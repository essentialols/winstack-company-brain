import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StorageModule } from '../common/storage/storage.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { BrainsController, MeBrainsController } from './brains.controller';
import { SavesController } from './saves.controller';
import { BrainsService } from './brains.service';
import { SavesService } from './saves.service';
import { IssuesService } from './issues.service';

@Module({
  imports: [PrismaModule, OrganizationsModule, StorageModule, ApiTokensModule],
  controllers: [BrainsController, MeBrainsController, SavesController],
  providers: [BrainsService, SavesService, IssuesService],
  exports: [BrainsService, SavesService, IssuesService],
})
export class BrainsModule {}
