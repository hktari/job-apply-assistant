import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobRelevanceService } from './job-relevance.service';
import { ConfigService } from '@nestjs/config';
import { Job, JobStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateManualJobDto } from '../dto/create-manual-job.dto';
import { JobSourceManual } from '../interface';
import { LLMScraperImpl } from './llm/llm-scraper';
import { openai } from '@ai-sdk/openai';
import { ScrapeResponse } from '@mendable/firecrawl-js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  AnalyzedJobPosting,
  EnrichedJobPosting,
  JobDetails,
  JobDetailsSchema,
  JobListPageItem,
  JobListPageScrapeSchema,
} from '../models/job.models';
import { mapJobPosting } from '../utils/job.utils';

@Injectable()
export class JobHuntingService {
  private readonly logger = new Logger(JobHuntingService.name);
  private listScraper: LLMScraperImpl;
  private detailScraper: LLMScraperImpl;
  constructor(
    private prisma: PrismaService,
    private jobRelevanceService: JobRelevanceService,
    private configService: ConfigService,
    @InjectQueue('job-field-population')
    private readonly fieldPopulationQueue: Queue,
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

  private async storeJob(job: AnalyzedJobPosting): Promise<void> {
    try {
      const data = mapJobPosting(job);
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
    irrelevantJobs: AnalyzedJobPosting[],
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
          title: title || 'Job Title (To be scraped)',
          company: companyName || null,
          url,
          source: JobSourceManual,
          status: JobStatus.APPROVED, // Automatically approve manually added jobs
          is_relevant: true, // Assume manually added jobs are relevant
          notes,
        },
      });

      this.logger.log(
        `Manually added job: ${title || 'Unknown Title'} (ID: ${job.id})`,
      );

