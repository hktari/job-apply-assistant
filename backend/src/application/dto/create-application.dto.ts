import { ApiProperty } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty()
  @IsInt()
  job_id: number;

  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cover_letter?: string;

  @ApiProperty()
  @IsString()
  resume_version: string;
}
