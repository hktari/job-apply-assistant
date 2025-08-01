import z from 'zod';
import { LLMScraperImpl } from '../../src/job/services/llm/llm-scraper';
import { openai } from '@ai-sdk/openai';
import { config } from 'dotenv';

config();

const scraper = new LLMScraperImpl(openai.chat('gpt-4o'));

const featuredPost = z.object({
  posts: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        posted_date_iso: z.string(),
        author: z.string(),
      }),
    )
    .describe('Featured posts'),
});

async function main() {
  const result = await scraper.scrapeUrl(
    'https://blog.logrocket.com/',
    featuredPost,
    { prompt: 'Scrape the page for featured posts' },
  );

  console.log(JSON.stringify(result, null, 2));
}

main();
