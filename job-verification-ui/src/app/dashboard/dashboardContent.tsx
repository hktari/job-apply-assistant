import { Button } from '@/components/ui/button'
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import { isError } from 'util'
import { jobOptions } from '../job'
import { format } from 'date-fns'
import Link from 'next/link'

type Props = {
    page: number;
    limit: number;
}

const DashboardContent = (props: Props) => {
    const { data, error } = useSuspenseQuery(jobOptions(props.page, props.limit))

    const isLoading = !data && !error
    const isError = error instanceof Error

  return (
    <>
    {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-red-500">
            Error loading jobs:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No pending jobs found.</p>
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
                  <TableCell>{job.company || "N/A"}</TableCell>
                  <TableCell>{job.source}</TableCell>
                  <TableCell>
                    {job.posted_date
                      ? format(new Date(job.posted_date), "MMM d, yyyy")
                      : "N/A"}
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
                        Review
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

export default DashboardContent