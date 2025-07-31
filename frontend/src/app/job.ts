import { JobStatus } from "@/lib/jobs/api";
import { queryOptions } from "@tanstack/react-query";
import { jobsClient } from '@/lib/jobs/client';


const mapRelevanceToBoolean = (isRelevant: 'all' | 'relevant' | 'not-relevant') => {
    switch (isRelevant) {
        case 'all':
            return undefined;
        case 'relevant':
            return true;
        case 'not-relevant':
            return false;
    }
}

export const jobOptions = (page: number, limit: number, isRelevant: 'all' | 'relevant' | 'not-relevant') => queryOptions({
  queryKey: ["jobs", JobStatus.PENDING, page, limit, isRelevant],
  queryFn: () => jobsClient.getJobs(
    JobStatus.PENDING, 
    page, 
    limit, 
    "created_at", 
    "desc", 
    mapRelevanceToBoolean(isRelevant)
  ),
});
