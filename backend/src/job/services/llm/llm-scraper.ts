import { chromium } from 'playwright';
import { z } from 'zod';
import LLMScraper, { ScraperRunOptions } from 'llm-scraper';
import { LanguageModelV1 } from 'ai';
import { Logger } from '@nestjs/common';
interface ScrapeResponse {
  success: boolean;
  error?: string;
  json?: any;
}
export class LLMScraperImpl {
  private scraper: LLMScraper;
  private readonly logger = new Logger(LLMScraperImpl.name);
  private readonly modelId: string;
  constructor(llm: LanguageModelV1) {
    this.scraper = new LLMScraper(llm);
    this.logger.debug(`LLMScraperImpl initialized with ${llm.modelId}`);
    this.modelId = llm.modelId;
  }

  async scrapeUrl<T extends z.ZodSchema>(
    url: string,
    schema: T,
    options?: ScraperRunOptions,
  ): Promise<ScrapeResponse> {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      this.logger.debug(`Scraping URL: ${url} using ${this.modelId}`);
      const response = await this.scraper.run(page, schema, options);

      if (!response.data) {
        this.logger.error(`Failed to scrape URL: ${url}`, { cause: response });
        throw new Error(`Failed to scrape URL: ${url}`, { cause: response });
      }

      return {
        success: true,
        json: response.data,
      };
    } catch (e: any) {
      this.logger.error(`Error scraping URL ${url}: ${e.message}`);
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
