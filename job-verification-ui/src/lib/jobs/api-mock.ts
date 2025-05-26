import axios from "axios";
import { JobStatus, Job, PaginatedResponse } from "./api"; // Import types from original api.ts

// Define the API base URL for the mock server
const API_MOCK_BASE_URL = "http://localhost:3001";

// Create an axios instance with default config for the mock server
const mockApi = axios.create({
  baseURL: API_MOCK_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

interface GetJobsMockParams {
  _page: number;
  _limit: number;
  _sort: string;
  _order: "asc" | "desc";
  status?: JobStatus;
  // Add other potential filter params here if needed
}

// API functions for jobs (mock implementation)
export const jobsApiMock = {
  // Get jobs with pagination and filters
  getJobs: async (
    status?: JobStatus, // Optional status
    page: number = 1,
    limit: number = 10,
    sortBy: string = "created_at",
    sortOrder: "asc" | "desc" = "desc",
  ): Promise<PaginatedResponse<Job>> => {
    const params: GetJobsMockParams = {
      _page: page,
      _limit: limit,
      _sort: sortBy,
      _order: sortOrder,
    };
    if (status) {
      params.status = status;
    }
    const response = await mockApi.get("/jobs", {
      params,
    });
    const totalCount = parseInt(response.headers["x-total-count"] || "0", 10);
    return {
      data: response.data,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
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
    const payload: Partial<Job> = { status };
    if (notes !== undefined) {
      payload.notes = notes;
    }
    const response = await mockApi.patch(`/jobs/${id}`, payload);
    return response.data;
  },
};

export default mockApi;
