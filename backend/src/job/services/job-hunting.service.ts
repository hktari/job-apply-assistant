import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobRelevanceService } from './job-relevance.service';
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Job, JobStatus, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { JobSourceManual } from '../interface';
import { LLMScraperImpl } from './llm/llm-scraper';
import { openai } from '@ai-sdk/openai';

// Schema for items from the main job listing page
const JobListPageItemSchema = z
  .object({
    job_title: z.string().min(1, 'Job title cannot be empty'),
    job_link: z.string().url('Invalid URL format for job link'),
    posted_date_iso: z
      .string()
      .describe('The date the job was posted, in YYYY-MM-DD format.'),
    constraints: z
      .string()
      .optional()
      .describe(
        "Any additional constraints mentioned for the job, e.g., country restrictions like 'USA only'.",
      ),
  })
  .describe('Items from the main job listing page');

const JobListPageScrapeSchema = z.object({
  job_postings: z.array(JobListPageItemSchema),
});

// Schema for details scraped from individual job posting pages
const JobDetailScrapeSchema = z
  .object({
    region: z.string(),
    role: z.string(),
    experience: z.string(),
    company: z.string(),
    job_type: z.string(),
    salary: z.string(),
  })
  .describe('Details scraped from individual job posting pages');

export type JobListPageItem = z.infer<typeof JobListPageItemSchema>;
export type JobListPageScrape = z.infer<typeof JobListPageScrapeSchema>;
export type AnalyzedJobPosting = JobListPageItem & {
  isRelevant: boolean;
  reasoning: string | null;
};
export type AnalyzedJobListPageItem = JobListPageItem & {
  isRelevant: boolean;
  reasoning: string | null;
};

@Injectable()
export class JobHuntingService {
  private readonly logger = new Logger(JobHuntingService.name);
  private listScraper: LLMScraperImpl;
  private detailScraper: LLMScraperImpl;
  constructor(
    private prisma: PrismaService,
    private jobRelevanceService: JobRelevanceService,
    private configService: ConfigService,
  ) {
    this.listScraper = new LLMScraperImpl(
      openai.chat(
        this.configService.get<string>('LIST_MODEL_ID') || 'gpt-4.1-mini',
      ),
    );
    this.detailScraper = new LLMScraperImpl(
      openai.chat(
        this.configService.get<string>('DETAIL_MODEL_ID') || 'gpt-4.1',
      ),
    );
  }

  async isJobDuplicate(url: string): Promise<boolean> {
    const existingJob = await this.prisma.job.findUnique({
      where: { url },
    });
    return existingJob !== null;
  }

  private mapJobPosting(job: AnalyzedJobPosting): Prisma.JobCreateInput {
    return {
      title: job.job_title,
      company: '',
      description: '',
      url: job.job_link,
      source: new URL(job.job_link).hostname,
      status: JobStatus.PENDING,
      is_relevant: job.isRelevant,
      relevance_reasoning: job.reasoning || null,
      posted_date: new Date(job.posted_date_iso),
      notes: null,
    };
  }

  private mapJobListPageItem(
    job: AnalyzedJobListPageItem,
  ): Prisma.JobCreateInput {
    return {
      title: job.job_title,
      company: '',
      description: '',
      url: job.job_link,
      source: new URL(job.job_link).hostname,
      status: JobStatus.PENDING,
      is_relevant: job.isRelevant,
      relevance_reasoning: job.reasoning || null,
      region: null,
      job_type: null,
      experience: null,
      salary: null,
      posted_date: new Date(job.posted_date_iso),
      notes: null,
    };
  }

