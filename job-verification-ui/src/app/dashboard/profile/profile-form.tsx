'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, type ProfileData } from '@/lib/api/profile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import Editor, { type OnMount } from '@monaco-editor/react';

interface ProfileFormProps {
  initialData: ProfileData;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [jsonData, setJsonData] = useState(JSON.stringify(initialData, null, 2));
  const queryClient = getQueryClient();
  const editorRef = useRef<Parameters<OnMount>[0]>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(jsonData);
      await updateProfileMutation({ data: parsedData.data });
    } catch (error) {
      toast.error('Invalid JSON format');
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  };

  return (  
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 h-[500px] border rounded-md overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={jsonData}
          onChange={(value) => value && setJsonData(value)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            formatOnPaste: true,
            formatOnType: true,
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
