'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Plus, ArrowLeft } from 'lucide-react';

// Define form validation schema
const formSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export default function AddJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      title: '',
      company: '',
      notes: '',
    },
  });

  // Focus URL input on mount and after successful submission
  useEffect(() => {
    if (urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [addedCount]);

  // Set up mutation for adding a job
  const addJobMutation = useMutation({
    mutationFn: (data: CreateManualJobRequest) => jobsClient.addManualJob(data),
    onSuccess: () => {
      const newCount = addedCount + 1;
      setAddedCount(newCount);
      toast.success('Job Added Successfully!', {
        description: `Job ${newCount} added and auto-approved. Ready to add another job.`,
        duration: 2000, // Shorter duration for faster workflow
      });
      // Reset form for next job
      form.reset({
        url: '',
        title: '',
        company: '',
        notes: '',
      });
      setIsSubmitting(false);
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

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
    }
    // Escape to go back
    if (event.key === 'Escape') {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <div className='container mx-auto py-6' onKeyDown={handleKeyDown}>
      <Card className='mx-auto max-w-2xl'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Plus className='h-5 w-5' />
            Add Job {addedCount > 0 && `(${addedCount} added)`}
          </CardTitle>
          <CardDescription>
            Add job postings quickly. Just paste the URL and hit{' '}
            <kbd className='bg-muted rounded px-1.5 py-0.5 text-xs'>
              Ctrl+Enter
            </kbd>{' '}
            to submit. Missing fields will be populated automatically by
            scraping the job URL.
            <br />
            <span className='text-muted-foreground mt-1 block text-xs'>
              💡 Tip: Use{' '}
              <kbd className='bg-muted rounded px-1 py-0.5 text-xs'>Tab</kbd> to
              navigate,{' '}
              <kbd className='bg-muted rounded px-1 py-0.5 text-xs'>
                Ctrl+Enter
              </kbd>{' '}
              to submit,{' '}
              <kbd className='bg-muted rounded px-1 py-0.5 text-xs'>Esc</kbd> to
              go back
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              {/* URL field first - most important for workflow */}
              <FormField
                control={form.control}
                name='url'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-base font-semibold'>
                      Job URL *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://example.com/jobs/123'
                        className='text-base'
                        autoComplete='off'
                        {...field}
                        ref={(el) => {
                          field.ref(el);
                          urlInputRef.current = el;
                        }}
                      />
                    </FormControl>
                    <FormDescription className='text-sm'>
                      Paste the job URL here. Other fields will be auto-filled
                      from this URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collapsible optional fields */}
              <details className='group'>
                <summary className='text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors'>
                  <span className='group-open:hidden'>
                    ▶ Show optional fields (auto-filled if empty)
                  </span>
                  <span className='hidden group-open:inline'>
                    ▼ Hide optional fields
                  </span>
                </summary>
                <div className='border-muted mt-4 space-y-4 border-l-2 pl-4'>
                  <FormField
                    control={form.control}
                    name='title'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Will be scraped if empty'
                            {...field}
                          />
                        </FormControl>
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
                          <Input
                            placeholder='Will be scraped if empty'
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
                            placeholder='Any additional notes...'
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>

              <div className='flex items-center justify-between pt-4'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className='flex items-center gap-2'
                >
                  <ArrowLeft className='h-4 w-4' />
                  Back
                </Button>

                <div className='flex space-x-3'>
                  <Button
                    type='submit'
                    disabled={isSubmitting || !form.watch('url')}
                    className='min-w-[120px]'
                  >
                    {isSubmitting
                      ? 'Adding...'
                      : addedCount > 0
                        ? 'Add Another'
                        : 'Add Job'}
                  </Button>

                  {addedCount > 0 && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => router.push('/dashboard/approved')}
                      disabled={isSubmitting}
                    >
                      View Added Jobs ({addedCount})
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
