import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import FirecrawlApp, { ExtractResponse, ScrapeResponse } from '@mendable/firecrawl-js';

// Load environment variables from .env file if it exists
dotenv.config();

// Define schemas using zod
const JobPostingSchema = z.object({
    region: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    experience: z.string().nullable().optional(),
    job_link: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    job_type: z.string().nullable().optional(),
    salary: z.string().nullable().optional(),
    posted_date: z.string().nullable().optional(),
});

const ExtractSchema = z.object({
    job_postings: z.array(JobPostingSchema),
});

class JobHuntingAgent {
    firecrawl: FirecrawlApp;
    constructor(firecrawlApiKey: string) {
        this.firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    }

    async findJobs() {
        const urls = [
            'https://slo-tech.com/delo',
        ];
        console.log('Progress: Starting job extraction...');

        const jobPostingOutdatedThreshold = new Date();
        jobPostingOutdatedThreshold.setMonth(jobPostingOutdatedThreshold.getMonth() - 1);
        const jobPostingOutdatedThresholdString = jobPostingOutdatedThreshold.toISOString().split('T')[0];

        try {
            const extractJob = await this.firecrawl.asyncExtract(urls, {
                prompt: `Extrat first 10 job postings`,
                schema: ExtractSchema,
            }) as ExtractResponse;

            if (!extractJob.success) {
                throw new Error('Failed to start extraction job. No job ID returned.');
            }

            // @ts-ignore
            const jobId = extractJob.id;
            console.log('Progress: Extraction job started. Polling for status...');

            let waited = 0;
            const maxWait = 60 * 5 * 1000; // 5 minutes timeout
            const interval = 5000; // Poll every 5 seconds
            let jobStatus;

            while (true) {
                jobStatus = await this.firecrawl.getExtractStatus(jobId);
                console.log(`Progress: Job Status: ${jobStatus.status}, Progress: ${jobStatus.progress || 0}%`);

                if (jobStatus.status === 'completed') break;
                if (jobStatus.status === 'failed') {
                    throw new Error(`Extraction job failed. Error: ${jobStatus.error || 'Unknown error'}`);
                }

                await new Promise((res) => setTimeout(res, interval));
                waited += interval;
                if (waited >= maxWait) {
                    throw new Error('Timed out waiting for job extraction to complete.');
                }
            }

            if (jobStatus.status === 'completed' && jobStatus.data) {
                const parsedResult = ExtractSchema.safeParse(jobStatus.data);

                if (parsedResult.success) {
                    const jobs = parsedResult.data.job_postings;
                    if (!jobs || jobs.length === 0) {
                        console.log('Progress: No job listings found matching your criteria or extracted data was empty.');
                        return [];
                    }
                    // Write results to JSON file
                    const outputPath = path.resolve(__dirname, 'job-results.json');
                    fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
                    console.log(`Progress: Job search completed! Results written to ${outputPath}`);
                    return jobs;
                } else {
                    console.error('Failed to parse extracted data:', parsedResult.error.errors);
                    console.log('Received data:', JSON.stringify(jobStatus.data, null, 2));
                    return [];
                }
            } else if (jobStatus.status === 'completed' && !jobStatus.data) {
                console.log('Progress: Extraction job completed but no data was returned.');
                return [];
            } else {
                console.log(`Progress: Extraction job did not complete successfully. Status: ${jobStatus.status}`);
                return [];
            }
        } catch (e: any) {
            console.error('Error in findJobs:', e.message);
            return [];
        }
    }
}

async function main() {
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) {
        console.error('Missing FIRECRAWL_API_KEY in environment variables.');
        process.exit(1);
    }
    const agent = new JobHuntingAgent(firecrawlKey);
    await agent.findJobs();
}

main();
