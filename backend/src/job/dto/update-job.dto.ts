import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { JobStatus } from '@prisma/client';

export class UpdateJobDto {
  @ApiProperty({
    description: 'The title of the job',
    example: 'Senior Software Engineer',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'The name of the company',
    example: 'Tech Solutions Inc.',
    required: false,
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({
    description: 'The job description',
    example: 'We are looking for a skilled developer...',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The URL of the job posting',
    example: 'https://example.com/job/123',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({
    description: 'The job status',
    enum: JobStatus,
    example: JobStatus.APPROVED,
    required: false,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiProperty({
    description: 'Whether the job is relevant',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_relevant?: boolean;

  @ApiProperty({
    description: 'Reasoning for relevance assessment',
    example: 'Matches required skills and experience level',
    required: false,
  })
  @IsOptional()
  @IsString()
  relevance_reasoning?: string;

  @ApiProperty({
    description: 'The region/location of the job',
    example: 'San Francisco, CA',
    required: false,
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({
    description: 'The type of job (full-time, part-time, contract, etc.)',
    example: 'Full-time',
    required: false,
  })
  @IsOptional()
  @IsString()
  job_type?: string;

  @ApiProperty({
    description: 'Required experience level',
    example: '3-5 years',
    required: false,
  })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({
    description: 'Salary information',
    example: '$80,000 - $120,000',
    required: false,
  })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiProperty({
    description: 'The date the job was posted (YYYY-MM-DD)',
    example: '2025-07-14',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  posted_date?: string;

  @ApiProperty({
    description: 'Additional notes about the job',
    example: 'Contact John Doe for more info.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'The source of the job posting',
    example: 'LinkedIn',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;
}
