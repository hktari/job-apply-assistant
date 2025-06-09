import { Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('jobs')
export class JobController {
  constructor(
    @InjectQueue('job-hunting') private readonly jobHuntingQueue: Queue,
  ) {}

  @Post('discover')
  async triggerJobDiscovery() {
    const job = await this.jobHuntingQueue.add('discover-jobs', {});
    return { jobId: job.id, status: 'queued' };
  }
}
