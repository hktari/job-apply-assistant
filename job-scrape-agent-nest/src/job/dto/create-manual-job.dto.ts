import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsDateString,
} from 'class-validator';

export class CreateManualJobDto {
  @ApiProperty({
    description: 'The title of the job',
    example: 'Software Engineer',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The name of the company',
    example: 'Tech Solutions Inc.',
  })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'The location of the job',
    example: 'Remote',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({
    description: 'The description of the job',
    example: 'Develop and maintain web applications...',
  })
  @IsNotEmpty()
  @IsString()
  jobDescription: string;

  @ApiProperty({
    description: 'The URL of the job posting',
    example: 'https://example.com/job/123',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'The date the job was posted',
    example: '2024-05-26T10:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  postedDate?: string;

  @ApiProperty({
    description: 'Salary information for the job',
    example: '$100,000 - $120,000 per year',
    required: false,
  })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiProperty({
    description: 'Any additional notes about the job',
    example: 'Contact John Doe for more info.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
