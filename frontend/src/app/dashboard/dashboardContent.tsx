import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { isError } from 'util';
import { jobOptions } from '../job';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { jobsApi } from '@/lib/jobs/api';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

type Props = {
  page: number;
  limit: number;
  relevance: 'all' | 'relevant' | 'not-relevant';
  onPageChange: (page: number) => void;
  totalPages: number;
};

const DashboardContent = (props: Props) => {
  const queryClient = useQueryClient();
  const { data, error } = useSuspenseQuery(
    jobOptions(props.page, props.limit, props.relevance),
  );

  const isLoading = !data && !error;
  const isError = error instanceof Error;

  const rerunAnalysisMutation = useMutation({
    mutationFn: (jobId: number) => jobsApi.rerunAnalysis(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Relevance analysis updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to rerun analysis', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleRerunAnalysis = (jobId: number) => {
    rerunAnalysisMutation.mutate(jobId);
  };

  return (
    <>
      {isLoading ? (
        <div className='flex items-center justify-center py-8'>
          <p className='text-muted-foreground'>Loading jobs...</p>
        </div>
      ) : isError ? (
        <div className='flex items-center justify-center py-8'>
          <p className='text-red-500'>
            Error loading jobs:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : data?.data.length === 0 ? (
        <div className='flex items-center justify-center py-8'>
          <p className='text-muted-foreground'>No pending jobs found.</p>
        </div>
      ) : (
        <div>
          <div className='rounded-md border'>
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
                    <TableCell className='font-medium'>{job.title}</TableCell>
                    <TableCell>{job.company || 'N/A'}</TableCell>
                    <TableCell>{job.source}</TableCell>
                    <TableCell>
                      {job.posted_date
                        ? format(new Date(job.posted_date), 'MMM d, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {job.is_relevant ? (
                        <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'>
                          Relevant
                        </span>
                      ) : (
                        <span className='inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'>
                          Not Relevant
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Button variant='outline' size='sm'>
                            Review
                          </Button>
                        </Link>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handleRerunAnalysis(job.id)}
                          disabled={rerunAnalysisMutation.isPending}
                        >
                          {rerunAnalysisMutation.isPending ? (
                            <RefreshCw className='h-4 w-4 animate-spin' />
                          ) : (
                            <RefreshCw className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardContent;
