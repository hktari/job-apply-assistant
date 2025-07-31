
'use client';
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { jobsApi } from "@/lib/jobs/api";
import { getQueryClient } from "@/lib/get-query-client";
import DashboardContent from "./dashboardContent";
import DashboardFooter from "./dashboardFooter";
import { jobOptions } from "../job";
import { useSuspenseQuery } from "@tanstack/react-query";
import DashboardFilter from "./dashboardFilter";

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [relevance, setRelevance] = useState<'all' | 'relevant' | 'not-relevant'>('all');

  const queryClient = getQueryClient();
  const { data } = useSuspenseQuery(jobOptions(page, limit, relevance));
  
  const totalPages = Math.ceil((data?.meta.total || 0) / limit);


  const handleRelevanceChange = (newRelevance: 'all' | 'relevant' | 'not-relevant') => {
    setRelevance(newRelevance);
    setPage(1);
    void queryClient.prefetchQuery(jobOptions(1, limit, newRelevance));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    void queryClient.prefetchQuery(jobOptions(newPage, limit, relevance));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pending Jobs</h1>
        <button
          onClick={() => {
            jobsApi.triggerJobDiscovery()
              .then(() => {
                // Optionally show a success toast
                alert('Job discovery started');
              })
              .catch((error: Error) => {
                console.error('Failed to trigger job discovery:', error);
                alert('Failed to trigger job discovery');
              });
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Discover Jobs
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Listings</CardTitle>
          <CardDescription>
            Review and verify job postings that need human verification.
          </CardDescription>
          <DashboardFilter 
            page={page}
            limit={limit}
            relevance={relevance}
            setRelevance={handleRelevanceChange}
            onPageChange={handlePageChange}
            totalPages={totalPages}
          />
        </CardHeader>
        <CardContent>
          <DashboardContent 
              page={page} 
              limit={limit} 
              relevance={relevance}
              onPageChange={handlePageChange}
              totalPages={totalPages}
            />
        </CardContent>
        <DashboardFooter page={page} setPage={setPage} limit={limit} />
      </Card>
    </div>
  );
}
