import { IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsObject()
  data: ProfileData;
}

export type ProfileData = Record<string, any>;
