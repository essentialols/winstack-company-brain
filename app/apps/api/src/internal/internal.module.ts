import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BrainsModule } from '../brains/brains.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { PipelineSecretGuard } from './pipeline-secret.guard';

@Module({
  imports: [PrismaModule, ConfigModule, StorageModule, NotificationsModule, BrainsModule],
  controllers: [InternalController],
  providers: [InternalService, PipelineSecretGuard],
})
export class InternalModule {}
