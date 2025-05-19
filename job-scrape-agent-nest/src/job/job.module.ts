import { Module } from '@nestjs/common';
import { JobHuntingService } from './services/job-hunting.service';
import { JobRelevanceService } from './services/job-relevance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [ConfigModule,  BullModule.registerQueue({
    name: 'job-hunting',
    // TODO: move to config
    connection: {
      host: 'localhost',  // Your Redis host
      port: 6379,         // Your Redis port
    },
  }),],
  providers: [JobHuntingService, JobRelevanceService, PrismaService],
  exports: [JobHuntingService, JobRelevanceService],
})
export class JobModule {}
