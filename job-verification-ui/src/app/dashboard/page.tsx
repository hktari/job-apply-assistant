
import { useState } from "react";
import { jobsApi, JobStatus } from "@/lib/jobs/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { getQueryClient } from "@/lib/get-query-client";
import DashboardContent from "./dashboardContent";
import DashboardFooter from "./dashboardFooter";
import { jobOptions } from "../job";

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const queryClient = getQueryClient();
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
