import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokenOrJwtGuard } from './api-token-or-jwt.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ApiTokensController],
  providers: [ApiTokensService, ApiTokenOrJwtGuard],
  exports: [ApiTokensService, ApiTokenOrJwtGuard],
})
export class ApiTokensModule {}
