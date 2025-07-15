import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dtos/profile.dto';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  const testProfileData = {
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
      providers: [ProfileService, PrismaService],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clean up the database before each test
    await prismaService.profile.deleteMany();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return profile data when profile exists', async () => {
      // Create a test profile
      const createdProfile = await prismaService.profile.create({
        data: {
          data: testProfileData.data,
        },
      });

      const result = await service.getProfile();
      expect(result.data).toMatchObject(
        createdProfile.data as Record<string, any>,
      );
    });

    it('should create and return empty profile when none exists', async () => {
      const result = await service.getProfile();
      expect(result.data).toMatchObject({});

      // Verify a new profile was created
      const profile = await prismaService.profile.findFirst();
      expect(profile).toBeDefined();
      expect(profile?.data).toMatchObject({});
    });
  });

  describe('createOrUpdateProfile', () => {
    it('should update existing profile', async () => {
      // Create initial profile
      const initialProfile = await prismaService.profile.create({
        data: { data: {} },
      });

      // Update the profile
      const result = await service.createOrUpdateProfile(testProfileData);

      // Verify the update
      expect(result.id).toBe(initialProfile.id);
      expect(result.data).toMatchObject(testProfileData.data);

      // Verify in database
      const updatedProfile = await prismaService.profile.findFirst();
      expect(updatedProfile?.id).toBe(initialProfile.id);
      expect(updatedProfile?.data).toMatchObject(testProfileData.data);
    });

    it('should create new profile when none exists', async () => {
      const result = await service.createOrUpdateProfile(testProfileData);

      // Verify the creation
      expect(result.data).toMatchObject(testProfileData.data);

      // Verify in database
      const profile = await prismaService.profile.findFirst();
      expect(profile?.id).toBe(result.id);
      expect(profile?.data).toMatchObject(testProfileData.data);
    });
  });
});
