import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useState } from 'react';

type Props = {
  page: number;
  limit: number;
  relevance: 'all' | 'relevant' | 'not-relevant';
  setRelevance: (filter: 'all' | 'relevant' | 'not-relevant') => void;
  onPageChange: (page: number) => void;
  totalPages: number;
};

const DashboardFilter = (props: Props) => {
  return (
    <div className='mb-4 flex items-center justify-between'>
      <Select
        value={props.relevance}
        onValueChange={(value: 'all' | 'relevant' | 'not-relevant') =>
          props.setRelevance(value)
        }
      >
        <SelectTrigger className='w-[180px]'>
          <SelectValue placeholder='Filter by relevance' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Jobs</SelectItem>
          <SelectItem value='relevant'>Relevant Only</SelectItem>
          <SelectItem value='not-relevant'>Not Relevant Only</SelectItem>
        </SelectContent>
      </Select>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => props.onPageChange(props.page - 1)}
          disabled={props.page === 1}
        >
          Previous
        </Button>
        <span className='flex items-center px-2'>
          Page {props.page} of {props.totalPages}
        </span>
        <Button
          variant='outline'
          size='sm'
          onClick={() => props.onPageChange(props.page + 1)}
          disabled={props.page === props.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default DashboardFilter;
