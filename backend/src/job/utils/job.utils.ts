import { Prisma, JobStatus } from '@prisma/client';
import { AnalyzedJobPosting } from '../models/job.models';

export function mapJobPosting(job: AnalyzedJobPosting): Prisma.JobCreateInput {
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

export function mapJobListPageItem(
  job: AnalyzedJobPosting,
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
