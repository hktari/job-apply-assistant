import z from 'zod';

// Schema for items from the main job listing page
export const JobListPageItemSchema = z
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

export const JobListPageScrapeSchema = z.object({
  job_postings: z.array(JobListPageItemSchema),
});

// Schema for details scraped from individual job posting pages
export const JobDetailScrapeSchema = z
  .object({
    region: z.string(),
    role: z.string(),
    experience: z.string(),
    company: z.string(),
    job_type: z.string(),
    salary: z.string(),
  })
  .describe('Details scraped from individual job posting pages');

export type AnalyzedJobPosting = JobListPageItem & {
  isRelevant: boolean;
  reasoning: string | null;
};

export type JobListPageItem = z.infer<typeof JobListPageItemSchema>;
export type JobListPageScrape = z.infer<typeof JobListPageScrapeSchema>;
export type JobDetailScrape = z.infer<typeof JobDetailScrapeSchema>;
