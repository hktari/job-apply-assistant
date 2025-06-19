import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dtos/profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(): Promise<string> {
    const profile = await this.prisma.profile.findFirst();
    if (!profile) {
      await this.createOrUpdateProfile({ data: {} });
      return '{}';
    }
    return profile.data as string;
  }

  async createOrUpdateProfile(profileData: UpdateProfileDto): Promise<Profile> {
    try {
      const result = await this.prisma.$transaction(
        async (tx): Promise<Profile> => {
          const existingProfile = await tx.profile.findFirst();

          if (existingProfile) {
            return tx.profile.update({
              where: { id: existingProfile.id },
              data: { data: profileData.data },
            });
          }

          return tx.profile.create({
            data: { data: profileData.data },
          });
        },
      );
      return result;
    } catch (error) {
      this.logger.error('Error updating profile:', error);
      throw new Error('Failed to create or update profile');
    }
  }
}
