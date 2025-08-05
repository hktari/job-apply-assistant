import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobHuntingService } from '../services/job-hunting.service';

@Processor('job-field-population')
export class FieldPopulationProcessor extends WorkerHost {
  private readonly logger = new Logger(FieldPopulationProcessor.name);

  constructor(private readonly jobHuntingService: JobHuntingService) {
    super();
  }

  async process(job: Job<{ jobId: number }, any, string>): Promise<void> {
    const { jobId } = job.data;

    this.logger.log(`Processing field population for job ${jobId}`);

    try {
      await this.jobHuntingService.populateMissingJobFields(jobId);
      this.logger.log(
        `Successfully completed field population for job ${jobId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to populate fields for job ${jobId}: ${error.message}`,
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }
}
