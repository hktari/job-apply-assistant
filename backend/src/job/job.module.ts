import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { BullModule } from '@nestjs/bullmq';
import { JobHuntingProcessor } from './services/job-hunting.processor';
import { FieldPopulationProcessor } from './processors/field-population.processor';
import { JobHuntingService } from './services/job-hunting.service';
import { JobRelevanceService } from './services/job-relevance.service';
import { FieldPopulationCronService } from './services/field-population-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { JobDiscoveryService } from './services/job-discovery.service';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { JobController } from './controllers/job.controller';
import { LLMMetricsController } from './controllers/llm-metrics.controller';
import { LLMObservabilityService } from './services/llm/llm-observability.service';
@Module({
  imports: [
    ProfileModule,
    ConfigModule,
    BullModule.registerQueue({
      name: 'job-hunting',
    }),
    BullModule.registerQueue({
      name: 'job-field-population',
    }),
    BullBoardModule.forFeature({
      name: 'job-hunting',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'job-field-population',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    JobHuntingProcessor,
    FieldPopulationProcessor,
    JobHuntingService,
    JobRelevanceService,
    FieldPopulationCronService,
    PrismaService,
    JobDiscoveryService,
    LLMObservabilityService,
  ],
  controllers: [JobController, LLMMetricsController],
  exports: [JobHuntingService, JobRelevanceService],
})
export class JobModule {}
