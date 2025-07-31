import {
  Controller,
  Get,
  Put,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dtos/profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile() {
    const profile = await this.profileService.getProfile();
    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }
    return profile;
  }

  @Put()
  async updateProfile(@Body() profileData: UpdateProfileDto) {
    return this.profileService.createOrUpdateProfile(profileData);
  }
}
