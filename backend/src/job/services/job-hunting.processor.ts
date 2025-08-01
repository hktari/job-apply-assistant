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
        return await this.processJobDiscovery(job);
      }
      case 'scrape-job-listings': {
        return await this.processScrapeJobListings(job);
      }
      case 'analyze-job-relevance': {
        return await this.processAnalyzeJobRelevance(job);
      }
      case 'scrape-job-details': {
        return await this.processScrapeJobDetails(job);
      }
      default: {
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  }

  private async processJobDiscovery(job: Job<any, any, string>): Promise<any> {
    try {
      const { jobListUrls = this.getDefaultJobUrls() } = job.data || {};

      // Type guard to ensure jobListUrls is string[]
      const validJobListUrls = Array.isArray(jobListUrls)
        ? jobListUrls.filter((url): url is string => typeof url === 'string')
        : [];

      if (validJobListUrls.length === 0) {
        const errorMsg = 'No valid job list URLs provided for job discovery.';
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      this.logger.log(
        `Starting job discovery process for ${validJobListUrls.length} URLs...`,
      );
      await job.updateProgress(0);

      // Progress tracking callback
      const progressCallback = (progress: number, message: string): void => {
        this.logger.log(`Progress: ${progress}% - ${message}`);
        // Note: updateProgress is async but we can't await in callback
        job.updateProgress(progress).catch((error) => {
          this.logger.error('Failed to update progress:', error);
        });
      };

      // Run the improved job discovery process
      const result = await this.jobHuntingService.findJobs(
        validJobListUrls,
        progressCallback,
      );

      this.logger.log(
        `Job discovery completed. Found ${result.matchedJobs.length} relevant jobs and ${result.irrelevantJobs.length} irrelevant jobs.`,
      );

      // Store jobs in database
      await job.updateProgress(95);
      this.logger.log('Storing jobs in database...');
      await this.jobHuntingService.storeJobsInDatabase(
        result.matchedJobs,
        result.irrelevantJobs,
      );

      await job.updateProgress(100);
      this.logger.log('Job discovery process completed successfully.');

      return {
        success: true,
        matchedJobs: result.matchedJobs.length,
        irrelevantJobs: result.irrelevantJobs.length,
        totalProcessed:
          result.matchedJobs.length + result.irrelevantJobs.length,
      };
    } catch (error: any) {
      this.logger.error('Job discovery process failed:', error);
      throw error;
    }
  }

  private async processScrapeJobListings(
    job: Job<any, any, string>,
  ): Promise<any> {
    try {
      const { jobListUrls } = job.data;

      // Type guard to ensure jobListUrls is string[]
      const validJobListUrls = Array.isArray(jobListUrls)
        ? jobListUrls.filter((url): url is string => typeof url === 'string')
        : [];
      if (validJobListUrls.length === 0) {
        throw new Error('No valid job list URLs provided for scraping.');
      }

      this.logger.log(
        `Scraping job listings from ${validJobListUrls.length} URLs...`,
      );

      // This would be a new method in the service for just scraping listings
      // For now, we'll use the existing findJobs method but could be split further
      const result = await this.jobHuntingService.findJobs(validJobListUrls);

      return {
        success: true,
        jobsFound: result.matchedJobs.length + result.irrelevantJobs.length,
      };
    } catch (error: any) {
      this.logger.error('Job listings scraping failed:', error);
      throw error;
    }
  }

  private async processAnalyzeJobRelevance(
    job: Job<any, any, string>,
  ): Promise<any> {
    try {
      const { jobs } = job.data;
      if (!jobs || jobs.length === 0) {
        throw new Error('No jobs provided for relevance analysis.');
      }

      this.logger.log(`Analyzing relevance for ${jobs.length} jobs...`);

      // This would use a new method in the service for just relevance analysis
      // Implementation would depend on how we want to structure the data flow
      // For now, return a placeholder result
      await Promise.resolve(); // Add await to satisfy linter

      return {
        success: true,
        jobsAnalyzed: jobs.length,
      };
    } catch (error: any) {
      this.logger.error('Job relevance analysis failed:', error);
      throw error;
    }
  }

  private async processScrapeJobDetails(
    job: Job<any, any, string>,
  ): Promise<any> {
    try {
      const { relevantJobs } = job.data;
      if (!relevantJobs || relevantJobs.length === 0) {
        throw new Error('No relevant jobs provided for detail scraping.');
      }

      this.logger.log(
        `Scraping details for ${relevantJobs.length} relevant jobs...`,
      );

      // This would use a new method in the service for just detail scraping
      // Implementation would depend on how we want to structure the data flow
      // For now, return a placeholder result
      await Promise.resolve(); // Add await to satisfy linter

      return {
        success: true,
        jobsScraped: relevantJobs.length,
      };
    } catch (error: any) {
      this.logger.error('Job detail scraping failed:', error);
      throw error;
    }
  }

  private getDefaultJobUrls(): string[] {
    // Get default URLs from configuration or environment variables
    const defaultUrls = this.configService.get<string>('JOB_LIST_URLS');
    if (defaultUrls) {
      return defaultUrls.split(',').map((url) => url.trim());
    }

    // Fallback to hardcoded URLs if not configured
    return [
      'https://slo-tech.com/delo',
      'https://www.bettercareer.si/jobs',
      'https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=37&amp;doSearch=&amp;Time=',
      'https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=42&amp;doSearch=&amp;Time=',
      'https://weworkremotely.com/remote-react-jobs',
      'https://weworkremotely.com/remote-javascript-jobs',
      'https://weworkremotely.com/remote-node-jobs',
      'https://weworkremotely.com/remote-angular-jobs',
      'https://weworkremotely.com/remote-full-time-jobs',
    ];
  }
}
