import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobHuntingService } from './job-hunting.service';

@Injectable()
export class JobDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(JobDiscoveryService.name);

  constructor(
    private jobHuntingService: JobHuntingService,
    @InjectQueue('job-hunting') private readonly jobHuntingQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing job scheduling...');
    await this.scheduleJobScraping();
  }

  async scheduleJobScraping() {
    const jobName = 'discover-jobs';
    const repeatOptions = { every: 4 * 60 * 60 * 1000 }; // Every 4 hours in milliseconds
    // const repeatOptions = { cron: '0 */4 * * *' }; // Every 4 hours using cron

    // Remove previous repeatable jobs with the same name to avoid duplicates
    // This is a common pattern to ensure only one instance of this repeatable job exists.
    const repeatableJobs = await this.jobHuntingQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === jobName) {
        await this.jobHuntingQueue.removeRepeatableByKey(job.key);
        this.logger.log(
          `Removed existing repeatable job: ${job.name} with key ${job.key}`,
        );
      }
    }

    await this.jobHuntingQueue.add(
      jobName,
      {}, // No specific data needed if processor fetches URLs from config
      {
        repeat: repeatOptions,
        jobId: jobName, // Optional: give a specific ID to the repeatable job for easier management
      },
    );
    this.logger.log(
      `Scheduled repeatable job '${jobName}' to run every 4 hours.`,
    );
  }
}
