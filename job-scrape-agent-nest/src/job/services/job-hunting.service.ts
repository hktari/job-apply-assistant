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

// Schema for items from the main job listing page
const JobListPageItemSchema = z.object({
  job_title: z.string().min(1, 'Job title cannot be empty'),
  job_link: z.string().url('Invalid URL format for job link'),
  posted_date_iso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .describe('The date the job was posted, in YYYY-MM-DD format.'),
  constraints: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Any additional constraints mentioned for the job, e.g., country restrictions like 'USA only'.",
    ),
});

const JobListPageScrapeSchema = z.object({
  job_postings: z.array(JobListPageItemSchema),
});

// Schema for details scraped from individual job posting pages
const JobDetailScrapeSchema = z.object({
  region: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
});

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
  private firecrawlClient: FirecrawlApp;

  constructor(
    private prisma: PrismaService,
    private jobRelevanceService: JobRelevanceService,
    private configService: ConfigService,
  ) {
    this.firecrawlClient = new FirecrawlApp({
      apiKey: this.configService.get<string>('FIRECRAWL_API_KEY'),
    });
  }

  private async isJobDuplicate(url: string): Promise<boolean> {
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

  async findJobs(jobListUrls: string[]): Promise<{
    matchedJobs: AnalyzedJobPosting[];
    irrelevantJobs: AnalyzedJobListPageItem[];
  }> {
    this.logger.log(
      `Starting job extraction from ${jobListUrls.length} URL(s)...`,
    );

    const dateThreshold = new Date();
    dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    const today_iso = new Date().toISOString().split('T')[0];

    const initialScrapedJobs: JobListPageItem[] = [];

    // Step 1: Scrape job listing pages
    for (const jobListUrl of jobListUrls) {
      this.logger.log(`Scraping initial job list from ${jobListUrl}...`);
      try {
        const initialScrapeResult = (await this.firecrawlClient.scrapeUrl(
          jobListUrl,
          {
            formats: ['json'],
            jsonOptions: {
              schema: JobListPageScrapeSchema,
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
            onlyMainContent: true,
          },
        )) as ScrapeResponse;

        if (!initialScrapeResult.success || !initialScrapeResult.json) {
          this.logger.warn(
            `Failed to scrape job list from ${jobListUrl}: ${initialScrapeResult.error || 'No data returned'}. Skipping this URL.`,
          );
          continue;
        }

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
          this.logger.warn(
            `Could not parse data from job list page ${jobListUrl}. Skipping this URL.`,
          );
          continue;
        }
        initialScrapedJobs.push(...parsedInitialData.data.job_postings);
        this.logger.log(
          `Found ${parsedInitialData.data.job_postings.length} jobs from ${jobListUrl}. Total initial jobs: ${initialScrapedJobs.length}`,
        );
      } catch (e: any) {
        this.logger.error(
          `Error in initial job list scrape for ${jobListUrl}: ${e.message}`,
        );
      }
    }

    if (initialScrapedJobs.length === 0) {
      this.logger.log('No jobs found in any initial scrape.');
      return { matchedJobs: [], irrelevantJobs: [] };
    }
    this.logger.log(
      `Total ${initialScrapedJobs.length} jobs found in initial scrapes.`,
    );

    // Step 1.1: deduplicate jobs
    const deduplicatedJobs = await Promise.all(
      initialScrapedJobs.filter(
        // TODO: look into this
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (job) => !(await this.isJobDuplicate(job.job_link)),
      ),
    );

    this.logger.log(
      `Deduplicated ${initialScrapedJobs.length - deduplicatedJobs.length} jobs.`,
    );

    // Step 2: Filter by posted date
    const recentJobs = deduplicatedJobs.filter((job) => {
      try {
        const jobDate = new Date(job.posted_date_iso);
        return jobDate >= dateThreshold;
      } catch (dateError) {
        this.logger.warn(
          `Could not parse date ${job.posted_date_iso} for job "${job.job_title}". Skipping.`,
        );
        this.logger.debug(dateError);
        return false;
      }
    });

    if (recentJobs.length === 0) {
      this.logger.log('No recent jobs found.');
      return { matchedJobs: [], irrelevantJobs: [] };
    }

    // Step 3: Analyze job titles for relevance
    const analyzedJobs: AnalyzedJobListPageItem[] = [];
    for (const job of recentJobs) {
      try {
        const relevanceResult = await this.jobRelevanceService.analyzeRelevance(
          job.job_title,
        );
        analyzedJobs.push({
          ...job,
          isRelevant: relevanceResult.isRelevant,
          reasoning: relevanceResult.reasoning,
        });
      } catch (e: any) {
        this.logger.error(`Error analyzing job ${job.job_title}: ${e.message}`);
      }
    }

    // Step 4: Split jobs into relevant and irrelevant
    const relevantJobs = analyzedJobs.filter((job) => job.isRelevant);
    const irrelevantJobs = analyzedJobs.filter((job) => !job.isRelevant);

    // Step 5: For relevant jobs, scrape detailed information
    // TODO: optimization: scrape all relevant jobs in parallel
    const matchedJobs: AnalyzedJobPosting[] = [];
    for (const job of relevantJobs) {
      try {
        const detailScrapeResult = (await this.firecrawlClient.scrapeUrl(
          job.job_link,
          {
            formats: ['json'],
            jsonOptions: {
              schema: JobDetailScrapeSchema,
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
            onlyMainContent: true,
          },
        )) as ScrapeResponse;

        if (!detailScrapeResult.success || !detailScrapeResult.json) {
          this.logger.warn(
            `Failed to scrape job details from ${job.job_link}: ${detailScrapeResult.error || 'No data returned'}`,
          );
          continue;
        }

        const parsedDetailData = JobDetailScrapeSchema.safeParse(
          detailScrapeResult.json,
        );
        if (!parsedDetailData.success) {
          this.logger.error(
            `Failed to parse job details from ${job.job_link}:`,
            parsedDetailData.error.errors,
          );
          continue;
        }

        const jobWithDetails: AnalyzedJobPosting = {
          ...parsedDetailData.data,
          job_title: job.job_title,
          job_link: job.job_link,
          posted_date_iso: job.posted_date_iso,
          isRelevant: job.isRelevant,
          reasoning: job.reasoning,
        };

        matchedJobs.push(jobWithDetails);
        this.logger.debug(
          `Successfully scraped details for job: ${job.job_title}`,
        );
      } catch (e: any) {
        this.logger.error(
          `Error scraping job details for ${job.job_title}: ${e.message}`,
        );
      }
    }

    return { matchedJobs, irrelevantJobs };
  }
}
