import axios from "axios";

// Define the API base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Define types based on the Prisma schema
export enum JobStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  APPLIED = "APPLIED",
  INTERVIEW = "INTERVIEW",
  REJECTED_BY_COMPANY = "REJECTED_BY_COMPANY",
}

export interface Job {
  id: number;
  title: string;
  company: string | null;
  description: string | null;
  url: string;
  source: string;
  status: JobStatus;
  is_relevant: boolean;
  relevance_reasoning: string | null;
  region: string | null;
  job_type: string | null;
  experience: string | null;
  salary: string | null;
  posted_date: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}
export interface CreateManualJobRequest {
  title: Job["title"];
  company: Job["company"];
  url: Job["url"];
  notes: Job["notes"];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// API functions for jobs
export const jobsApi = {
  // Get jobs with pagination and filters
  getJobs(
    status: JobStatus = JobStatus.PENDING,
    page: number = 1,
    limit: number = 10,
    sortBy: string = "created_at",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<PaginatedResponse<Job>> {
    return api
      .get("/jobs", {
        params: { status, page, limit, sortBy, sortOrder },
      })
      .then((response) => response.data);
  },

  // Get a single job by ID
  getJob(id: number): Promise<Job> {
    return api.get(`/jobs/${id}`).then((response) => response.data);
  },

  // Update job verification status
  verifyJob(
    id: number,
    status: JobStatus,
    notes?: string,
  ): Promise<Job> {
    return api
      .patch(`/jobs/${id}/verify`, { status, notes })
      .then((response) => response.data);
  },

  // Add a job manually
  addManualJob(jobData: CreateManualJobRequest): Promise<Job> {
    return api
      .post("/jobs/manual", jobData)
      .then((response) => response.data);
  },
};

export default api;
