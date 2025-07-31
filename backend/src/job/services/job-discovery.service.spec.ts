import { Test, TestingModule } from '@nestjs/testing';
import { JobDiscoveryService } from './job-discovery.service';

describe('JobDiscoveryService', () => {
  let service: JobDiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobDiscoveryService],
    }).compile();

    service = module.get<JobDiscoveryService>(JobDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
