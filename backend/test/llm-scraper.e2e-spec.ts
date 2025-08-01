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

  const urls = ['https://slo-tech.com/delo'];

  urls.forEach((url) => {
    describe.only(`should successfuly scrape job list page and validate dates for ${url}`, () => {
      let scraper: LLMScraperImpl;
      let schema: z.ZodSchema;
      beforeEach(() => {
        const llm = openai.chat('gpt-4o');
        scraper = new LLMScraperImpl(llm);
        schema = z.object({
          job_postings: z
            .array(
              z.object({
                job_title: z.string(),
                job_link: z.string(),
                posted_date_iso: z.string(),
                constraints: z.string().optional(),
              }),
            )
            .max(3)
            .describe('Items from the main job listing page'),
        });
      });
      it('should successfuly scrape job list page', async () => {
        const result = await scraper.scrapeUrl(url, schema);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(result.json).toBeDefined();
        expect(result.json).toEqual(
          expect.objectContaining({
            job_postings: expect.arrayContaining([
              expect.objectContaining({
                job_title: expect.any(String),
                job_link: expect.any(String),
                posted_date_iso: expect.any(String),
                constraints: expect.any(String),
              }),
            ]),
          }),
        );
      });
      it('should return posted_date_iso as valid date', async () => {
        const result = await scraper.scrapeUrl(url, schema);

        const resultParsed = schema.parse(result.json);
        expect(resultParsed).toBeDefined();
        expect(resultParsed.job_postings).toHaveLength(3);
        resultParsed.job_postings.forEach((jobPosting) => {
          expect(jobPosting.posted_date_iso).toBeDefined();
          expect(jobPosting.posted_date_iso).toMatch(
            /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2})?$/,
          );
          expect(Date.parse(jobPosting.posted_date_iso)).not.toBeNaN();
          expect(new Date(jobPosting.posted_date_iso)).toBeInstanceOf(Date);
        });
      });
    });
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
      { prompt: 'Scrape the page for featured posts' },
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
