import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException } from '@nestjs/common';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ProfileService;

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
      controllers: [ProfileController],
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

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return profile data when profile exists', async () => {
      jest
        .spyOn(service, 'getProfile')
        .mockResolvedValue(JSON.stringify(mockProfileData.data));
      const result = await controller.getProfile();
      expect(result).toEqual(JSON.stringify(mockProfileData.data));
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      jest
        .spyOn(service, 'getProfile')
        .mockRejectedValue(new HttpException('Profile not found', 404));
      await expect(controller.getProfile()).rejects.toThrow(HttpException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = {
        id: 1,
        ...mockProfileData,
        created_at: new Date(),
        updated_at: new Date(),
      };
      jest
        .spyOn(service, 'createOrUpdateProfile')
        .mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockProfileData);
      expect(result).toEqual(updatedProfile);
    });

    it('should handle update errors', async () => {
      jest
        .spyOn(service, 'createOrUpdateProfile')
        .mockRejectedValue(new Error('Update failed'));
      await expect(controller.updateProfile(mockProfileData)).rejects.toThrow();
    });
  });
});
