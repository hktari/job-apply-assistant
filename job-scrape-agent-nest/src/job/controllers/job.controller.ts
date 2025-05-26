import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Controller('api/jobs')
export class JobController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async findAll(
    @Query('status') status: JobStatus = JobStatus.PENDING,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      this.prismaService.job.findMany({
        where: { status },
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prismaService.job.count({ where: { status } }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
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
}
