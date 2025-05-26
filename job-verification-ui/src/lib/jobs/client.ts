import { jobsApi as realJobsApi, Job, JobStatus, PaginatedResponse } from './api';
import { jobsApiMock } from './api-mock';

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === '1';

export const jobsClient = useMock ? jobsApiMock : realJobsApi;

// Re-export types if needed, though components should ideally import them from api.ts
export { JobStatus }; // Export JobStatus as a value (enum) and its type
export type { Job, PaginatedResponse }; // Keep these as type-only exports