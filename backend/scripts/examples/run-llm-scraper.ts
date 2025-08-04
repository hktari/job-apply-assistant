import z from 'zod';
import { LLMScraperImpl } from '../../src/job/services/llm/llm-scraper';
import { openai } from '@ai-sdk/openai';
import { config } from 'dotenv';
import { JobDetailsSchema } from '../../src/job/models/job.models';

config();

const scraper = new LLMScraperImpl(openai.chat('gpt-4.1'));

async function main() {
  const result = await scraper.scrapeUrl(
    'https://www.optius.com/iskalci/prosta-delovna-mesta/visji-analitik-programer-mz-921819-921819/',
    JobDetailsSchema,
    { prompt: 'Scrape the page for job details' },
  );

  console.log(JSON.stringify(result, null, 2));
}

main();
