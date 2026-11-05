import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DigestPreferencesController } from './digest-preferences.controller';
import { DigestPreferencesService } from './digest-preferences.service';

@Module({
  imports: [PrismaModule],
  controllers: [DigestPreferencesController],
  providers: [DigestPreferencesService],
  exports: [DigestPreferencesService],
})
export class DigestPreferencesModule {}