  private async storeJob(
    job: AnalyzedJobPosting | AnalyzedJobListPageItem,
  ): Promise<void> {
    try {
      const data =
        'company' in job
          ? this.mapJobPosting(job)
          : this.mapJobListPageItem(job as AnalyzedJobListPageItem);
      await this.prisma.job.create({ data });
      this.logger.debug(`Stored job: ${job.job_title}`);
    } catch (error: unknown) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw error;
      } else {
        this.logger.error(`Error storing job ${job.job_title}:`, error);
        throw error;
      }
    }
  }

  async storeJobsInDatabase(
    matchedJobs: AnalyzedJobPosting[],
    irrelevantJobs: AnalyzedJobListPageItem[],
  ) {
    for (const job of matchedJobs) {
      await this.storeJob(job);
    }
    for (const job of irrelevantJobs) {
      await this.storeJob(job);
    }
  }

  async createManualJob(createManualJobDto: CreateManualJobDto): Promise<Job> {
    try {
      const { title, company: companyName, url, notes } = createManualJobDto;

      // Check if job with this URL already exists
      const exists = await this.isJobDuplicate(url);
      if (exists) {
        this.logger.warn(
          `Job with URL ${url} already exists. Skipping creation.`,
        );
        throw new Error(`Job with URL ${url} already exists`);
      }

      // Create the job with APPROVED status since it's manually added
      const job = await this.prisma.job.create({
        data: {
          title,
          company: companyName,
          url,
          source: JobSourceManual,
          status: JobStatus.APPROVED, // Automatically approve manually added jobs
          is_relevant: true, // Assume manually added jobs are relevant
          notes,
        },
      });

      this.logger.log(`Manually added job: ${title} (ID: ${job.id})`);
      return job;
    } catch (error: any) {
      this.logger.error(
        `Error creating manual job: ${error?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Main orchestration method - now with better error handling and progress tracking
  async findJobs(
    jobListUrls: string[],
    progressCallback?: (progress: number, message: string) => void,
  ): Promise<{
    matchedJobs: AnalyzedJobPosting[];
    irrelevantJobs: AnalyzedJobListPageItem[];
  }> {
    this.logger.log(
      `Starting job extraction from ${jobListUrls.length} URL(s)...`,
    );

    try {
      // Step 1: Scrape job listing pages (parallelized)
      progressCallback?.(10, 'Scraping job listing pages...');
      const initialScrapedJobs = await this.scrapeJobListings(jobListUrls);

      if (initialScrapedJobs.length === 0) {
        this.logger.log('No jobs found in any initial scrape.');
        return { matchedJobs: [], irrelevantJobs: [] };
      }

      // Step 2: Deduplicate jobs (parallelized)
      progressCallback?.(30, 'Deduplicating jobs...');
      const deduplicatedJobs = await this.deduplicateJobs(initialScrapedJobs);

      // Step 3: Filter by date
      progressCallback?.(40, 'Filtering by date...');
      const recentJobs = this.filterJobsByDate(deduplicatedJobs);

      if (recentJobs.length === 0) {
        this.logger.log('No recent jobs found.');
        return { matchedJobs: [], irrelevantJobs: [] };
      }

      // Step 4: Analyze relevance (parallelized)
      progressCallback?.(60, 'Analyzing job relevance...');
      const analyzedJobs = await this.analyzeJobRelevance(recentJobs);

      // Step 5: Split jobs by relevance
      const { relevantJobs, irrelevantJobs } =
        this.splitJobsByRelevance(analyzedJobs);

      // Step 6: Scrape detailed information for relevant jobs (parallelized)
      progressCallback?.(80, 'Scraping detailed job information...');
      const matchedJobs = await this.scrapeJobDetails(relevantJobs);

      progressCallback?.(100, 'Job discovery completed');
      this.logger.log(
        `Job discovery completed. Found ${matchedJobs.length} relevant jobs and ${irrelevantJobs.length} irrelevant jobs.`,
      );

      return { matchedJobs, irrelevantJobs };
    } catch (error) {
      this.logger.error('Error in job discovery process:', error);
      throw error;
    }
  }

  // Step 1: Scrape job listing pages in parallel
  private async scrapeJobListings(
    jobListUrls: string[],
  ): Promise<JobListPageItem[]> {
    const today_iso = new Date().toISOString().split('T')[0];
    const scrapePromises = jobListUrls.map(async (jobListUrl) => {
      try {
        this.logger.log(`Scraping initial job list from ${jobListUrl}...`);

        const initialScrapeResult = (await this.listScraper.scrapeUrl(
          jobListUrl,
          JobListPageScrapeSchema,
          {
            prompt: `
            Extract all job postings from this page. 
            
            For each job, provide its title (job_title), 
            the direct URL to the job details (job_link), 
            the posting date (posted_date_iso),
            and any constraints mentioned (constraints), such as country restrictions (e.g., "USA only").
            
            Convert all posting dates to YYYY-MM-DD format. 
            For example, if a job was posted 'today' (assuming today is ${today_iso}), 'yesterday', or '2 days ago', calculate and use the YYYY-MM-DD format. 
            If a date like '15.03.2024' is given, convert it to '2024-03-15'. 
            
            Ensure job_link is a full URL.`,
          },
        )) as ScrapeResponse;

        if (!initialScrapeResult.success || !initialScrapeResult.json) {
          this.logger.warn(
            `Failed to scrape job list from ${jobListUrl}: ${initialScrapeResult.error || 'No data returned'}. Skipping this URL.`,
          );
          return [];
        }

        this.logger.debug(
          `Received data from ${jobListUrl}:`,
          JSON.stringify(initialScrapeResult.json, null, 2),
        );
        const parsedInitialData = JobListPageScrapeSchema.safeParse(
          initialScrapeResult.json,
        );

        if (!parsedInitialData.success) {
          this.logger.error(
            `Failed to parse initial job list data from ${jobListUrl}:`,
            parsedInitialData.error.errors,
          );
          this.logger.debug(
            `Received data from ${jobListUrl}:`,
            JSON.stringify(initialScrapeResult.json, null, 2),
          );
          return [];
        }

        this.logger.log(
          `Found ${parsedInitialData.data.job_postings.length} jobs from ${jobListUrl}`,
        );
        return parsedInitialData.data.job_postings;
      } catch (error: any) {
        this.logger.error(
          `Error scraping job list from ${jobListUrl}: ${error.message}`,
        );
        this.logger.debug(`Full error details for ${jobListUrl}:`, {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });
        return [];
      }
    });

    const results = await Promise.all(scrapePromises);
    const allJobs = results.flat();

    this.logger.log(`Total ${allJobs.length} jobs found in initial scrapes.`);
    return allJobs;
  }

  // Step 2: Deduplicate jobs in parallel
  private async deduplicateJobs(
    jobs: JobListPageItem[],
  ): Promise<JobListPageItem[]> {
    const BATCH_SIZE = 10; // Process in batches to avoid overwhelming the database
    const deduplicatedJobs: JobListPageItem[] = [];

    // NOTE: db deadlocks ?
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (job) => {
        const isDuplicate = await this.isJobDuplicate(job.job_link);

        return isDuplicate ? null : job;
      });

      const batchResults = await Promise.all(batchPromises);
      deduplicatedJobs.push(
        ...batchResults.filter((job): job is JobListPageItem => job !== null),
      );
    }

    const duplicatesRemoved = jobs.length - deduplicatedJobs.length;
    this.logger.log(
      `Deduplicated ${duplicatesRemoved} jobs. ${deduplicatedJobs.length} unique jobs remaining.`,
    );

    return deduplicatedJobs;
  }

  // Step 3: Filter jobs by date
  private filterJobsByDate(jobs: JobListPageItem[]): JobListPageItem[] {
    const dateThreshold = new Date();
    const ignorePostingsOlderThanMonths = this.configService.get<number>(
      'IGNORE_POSTINGS_OLDER_THAN_MONTHS',
      4,
    );
    dateThreshold.setMonth(
      dateThreshold.getMonth() - ignorePostingsOlderThanMonths,
    );

    const recentJobs = jobs.filter((job) => {
      try {
        const jobDate = new Date(job.posted_date_iso);
        return jobDate >= dateThreshold;
      } catch (dateError) {
        this.logger.warn(
          `Could not parse date ${job.posted_date_iso} for job "${job.job_title}". Skipping.`,
        );
        this.logger.debug('Date parsing error:', dateError);
        return false;
      }
    });

    this.logger.log(
      `Filtered ${jobs.length - recentJobs.length} old jobs. ${recentJobs.length} recent jobs remaining.`,
    );

    return recentJobs;
  }

  // Step 4: Analyze job relevance in parallel
  private async analyzeJobRelevance(
    jobs: JobListPageItem[],
  ): Promise<AnalyzedJobListPageItem[]> {
    const BATCH_SIZE = 5; // Limit concurrent API calls
    const analyzedJobs: AnalyzedJobListPageItem[] = [];

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const analysisPromises = batch.map(async (job) => {
        try {
          const relevanceResult =
            await this.jobRelevanceService.analyzeRelevance(job.job_title);
          return {
            ...job,
            isRelevant: relevanceResult.isRelevant,
            reasoning: relevanceResult.reasoning,
          };
        } catch (error: any) {
          this.logger.error(
            `Error analyzing job ${job.job_title}: ${error.message}`,
          );
          // Return as irrelevant if analysis fails
          return {
            ...job,
            isRelevant: false,
            reasoning: `Analysis failed: ${error.message}`,
          };
        }
      });

      const batchResults = await Promise.all(analysisPromises);
      analyzedJobs.push(...batchResults);
    }

    this.logger.log(`Analyzed ${analyzedJobs.length} jobs for relevance.`);
    return analyzedJobs;
  }

  // Step 5: Split jobs by relevance
  private splitJobsByRelevance(analyzedJobs: AnalyzedJobListPageItem[]): {
    relevantJobs: AnalyzedJobListPageItem[];
    irrelevantJobs: AnalyzedJobListPageItem[];
  } {
    const relevantJobs = analyzedJobs.filter((job) => job.isRelevant);
    const irrelevantJobs = analyzedJobs.filter((job) => !job.isRelevant);

    this.logger.log(
      `Split jobs: ${relevantJobs.length} relevant, ${irrelevantJobs.length} irrelevant`,
    );

    return { relevantJobs, irrelevantJobs };
  }

  // Step 6: Scrape detailed information for relevant jobs in parallel
  private async scrapeJobDetails(
    relevantJobs: AnalyzedJobListPageItem[],
  ): Promise<AnalyzedJobPosting[]> {
    const BATCH_SIZE = 3; // Limit concurrent scraping to avoid rate limits
    const matchedJobs: AnalyzedJobPosting[] = [];

    for (let i = 0; i < relevantJobs.length; i += BATCH_SIZE) {
      const batch = relevantJobs.slice(i, i + BATCH_SIZE);
      const scrapingPromises = batch.map(async (job) => {
        try {
          const detailScrapeResult = await this.detailScraper.scrapeUrl(
            job.job_link,
            JobDetailScrapeSchema,
            {
              prompt: `
              Extract the following job details:
              - region: The location/region where the job is based
              - role: The full job description or role details
              - experience: Any mentioned experience requirements
              - company: The company name
              - job_type: The type of employment (e.g., full-time, contract)
              - salary: Any salary or compensation information
              
              Return null for any fields that are not found in the content.`,
            },
          );

          if (!detailScrapeResult.success || !detailScrapeResult.json) {
            this.logger.warn(
              `Failed to scrape job details from ${job.job_link}: ${detailScrapeResult.error || 'No data returned'}`,
            );
            return null;
          }

          const parsedDetailData = JobDetailScrapeSchema.safeParse(
            detailScrapeResult.json,
          );

          if (!parsedDetailData.success) {
            this.logger.error(
              `Failed to parse job details from ${job.job_link}:`,
              parsedDetailData.error.errors,
            );
            return null;
          }

          const jobWithDetails: AnalyzedJobPosting = {
            ...parsedDetailData.data,
            job_title: job.job_title,
            job_link: job.job_link,
            posted_date_iso: job.posted_date_iso,
            constraints: job.constraints,
            isRelevant: job.isRelevant,
            reasoning: job.reasoning,
          };

          this.logger.debug(
            `Successfully scraped details for job: ${job.job_title}`,
          );
          return jobWithDetails;
        } catch (error: any) {
          this.logger.error(
            `Error scraping job details for ${job.job_title}: ${error.message}`,
          );
          return null;
        }
      });

      const batchResults = await Promise.all(scrapingPromises);
      matchedJobs.push(
        ...batchResults.filter(
          (job): job is AnalyzedJobPosting => job !== null,
        ),
      );
    }

    this.logger.log(
      `Successfully scraped details for ${matchedJobs.length} jobs.`,
    );
    return matchedJobs;
  }
}
