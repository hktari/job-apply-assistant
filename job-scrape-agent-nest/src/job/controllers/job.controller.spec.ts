/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { JobController } from './job.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus, Job } from '@prisma/client'; // Assuming Job type is also from @prisma/client

// Mock Job type for testing if not fully available or to simplify
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MockJob extends Job {
  // Add any specific fields if not covered by Prisma's Job
}

describe('JobController', () => {
  let controller: JobController;
  let prismaService: PrismaService;

  const mockJobs: MockJob[] = [
    {
      id: 1,
      title: 'Software Engineer',
      company: 'Tech Corp',
      url: 'http://example.com/job/1',
      description: 'Develop amazing software.',
      status: JobStatus.PENDING,
      is_relevant: true, // Assuming boolean is_relevant
      created_at: new Date(),
      updated_at: new Date(),
      source: 'TestSource',
      salary: null,
      job_type: null,
      posted_date: null,
      experience: null,
      region: null,
      notes: null,
      relevance_reasoning: null,
    },
    {
      id: 2,
      title: 'Product Manager',
      company: 'Innovate Ltd',
      url: 'http://example.com/job/2',
      description: 'Manage innovative products.',
      status: JobStatus.APPLIED,
      is_relevant: false,
      created_at: new Date(),
      updated_at: new Date(),
      source: 'TestSource',
      salary: null,
      job_type: null,
      posted_date: null,
      experience: null,
      region: null,
      notes: null,
      relevance_reasoning: null,
    },
    {
      id: 3,
      title: 'Data Analyst',
      company: 'Data Inc.',
      url: 'http://example.com/job/3',
      description: 'Analyze important data.',
      status: JobStatus.PENDING,
      is_relevant: true,
      created_at: new Date(),
      updated_at: new Date(),
      source: 'TestSource',
      salary: null,
      job_type: null,
      posted_date: null,
      experience: null,
      region: null,
      notes: null,
      relevance_reasoning: null,
    },
  ];

  const mockPrismaService = {
    job: {
      findMany: jest.fn().mockResolvedValue(mockJobs),
      count: jest.fn().mockResolvedValue(mockJobs.length),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<JobController>(JobController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of jobs with default pagination and no filters', async () => {
      const result = await controller.findAll(
        undefined,
        undefined,
        1,
        10,
        'created_at',
        'desc',
      );
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
      expect(prismaService.job.count).toHaveBeenCalledWith({ where: {} });
      expect(result.data).toEqual(mockJobs);
      expect(result.meta.total).toBe(mockJobs.length);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const status = JobStatus.PENDING;
      mockPrismaService.job.findMany.mockResolvedValueOnce(
        mockJobs.filter((job) => job.status === status),
      );
      mockPrismaService.job.count.mockResolvedValueOnce(
        mockJobs.filter((job) => job.status === status).length,
      );

      await controller.findAll(status, undefined, 1, 10, 'created_at', 'desc');
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: { status },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
      expect(prismaService.job.count).toHaveBeenCalledWith({
        where: { status },
      });
    });

    it('should filter by is_relevant', async () => {
      const is_relevant = true;
      mockPrismaService.job.findMany.mockResolvedValueOnce(
        mockJobs.filter((job) => job.is_relevant === is_relevant),
      );
      mockPrismaService.job.count.mockResolvedValueOnce(
        mockJobs.filter((job) => job.is_relevant === is_relevant).length,
      );

      await controller.findAll(
        undefined,
        is_relevant,
        1,
        10,
        'created_at',
        'desc',
      );
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: { is_relevant },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
      expect(prismaService.job.count).toHaveBeenCalledWith({
        where: { is_relevant },
      });
    });

    it('should filter by status and is_relevant', async () => {
      const status = JobStatus.PENDING;
      const is_relevant = true;
      mockPrismaService.job.findMany.mockResolvedValueOnce(
        mockJobs.filter(
          (job) => job.status === status && job.is_relevant === is_relevant,
        ),
      );
      mockPrismaService.job.count.mockResolvedValueOnce(
        mockJobs.filter(
          (job) => job.status === status && job.is_relevant === is_relevant,
        ).length,
      );

      await controller.findAll(
        status,
        is_relevant,
        1,
        10,
        'created_at',
        'desc',
      );
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: { status, is_relevant },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
      });
      expect(prismaService.job.count).toHaveBeenCalledWith({
        where: { status, is_relevant },
      });
    });

    it('should handle custom pagination', async () => {
      const page = 2;
      const limit = 5;
      await controller.findAll(
        undefined,
        undefined,
        page,
        limit,
        'created_at',
        'desc',
      );
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: {},
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      });
    });

    it('should handle custom sorting', async () => {
      const sortBy = 'title';
      const sortOrder = 'asc';
      await controller.findAll(undefined, undefined, 1, 10, sortBy, sortOrder);
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { [sortBy]: sortOrder },
      });
    });
  });
});
