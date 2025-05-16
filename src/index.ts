import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import FirecrawlApp from '@mendable/firecrawl-js';

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
      'https://slo-tech.com/delo/*',
    ];
    console.log('Progress: Starting job extraction...');
    try {
      // Use asyncCrawlUrl for the first URL (Firecrawl only supports one at a time)
      const crawlJob = await this.firecrawl.asyncCrawlUrl(urls[0], {
        limit: 100,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        },
      });
      if (!crawlJob.success) {
        throw new Error(`Failed to start crawl: ${crawlJob.error}`);
      }
      const crawlId = crawlJob.id;
      console.log('Progress: Extraction job started. Polling for status...');
      let waited = 0;
      const maxWait = 60 * 3 * 1000;
      const interval = 1000;
      let crawlStatus;
      while (true) {
        crawlStatus = await this.firecrawl.checkCrawlStatus(crawlId);
        console.log(`Progress: Job Status: ${crawlStatus.status}`);
        if (crawlStatus.status === 'completed') break;
        if (crawlStatus.status === 'failed') throw new Error('Extraction job failed');
        await new Promise((res) => setTimeout(res, interval));
        waited += interval;
        if (waited >= maxWait) throw new Error('Timed out waiting for job extraction to complete.');
      }
      if (crawlStatus.success) {
        // Extract job postings from crawlStatus.pages or similar property
        // This will depend on the actual Firecrawl response structure
        // For now, let's assume crawlStatus.pages is an array of crawled pages
        const jobs: any[] = [];
        for (const page of crawlStatus.pages || []) {
          // Here you would parse the page content to extract job postings
          // For now, just push the page URL as a placeholder
          jobs.push({ job_link: page.url, ...page });
        }
        if (!jobs.length) {
          console.log('Progress: No job listings found matching your criteria.');
          return [];
        }
        // Write results to JSON file
        const outputPath = path.resolve(__dirname, 'job-results.json');
        fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
        console.log(`Progress: Job search completed! Results written to ${outputPath}`);
        return jobs;
      } else {
        console.log('Progress: Extraction job did not succeed.');
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
