import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgRole, Prisma, Save, SaveKind, SaveSource } from '@prisma/client';
import { PipelineSave, SaveDto } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BrainsService, PENDING_SAVE_WHERE } from './brains.service';
import { CreateSaveDto } from './dto/create-save.dto';
import { BrainAccessDeniedException, SaveNotFoundException } from './exceptions/brains.exceptions';

const EXCERPT_LENGTH = 200;
const LIST_LIMIT = 200;
const MANAGE_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];

type SaveWithCreator = Save & { createdBy: { id: string; name: string | null } };

const CREATOR_INCLUDE = { createdBy: { select: { id: true, name: true } } } as const;

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com|twitch\.tv|tiktok\.com)$/;
const PODCAST_HOSTS = /(^|\.)(open\.spotify\.com|podcasts\.apple\.com|overcast\.fm|pca\.st|podcasts\.google\.com|pocketcasts\.com)$/;
const POST_HOSTS = /(^|\.)(x\.com|twitter\.com|linkedin\.com|reddit\.com|news\.ycombinator\.com|bsky\.app|threads\.net|mastodon\.social|facebook\.com|instagram\.com)$/;
const BARE_URL = /^https?:\/\/\S+$/i;

const parseUrl = (value: string | undefined | null): URL | null => {
  if (!value) {
    return null;
  }
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/** Best-effort kind from URL and content; the client may override it. */
export const inferKind = (url: URL | null, hasSelection: boolean): SaveKind => {
  if (!url) {
    return hasSelection ? SaveKind.SNIPPET : SaveKind.TEXT;
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.pdf')) return SaveKind.PDF;
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return SaveKind.IMAGE;
  if (/\.(mp3|m4a|ogg|wav)$/.test(path) || PODCAST_HOSTS.test(host)) return SaveKind.PODCAST;
  if (VIDEO_HOSTS.test(host) || /\.(mp4|webm|mov)$/.test(path)) return SaveKind.VIDEO;
  if (POST_HOSTS.test(host)) return hasSelection ? SaveKind.SNIPPET : SaveKind.POST;
  return hasSelection ? SaveKind.SNIPPET : SaveKind.ARTICLE;
};

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

const titleFromUrl = (url: URL): string => {
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.hostname.replace(/^www\./, '')}${path}`.slice(0, 300);
};

const emptyToNull = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  return value.trim().length > 0 ? value : null;
};

@Injectable()
export class SavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brainsService: BrainsService,
  ) {}

  /** Web paste box: brain comes from the path, so it must belong to the path org. */
  async createInOrg(
    userId: string,
    organizationId: string,
    brainId: string,
    data: CreateSaveDto,
  ): Promise<SaveDto> {
    await this.brainsService.requireMember(userId, organizationId, 'save to');
    const brain = await this.brainsService.loadScoped(organizationId, brainId);
    return this.persist(userId, brain.organizationId, brain.id, SaveSource.PASTE, data);
  }

  /** Extension: brain from the body, else the caller's default brain. */
  async createFromExtension(userId: string, data: CreateSaveDto): Promise<SaveDto> {
    const brain = data.brainId
      ? await this.brainsService.loadForMember(userId, data.brainId)
      : await this.brainsService.resolveDefaultBrain(userId);
    return this.persist(userId, brain.organizationId, brain.id, SaveSource.EXTENSION, data);
  }

  async list(
    userId: string,
    organizationId: string,
    brainId: string,
    isPendingOnly: boolean,
  ): Promise<SaveDto[]> {
    await this.brainsService.requireMember(userId, organizationId, 'view saves in');
    const brain = await this.brainsService.loadScoped(organizationId, brainId);

    const saves = await this.prisma.save.findMany({
      where: {
        organizationId,
        brainId: brain.id,
        deletedAt: null,
        ...(isPendingOnly ? { issueId: null } : {}),
      },
      include: CREATOR_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });

    return saves.map((s) => this.toDto(s));
  }

  /**
   * Soft delete. Only pending saves can go (an issued save is part of the
   * issue's sources). The saver may remove their own; OWNER/ADMIN any.
   */
  async remove(
    userId: string,
    organizationId: string,
    brainId: string,
    saveId: string,
  ): Promise<void> {
    const role = await this.brainsService.requireMember(userId, organizationId, 'remove saves from');
    const save = await this.prisma.save.findFirst({
      where: { id: saveId, organizationId, brainId, ...PENDING_SAVE_WHERE },
    });
    if (!save) {
      throw new SaveNotFoundException(saveId);
    }
    if (save.createdById !== userId && !MANAGE_ROLES.includes(role)) {
      throw new BrainAccessDeniedException('remove saves from');
    }
    await this.prisma.save.update({ where: { id: save.id }, data: { deletedAt: new Date() } });
  }

  toDto(save: SaveWithCreator): SaveDto {
    const excerptSource = save.selection || save.text || save.captions || save.note || '';
    return {
      id: save.id,
      brainId: save.brainId,
      source: save.source,
      kind: save.kind,
      url: save.url,
      title: save.title,
      siteName: save.siteName,
      excerpt: collapse(excerptSource.slice(0, EXCERPT_LENGTH * 4)).slice(0, EXCERPT_LENGTH),
      note: save.note,
      issueId: save.issueId,
      createdBy: { id: save.createdBy.id, name: save.createdBy.name },
      createdAt: save.createdAt.toISOString(),
    };
  }

  toPipelineSave(save: SaveWithCreator): PipelineSave {
    return {
      ...this.toDto(save),
      text: save.text,
      selection: save.selection,
      captions: save.captions,
    };
  }

  private async persist(
    userId: string,
    organizationId: string,
    brainId: string,
    source: SaveSource,
    data: CreateSaveDto,
  ): Promise<SaveDto> {
    let rawUrl = emptyToNull(data.url)?.trim() ?? null;
    let text = emptyToNull(data.text);

    // A pasted bare link arrives as text; treat it as a URL save.
    if (!rawUrl && text && BARE_URL.test(text.trim())) {
      rawUrl = text.trim();
      text = null;
    }

    const selection = emptyToNull(data.selection);
    const captions = emptyToNull(data.captions);
    const note = emptyToNull(data.note)?.trim() ?? null;
    const url = parseUrl(rawUrl);

    if (rawUrl && !url) {
      throw new BadRequestException('url must be a valid absolute URL');
    }
    if (!url && !text && !selection && !captions) {
      throw new BadRequestException('Provide a url or some text to save');
    }

    const title =
      emptyToNull(data.title)?.trim() ||
      (url ? titleFromUrl(url) : null) ||
      collapse((selection || text || captions || '').slice(0, 400)).slice(0, 80) ||
      'Untitled';

    const createData: Prisma.SaveUncheckedCreateInput = {
      organizationId,
      brainId,
      createdById: userId,
      source,
      kind: data.kind ?? inferKind(url, !!selection),
      url: url ? url.toString() : null,
      title: title.slice(0, 500),
      siteName: emptyToNull(data.siteName)?.trim() ?? null,
      text,
      selection,
      captions,
      note,
    };

    const save = await this.prisma.save.create({ data: createData, include: CREATOR_INCLUDE });
    return this.toDto(save);
  }
}
