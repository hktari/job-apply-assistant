'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, JobStatus } from '@/lib/jobs/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

// Form schema for job verification
const verificationSchema = z.object({
  notes: z.string().optional(),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = parseInt(params.id, 10);
  const [activeTab, setActiveTab] = useState('details');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Fetch job details
  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.getJob(jobId),
  });

  // Form for verification notes
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      notes: '',
    },
  });

  // Mutation for verifying job
  const verifyMutation = useMutation({
    mutationFn: ({ status, notes }: { status: JobStatus; notes?: string }) => 
      jobsApi.verifyJob(jobId, status, notes),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      // Close dialog and redirect to dashboard
      setDialogOpen(false);
      router.push('/dashboard');
    },
  });

  // Handle approve/reject actions
  const handleAction = (type: 'approve' | 'reject') => {
    setActionType(type);
    setDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (values: VerificationFormValues) => {
    if (actionType === 'approve') {
      verifyMutation.mutate({ status: JobStatus.APPROVED, notes: values.notes });
    } else if (actionType === 'reject') {
      verifyMutation.mutate({ status: JobStatus.REJECTED, notes: values.notes });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">Error loading job details: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground">{job.company || 'Unknown Company'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
          >
            Back to List
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => handleAction('reject')}
            disabled={verifyMutation.isPending}
          >
            Reject
          </Button>
          <Button 
            variant="default" 
            onClick={() => handleAction('approve')}
            disabled={verifyMutation.isPending}
          >
            Approve
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="details">Job Details</TabsTrigger>
          <TabsTrigger value="relevance">Relevance Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
              <CardDescription>
                Review the job details before making a decision.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                  <p>{job.company || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Source</h3>
                  <p>{job.source}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Region</h3>
                  <p>{job.region || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Job Type</h3>
                  <p>{job.job_type || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Experience</h3>
                  <p>{job.experience || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Salary</h3>
                  <p>{job.salary || 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Posted Date</h3>
                  <p>
                    {job.posted_date
                      ? format(new Date(job.posted_date), 'MMMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">URL</h3>
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {job.url}
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <div className="rounded-md border p-4 max-h-96 overflow-y-auto whitespace-pre-line">
                  {job.description || 'No description available'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="relevance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Relevance Analysis</CardTitle>
              <CardDescription>
                AI-generated relevance analysis for this job posting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox id="is-relevant" checked={job.is_relevant} disabled />
                <label
                  htmlFor="is-relevant"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  This job is relevant based on AI analysis
                </label>
              </div>
              
              {job.relevance_reasoning && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Reasoning</h3>
                  <div className="rounded-md border p-4 whitespace-pre-line">
                    {job.relevance_reasoning}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Job' : 'Reject Job'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This job will be marked as approved and moved to the approved list.'
                : 'This job will be marked as rejected and moved to the rejected list.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add any notes about this decision..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={verifyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending
                    ? 'Processing...'
                    : actionType === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
