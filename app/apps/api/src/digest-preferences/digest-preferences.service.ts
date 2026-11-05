import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DigestPreferencesResponse,
  UpdateDigestPreferencesDto,
} from './dto/update-digest-preferences.dto';

/** Per-user format choice (read / listen). Channel choice lives in notification preferences. */
@Injectable()
export class DigestPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<DigestPreferencesResponse> {
    const pref = await this.prisma.userDigestPreference.findUnique({ where: { userId } });
    return { wantsRead: pref?.wantsRead ?? true, wantsListen: pref?.wantsListen ?? true };
  }

  async update(
    userId: string,
    data: UpdateDigestPreferencesDto,
  ): Promise<DigestPreferencesResponse> {
    const changes = {
      ...(data.wantsRead !== undefined ? { wantsRead: data.wantsRead } : {}),
      ...(data.wantsListen !== undefined ? { wantsListen: data.wantsListen } : {}),
    };
    const pref = await this.prisma.userDigestPreference.upsert({
      where: { userId },
      create: { userId, ...changes },
      update: changes,
    });
    return { wantsRead: pref.wantsRead, wantsListen: pref.wantsListen };
  }
}
