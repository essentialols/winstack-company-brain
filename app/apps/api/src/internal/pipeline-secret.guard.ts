import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/** Guards `/internal/*`: requires `X-Pipeline-Secret: $PIPELINE_SECRET`. */
@Injectable()
export class PipelineSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('PIPELINE_SECRET');
    if (!expected) {
      throw new ServiceUnavailableException('PIPELINE_SECRET is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers?.['x-pipeline-secret'];
    // Hash both sides so timingSafeEqual gets equal-length buffers.
    if (typeof provided !== 'string' || !timingSafeEqual(digest(provided), digest(expected))) {
      throw new UnauthorizedException('Invalid pipeline secret');
    }
    return true;
  }
}