      // If title or company is missing, trigger background scraping to populate fields
      if (!title || !companyName) {
        this.logger.log(
          `Missing fields detected for job ${job.id}. Queuing background scraping...`,
        );
        // Queue job for background field population
        await this.fieldPopulationQueue.add(
          'populate-missing-fields',
          { jobId: job.id },
          {
            delay: 1000, // Small delay to ensure job is committed to DB
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
      }

      return job;
    } catch (error: any) {
      this.logger.error(
        `Error creating manual job: ${error?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  async findJobs(
    jobListUrls: string[],
    progressCallback?: (progress: number, message: string) => void,
  ): Promise<{
    matchedJobs: AnalyzedJobPosting[];
    irrelevantJobs: AnalyzedJobPosting[];
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
      const enrichedJobs =
        await this.enrichjobListItemsWithDetails(relevantJobs);

      progressCallback?.(100, 'Job discovery completed');
      this.logger.log(
        `Job discovery completed. Found ${enrichedJobs.length} relevant jobs and ${irrelevantJobs.length} irrelevant jobs.`,
      );

      return { matchedJobs: enrichedJobs, irrelevantJobs };
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
  ): Promise<AnalyzedJobPosting[]> {
    const BATCH_SIZE = 5; // Limit concurrent API calls
    const analyzedJobs: AnalyzedJobPosting[] = [];

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
  private splitJobsByRelevance(analyzedJobs: AnalyzedJobPosting[]): {
    relevantJobs: AnalyzedJobPosting[];
    irrelevantJobs: AnalyzedJobPosting[];
  } {
    const relevantJobs = analyzedJobs.filter((job) => job.isRelevant);
    const irrelevantJobs = analyzedJobs.filter((job) => !job.isRelevant);

    this.logger.log(
      `Split jobs: ${relevantJobs.length} relevant, ${irrelevantJobs.length} irrelevant`,
    );

    return { relevantJobs, irrelevantJobs };
  }

  // Step 6: Scrape detailed information for relevant jobs in parallel
  private async enrichjobListItemsWithDetails(
    relevantJobs: AnalyzedJobPosting[],
  ): Promise<EnrichedJobPosting[]> {
    const BATCH_SIZE = 3; // Limit concurrent scraping to avoid rate limits
    const matchedJobs: EnrichedJobPosting[] = [];

    for (let i = 0; i < relevantJobs.length; i += BATCH_SIZE) {
      const batch = relevantJobs.slice(i, i + BATCH_SIZE);
      const scrapingPromises = batch.map(async (job) => {
        try {
          const details = await this.scrapeJobDetails(job.job_link);
          return {
            ...job,
            ...details,
          };
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
          (job): job is EnrichedJobPosting => job !== null,
        ),
      );
    }

    this.logger.log(
      `Successfully scraped details for ${matchedJobs.length} jobs.`,
    );
    return matchedJobs;
  }

  /**
   * Queue pending manual jobs for field population
   */
  async queuePendingManualJobs(): Promise<void> {
    try {
      // Find manual jobs that need field population
      const pendingJobs = await this.prisma.job.findMany({
        where: {
          source: JobSourceManual,
          OR: [
            { title: 'Job Title (To be scraped)' },
            { title: null },
            { company: null },
          ],
        },
        select: { id: true, title: true, company: true, url: true },
      });

      if (pendingJobs.length === 0) {
        this.logger.debug('No pending manual jobs found for field population');
        return;
      }

      this.logger.log(
        `Found ${pendingJobs.length} pending manual jobs for field population`,
      );

      // Queue each job for background processing
      for (const job of pendingJobs) {
        await this.fieldPopulationQueue.add(
          'populate-missing-fields',
          { jobId: job.id },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            // Remove duplicate jobs with same jobId
            jobId: `populate-${job.id}`,
          },
        );
      }

      this.logger.log(
        `Queued ${pendingJobs.length} manual jobs for field population`,
      );
    } catch (error: any) {
      this.logger.error(`Error queuing pending manual jobs: ${error.message}`);
    }
  }

  /**
   * Populate missing fields for a manually added job by scraping the job URL
   */
  async populateMissingJobFields(jobId: number): Promise<void> {
    try {
      // Get the job from database
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        this.logger.error(`Job with ID ${jobId} not found`);
        return;
      }

      this.logger.log(
        `Starting field population for job ${jobId} (${job.url})`,
      );

      // Scrape job details from the URL
      const jobDetails = await this.scrapeJobDetails(job.url);

      if (!jobDetails) {
        this.logger.warn(`Failed to scrape details for job ${jobId}`);
        return;
      }

      // Prepare update data - only update fields that are missing
      const updateData: any = {
        updated_at: new Date(),
      };

      // Update title if it's missing or is the placeholder (use 'role' from JobDetails)
      if (!job.title || job.title === 'Job Title (To be scraped)') {
        if (jobDetails.role) {
          updateData.title = jobDetails.role;
        }
      }

      // Update company if it's missing
      if (!job.company && jobDetails.company) {
        updateData.company = jobDetails.company;
      }

      // Update other fields that might be missing
      if (!job.job_type && jobDetails.job_type) {
        updateData.job_type = jobDetails.job_type;
      }

      if (!job.experience && jobDetails.experience) {
        updateData.experience = jobDetails.experience;
      }

      if (!job.salary && jobDetails.salary) {
        updateData.salary = jobDetails.salary;
      }

      if (!job.region && jobDetails.region) {
        updateData.region = jobDetails.region;
      }

      // Update the job in database
      const updatedJob = await this.prisma.job.update({
        where: { id: jobId },
        data: updateData,
      });

      this.logger.log(
        `Successfully populated missing fields for job ${jobId}: ${updatedJob.title}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error populating missing fields for job ${jobId}: ${error.message}`,
      );
    }
  }

  private async scrapeJobDetails(jobLink: string): Promise<JobDetails | null> {
    try {
      const detailScrapeResult = await this.detailScraper.scrapeUrl(
        jobLink,
        JobDetailsSchema,
        { prompt: 'Scrape the page for job details' },
      );

      if (!detailScrapeResult.success || !detailScrapeResult.json) {
        this.logger.warn(
          `Failed to scrape job details from ${jobLink}: ${detailScrapeResult.error || 'No data returned'}`,
        );
        return null;
      }

      const parsedDetailData = JobDetailsSchema.safeParse(
        detailScrapeResult.json,
      );

      if (!parsedDetailData.success) {
        this.logger.error(
          `Failed to parse job details from ${jobLink}:`,
          parsedDetailData.error.errors,
        );
        return null;
      }

      const jobWithDetails: JobDetails = {
        ...parsedDetailData.data,
      };

      this.logger.debug(`Successfully scraped details for job URL: ${jobLink}`);
      return jobWithDetails;
    } catch (error: any) {
      this.logger.error(
        `Error scraping job details for ${jobLink}: ${error.message}`,
      );
      return null;
    }
  }
}
