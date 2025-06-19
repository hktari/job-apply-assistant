import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus } from '@prisma/client';
import { JobHuntingService } from '../services/job-hunting.service';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('jobs')
@Controller('api/jobs')
export class JobController {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue('job-hunting') private readonly jobHuntingQueue: Queue,
    private readonly jobHuntingService: JobHuntingService,
  ) {}

  @Post('discover')
  async triggerJobDiscovery() {
    const job = await this.jobHuntingQueue.add('discover-jobs', {});
    return { jobId: job.id, status: 'queued' };
  }
  @Get()
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('isRelevant') isRelevant?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('sortBy', new DefaultValuePipe('created_at')) sortBy?: string,
    @Query('sortOrder', new DefaultValuePipe('desc'))
    sortOrder?: 'asc' | 'desc',
  ) {
    const skip = (page! - 1) * limit!;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (isRelevant !== undefined) {
      whereClause.is_relevant = isRelevant;
    }

    const [jobs, total] = await Promise.all([
      this.prismaService.job.findMany({
        where: whereClause,
        skip,
        take: limit!,
        orderBy: { [sortBy!]: sortOrder },
      }),
      this.prismaService.job.count({ where: whereClause }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page: page!,
        limit: limit!,
        totalPages: Math.ceil(total / limit!),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const jobId = parseInt(id, 10);
    return this.prismaService.job.findUnique({
      where: { id: jobId },
    });
  }

  @Patch(':id/verify')
  async verifyJob(
    @Param('id') id: string,
    @Body() data: { status: JobStatus; notes?: string },
  ) {
    const jobId = parseInt(id, 10);
    return this.prismaService.job.update({
      where: { id: jobId },
      data: {
        status: data.status,
        notes: data.notes,
        updated_at: new Date(),
      },
    });
  }

  @Post('manual')
  @ApiOperation({ summary: 'Add a job manually' })
  @ApiResponse({
    status: 201,
    description: 'The job has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async createManualJob(@Body() createManualJobDto: CreateManualJobDto) {
    return this.jobHuntingService.createManualJob(createManualJobDto);
  }
}
