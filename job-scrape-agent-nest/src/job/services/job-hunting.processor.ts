import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobHuntingService } from './job-hunting.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Processor('job-hunting')
export class JobHuntingProcessor extends WorkerHost {
  private readonly logger = new Logger(JobHuntingProcessor.name);

  constructor(
    private readonly jobHuntingService: JobHuntingService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'discover-jobs': {
        let progress = 0;

        const jobListUrls = [
          "https://slo-tech.com/delo",
          "https://www.bettercareer.si/jobs",
          "https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=37&amp;doSearch=&amp;Time=",
          "https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=42&amp;doSearch=&amp;Time=",
          "https://weworkremotely.com/remote-react-jobs",
          "https://weworkremotely.com/remote-javascript-jobs",
          "https://weworkremotely.com/remote-node-jobs",
          "https://weworkremotely.com/remote-angular-jobs",
          "https://weworkremotely.com/remote-full-time-jobs",
        ];

        if (jobListUrls.length === 0) {
          this.logger.warn("No job list URLs provided for immediate discovery.");
          return;
        }

        this.logger.log(`Manually triggering job discovery for ${jobListUrls.length} URLs...`);
        const result = await this.jobHuntingService.findJobs(jobListUrls);
        this.logger.log("Manual job search completed.");
        this.logger.log("Matched Jobs:", result.matchedJobs.length);
        this.logger.log("Irrelevant Jobs:", result.irrelevantJobs.length);

        return {
          matchedJobs: result.matchedJobs,
          irrelevantJobs: result.irrelevantJobs,
        };
        // The jobHuntingService.findJobs now handles storage, so this might be redundant
        // await this.jobHuntingService.storeJobsInDatabase(result.matchedJobs, result.irrelevantJobs);
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        return;
      }
    }
  }
}

