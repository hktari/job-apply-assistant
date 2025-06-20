/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../services/application.service';
import { Application, JobStatus } from '@prisma/client';

describe('ApplicationController', () => {
  let controller: ApplicationController;
  let applicationService: ApplicationService;

  const mockApplication: Application = {
    id: 1,
    job_id: 1,
    status: JobStatus.APPLIED,
    resume_version: 'v1.0',
    cover_letter: 'Test cover letter',
    applied_at: new Date(),
    updated_at: new Date(),
  };

  const mockApplicationService = {
    create: jest.fn().mockResolvedValue(mockApplication),
    findAll: jest.fn().mockResolvedValue({
      data: [mockApplication],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    }),
    findOne: jest.fn().mockResolvedValue(mockApplication),
    update: jest.fn().mockResolvedValue(mockApplication),
    remove: jest.fn().mockResolvedValue(mockApplication),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        {
          provide: ApplicationService,
          useValue: mockApplicationService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
    applicationService = module.get<ApplicationService>(ApplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      job_id: 1,
      status: JobStatus.APPLIED,
      resume_version: 'v1.0',
      cover_letter: 'Test cover letter',
    };

    it('should create an application', async () => {
      const result = await controller.create(createDto);

      expect(applicationService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockApplication);
    });
  });

  describe('findAll', () => {
    it('should return paginated applications', async () => {
      const result = await controller.findAll(1, 10, 'applied_at', 'desc');

      expect(applicationService.findAll).toHaveBeenCalledWith(
        1,
        10,
        'applied_at',
        'desc',
      );
      expect(result).toEqual({
        data: [mockApplication],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should use default values when no parameters are provided', async () => {
      await controller.findAll();

      expect(applicationService.findAll).toHaveBeenCalledWith(
        1,
        10,
        'applied_at',
        'desc',
      );
    });
  });

  describe('findOne', () => {
    it('should return a single application', async () => {
      const result = await controller.findOne(1);

      expect(applicationService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockApplication);
    });
  });

  describe('update', () => {
    const updateDto = {
      status: JobStatus.REJECTED,
    };

    it('should update an application', async () => {
      const result = await controller.update(1, updateDto);

      expect(applicationService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(mockApplication);
    });
  });

  describe('remove', () => {
    it('should remove an application', async () => {
      const result = await controller.remove(1);

      expect(applicationService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockApplication);
    });
  });
});
