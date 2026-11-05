import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiTokenDto, TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

/** Token management requires a real session, never another API token. */
@ApiTags('api-tokens')
@Controller('me/api-tokens')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an extension API token (shown once)' })
  async create(
    @Request() req: { user: TokenPayload },
    @Body() data: CreateApiTokenDto,
  ): Promise<{ token: string; apiToken: ApiTokenDto }> {
    return this.apiTokensService.create(req.user.sub, data.name);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active API tokens' })
  async list(@Request() req: { user: TokenPayload }): Promise<ApiTokenDto[]> {
    return this.apiTokensService.list(req.user.sub);
  }

  @Delete(':tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API token' })
  async revoke(
    @Request() req: { user: TokenPayload },
    @Param('tokenId') tokenId: string,
  ): Promise<void> {
    await this.apiTokensService.revoke(req.user.sub, tokenId);
  }
}
