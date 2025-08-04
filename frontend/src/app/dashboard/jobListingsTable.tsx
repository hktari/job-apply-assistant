import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Link from 'next/link';
import { jobsApi, PaginatedResponse, Job } from '@/lib/jobs/api';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

type Props = {
  jobs: Job[];
  page: number;
  limit: number;
  relevance: 'all' | 'relevant' | 'not-relevant';
};

const JobListingsTable = ({ jobs, page, limit, relevance }: Props) => {
  const queryClient = useQueryClient();
  const [rerunningJobId, setRerunningJobId] = useState<number | null>(null);

  const rerunAnalysisMutation = useMutation({
    mutationFn: (jobId: number) => jobsApi.rerunAnalysis(jobId),
    onMutate: (jobId: number) => {
      setRerunningJobId(jobId);
    },
    onSuccess: (updatedJob: Job, jobId: number) => {
      // Update the specific job in the jobs list cache
      queryClient.setQueryData(
        ['jobs', { page, limit, relevance }],
        (oldData: PaginatedResponse<Job> | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map((job: Job) =>
              job.id === jobId ? updatedJob : job
            ),
          };
        }
      );
      
      // Also update the individual job cache if it exists
      queryClient.setQueryData(['job', jobId], updatedJob);
      
      toast.success('Relevance analysis updated successfully');
      setRerunningJobId(null);
    },
    onError: (error: Error, jobId: number) => {
      toast.error('Failed to rerun analysis', {
        description: error.message,
      });
      setRerunningJobId(null);
    },
  });

  const handleRerunAnalysis = (jobId: number) => {
    rerunAnalysisMutation.mutate(jobId);
  };

  return (
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
          {jobs.map((job) => (
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
                    disabled={rerunningJobId === job.id}
                    title='Rerun relevance analysis'
                  >
                    {rerunningJobId === job.id ? (
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
  );
};

export default JobListingsTable;
