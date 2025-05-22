import { JobStatus } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";

export const jobOptions = (page: number, limit: number) => queryOptions({
  queryKey: ["jobs", JobStatus.PENDING, page, limit],
  queryFn: () => jobsApi.getJobs(JobStatus.PENDING, page, limit),
});
