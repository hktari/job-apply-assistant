import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JobHuntingService } from './job-hunting.service';

@Injectable()
export class FieldPopulationCronService {
  private readonly logger = new Logger(FieldPopulationCronService.name);
  private readonly cronInterval: string;

  constructor(
    private readonly jobHuntingService: JobHuntingService,
    private readonly configService: ConfigService,
  ) {
    // Get cron interval from environment variable, default to every 10 minutes
    const intervalMinutes = this.configService.get<number>(
      'FIELD_POPULATION_INTERVAL_MINUTES',
      10,
    );

    // Convert minutes to cron expression (every X minutes)
    this.cronInterval = `0 */${intervalMinutes} * * * *`;

    this.logger.log(
      `Field population cron job configured to run every ${intervalMinutes} minutes`,
    );
  }

  @Cron('0 */10 * * * *') // Default fallback: every 10 minutes
  async handleCron() {
    // Use dynamic cron interval if different from default
    const intervalMinutes = this.configService.get<number>(
      'FIELD_POPULATION_INTERVAL_MINUTES',
      10,
    );

    // Only run if it's time based on the configured interval
    const now = new Date();
    const minutes = now.getMinutes();

    if (minutes % intervalMinutes !== 0) {
      return; // Skip this execution
    }

    this.logger.log('Running periodic field population for manual jobs');

    try {
      await this.jobHuntingService.queuePendingManualJobs();
      this.logger.log('Completed periodic field population check');
    } catch (error: any) {
      this.logger.error(`Error in periodic field population: ${error.message}`);
    }
  }

  /**
   * Manually trigger field population for pending jobs
   */
  async triggerManualFieldPopulation(): Promise<void> {
    this.logger.log('Manually triggering field population for pending jobs');
    await this.jobHuntingService.queuePendingManualJobs();
  }
}
