import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";
import { PrismaClient, JobStatus, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import path from "path";
import { z } from "zod";
import { JobRelevanceAnalyzer, AIRelevanceResponse } from "./jobRelevanceAnalyzer.js";
import fs from "fs";

// Define schemas using zod

// Schema for items from the main job listing page
const JobListPageItemSchema = z.object({
    job_title: z.string().min(1, "Job title cannot be empty"),
    job_link: z.string().url("Invalid URL format for job link"),
    posted_date_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("The date the job was posted, in YYYY-MM-DD format."),
    constraints: z.string().nullable().optional().describe("Any additional constraints mentioned for the job, e.g., country restrictions like 'USA only'."),
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

// Final combined schema for output
const JobPostingSchema = JobDetailScrapeSchema.extend({
    job_title: z.string().min(1),
    job_link: z.string().url(),
    posted_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    job_posting_id: z.string().min(1).describe("Unique identifier for the job posting, typically the job link itself."),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
export type JobListPageItem = z.infer<typeof JobListPageItemSchema>;
export type JobListPageScrape = z.infer<typeof JobListPageScrapeSchema>;
export type AnalyzedJobPosting = JobPosting & AIRelevanceResponse;
export type AnalyzedJobListPageItem = JobListPageItem & AIRelevanceResponse;

class JobHuntingAgent {
    firecrawl: FirecrawlApp;
    relevanceAnalyzer: JobRelevanceAnalyzer;
    prisma: PrismaClient;

    constructor(firecrawlApiKey: string) {
        this.firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
        this.relevanceAnalyzer = new JobRelevanceAnalyzer();
        this.prisma = new PrismaClient();
    }

    private async isJobDuplicate(url: string): Promise<boolean> {
        const existingJob = await this.prisma.job.findUnique({
            where: { url }
        });
        return existingJob !== null;
    }


    private mapJobPosting(job: AnalyzedJobPosting): Prisma.JobCreateInput {
        return {
            title: job.job_title,
            company: job.company,
            description: job.role,
            url: job.job_link,
            source: new URL(job.job_link).hostname,
            status: JobStatus.PENDING,
            is_relevant: job.isRelevant,
            relevance_reasoning: job.reasoning || null,
            region: job.region,
            job_type: job.job_type,
            experience: job.experience,
            salary: job.salary,
            posted_date: new Date(job.posted_date),
            notes: null
        };
    }

    private mapJobListPageItem(job: AnalyzedJobListPageItem): Prisma.JobCreateInput {
        return {
            title: job.job_title,
            company: "",
            description: "",
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
            notes: null
        };
    }

    // TODO: test database insertion
    private async storeJob(job: AnalyzedJobPosting | AnalyzedJobListPageItem): Promise<void> {
        try {
            const data = "company" in job ? this.mapJobPosting(job as AnalyzedJobPosting) : this.mapJobListPageItem(job as AnalyzedJobListPageItem);
            await this.prisma.job.create({ data });
            console.log(`Stored job: ${job.job_title}`);
        } catch (error: unknown) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw error;
            } else {
                console.error(`Error storing job ${job.job_title}:`, error);
                throw error;
            }
        }
    }

    async storeJobsInDatabase(matchedJobs: AnalyzedJobPosting[], irrelevantJobs: AnalyzedJobListPageItem[]) {
        console.log(`Progress: Updating database with ${matchedJobs.length} matched jobs and ${irrelevantJobs.length} irrelevant jobs...`);
        for (const job of matchedJobs) {
            await this.storeJob(job);
        }
        for (const job of irrelevantJobs) {
            await this.storeJob(job);
        }
    }

    async findJobs(jobListUrls: string[]): Promise<{ matchedJobs: AnalyzedJobPosting[], irrelevantJobs: AnalyzedJobListPageItem[] }> {
        console.log(`Progress: Starting job extraction from ${jobListUrls.length} URL(s)...`);

        const dateThreshold = new Date();
        dateThreshold.setMonth(dateThreshold.getMonth() - 1);
        const today_iso = new Date().toISOString().split('T')[0];

        let initialScrapedJobs: z.infer<typeof JobListPageItemSchema>[] = [];

        // Step 1: Scrape job listing pages
        for (const jobListUrl of jobListUrls) {
            console.log(`Progress: Scraping initial job list from ${jobListUrl}...`);
            try {
                const initialScrapeResult = await this.firecrawl.scrapeUrl(jobListUrl, {
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
                }) as ScrapeResponse;

                if (!initialScrapeResult.success || !initialScrapeResult.json) {
                    console.warn(`Failed to scrape job list from ${jobListUrl}: ${initialScrapeResult.error || 'No data returned'}. Skipping this URL.`);
                    continue;
                }

                const parsedInitialData = JobListPageScrapeSchema.safeParse(initialScrapeResult.json);
                if (!parsedInitialData.success) {
                    console.error(`Failed to parse initial job list data from ${jobListUrl}:`, parsedInitialData.error.errors);
                    console.log(`Received data from ${jobListUrl}:`, JSON.stringify(initialScrapeResult.json, null, 2));
                    console.warn(`Could not parse data from job list page ${jobListUrl}. Skipping this URL.`);
                    continue;
                }
                initialScrapedJobs.push(...parsedInitialData.data.job_postings);
                console.log(`Progress: Found ${parsedInitialData.data.job_postings.length} jobs from ${jobListUrl}. Total initial jobs: ${initialScrapedJobs.length}`);

            } catch (e: any) {
                console.error(`Error in initial job list scrape for ${jobListUrl}: ${e.message}`);
            }
        }

        if (initialScrapedJobs.length === 0) {
            console.log('Progress: No jobs found in any initial scrape.');
            return { matchedJobs: [], irrelevantJobs: [] };
        }
        console.log(`Progress: Total ${initialScrapedJobs.length} jobs found in initial scrapes.`);

        // Step 1.1: deduplicate jobs
        const deduplicatedJobs = initialScrapedJobs.filter((job) => !this.isJobDuplicate(job.job_link));
        console.log(`Progress: Deduplicated ${initialScrapedJobs.length - deduplicatedJobs.length} jobs.`);

        // Step 2: Filter by posted date
        const recentJobs = deduplicatedJobs.filter(job => {
            try {
                const jobDate = new Date(job.posted_date_iso);
                return jobDate >= dateThreshold;
            } catch (dateError) {
                console.warn(`Could not parse date ${job.posted_date_iso} for job "${job.job_title}". Skipping.`);
                return false;
            }
        });
        console.log(`Progress: ${recentJobs.length} jobs are recent enough to process further.`);

        if (recentJobs.length === 0) {
            console.log('Progress: No recent job listings found.');
            return { matchedJobs: [], irrelevantJobs: [] };
        }

        // Step 2.1: Filter by relevance using OpenAI
        // const jobPreferences = await getJobPreferences();
        let relevantJobsFromAnalysis: Array<{ job: z.infer<typeof JobListPageItemSchema>, relevance: AIRelevanceResponse }> = [];
        try {
            const relevanceResults = await Promise.allSettled(
                recentJobs.map(job => this.relevanceAnalyzer.analyzeJobTitleRelevance(job.job_title))
            );
            relevantJobsFromAnalysis = relevanceResults
                .map((result, idx) => {
                    if (result.status === 'fulfilled') {
                        // Ensure result.value has the expected structure
                        if (typeof result.value === 'object' && result.value !== null && 'isRelevant' in result.value) {
                            return { job: recentJobs[idx], relevance: result.value as AIRelevanceResponse };
                        } else {
                            console.warn(`Relevance check for "${recentJobs[idx].job_title}" returned unexpected data:`, result.value);
                            return null; // Or handle as not relevant
                        }
                    } else {
                        console.warn(`Relevance check failed for "${recentJobs[idx].job_title}": ${result.reason}`);
                        return null;
                    }
                })
                .filter((item): item is { job: z.infer<typeof JobListPageItemSchema>, relevance: AIRelevanceResponse } => item !== null);
        } catch (err) {
            console.error('Error during job relevance analysis:', err);
            // relevantJobsFromAnalysis will remain empty or partially filled
        }

        // Filter jobs based on relevance
        const trulyRelevantJobs = relevantJobsFromAnalysis
            .filter(item => item.relevance.isRelevant)

        const irrelevantJobsForOutput = relevantJobsFromAnalysis
            .filter(item => !item.relevance.isRelevant)
            .map(item => ({ ...item.job, ...item.relevance })); // Combine job and relevance properties

        console.log(`Progress: ${trulyRelevantJobs.length} jobs are considered relevant after AI analysis.`);
        console.log(`Progress: ${irrelevantJobsForOutput.length} jobs were filtered out by AI analysis as irrelevant.`);


        if (trulyRelevantJobs.length === 0) {
            console.log('Progress: No relevant job listings found after AI analysis.');
            // Still write irrelevant jobs to file
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
            const outputPath = path.resolve(__dirname, `job-results-${timestamp}.json`);
            const outputData = {
                matchedJobs: [],
                irrelevantJobs: irrelevantJobsForOutput
            };
            fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
            console.log(`Progress: Job search completed! 0 matched jobs. ${irrelevantJobsForOutput.length} irrelevant job(s) written to ${outputPath}`);
            return outputData;
        }

        // Step 3: Scrape job listing details for filtered posts
        const matchedJobs: (JobPosting & AIRelevanceResponse)[] = [];
        console.log(`Progress: Scraping details for ${trulyRelevantJobs.length} relevant jobs...`);

        for (let i = 0; i < trulyRelevantJobs.length; i++) {
            const jobListItem = trulyRelevantJobs[i];
            console.log(`Progress: Scraping details for "${jobListItem.job.job_title}" (${i + 1}/${trulyRelevantJobs.length})...`);
            try {
                const detailScrapeResult = await this.firecrawl.scrapeUrl(jobListItem.job.job_link, {
                    formats: ['json'],
                    jsonOptions: {
                        schema: JobDetailScrapeSchema,
                        prompt: "From the content of this job posting, extract the following details: region, role (specific role like 'Frontend Developer', not a general category), required experience level (experience), company name (company), job type (job_type, e.g., full-time, remote), and salary (salary) if mentioned.",
                    },
                    onlyMainContent: true
                }) as ScrapeResponse;

                if (!detailScrapeResult.success || !detailScrapeResult.json) {
                    console.warn(`Failed to scrape details for ${jobListItem.job.job_link}: ${detailScrapeResult.error || 'No data returned'}. Skipping this job.`);
                    continue;
                }

                const parsedDetailData = JobDetailScrapeSchema.safeParse(detailScrapeResult.json);
                if (!parsedDetailData.success) {
                    console.warn(`Failed to parse job details for ${jobListItem.job.job_link}:`, parsedDetailData.error.errors);
                    console.log('Received detail data:', JSON.stringify(detailScrapeResult.json, null, 2));
                    continue;
                }

                const jobDetails = parsedDetailData.data;
                matchedJobs.push({
                    ...jobDetails,
                    ...jobListItem.job,
                    ...jobListItem.relevance,
                    job_title: jobListItem.job.job_title,
                    job_link: jobListItem.job.job_link,
                    posted_date: jobListItem.job.posted_date_iso,
                    job_posting_id: jobListItem.job.job_link, // Assign job_link as job_posting_id
                });

            } catch (e: any) {
                console.error(`Error scraping details for ${jobListItem.job.job_link}: ${e.message}. Skipping this job.`);
            }
            // Optional: Add a small delay to avoid overwhelming the server
            // await new Promise(resolve => setTimeout(resolve, 1000)); 
        }

        // Step 4: Write results to JSON file
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
        const outputPath = path.resolve(__dirname, `job-results-${timestamp}.json`);
        const outputData = {
            matchedJobs: matchedJobs,
            irrelevantJobs: irrelevantJobsForOutput
        };

        if (matchedJobs.length > 0 || irrelevantJobsForOutput.length > 0) {
            fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
            console.log(`Progress: Job search completed! ${matchedJobs.length} matched job details and ${irrelevantJobsForOutput.length} irrelevant jobs written to ${outputPath}`);
        } else {
            console.log('Progress: No job details could be extracted and no irrelevant jobs found.');
        }
        return outputData;
    }
}


export default JobHuntingAgent; 