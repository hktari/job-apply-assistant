import { Injectable, Logger } from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dtos/profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(): Promise<Profile> {
    const profile = await this.prisma.profile.findFirst();
    if (!profile) {
      return await this.createOrUpdateProfile({ data: {} });
    }
    return profile;
  }
  async createOrUpdateProfile(profileData: UpdateProfileDto): Promise<Profile> {
    const existingProfile = await this.prisma.profile.findFirst();

    if (existingProfile) {
      return this.prisma.profile.update({
        where: { id: existingProfile.id },
        data: { data: profileData.data },
      });
    }

    return this.prisma.profile.create({
      data: { data: profileData.data },
    });
  }
}
