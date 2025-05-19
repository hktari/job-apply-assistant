import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define an interface for the structure of jobPreferences in profile.json
interface JobPreferences {
    roles: string[];
    experience: string;
    level: string;
    locations: string[];
    salary: string;
}

// Define an interface for the expected AI response
export interface AIRelevanceResponse {
    isRelevant: boolean;
    reasoning: string;
}

@Injectable()
export class JobRelevanceService {
  private openai: OpenAI;
  private profilePath: string;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    // Assuming profile.json is in the root of the project
    this.profilePath = path.join(process.cwd(), 'profile.json');
  }

  private async getJobPreferences(): Promise<JobPreferences> {
    try {
      const data = await fs.readFile(this.profilePath, 'utf-8');
      const profile = JSON.parse(data);
      if (profile && profile.jobPreferences) {
        return profile.jobPreferences;
      } else {
        throw new Error('Job preferences not found in profile.json');
      }
    } catch (error) {
      console.error('Error reading or parsing profile.json:', error);
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

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const aiResponseContent = completion.choices[0]?.message?.content;

      if (!aiResponseContent) {
        throw new Error('OpenAI response content is null or undefined.');
      }

      try {
        const parsedResponse: AIRelevanceResponse = JSON.parse(aiResponseContent);
        return parsedResponse;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw AI response:', aiResponseContent);
        // Fallback or attempt to infer relevance if parsing fails
        return {
          isRelevant: false,
          reasoning: 'Failed to parse AI response. Raw: ' + aiResponseContent
        };
      }
    } catch (error) {
      console.error('Error in analyzeJobTitleRelevance:', error);
      throw error;
    }
  }
}
