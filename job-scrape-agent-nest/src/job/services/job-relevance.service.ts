import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

@Injectable()
export class JobRelevanceService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeRelevance(jobDescription: string): Promise<{ isRelevant: boolean; reasoning: string }> {
    // Implementation will be added later
    // This is a placeholder that returns a mock response
    return {
      isRelevant: true,
      reasoning: 'Placeholder response'
    };
  }
}
