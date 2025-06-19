import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  const mockProfileData = {
    data: {
      jobPreferences: {
        roles: ['Software Engineer'],
        experience: '5+ years',
        level: 'Senior',
        locations: ['Remote', 'Europe'],
        salary: '80000-120000',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: {
            profile: {
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) =>
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              callback({
                profile: {
                  findFirst: jest.fn(),
                  update: jest.fn(),
                  create: jest.fn(),
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return profile data when profile exists', async () => {
      const mockProfile = {
        id: 1,
        data: JSON.stringify(mockProfileData.data),
        created_at: new Date(),
        updated_at: new Date(),
      };
      jest
        .spyOn(prismaService.profile, 'findFirst')
        .mockResolvedValue(mockProfile);

      const result = await service.getProfile();
      expect(result).toBe(mockProfile.data);
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      jest.spyOn(prismaService.profile, 'findFirst').mockResolvedValue(null);
      await expect(service.getProfile()).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrUpdateProfile', () => {
    it('should update existing profile', async () => {
      const existingProfile = {
        id: 1,
        data: '{}',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updatedProfile = {
        ...existingProfile,
        data: JSON.stringify(mockProfileData.data),
      };

      const transactionMock = jest.spyOn(prismaService, '$transaction');
      transactionMock.mockImplementation(async (callback) => {
        const tx = {
          profile: {
            findFirst: jest.fn().mockResolvedValue(existingProfile),
            update: jest.fn().mockResolvedValue(updatedProfile),
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.createOrUpdateProfile(mockProfileData);
      expect(result).toEqual(updatedProfile);
    });

    it('should create new profile if none exists', async () => {
      const newProfile = {
        id: 1,
        data: JSON.stringify(mockProfileData.data),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const transactionMock = jest.spyOn(prismaService, '$transaction');
      transactionMock.mockImplementation(async (callback) => {
        const tx = {
          profile: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
            create: jest.fn().mockResolvedValue(newProfile),
          },
        };
        return callback(tx);
      });

      const result = await service.createOrUpdateProfile(mockProfileData);
      expect(result).toEqual(newProfile);
    });

    it('should handle database errors', async () => {
      const transactionMock = jest.spyOn(prismaService, '$transaction');
      transactionMock.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createOrUpdateProfile(mockProfileData),
      ).rejects.toThrow('Failed to create or update profile');
    });
  });
});
