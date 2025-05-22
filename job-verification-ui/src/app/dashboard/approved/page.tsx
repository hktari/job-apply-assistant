'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, JobStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ApprovedJobsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['jobs', JobStatus.APPROVED, page, limit],
    queryFn: () => jobsApi.getJobs(JobStatus.APPROVED, page, limit),
  });

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < data.meta.totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Approved Jobs</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved Job Listings</CardTitle>
          <CardDescription>
            Jobs that have been verified and approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-red-500">Error loading jobs: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No approved jobs found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Posted</TableHead>
                    <TableHead>Relevance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.company || 'N/A'}</TableCell>
                      <TableCell>{job.source}</TableCell>
                      <TableCell>
                        {job.posted_date
                          ? format(new Date(job.posted_date), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {job.is_relevant ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Relevant
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            Not Relevant
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {data && data.meta.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= data.meta.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
