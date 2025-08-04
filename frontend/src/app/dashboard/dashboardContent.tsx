import { useSuspenseQuery } from '@tanstack/react-query';
import React from 'react';
import { isError } from 'util';
import { jobOptions } from '../job';
import JobListingsTable from './jobListingsTable';

type Props = {
  page: number;
  limit: number;
  relevance: 'all' | 'relevant' | 'not-relevant';
  onPageChange: (page: number) => void;
  totalPages: number;
};

const DashboardContent = (props: Props) => {
  const { data, error } = useSuspenseQuery(
    jobOptions(props.page, props.limit, props.relevance),
  );

  const isLoading = !data && !error;
  const isError = error instanceof Error;

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
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Job Listings</h2>
            <p className="text-muted-foreground">
              Found {data.meta.total} jobs, showing page {props.page} of{' '}
              {Math.ceil(data.meta.total / props.limit)}
            </p>
          </div>
          <JobListingsTable jobs={data.data} />
        </>
      )}
    </>
  );
};

export default DashboardContent;
