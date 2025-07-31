import { LLMScraperImpl } from '../src/job/services/llm/llm-scraper';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

describe('LLMScraper', () => {
  it('response should pass  zod schema parsing successfully', () => {
    const response = {
      posts: [
        {
          author: 'Matt MacCormack',
          posted_date_iso: '2025-07-23',
          title: 'What are the AI-proof skills every frontend developer needs?',
          url: 'https://blog.logrocket.com/ai-proof-skills-frontend-developers/',
        },
        {
          author: 'Sibel Bagcilar',
          posted_date_iso: '2025-07-18',
          title:
            'Leader Spotlight: Navigating a complete product redesign, with Tyler Stone',
          url: 'https://blog.logrocket.com/product-management/leader-spotlight-tyler-stone/',
        },
        {
          author: 'Andrew Evans',
          posted_date_iso: '2025-07-16',
          title:
            'How to prep for a software dev interview: Advice from a dev leader',
          url: 'https://blog.logrocket.com/prep-for-software-dev-interview/',
        },
        {
          author: 'Marta Randall',
          posted_date_iso: '2025-07-15',
          title:
            'Leader Spotlight: Designing for trust and managing user expectations, with Rachel Bentley',
          url: 'https://blog.logrocket.com/product-management/leader-spotlight-rachel-bentley/',
        },
        {
          author: 'Katie Schickel',
          posted_date_iso: '2025-07-10',
          title:
            'Leader Spotlight: Building a human-focused AI product, with Cory Bishop',
          url: 'https://blog.logrocket.com/product-management/leader-spotlight-cory-bishop/',
        },
        {
          author: 'Katie Schickel',
          posted_date_iso: '2025-07-08',
          title:
            'Leader Spotlight: Improving predictability using agile, with Emmett Ryan',
          url: 'https://blog.logrocket.com/product-management/leader-spotlight-emmett-ryan/',
        },
      ],
      success: true,
    };

    const schema = z.object({
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

    expect(schema.parse(response)).toBeDefined();
  });

  it('should scrape a URL using openAI ', async () => {
    const llm = openai.chat('gpt-4o');
    const scraper = new LLMScraperImpl(llm);

    const schema = z.object({
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

    const result = await scraper.scrapeUrl(
      'https://blog.logrocket.com/',
      schema,
      { format: 'html', prompt: 'Scrape the page for featured posts' },
    );
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.json).toBeDefined();

    expect(result.json).toEqual(
      expect.objectContaining({
        posts: expect.arrayContaining([
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
