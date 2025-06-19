'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, type ProfileData } from '@/lib/api/profile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';

interface ProfileFormProps {
  initialData: ProfileData;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [jsonData, setJsonData] = useState(
    JSON.stringify(initialData, null, 2)
  );
  const queryClient = getQueryClient();

  const { mutate: updateProfileMutation, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(jsonData);
      updateProfileMutation({ data: parsedData });
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          className="font-mono min-h-[400px]"
          placeholder="Enter your profile data in JSON format"
        />
        {jsonData !== JSON.stringify(initialData, null, 2) && (
          <p className="text-sm text-muted-foreground">
            * You have unsaved changes
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
