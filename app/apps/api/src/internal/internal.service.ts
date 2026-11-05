import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Brain, Prisma } from '@prisma/client';
import { DueBrainDto, IssueContent, IssueDto } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IStorageProvider } from '../common/storage/storage-provider.interface';
import { NotificationsService } from '../notifications/services/notifications.service';
import { BrainsService, PENDING_SAVE_WHERE } from '../brains/brains.service';
import { SavesService } from '../brains/saves.service';
import { IssuesService } from '../brains/issues.service';
import { BrainNotFoundException } from '../brains/exceptions/brains.exceptions';
import { previousSlot } from '../brains/brain-schedule.util';
import { PublishIssuePayload } from './dto/publish-issue.dto';

type BrainWithOrg = Brain & { organization: { name: string } };

/**
 * Endpoints the digest pipeline calls. Not tenant-scoped by a caller: the
 * pipeline secret is the authorization, and it operates across all orgs.
 */
@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly brainsService: BrainsService,
    private readonly savesService: SavesService,
    private readonly issuesService: IssuesService,
    private readonly notificationsService: NotificationsService,
    @Inject('STORAGE_PROVIDER') private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Brains whose most recent delivery slot has passed since their last issue
   * (or since creation) and that have at least one pending save. `forceBrainId`
   * skips the schedule check for that one brain (demo / manual run).
   */
  async dueBrains(now: Date, forceBrainId?: string): Promise<DueBrainDto[]> {
    const brains: BrainWithOrg[] = await this.prisma.brain.findMany({
      where: {
        archivedAt: null,
        ...(forceBrainId ? { id: forceBrainId } : { saves: { some: PENDING_SAVE_WHERE } }),
      },
      include: { organization: { select: { name: true } } },
    });

    const due = forceBrainId ? brains : brains.filter((brain) => this.isDue(brain, now));
    return Promise.all(due.map((brain) => this.toDueBrain(brain, now)));
  }

  /**
   * Publish an issue: store audio, number it, attach every pending save
   * created up to now, bump lastIssueAt, then notify members.
   */
  async publishIssue(
    brainId: string,
    rawPayload: string,
    audio?: Express.Multer.File,
  ): Promise<IssueDto> {
    const requestTime = new Date();
    const payload = this.parsePayload(rawPayload);

    const brain = await this.prisma.brain.findFirst({
      where: { id: brainId, archivedAt: null },
      include: { organization: { select: { name: true } } },
    });
    if (!brain) {
      throw new BrainNotFoundException(brainId);
    }

    const audioKey = audio ? await this.storeAudio(brain.id, audio) : null;

    const issue = await this.prisma.$transaction(async (tx) => {
      const last = await tx.issue.findFirst({
        where: { brainId: brain.id },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const created = await tx.issue.create({
        data: {
          organizationId: brain.organizationId,
          brainId: brain.id,
          number: (last?.number ?? 0) + 1,
          title: payload.title,
          content: payload.content as unknown as Prisma.InputJsonValue,
          audioKey,
          audioDurationSec: audioKey ? (payload.audioDurationSec ?? null) : null,
          publishedAt: requestTime,
        },
      });
      await tx.save.updateMany({
        where: {
          brainId: brain.id,
          organizationId: brain.organizationId,
          ...PENDING_SAVE_WHERE,
          createdAt: { lte: requestTime },
        },
        data: { issueId: created.id },
      });
      await tx.brain.update({ where: { id: brain.id }, data: { lastIssueAt: requestTime } });
      return created;
    });

    // Fire-and-forget: email delivery must not hold up the pipeline's request.
    void this.notifyMembers(brain, issue.id, issue.number, payload, !!audioKey).catch((error) =>
      this.logger.error(`Issue notifications failed for ${issue.id}: ${error.message}`),
    );

    return this.issuesService.toDto(issue);
  }

  private isDue(brain: Brain, now: Date): boolean {
    const slot = previousSlot(brain, now);
    if (!slot) {
      return false;
    }
    const since = brain.lastIssueAt ?? brain.createdAt;
    return slot.getTime() > since.getTime();
  }

  private async toDueBrain(brain: BrainWithOrg, now: Date): Promise<DueBrainDto> {
    const [saves, last] = await Promise.all([
      this.prisma.save.findMany({
        where: { brainId: brain.id, organizationId: brain.organizationId, ...PENDING_SAVE_WHERE },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.issue.findFirst({
        where: { brainId: brain.id },
        orderBy: { number: 'desc' },
        select: { number: true },
      }),
    ]);

    return {
      brain: {
        ...this.brainsService.toDto(brain, saves.length, now),
        organizationName: brain.organization.name,
      },
      saves: saves.map((s) => this.savesService.toPipelineSave(s)),
      nextIssueNumber: (last?.number ?? 0) + 1,
    };
  }

  private parsePayload(raw: string): PublishIssuePayload & { content: IssueContent } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('payload must be valid JSON');
    }
    const value = parsed as Partial<PublishIssuePayload>;
    if (!value || typeof value.title !== 'string' || value.title.trim().length === 0) {
      throw new BadRequestException('payload.title is required');
    }
    const content = value.content as IssueContent | undefined;
    if (!content || typeof content !== 'object' || !Array.isArray(content.takeaways)) {
      throw new BadRequestException('payload.content must be an IssueContent object');
    }
    const duration =
      typeof value.audioDurationSec === 'number' && Number.isFinite(value.audioDurationSec)
        ? Math.max(0, Math.round(value.audioDurationSec))
        : undefined;
    return { title: value.title.trim().slice(0, 500), content, audioDurationSec: duration };
  }

  private async storeAudio(brainId: string, audio: Express.Multer.File): Promise<string> {
    const isMp3 = audio.mimetype === 'audio/mpeg' || /\.mp3$/i.test(audio.originalname ?? '');
    if (!isMp3) {
      throw new BadRequestException('audio must be audio/mpeg');
    }
    // Providers derive the stored extension from originalname.
    const file = {
      ...audio,
      mimetype: 'audio/mpeg',
      originalname: /\.mp3$/i.test(audio.originalname ?? '') ? audio.originalname : 'issue.mp3',
    } as Express.Multer.File;
    return this.storageProvider.uploadFile(file, `issues/${brainId}`);
  }

  private async notifyMembers(
    brain: BrainWithOrg,
    issueId: string,
    issueNumber: number,
    payload: PublishIssuePayload & { content: IssueContent },
    hasAudio: boolean,
  ): Promise<void> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: brain.organizationId },
      select: { userId: true },
    });
    const webUrl = (
      this.configService.get<string>('WEB_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    await this.notificationsService.sendBulkNotification(
      'brain-issue-published',
      members.map((m) => ({ type: 'userId' as const, userId: m.userId })),
      {
        brainName: brain.name,
        issueTitle: payload.title,
        issueNumber,
        issueId,
        issueUrl: `${webUrl}/issues/${issueId}`,
        organizationId: brain.organizationId,
        organizationName: brain.organization.name,
        takeawayCount: payload.content.takeaways.length,
        hasAudio,
      },
      brain.organizationId,
    );
  }
}
