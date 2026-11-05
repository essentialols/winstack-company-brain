import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { DigestPreferencesService } from './digest-preferences.service';
import {
  DigestPreferencesResponse,
  UpdateDigestPreferencesDto,
} from './dto/update-digest-preferences.dto';

@ApiTags('digest-preferences')
@Controller('me/digest-preferences')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class DigestPreferencesController {
  constructor(private readonly digestPreferencesService: DigestPreferencesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the caller’s digest format preferences' })
  async get(@Request() req: { user: TokenPayload }): Promise<DigestPreferencesResponse> {
    return this.digestPreferencesService.get(req.user.sub);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the caller’s digest format preferences' })
  async update(
    @Request() req: { user: TokenPayload },
    @Body() data: UpdateDigestPreferencesDto,
  ): Promise<DigestPreferencesResponse> {
    return this.digestPreferencesService.update(req.user.sub, data);
  }
}
