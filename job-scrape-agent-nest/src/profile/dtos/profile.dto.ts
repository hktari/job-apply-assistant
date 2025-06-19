import { IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsObject()
  data: Record<string, any>;
}

export interface ProfileData {
  
}
