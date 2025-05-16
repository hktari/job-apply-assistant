import OpenAI from "openai";
import * as fs from 'fs/promises';
import * as path from 'path';
// For __dirname
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export class JobRelevanceAnalyzer {
    private openai: OpenAI;
    private profilePath: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is set as an environment variable
        });
        this.profilePath = path.join(__dirname, 'profile.json');
    }

    private async getJobPreferences(): Promise<JobPreferences> {
        try {
            const data = await fs.readFile(this.profilePath, 'utf-8');
            const profile = JSON.parse(data);
            if (profile && profile.jobPreferences) {
                return profile.jobPreferences;
            } else {
                throw new Error("Job preferences not found in profile.json");
            }
        } catch (error) {
            console.error("Error reading or parsing profile.json:", error);
            throw error;
        }
    }

    /**
     * Analyzes whether a job title is relevant based on the user's job preferences
     * stored in profile.json using OpenAI.
     * @param jobTitle The job title to analyze.
     * @returns A promise that resolves to an AIRelevanceResponse object.
     */
    public async analyzeJobTitleRelevance(jobTitle: string): Promise<AIRelevanceResponse> {
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
                throw new Error("OpenAI response content is null or undefined.");
            }

            try {
                const parsedResponse: AIRelevanceResponse = JSON.parse(aiResponseContent);
                return parsedResponse;
            } catch (parseError) {
                console.error("Error parsing AI response:", parseError);
                console.error("Raw AI response:", aiResponseContent);
                // Fallback or attempt to infer relevance if parsing fails
                // For simplicity, we'll assume not relevant if parsing fails
                return {
                    isRelevant: false,
                    reasoning: "Failed to parse AI response. Raw: " + aiResponseContent
                };
            }

        } catch (error) {
            console.error("Error analyzing job title relevance:", error);
            // Return a default response indicating failure/non-relevance
            return {
                isRelevant: false,
                reasoning: `Error during analysis: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}

// // Example usage (optional, for testing purposes)
// async function example() {
//     const analyzer = new JobRelevanceAnalyzer();
//     const jobTitleToTest = "Senior Frontend Engineer";
//     try {
//         console.log(`Analyzing job title: "${jobTitleToTest}"...`);
//         const relevance = await analyzer.analyzeJobTitleRelevance(jobTitleToTest);
//         console.log("Relevance Analysis:");
//         console.log(`  Is Relevant: ${relevance.isRelevant}`);
//         console.log(`  Reasoning: ${relevance.reasoning}`);

//         const anotherJobTitle = "Chef de Cuisine";
//         console.log(`\nAnalyzing job title: "${anotherJobTitle}"...`);
//         const relevance2 = await analyzer.analyzeJobTitleRelevance(anotherJobTitle);
//         console.log("Relevance Analysis:");
//         console.log(`  Is Relevant: ${relevance2.isRelevant}`);
//         console.log(`  Reasoning: ${relevance2.reasoning}`);

//     } catch (error) {
//         console.error("Example usage failed:", error);
//     }
// }

// console.log("Running example usage...");
// await example();
// console.log("Job relevance analyzer module loaded successfully.");
