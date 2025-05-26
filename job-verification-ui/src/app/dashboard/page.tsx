
'use client';
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getQueryClient } from "@/lib/get-query-client";
import DashboardContent from "./dashboardContent";
import DashboardFooter from "./dashboardFooter";
import { jobOptions } from "../job";

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const queryClient = getQueryClient();
  
console.log(process.env.NEXT_PUBLIC_USE_MOCK_API);
  void queryClient.prefetchQuery(jobOptions(page, limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pending Jobs</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Listings</CardTitle>
          <CardDescription>
            Review and verify job postings that need human verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardContent page={page} limit={limit} />
        </CardContent>
        <DashboardFooter page={page} setPage={setPage} limit={limit} />
      </Card>
    </div>
  );
}
