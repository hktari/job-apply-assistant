import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobHuntingProcessor } from './services/job-hunting.processor';
import { JobHuntingService } from './services/job-hunting.service';
import { JobRelevanceService } from './services/job-relevance.service';
import { JobController } from './job.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { JobDiscoveryService } from './services/job-discovery.service';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'job-hunting',
    }),
    BullBoardModule.forFeature({
      name: 'job-hunting',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    JobHuntingProcessor,
    JobHuntingService,
    JobRelevanceService,
    PrismaService,
    JobDiscoveryService,
  ],
  controllers: [JobController],
  exports: [JobHuntingService, JobRelevanceService],
})
export class JobModule {}
