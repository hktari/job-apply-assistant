'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsClient, JobStatus } from '@/lib/jobs/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { getQueryClient } from '@/lib/get-query-client';
import { editJobSchema, UpdateJobRequest } from '@/lib/jobs/api';
import { toast } from 'sonner';

const verificationSchema = z.object({
  notes: z.string().optional(),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

type JobDetailPageParams = {
  params: Promise<{ id: string }>;
};

export default function JobDetailPage({ params }: JobDetailPageParams) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const queryClient = getQueryClient();
  const jobId = parseInt(resolvedParams.id, 10);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    'approve' | 'reject' | 'applied' | null
  >(null);

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsClient.getJob(jobId),
  });

  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { notes: '' },
  });

  const editForm = useForm<UpdateJobRequest>({
    resolver: zodResolver(editJobSchema),
  });

  useEffect(() => {
    if (job) {
      editForm.reset({
        ...job,
      });
    }
  }, [job, editForm]);

  const verifyMutation = useMutation({
    mutationFn: ({ status, notes }: { status: JobStatus; notes?: string }) =>
      jobsClient.verifyJob(jobId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      setDialogOpen(false);
      router.push('/dashboard');
    },
    onError: (error) => {
      toast.error('Error Verifying Job', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateJobRequest) => jobsClient.updateJob(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Error Updating Job', {
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
      });
      setIsEditing(false);
    },
  });

  const handleAction = (type: 'approve' | 'reject' | 'applied') => {
    setActionType(type);
    setDialogOpen(true);
  };

  const onVerificationSubmit = (values: VerificationFormValues) => {
    if (actionType === 'approve') {
      verifyMutation.mutate({
        status: JobStatus.APPROVED,
        notes: values.notes,
      });
    } else if (actionType === 'reject') {
      verifyMutation.mutate({
        status: JobStatus.REJECTED,
        notes: values.notes,
      });
    } else if (actionType === 'applied') {
      verifyMutation.mutate({ status: JobStatus.APPLIED, notes: values.notes });
    }
  };

  const onEditSubmit = (values: UpdateJobRequest) => {
    updateMutation.mutate(values);
  };

  if (isLoading)
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    );
  if (isError)
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-red-500'>Error: {error.message}</p>
      </div>
    );
  if (!job)
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-muted-foreground'>Job not found</p>
      </div>
    );

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='flex-grow'>
          {isEditing ? (
            <FormField
              control={editForm.control}
              name='title'
              render={({ field }) => (
                <Input
                  {...field}
                  className='text-2xl font-bold tracking-tight sm:text-3xl'
                />
              )}
            />
          ) : (
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {job.title}
            </h1>
          )}
          {isEditing ? (
            <FormField
              control={editForm.control}
              name='company'
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value}
                  placeholder='Company Name'
                  className='text-muted-foreground'
                />
              )}
            />
          ) : (
            <p className='text-muted-foreground'>
              {job.company || 'Unknown Company'}
            </p>
          )}
        </div>
        <div className='flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end'>
          {!isEditing ? (
            <>
              <Button
                variant='outline'
                onClick={() => router.push('/dashboard')}
                className='w-full sm:w-auto'
              >
                Back
              </Button>
              <Button
                variant='outline'
                onClick={() => setIsEditing(true)}
                className='w-full sm:w-auto'
              >
                Edit
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleAction('reject')}
                disabled={verifyMutation.isPending}
                className='w-full sm:w-auto'
              >
                Reject
              </Button>
              <Button
                onClick={() => handleAction('approve')}
                disabled={verifyMutation.isPending}
                className='w-full sm:w-auto'
              >
                Approve
              </Button>
              <Button
                onClick={() => handleAction('applied')}
                disabled={verifyMutation.isPending}
                className='w-full bg-green-600 sm:w-auto'
              >
                Mark as Applied
              </Button>
            </>
          ) : (
            <>
              <Button
                variant='outline'
                onClick={() => setIsEditing(false)}
                className='w-full sm:w-auto'
              >
                Cancel
              </Button>
              <Button
                onClick={editForm.handleSubmit(onEditSubmit)}
                disabled={updateMutation.isPending}
                className='w-full sm:w-auto'
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs
        defaultValue='details'
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-1 sm:grid-cols-2 md:w-[400px]'>
          <TabsTrigger value='details'>Job Details</TabsTrigger>
          <TabsTrigger value='relevance'>Relevance Analysis</TabsTrigger>
        </TabsList>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <TabsContent value='details' className='mt-4 space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Job Information</CardTitle>
                  <CardDescription>
                    Review and edit the job details.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        Region
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='region'
                          render={({ field }) => (
                            <Input {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <p>{job.region || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        Job Type
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='job_type'
                          render={({ field }) => (
                            <Input {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <p>{job.job_type || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        Experience
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='experience'
                          render={({ field }) => (
                            <Input {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <p>{job.experience || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        Salary
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='salary'
                          render={({ field }) => (
                            <Input {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <p>{job.salary || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        Posted Date
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='posted_date'
                          render={({ field }) => (
                            <Input type='date' {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <p>
                          {job.posted_date
                            ? format(new Date(job.posted_date), 'MMMM d, yyyy')
                            : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className='text-muted-foreground text-sm font-medium'>
                        URL
                      </h3>
                      {isEditing ? (
                        <FormField
                          control={editForm.control}
                          name='url'
                          render={({ field }) => (
                            <Input {...field} value={field.value} />
                          )}
                        />
                      ) : (
                        <a
                          href={job.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='break-all text-blue-600 hover:underline'
                        >
                          {job.url}
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className='text-muted-foreground mb-2 text-sm font-medium'>
                      Description
                    </h3>
                    {isEditing ? (
                      <FormField
                        control={editForm.control}
                        name='description'
                        render={({ field }) => (
                          <Textarea {...field} value={field.value} rows={10} />
                        )}
                      />
                    ) : (
                      <div className='max-h-96 overflow-y-auto rounded-md border p-4 whitespace-pre-line'>
                        {job.description || 'No description'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value='relevance' className='mt-4 space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Relevance Analysis</CardTitle>
                  <CardDescription>
                    Review and edit the AI-generated relevance analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    {isEditing ? (
                      <FormField
                        control={editForm.control}
                        name='is_relevant'
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            id='is-relevant-edit'
                          />
                        )}
                      />
                    ) : (
                      <Checkbox
                        id='is-relevant'
                        checked={job.is_relevant}
                        disabled
                      />
                    )}
                    <label
                      htmlFor={isEditing ? 'is-relevant-edit' : 'is-relevant'}
                      className='text-sm font-medium'
                    >
                      This job is relevant
                    </label>
                  </div>
                  <div>
                    <h3 className='text-muted-foreground mb-2 text-sm font-medium'>
                      Reasoning
                    </h3>
                    {isEditing ? (
                      <FormField
                        control={editForm.control}
                        name='relevance_reasoning'
                        render={({ field }) => (
                          <Textarea {...field} value={field.value} rows={5} />
                        )}
                      />
                    ) : (
                      <div className='rounded-md border p-4 whitespace-pre-line'>
                        {job.relevance_reasoning || 'No reasoning provided'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Form>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Job' : 'Reject Job'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This job will be marked as approved.'
                : 'This job will be marked as rejected.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...verificationForm}>
            <form
              onSubmit={verificationForm.handleSubmit(onVerificationSubmit)}
              className='space-y-4'
            >
              <FormField
                control={verificationForm.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder='Add notes...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setDialogOpen(false)}
                  disabled={verifyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending
                    ? 'Processing...'
                    : `Confirm ${actionType}`}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
