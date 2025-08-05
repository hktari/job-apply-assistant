'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { jobsClient, CreateManualJobRequest } from '@/lib/jobs/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/utils';

// Define form validation schema
const formSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  url: z.string().url('Must be a valid URL'),
  notes: z.string().optional(),
});

export default function AddJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      company: '',
      url: '',
      notes: '',
    },
  });

  // Set up mutation for adding a job
  const addJobMutation = useMutation({
    mutationFn: (data: CreateManualJobRequest) => jobsClient.addManualJob(data),
    onSuccess: () => {
      toast.success('Job Added Successfully!', {
        description:
          'The job has been added and automatically approved. You can view it in the approved jobs list.',
      });
      router.push('/dashboard/approved');
    },
    onError: (error) => {
      const { title, description } = getErrorMessage(error);
      toast.error(title, {
        description,
        duration: 5000, // Show error longer for better visibility
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    addJobMutation.mutate({
      title: values.title?.trim() || undefined,
      company: values.company?.trim() || undefined,
      url: values.url,
      notes: values.notes || null,
    });
  };

  return (
    <div className='container mx-auto py-6'>
      <Card className='mx-auto max-w-2xl'>
        <CardHeader>
          <CardTitle>Add Job</CardTitle>
          <CardDescription>
            Add a job posting manually. The job will be automatically approved.
            Missing fields will be populated automatically by scraping the job URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='Software Engineer (will be scraped if empty)' {...field} />
                    </FormControl>
                    <FormDescription>
                      If left empty, the job title will be automatically scraped from the job URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='company'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='Acme Inc. (will be scraped if empty)' {...field} />
                    </FormControl>
                    <FormDescription>
                      If left empty, the company name will be automatically scraped from the job URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://example.com/jobs/123'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Any additional notes about this job...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end space-x-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Job'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
