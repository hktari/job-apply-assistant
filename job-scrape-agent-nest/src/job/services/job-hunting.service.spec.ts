import { Test, TestingModule } from '@nestjs/testing';
import { AnalyzedJobListPageItem, AnalyzedJobPosting, JobHuntingService } from './job-hunting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JobRelevanceService } from './job-relevance.service';
import { ConfigService } from '@nestjs/config';
import { Job, JobStatus } from '@prisma/client';

describe('JobHuntingService', () => {
  let service: JobHuntingService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let jobRelevanceService: JobRelevanceService;

  beforeEach(async () => {
    const mockPrismaService = {
      job: {
        create: jest.fn().mockResolvedValue({})
      }
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('dummy-api-key')
    };

    const mockJobRelevanceService = {
      analyzeRelevance: jest.fn().mockResolvedValue({
        isRelevant: true,
        reasoning: 'Matches skills'
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobHuntingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: JobRelevanceService,
          useValue: mockJobRelevanceService
        }
      ],
    }).compile();

    service = module.get<JobHuntingService>(JobHuntingService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jobRelevanceService = module.get<JobRelevanceService>(JobRelevanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapping logic', () => {
    it('should correctly map AnalyzedJobPosting', async () => {
      const jobPosting: AnalyzedJobPosting = {
        job_title: 'Software Engineer',
        job_link: 'https://example.com/job/123',
        job_posting_id: 'https://example.com/job/123',
        isRelevant: true,
        reasoning: 'Matches skills',
        company: 'Tech Corp',
        role: 'Senior developer position',
        region: 'Remote',
        job_type: 'Full-time',
        experience: '5+ years',
        salary: '100k-120k',
        posted_date: '2025-05-19'
      };

      const mappedJob = (service as any).mapJobPosting(jobPosting);

      expect(mappedJob).toEqual({
        title: 'Software Engineer',
        company: 'Tech Corp',
        description: 'Senior developer position',
        url: 'https://example.com/job/123',
        source: 'example.com',
        status: JobStatus.PENDING,
        is_relevant: true,
        relevance_reasoning: 'Matches skills',
        region: 'Remote',
        job_type: 'Full-time',
        experience: '5+ years',
        salary: '100k-120k',
        posted_date: new Date('2025-05-19'),
        notes: null
      });
    });

    it('should correctly map AnalyzedJobListPageItem', async () => {
      const jobListItem: AnalyzedJobListPageItem = {
        job_title: 'Frontend Developer',
        job_link: 'https://example.com/job/456',
        isRelevant: false,
        reasoning: 'Different tech stack',
        posted_date_iso: '2025-05-19'
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
        notes: null
      });
    });
  });
});
