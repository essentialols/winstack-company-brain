import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiToken } from '@prisma/client';
import { ApiTokenDto, TokenPayload } from '@app-starter/shared';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_PREFIX = 'oib_';
const TOKEN_RANDOM_LENGTH = 40;
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
/** Avoid a DB write on every extension request. */
const LAST_USED_RESOLUTION_MS = 60_000;

export const isApiToken = (value: string): boolean => value.startsWith(TOKEN_PREFIX);

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Unbiased base62 via rejection sampling (248 = 62 * 4). */
const randomBase62 = (length: number): string => {
  let out = '';
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248 && out.length < length) {
        out += BASE62[byte % 62];
      }
    }
  }
  return out;
};

/**
 * Personal API tokens for the Chrome extension. Only the sha256 hash is
 * stored; the plaintext is returned once at creation.
 */
@Injectable()
export class ApiTokensService {
  private readonly logger = new Logger(ApiTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string): Promise<{ token: string; apiToken: ApiTokenDto }> {
    const token = `${TOKEN_PREFIX}${randomBase62(TOKEN_RANDOM_LENGTH)}`;
    const apiToken = await this.prisma.apiToken.create({
      data: {
        userId,
        name: name.trim(),
        prefix: token.slice(0, 8),
        tokenHash: hashToken(token),
      },
    });
    return { token, apiToken: this.toDto(apiToken) };
  }

  async list(userId: string): Promise<ApiTokenDto[]> {
    const tokens = await this.prisma.apiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return tokens.map((t) => this.toDto(t));
  }

  async revoke(userId: string, tokenId: string): Promise<void> {
    const result = await this.prisma.apiToken.updateMany({
      where: { id: tokenId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException(`API token not found: ${tokenId}`);
    }
  }

  /** Resolve a plaintext token to the same payload shape the JWT strategy yields. */
  async validate(token: string): Promise<TokenPayload | null> {
    if (!isApiToken(token)) {
      return null;
    }
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true, quarantinedAt: true } } },
    });
    if (!apiToken || apiToken.revokedAt || apiToken.user.quarantinedAt) {
      return null;
    }

    const now = Date.now();
    if (!apiToken.lastUsedAt || now - apiToken.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
      this.prisma.apiToken
        .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date(now) } })
        .catch((error) => this.logger.warn(`Failed to touch API token: ${error.message}`));
    }

    return { sub: apiToken.user.id, email: apiToken.user.email };
  }

  private toDto(token: ApiToken): ApiTokenDto {
    return {
      id: token.id,
      name: token.name,
      prefix: token.prefix,
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      createdAt: token.createdAt.toISOString(),
    };
  }
}
