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
  ParseBoolPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus } from '@prisma/client';
import { JobHuntingService } from '../services/job-hunting.service';
import { JobRelevanceService } from '../services/job-relevance.service';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue('job-hunting') private readonly jobHuntingQueue: Queue,
    private readonly jobHuntingService: JobHuntingService,
    private readonly jobRelevanceService: JobRelevanceService,
  ) {}

  @Post('discover')
  async triggerJobDiscovery() {
    const job = await this.jobHuntingQueue.add('discover-jobs', {});
    return { jobId: job.id, status: 'queued' };
  }
  @Get()
  @ApiOperation({ summary: 'Get all jobs with pagination and filtering' })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiQuery({ name: 'isRelevant', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'A list of jobs.' })
  async findAll(
    @Query('status') status?: JobStatus,
    @Query(
      'isRelevant',
      new DefaultValuePipe(undefined),
      new ParseBoolPipe({ optional: true }),
    )
    isRelevant?: boolean,
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job entry' })
  @ApiResponse({
    status: 200,
    description: 'The job has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async updateJob(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    const jobId = parseInt(id, 10);

    // Convert posted_date string to Date if provided and valid
    const updateData: any = { ...updateJobDto };
    if (updateJobDto.posted_date && updateJobDto.posted_date.trim() !== '') {
      updateData.posted_date = new Date(updateJobDto.posted_date);
    } else if (updateJobDto.posted_date === '') {
      // Set empty string to null for Prisma
      updateData.posted_date = null;
    }

    return this.prismaService.job.update({
      where: { id: jobId },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    });
  }

  @Post(':id/rerun-analysis')
  @ApiOperation({ summary: 'Rerun relevance analysis for a job' })
  @ApiResponse({
    status: 200,
    description: 'The relevance analysis has been successfully rerun.',
  })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  async rerunAnalysis(@Param('id') id: string) {
    const jobId = parseInt(id, 10);

    // Get the existing job
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Job not found',
          error: 'Not Found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Run the relevance analysis
    const analysisResult = await this.jobRelevanceService.rerunAnalysis(job);

    // Update the job with new analysis results
    const updatedJob = await this.prismaService.job.update({
      where: { id: jobId },
      data: {
        is_relevant: analysisResult.isRelevant,
        relevance_reasoning: analysisResult.reasoning,
        updated_at: new Date(),
      },
    });

    return updatedJob;
  }

  @Post('manual')
  @ApiOperation({ summary: 'Add a job manually' })
  @ApiResponse({
    status: 201,
    description: 'The job has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'Job with this URL already exists.',
  })
  async createManualJob(@Body() createManualJobDto: CreateManualJobDto) {
    const existingJob = await this.prismaService.job.findUnique({
      where: { url: createManualJobDto.url },
    });
    if (existingJob) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Job with this URL already exists',
          error: 'Conflict',
        },
        HttpStatus.CONFLICT,
      );
    }
    return await this.jobHuntingService.createManualJob(createManualJobDto);
  }

  @Post('populate-missing-fields')
  @ApiOperation({
    summary: 'Manually trigger field population for pending manual jobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Field population has been queued for pending manual jobs.',
  })
  async triggerFieldPopulation() {
    await this.jobHuntingService.queuePendingManualJobs();
    return { message: 'Field population queued for pending manual jobs' };
  }
}
