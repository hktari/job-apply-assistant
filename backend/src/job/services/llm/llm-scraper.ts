import { chromium } from 'playwright';
import { z } from 'zod';
import LLMScraper from 'llm-scraper';
import { LanguageModelV1 } from 'ai';

interface ScrapeResponse {
  success: boolean;
  error?: string;
  json?: any;
}
export class LLMScraperImpl {
  private scraper: LLMScraper;

  constructor(llm: LanguageModelV1) {
    this.scraper = new LLMScraper(llm);
  }

  async scrapeUrl<T extends z.ZodSchema>(
    url: string,
    schema: T,
  ): Promise<ScrapeResponse> {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url);

    try {
      const response = await this.scraper.run(page, schema, { format: 'html' });
      if (!response.data) {
        throw new Error(`Failed to scrape URL: ${url}`);
      }
      return {
        success: true,
        json: response.data,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    } finally {
      await page.close();
      await browser.close();
    }
  }
}
