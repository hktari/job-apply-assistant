import { JobStatus } from "@/lib/jobs/api";
import { queryOptions } from "@tanstack/react-query";
import { jobsClient } from '@/lib/jobs/client';


export const jobOptions = (page: number, limit: number) => queryOptions({
  queryKey: ["jobs", JobStatus.PENDING, page, limit],
  queryFn: () => jobsClient.getJobs(JobStatus.PENDING, page, limit),
});
