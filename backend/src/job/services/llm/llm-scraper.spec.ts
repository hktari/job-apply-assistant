import { LLMScraperImpl } from './llm-scraper';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

describe('LLMScraper', () => {
  it('should scrape a URL using openAI ', async () => {
    const llm = openai.chat('gpt-4o');
    const scraper = new LLMScraperImpl(llm);
    const featuredPost = z.object({
      title: z.string(),
      url: z.string(),
      posted_date_iso: z.string(),
      author: z.string(),
    });
    const schema = z.array(featuredPost);
    const result = await scraper.scrapeUrl(
      'https://blog.logrocket.com/',
      schema,
    );
    expect(result).toBeDefined();

    expect(schema.safeParse(result.json)).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            url: expect.any(String),
            posted_date_iso: expect.any(String),
            author: expect.any(String),
          }),
        ]),
      }),
    );
  });
});
