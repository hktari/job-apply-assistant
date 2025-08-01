import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { ProfileService } from '../../profile/services/profile.service';
import { ProfileData } from 'src/profile/dtos/profile.dto';
import { LLMObservabilityService } from './llm/llm-observability.service';

export type JobPreferences = Record<string, any>;

// Define an interface for the expected AI response
export interface AIRelevanceResponse {
  isRelevant: boolean;
  reasoning: string;
}

@Injectable()
export class JobRelevanceService {
  private openai: OpenAI;
  private readonly logger = new Logger(JobRelevanceService.name);
  private readonly llmObservabilityService: LLMObservabilityService;

  constructor(
    private configService: ConfigService,
    private profileService: ProfileService,
    llmObservabilityService: LLMObservabilityService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.llmObservabilityService = llmObservabilityService;
  }

  private async getJobPreferences(): Promise<JobPreferences> {
    try {
      const profile = await this.profileService.getProfile();
      const data = profile.data as ProfileData;
      if (data && data.jobPreferences) {
        return data.jobPreferences as JobPreferences;
      } else {
        throw new Error('Job preferences not found in profile');
      }
    } catch (error) {
      this.logger.error('Error getting job preferences:', error);
      throw error;
    }
  }

  /**
   * Analyzes whether a job title is relevant based on the user's job preferences
   * stored in profile.json using OpenAI.
   * @param jobTitle The job title to analyze.
   * @returns A promise that resolves to an AIRelevanceResponse object.
   */
  async analyzeRelevance(jobTitle: string): Promise<AIRelevanceResponse> {
    try {
      const jobPreferences = await this.getJobPreferences();

      const systemPrompt = `You are an expert career advisor. Your task is to determine if a given job title is relevant to the user's job preferences.
Respond with a JSON object containing a boolean field 'isRelevant' and a string field 'reasoning'. For example: {"isRelevant": true, "reasoning": "The job title aligns with preferred roles."}`;

      const userPrompt = `
Job Title: "${jobTitle}"

User's Job Preferences:
${JSON.stringify(jobPreferences, null, 2)}

Is this job title relevant based on these preferences? Provide your answer in the specified JSON format.
`;

      const { result: completion, metrics } =
        await this.llmObservabilityService.trackOpenAICall(
          () =>
            this.openai.chat.completions.create({
              model:
                this.configService.get<string>('ANALYSIS_MODEL_ID') ||
                'gpt-4.1',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              response_format: { type: 'json_object' },
            }),
          {
            name: 'job_relevance_analysis',
            tags: ['job-analysis', 'relevance'],
            metadata: {
              jobTitle,
              hasPreferences: !!jobPreferences,
            },
          },
          {
            model:
              this.configService.get<string>('ANALYSIS_MODEL_ID') || 'gpt-4.1',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          },
        );

      this.logger.log(`Job relevance analysis completed for "${jobTitle}"`, {
        tokens: metrics.totalTokens,
        cost: metrics.cost,
        latency: `${metrics.latency}ms`,
      });

      const aiResponseContent = completion.choices[0]?.message?.content;

      if (!aiResponseContent) {
        throw new Error('OpenAI response content is null or undefined.');
      }

      try {
        const parsedResponse: AIRelevanceResponse =
          JSON.parse(aiResponseContent);
        return parsedResponse;
      } catch (parseError) {
        this.logger.error('Error parsing AI response:', parseError);
        this.logger.error('Raw AI response:', aiResponseContent);
        // Fallback or attempt to infer relevance if parsing fails
        return {
          isRelevant: false,
          reasoning: 'Failed to parse AI response. Raw: ' + aiResponseContent,
        };
      }
    } catch (error) {
      this.logger.error('Error in analyzeJobTitleRelevance:', error);
      throw error;
    }
  }
}
