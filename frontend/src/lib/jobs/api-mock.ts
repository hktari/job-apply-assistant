import axios from 'axios';
import {
  JobStatus,
  Job,
  PaginatedResponse,
  CreateManualJobRequest,
  UpdateJobRequest,
} from './api'; // Import types from original api.ts

// Define the API base URL for the mock server
const API_MOCK_BASE_URL = 'http://localhost:3001';

// Create an axios instance with default config for the mock server
const mockApi = axios.create({
  baseURL: API_MOCK_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface GetJobsMockParams {
  _page: number;
  _per_page: number;
  _sort: string;
  _order: 'asc' | 'desc';
  status?: JobStatus;
  is_relevant?: boolean;
}
interface JsonServerResponse {
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
  pages: number;
  items: number;
  data: Job[];
}

// API functions for jobs (mock implementation)
export const jobsApiMock = {
  // Get jobs with pagination and filters
  getJobs: async (
    status?: JobStatus, // Optional status
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    isRelevant?: boolean,
  ): Promise<PaginatedResponse<Job>> => {
    const params: GetJobsMockParams = {
      _page: page,
      _per_page: limit,
      _sort: sortBy,
      _order: sortOrder,
    };
    if (status) {
      params.status = status;
    }

    if (isRelevant) {
      params.is_relevant = isRelevant;
    }

    const response = await mockApi.get('/jobs', {
      params,
    });
    if (response.data) {
      const totalCount = response.data.items;
      const totalPages = response.data.pages;
      return {
        data: response.data.data,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      };
    } else {
      throw new Error('Failed to fetch jobs');
    }
  },

  // Get a single job by ID
  getJob: async (id: number): Promise<Job> => {
    const response = await mockApi.get(`/jobs/${id}`);
    return response.data;
  },

  // Update job verification status
  verifyJob: async (
    id: number,
    status: JobStatus,
    notes?: string,
  ): Promise<Job> => {
    const response = await mockApi.patch(`/jobs/${id}/verify`, {
      status,
      notes,
    });
    return response.data;
  },

  updateJob: async (id: number, jobData: UpdateJobRequest): Promise<Job> => {
    const response = await mockApi.patch(`/jobs/${id}`, jobData);
    return response.data;
  },

  // Add a job manually
  addManualJob: async (jobData: CreateManualJobRequest): Promise<Job> => {
    const response = await mockApi.post('/jobs', jobData);
    return response.data;
  },
};

export default mockApi;
