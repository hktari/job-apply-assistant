import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Application, Job, JobStatus } from '@prisma/client';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let prismaService: PrismaService;
  let testJob: Job;

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
    await prismaService.application.deleteMany();
    await prismaService.job.deleteMany();

    // Create a test job to use in application tests
    testJob = await prismaService.job.create({
      data: {
        title: 'Test Software Engineer',
        company: 'Test Corp',
        description: 'Test job description',
        url: 'https://example.com/job/1',
        source: 'test',
        status: JobStatus.PENDING,
        is_relevant: true,
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an application', async () => {
      const createDto = {
        job_id: testJob.id,
        status: JobStatus.APPLIED,
        resume_version: 'v1.0',
        cover_letter: 'Test cover letter',
      };

      const application = await service.create(createDto);

      expect(application).toBeDefined();
      expect(application.job_id).toBe(testJob.id);
      expect(application.status).toBe(JobStatus.APPLIED);
      expect(application.resume_version).toBe('v1.0');
      expect(application.cover_letter).toBe('Test cover letter');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test applications
      await Promise.all([
        service.create({
          job_id: testJob.id,
          status: JobStatus.APPLIED,
          resume_version: 'v1.0',
        }),
        service.create({
          job_id: testJob.id,
          status: JobStatus.REJECTED,
          resume_version: 'v1.1',
        }),
      ]);
    });

    it('should return paginated applications', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should respect pagination parameters', async () => {
      const result = await service.findAll(1, 1);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('findOne', () => {
    let testApplication: Application;

    beforeEach(async () => {
      testApplication = await service.create({
        job_id: testJob.id,
        status: JobStatus.APPLIED,
        resume_version: 'v1.0',
      });
    });

    it('should return an application by id', async () => {
      const found = await service.findOne(testApplication.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(testApplication.id);
      expect(found.job).toBeDefined();
      expect(found.job.id).toBe(testJob.id);
    });
  });

  describe('update', () => {
    let testApplication: Application;

    beforeEach(async () => {
      testApplication = await service.create({
        job_id: testJob.id,
        status: JobStatus.APPLIED,
        resume_version: 'v1.0',
      });
    });

    it('should update an application', async () => {
      const updated = await service.update(testApplication.id, {
        status: JobStatus.REJECTED,
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(testApplication.id);
      expect(updated.status).toBe(JobStatus.REJECTED);
    });
  });

  describe('remove', () => {
    let testApplication: Application;

    beforeEach(async () => {
      testApplication = await service.create({
        job_id: testJob.id,
        status: JobStatus.APPLIED,
        resume_version: 'v1.0',
      });
    });

    it('should delete an application', async () => {
      await service.remove(testApplication.id);

      const found = await prismaService.application.findUnique({
        where: { id: testApplication.id },
      });
      expect(found).toBeNull();
    });
  });
});
