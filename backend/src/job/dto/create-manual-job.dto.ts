import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

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
  company: string;

  @ApiProperty({
    description: 'The URL of the job posting',
    example: 'https://example.com/job/123',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Any additional notes about the job',
    example: 'Contact John Doe for more info.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
