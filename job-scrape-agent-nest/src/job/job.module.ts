import { Module } from '@nestjs/common';
import { JobHuntingService } from './services/job-hunting.service';
import { JobRelevanceService } from './services/job-relevance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { JobDiscoveryService } from './services/job-discovery.service';
import { JobHuntingProcessor } from './services/job-hunting.processor';

@Module({
  imports: [ConfigModule,  BullModule.registerQueue({
    name: 'job-hunting',
  }),],
  providers: [
    JobHuntingService, 
    JobRelevanceService, 
    PrismaService, 
    JobDiscoveryService, 
    JobHuntingProcessor,
  ],
  exports: [JobHuntingService, JobRelevanceService],
})
export class JobModule {}
