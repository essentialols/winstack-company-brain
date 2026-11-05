import { BadRequestException, Injectable } from '@nestjs/common';
import { Brain, OrgRole, Prisma } from '@prisma/client';
import { BrainDto, MeBrainsDto } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ensureUniqueSlug, generateSlugFromName } from '../common/utils/slug.util';
import { CreateBrainDto } from './dto/create-brain.dto';
import { UpdateBrainDto } from './dto/update-brain.dto';
import { BrainAccessDeniedException, BrainNotFoundException } from './exceptions/brains.exceptions';
import { isValidTimezone, nextSlot } from './brain-schedule.util';

export const DEFAULT_BRAIN_NAME = 'My brain';

/** Saves that have not gone into an issue yet and were not removed. */
export const PENDING_SAVE_WHERE = { issueId: null, deletedAt: null } as const;

/**
 * Organization-scoped brains. Follows the projects reference: every query is
 * filtered by organizationId and the caller's role is resolved first.
 */
@Injectable()
export class BrainsService {
  private static readonly MEMBER_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER];

  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(userId: string, organizationId: string): Promise<BrainDto[]> {
    await this.requireMember(userId, organizationId, 'view brains in');

    const brains = await this.prisma.brain.findMany({
      where: { organizationId, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const counts = await this.pendingCounts(brains.map((b) => b.id));

    return brains.map((brain) => this.toDto(brain, counts.get(brain.id) ?? 0));
  }

  async create(userId: string, organizationId: string, data: CreateBrainDto): Promise<BrainDto> {
    await this.requireMember(userId, organizationId, 'create');
    const brain = await this.createBrain(this.prisma, organizationId, userId, data.name.trim());
    return this.toDto(brain, 0);
  }

  async update(
    userId: string,
    organizationId: string,
    brainId: string,
    data: UpdateBrainDto,
  ): Promise<BrainDto> {
    await this.requireMember(userId, organizationId, 'edit');
    const brain = await this.loadScoped(organizationId, brainId);

    if (data.timezone !== undefined && !isValidTimezone(data.timezone)) {
      throw new BadRequestException(`Unknown timezone: ${data.timezone}`);
    }

    const updated = await this.prisma.brain.update({
      where: { id: brain.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
        ...(data.deliveryDays !== undefined ? { deliveryDays: data.deliveryDays } : {}),
        ...(data.deliveryHour !== undefined ? { deliveryHour: data.deliveryHour } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.podcastMinutes !== undefined ? { podcastMinutes: data.podcastMinutes } : {}),
      },
    });
    const counts = await this.pendingCounts([updated.id]);

    return this.toDto(updated, counts.get(updated.id) ?? 0);
  }

  /**
   * Brains across every organization of the caller, for the extension. The
   * default brain is the one the user saved into most recently.
   */
  async meBrains(userId: string): Promise<MeBrainsDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            brains: { where: { archivedAt: null }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { organization: { name: 'asc' } },
    });

    const allBrains = memberships.flatMap((m) => m.organization.brains);
    const counts = await this.pendingCounts(allBrains.map((b) => b.id));
    const brainIds = new Set(allBrains.map((b) => b.id));

    const lastSave = await this.prisma.save.findFirst({
      where: { createdById: userId, deletedAt: null, brainId: { in: [...brainIds] } },
      orderBy: { createdAt: 'desc' },
      select: { brainId: true },
    });

    const now = new Date();
    return {
      user,
      defaultBrainId: lastSave?.brainId ?? allBrains[0]?.id ?? null,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        brains: m.organization.brains.map((b) => ({
          id: b.id,
          name: b.name,
          pendingSaveCount: counts.get(b.id) ?? 0,
          nextIssueAt: nextSlot(b, now)?.toISOString() ?? null,
        })),
      })),
    };
  }

  /** The brain a save goes to when the caller did not pick one. */
  async resolveDefaultBrain(userId: string): Promise<Brain> {
    const { defaultBrainId } = await this.meBrains(userId);
    if (!defaultBrainId) {
      throw new BrainNotFoundException('no brain available for this user');
    }
    return this.prisma.brain.findUniqueOrThrow({ where: { id: defaultBrainId } });
  }

  /**
   * Load an active brain by id alone (extension route, where the org is not
   * in the path) and check the caller belongs to its organization. A brain in
   * another tenant reads as not found.
   */
  async loadForMember(userId: string, brainId: string): Promise<Brain> {
    const brain = await this.prisma.brain.findFirst({ where: { id: brainId, archivedAt: null } });
    if (!brain) {
      throw new BrainNotFoundException(brainId);
    }
    const role = await this.organizationsService.getUserRoleInOrganization(
      userId,
      brain.organizationId,
    );
    if (!role) {
      throw new BrainNotFoundException(brainId);
    }
    return brain;
  }

  /** Create a brain with a unique per-org slug. Accepts a transaction client. */
  async createBrain(
    client: Prisma.TransactionClient,
    organizationId: string,
    createdById: string,
    name: string,
  ): Promise<Brain> {
    const slug = await ensureUniqueSlug(
      async (candidate) => {
        const existing = await client.brain.findUnique({
          where: { organizationId_slug: { organizationId, slug: candidate } },
          select: { id: true },
        });
        return existing !== null;
      },
      100,
      () => generateSlugFromName(name),
    );

    return client.brain.create({ data: { organizationId, createdById, name, slug } });
  }

  async loadScoped(organizationId: string, brainId: string): Promise<Brain> {
    const brain = await this.prisma.brain.findFirst({
      where: { id: brainId, organizationId, archivedAt: null },
    });
    if (!brain) {
      throw new BrainNotFoundException(brainId);
    }
    return brain;
  }

  async requireMember(userId: string, organizationId: string, action: string): Promise<OrgRole> {
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);
    if (!role || !BrainsService.MEMBER_ROLES.includes(role as OrgRole)) {
      throw new BrainAccessDeniedException(action);
    }
    return role as OrgRole;
  }

  async pendingCounts(brainIds: string[]): Promise<Map<string, number>> {
    if (brainIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.save.groupBy({
      by: ['brainId'],
      where: { brainId: { in: brainIds }, ...PENDING_SAVE_WHERE },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.brainId, r._count._all]));
  }

  toDto(brain: Brain, pendingSaveCount: number, now: Date = new Date()): BrainDto {
    return {
      id: brain.id,
      organizationId: brain.organizationId,
      name: brain.name,
      slug: brain.slug,
      frequency: brain.frequency,
      deliveryDays: brain.deliveryDays,
      deliveryHour: brain.deliveryHour,
      timezone: brain.timezone,
      podcastMinutes: brain.podcastMinutes,
      lastIssueAt: brain.lastIssueAt?.toISOString() ?? null,
      pendingSaveCount,
      nextIssueAt: nextSlot(brain, now)?.toISOString() ?? null,
      createdAt: brain.createdAt.toISOString(),
    };
  }
}
