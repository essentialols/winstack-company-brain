import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DueBrainDto, IssueDto } from '@app-starter/shared';
import { PipelineSecretGuard } from './pipeline-secret.guard';
import { InternalService } from './internal.service';
import { DueBrainsQueryDto, PublishIssueFormDto } from './dto/publish-issue.dto';

const MAX_AUDIO_BYTES = 40 * 1024 * 1024;

/** Pipeline-only routes. Hidden from Swagger; authorized by X-Pipeline-Secret. */
@ApiExcludeController()
@SkipThrottle()
@Controller('internal')
@UseGuards(PipelineSecretGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('brains/due')
  @HttpCode(HttpStatus.OK)
  async due(@Query() query: DueBrainsQueryDto): Promise<DueBrainDto[]> {
    const now = query.now ? new Date(query.now) : new Date();
    if (Number.isNaN(now.getTime())) {
      throw new BadRequestException('now must be an ISO timestamp');
    }
    return this.internalService.dueBrains(now, query.force || undefined);
  }

  @Post('brains/:brainId/issues')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  async publish(
    @Param('brainId') brainId: string,
    @Body() body: PublishIssueFormDto,
    @UploadedFile() audio?: Express.Multer.File,
  ): Promise<IssueDto> {
    return this.internalService.publishIssue(brainId, body.payload, audio);
  }

  /** Reserved for an on-demand run trigger; accepted and ignored for now. */
  @Post('brains/:brainId/run')
  @HttpCode(HttpStatus.ACCEPTED)
  run(): { accepted: true } {
    return { accepted: true };
  }
}
