import { Test, TestingModule } from '@nestjs/testing';
import {
  AnalyzedJobListPageItem,
  AnalyzedJobPosting,
  JobHuntingService,
} from './job-hunting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobRelevanceService } from './job-relevance.service';
import { ConfigService } from '@nestjs/config';
import { Job, JobStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('JobHuntingService', () => {
  let service: JobHuntingService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let jobRelevanceService: JobRelevanceService;

  beforeAll(async () => {
    // Connect to test database
    prismaService = new PrismaService();
    await prismaService.$connect();
  });

  afterAll(async () => {
    // Cleanup and disconnect
    await prismaService.$disconnect();
  });

  beforeEach(async () => {
    // Clean the database before each test
    await prismaService.job.deleteMany();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FIRECRAWL_API_KEY') return 'dummy-api-key';
        if (key === 'OPENAI_API_KEY') return 'dummy-openai-key';
        return null;
      }),
    };

    const mockJobRelevanceService = {
      analyzeRelevance: jest.fn().mockResolvedValue({
        isRelevant: true,
        reasoning: 'Matches skills',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobHuntingService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JobRelevanceService,
          useValue: mockJobRelevanceService,
        },
      ],
    }).compile();

    service = module.get<JobHuntingService>(JobHuntingService);
    configService = module.get<ConfigService>(ConfigService);
    jobRelevanceService = module.get<JobRelevanceService>(JobRelevanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapping logic', () => {
    it('should correctly map AnalyzedJobPosting', () => {
      const jobPosting: AnalyzedJobPosting = {
        job_title: 'Software Engineer',
        job_link: 'https://example.com/job/123',
        posted_date_iso: '2025-05-19',
        isRelevant: true,
        reasoning: 'Matches skills',
      };

      const mappedJob = (service as any).mapJobPosting(jobPosting);

      expect(mappedJob).toEqual({
        title: 'Software Engineer',
        company: '',
        description: '',
        url: 'https://example.com/job/123',
        source: 'example.com',
        status: JobStatus.PENDING,
        is_relevant: true,
        relevance_reasoning: 'Matches skills',
        posted_date: new Date('2025-05-19'),
        notes: null,
      });
    });

    it('should correctly map AnalyzedJobListPageItem', () => {
      const jobListItem: AnalyzedJobListPageItem = {
        job_title: 'Frontend Developer',
        job_link: 'https://example.com/job/456',
        isRelevant: false,
        reasoning: 'Different tech stack',
        posted_date_iso: '2025-05-19',
      };

      const mappedJob = (service as any).mapJobListPageItem(jobListItem);

      expect(mappedJob).toEqual({
        title: 'Frontend Developer',
        company: '',
        description: '',
        url: 'https://example.com/job/456',
        source: 'example.com',
        status: JobStatus.PENDING,
        is_relevant: false,
        relevance_reasoning: 'Different tech stack',
        region: null,
        job_type: null,
        experience: null,
        salary: null,
        posted_date: new Date('2025-05-19'),
        notes: null,
      });
    });
  });

  describe('storeJob', () => {
    const testJobPosting: AnalyzedJobPosting = {
      job_title: 'Test Software Engineer',
      job_link: 'https://example.com/test/job/posting/123',
      posted_date_iso: '2025-01-15',
      isRelevant: true,
      reasoning: 'Test relevant skills',
    };

    const testJobListPageItem: AnalyzedJobListPageItem = {
      job_title: 'Test Frontend Developer List',
      job_link: 'https://example.com/test/job/list/456',
      isRelevant: false,
      reasoning: 'Test different tech stack from list',
      posted_date_iso: '2025-02-20',
    };

    afterEach(async () => {
      try {
        await prismaService.job.deleteMany({
          where: {
            OR: [
              { url: testJobPosting.job_link },
              { url: testJobListPageItem.job_link },
            ],
          },
        });
      } catch (error) {
        // console.error('Error cleaning up test data:', error);
      }
    });

    it('should store an AnalyzedJobPosting correctly', async () => {
      await service['storeJob'](testJobPosting);
      const storedJob = await prismaService.job.findUnique({
        where: { url: testJobPosting.job_link },
      });

      expect(storedJob).not.toBeNull();
      expect(storedJob?.title).toBe(testJobPosting.job_title);
      expect(storedJob?.company).toBe('');
      expect(storedJob?.url).toBe(testJobPosting.job_link);
      expect(storedJob?.is_relevant).toBe(testJobPosting.isRelevant);
      expect(storedJob?.relevance_reasoning).toBe(testJobPosting.reasoning);
      expect(storedJob?.posted_date).toEqual(
        new Date(testJobPosting.posted_date_iso),
      );
      expect(storedJob?.status).toBe(JobStatus.PENDING);
    });

    it('should store an AnalyzedJobListPageItem correctly', async () => {
      await service['storeJob'](testJobListPageItem);
      const storedJob = await prismaService.job.findUnique({
        where: { url: testJobListPageItem.job_link },
      });

      expect(storedJob).not.toBeNull();
      expect(storedJob?.title).toBe(testJobListPageItem.job_title);
      expect(storedJob?.url).toBe(testJobListPageItem.job_link);
      expect(storedJob?.is_relevant).toBe(testJobListPageItem.isRelevant);
      expect(storedJob?.relevance_reasoning).toBe(
        testJobListPageItem.reasoning,
      );
      expect(storedJob?.posted_date).toEqual(
        new Date(testJobListPageItem.posted_date_iso),
      );
      expect(storedJob?.status).toBe(JobStatus.PENDING);
      expect(storedJob?.company).toBe('');
      expect(storedJob?.description).toBe('');
    });

    it('should throw PrismaClientKnownRequestError (P2002) when storing a duplicate job', async () => {
      await service['storeJob'](testJobPosting);

      try {
        await service['storeJob'](testJobPosting);
        fail(
          'Should have thrown PrismaClientKnownRequestError for duplicate entry',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(PrismaClientKnownRequestError);
        expect((error as PrismaClientKnownRequestError).code).toBe('P2002');
      }
    });
  });

  describe('createManualJob', () => {
    const testManualJob = {
      title: 'Test Manual Job',
      company: 'Manual Test Corp',
      url: 'https://example.com/manual-job',
      notes: 'Test notes',
    };

    beforeEach(async () => {
      await prismaService.job.deleteMany({
        where: { url: testManualJob.url },
      });
    });

    it('should create a manual job successfully', async () => {
      const createdJob = await service.createManualJob(testManualJob);

      expect(createdJob).toBeDefined();
      expect(createdJob.title).toBe(testManualJob.title);
      expect(createdJob.company).toBe(testManualJob.company);
      expect(createdJob.url).toBe(testManualJob.url);
      expect(createdJob.notes).toBe(testManualJob.notes);
      expect(createdJob.status).toBe(JobStatus.APPROVED);
      expect(createdJob.is_relevant).toBe(true);
      expect(createdJob.source).toBe('manual');
    });

    it('should throw error when creating duplicate job', async () => {
      // First create the job
      await service.createManualJob(testManualJob);

      // Try to create the same job again
      await expect(service.createManualJob(testManualJob)).rejects.toThrow(
        'Job with URL https://example.com/manual-job already exists',
      );
    });
  });
});
