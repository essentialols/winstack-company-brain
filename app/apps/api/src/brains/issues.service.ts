import { Inject, Injectable, Logger } from '@nestjs/common';
import { Issue } from '@prisma/client';
import { IssueContent, IssueDto, IssueSummaryDto } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IStorageProvider } from '../common/storage/storage-provider.interface';
import { BrainsService } from './brains.service';
import { IssueNotFoundException } from './exceptions/brains.exceptions';

/** Long enough to listen through an issue without the URL expiring mid-play. */
const AUDIO_URL_TTL_SECONDS = 6 * 60 * 60;

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brainsService: BrainsService,
    @Inject('STORAGE_PROVIDER') private readonly storageProvider: IStorageProvider,
  ) {}

  async listForBrain(
    userId: string,
    organizationId: string,
    brainId: string,
  ): Promise<IssueSummaryDto[]> {
    await this.brainsService.requireMember(userId, organizationId, 'view issues of');
    const brain = await this.brainsService.loadScoped(organizationId, brainId);

    const issues = await this.prisma.issue.findMany({
      where: { organizationId, brainId: brain.id },
      orderBy: { number: 'desc' },
    });

    return issues.map((issue) => this.toSummary(issue));
  }

  async findOne(userId: string, organizationId: string, issueId: string): Promise<IssueDto> {
    await this.brainsService.requireMember(userId, organizationId, 'view issues of');
    const issue = await this.prisma.issue.findFirst({ where: { id: issueId, organizationId } });
    if (!issue) {
      throw new IssueNotFoundException(issueId);
    }
    return this.toDto(issue);
  }

  toSummary(issue: Issue): IssueSummaryDto {
    const content = issue.content as unknown as IssueContent | null;
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      takeawayCount: Array.isArray(content?.takeaways) ? content.takeaways.length : 0,
      audioDurationSec: issue.audioDurationSec,
      publishedAt: issue.publishedAt.toISOString(),
    };
  }

  async toDto(issue: Issue): Promise<IssueDto> {
    return {
      id: issue.id,
      brainId: issue.brainId,
      organizationId: issue.organizationId,
      number: issue.number,
      title: issue.title,
      content: issue.content as unknown as IssueContent,
      audioUrl: await this.resolveAudioUrl(issue.audioKey),
      audioDurationSec: issue.audioDurationSec,
      publishedAt: issue.publishedAt.toISOString(),
    };
  }

  /**
   * `audioKey` holds the URL the storage provider returned at upload. Local
   * storage serves it as-is; R2 gets a presigned URL so the bucket can stay
   * private. Falls back to the stored URL if signing fails.
   */
  private async resolveAudioUrl(audioKey: string | null): Promise<string | null> {
    if (!audioKey) {
      return null;
    }
    try {
      return await this.storageProvider.getSignedUrl(audioKey, AUDIO_URL_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`Could not sign audio URL, using stored URL: ${(error as Error).message}`);
      return audioKey;
    }
  }
}
