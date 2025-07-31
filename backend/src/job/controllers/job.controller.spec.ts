/* eslint-disable @typescript-eslint/unbound-method */

import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JobController } from './job.controller';
import { JobHuntingService } from '../services/job-hunting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus, Job } from '@prisma/client';
import { CreateManualJobDto } from '../dto/create-manual-job.dto'; // Assuming Job type is also from @prisma/client
import { Queue } from 'bullmq';

// Mock Job type for testing if not fully available or to simplify
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MockJob extends Job {
  // Add any specific fields if not covered by Prisma's Job
}

describe('JobController', () => {
  let controller: JobController;
  let prismaService: PrismaService;
  let mockQueue: { add: jest.Mock };

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
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJobHuntingQueue = {
    add: jest.fn().mockResolvedValue({ id: 'bull-job-id-1' }),
  };

  const mockJobHuntingService = {
    createManualJob: jest.fn().mockResolvedValue(mockJobs[0]),
  };

  const mockBullQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('job-hunting'),
          useValue: mockJobHuntingQueue,
        },
        {
          provide: JobHuntingService,
          useValue: mockJobHuntingService,
        },
      ],
    }).compile();

    controller = module.get<JobController>(JobController);
    prismaService = module.get<PrismaService>(PrismaService);
    mockQueue = module.get(getQueueToken('job-hunting'));
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

  describe('triggerJobDiscovery', () => {
    it('should add a job to the job-hunting queue', async () => {
      const result = await controller.triggerJobDiscovery();

      expect(mockQueue.add).toHaveBeenCalledWith('discover-jobs', {});
      expect(result).toEqual({ jobId: 'bull-job-id-1', status: 'queued' });
    });
  });

  describe('findOne', () => {
    it('should return a single job by id', async () => {
      const jobId = '1';
      const expectedJob = mockJobs[0];
      mockPrismaService.job.findUnique.mockResolvedValue(expectedJob);

      const result = await controller.findOne(jobId);

      expect(prismaService.job.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(expectedJob);
    });
  });

  describe('updateJob', () => {
    const mockUpdatedJob: MockJob = {
      ...mockJobs[0],
      title: 'Updated Software Engineer',
      company: 'Updated Tech Corp',
      status: JobStatus.APPROVED,
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.job.update.mockResolvedValue(mockUpdatedJob);
    });

    it('should update a job with basic fields', async () => {
      const jobId = '1';
      const updateData = {
        title: 'Updated Software Engineer',
        company: 'Updated Tech Corp',
        status: JobStatus.APPROVED,
      };

      const result = await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateData,
          updated_at: expect.any(Date),
        },
      });
      expect(result).toEqual(mockUpdatedJob);
    });

    it('should update a job with all fields', async () => {
      const jobId = '1';
      const updateData = {
        title: 'Senior Full Stack Developer',
        company: 'Amazing Tech Inc',
        description: 'Build amazing applications',
        url: 'https://example.com/updated-job',
        status: JobStatus.APPLIED,
        is_relevant: true,
        relevance_reasoning: 'Perfect match for skills',
        region: 'San Francisco, CA',
        job_type: 'Full-time',
        experience: '5+ years',
        salary: '$120,000 - $150,000',
        notes: 'Very interested in this position',
        source: 'LinkedIn',
      };

      await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateData,
          updated_at: expect.any(Date),
        },
      });
    });

    it('should handle posted_date conversion from string to Date', async () => {
      const jobId = '1';
      const updateData = {
        title: 'Updated Job',
        posted_date: '2025-07-14',
      };

      await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          title: 'Updated Job',
          posted_date: new Date('2025-07-14'),
          updated_at: expect.any(Date),
        },
      });
    });

    it('should update only provided fields (partial update)', async () => {
      const jobId = '1';
      const updateData = {
        status: JobStatus.INTERVIEW,
        notes: 'Interview scheduled for next week',
      };

      await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: JobStatus.INTERVIEW,
          notes: 'Interview scheduled for next week',
          updated_at: expect.any(Date),
        },
      });
    });

    it('should handle empty update data', async () => {
      const jobId = '1';
      const updateData = {};

      await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          updated_at: expect.any(Date),
        },
      });
    });

    it('should parse jobId correctly', async () => {
      const jobId = '123';
      const updateData = { title: 'Test Job' };

      await controller.updateJob(jobId, updateData);

      expect(prismaService.job.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: {
          title: 'Test Job',
          updated_at: expect.any(Date),
        },
      });
    });
  });

  describe('createManualJob', () => {
    it('should call jobHuntingService.createManualJob with the correct data', async () => {
      const createDto: CreateManualJobDto = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        url: 'http://example.com/job/1',
      };
      const result = await controller.createManualJob(createDto);
      expect(mockJobHuntingService.createManualJob).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual(mockJobs[0]);
    });
  });
});
