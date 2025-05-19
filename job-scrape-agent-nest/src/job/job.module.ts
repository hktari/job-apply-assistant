import { Module } from '@nestjs/common';
import { JobHuntingService } from './services/job-hunting.service';
import { JobRelevanceService } from './services/job-relevance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [JobHuntingService, JobRelevanceService, PrismaService],
  exports: [JobHuntingService, JobRelevanceService],
})
export class JobModule {}
