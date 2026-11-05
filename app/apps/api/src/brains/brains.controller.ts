import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrainDto, IssueDto, IssueSummaryDto, MeBrainsDto, TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { ApiTokenOrJwtGuard } from '../api-tokens/api-token-or-jwt.guard';
import { BrainsService } from './brains.service';
import { IssuesService } from './issues.service';
import { CreateBrainDto } from './dto/create-brain.dto';
import { UpdateBrainDto } from './dto/update-brain.dto';

/** Organization-scoped brain routes (web app, JWT). */
@ApiTags('brains')
@Controller('organizations/:organizationId')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class BrainsController {
  constructor(
    private readonly brainsService: BrainsService,
    private readonly issuesService: IssuesService,
  ) {}

  @Get('brains')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List brains in an organization' })
  async list(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ): Promise<BrainDto[]> {
    return this.brainsService.list(req.user.sub, organizationId);
  }

  @Post('brains')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a brain' })
  async create(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() data: CreateBrainDto,
  ): Promise<BrainDto> {
    return this.brainsService.create(req.user.sub, organizationId, data);
  }

  @Patch('brains/:brainId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a brain name or schedule' })
  async update(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('brainId') brainId: string,
    @Body() data: UpdateBrainDto,
  ): Promise<BrainDto> {
    return this.brainsService.update(req.user.sub, organizationId, brainId, data);
  }

  @Get('brains/:brainId/issues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List issues of a brain, newest first' })
  async listIssues(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('brainId') brainId: string,
  ): Promise<IssueSummaryDto[]> {
    return this.issuesService.listForBrain(req.user.sub, organizationId, brainId);
  }

  @Get('issues/:issueId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one issue with its audio URL' })
  async getIssue(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('issueId') issueId: string,
  ): Promise<IssueDto> {
    return this.issuesService.findOne(req.user.sub, organizationId, issueId);
  }
}

/** `GET /me/brains` — used by the extension (API token) and the web app (JWT). */
@ApiTags('brains')
@Controller('me/brains')
@UseGuards(ApiTokenOrJwtGuard, EmailVerifiedGuard)
export class MeBrainsController {
  constructor(private readonly brainsService: BrainsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'All brains of the caller across organizations' })
  async list(@Request() req: { user: TokenPayload }): Promise<MeBrainsDto> {
    return this.brainsService.meBrains(req.user.sub);
  }
}
