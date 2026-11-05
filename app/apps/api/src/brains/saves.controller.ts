import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SaveDto, TokenPayload } from '@app-starter/shared';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ApiTokenOrJwtGuard } from '../api-tokens/api-token-or-jwt.guard';
import { SavesService } from './saves.service';
import { CreateSaveDto } from './dto/create-save.dto';

/**
 * Save routes. All accept a JWT or an extension API token: the extension
 * creates via `POST /saves` and undoes via the org-scoped DELETE.
 */
@ApiTags('saves')
@Controller()
@UseGuards(ApiTokenOrJwtGuard, EmailVerifiedGuard)
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Post('saves')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save from the extension (brainId optional → default brain)' })
  async createFromExtension(
    @Request() req: { user: TokenPayload },
    @Body() data: CreateSaveDto,
  ): Promise<SaveDto> {
    return this.savesService.createFromExtension(req.user.sub, data);
  }

  @Get('organizations/:organizationId/brains/:brainId/saves')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List saves of a brain, newest first' })
  async list(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('brainId') brainId: string,
    @Query('pending') pending?: string,
  ): Promise<SaveDto[]> {
    return this.savesService.list(req.user.sub, organizationId, brainId, pending === 'true');
  }

  @Post('organizations/:organizationId/brains/:brainId/saves')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Paste a link or text into a brain' })
  async create(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('brainId') brainId: string,
    @Body() data: CreateSaveDto,
  ): Promise<SaveDto> {
    return this.savesService.createInOrg(req.user.sub, organizationId, brainId, data);
  }

  @Delete('organizations/:organizationId/brains/:brainId/saves/:saveId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a pending save (soft delete)' })
  async remove(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('brainId') brainId: string,
    @Param('saveId') saveId: string,
  ): Promise<void> {
    await this.savesService.remove(req.user.sub, organizationId, brainId, saveId);
  }
}
