import { Test, TestingModule } from '@nestjs/testing';
import { JobHuntingService } from './job-hunting.service';
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

  describe('job mapping and saving', () => {
    it('should correctly map and save a job posting', async () => {
      const jobData = {
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
      };

      await service.saveJob(jobData);

      expect(prismaService.job.create).toHaveBeenCalledWith({
        data: jobData
      });
    });

    it('should analyze job relevance', async () => {
      const jobDescription = 'Senior TypeScript Developer position';
      
      const result = await service.analyzeJobRelevance(jobDescription);

      expect(jobRelevanceService.analyzeRelevance).toHaveBeenCalledWith(jobDescription);
      expect(result).toEqual({
        isRelevant: true,
        reasoning: 'Matches skills'
      });
    });
  });
});
