'use client';

import { useState } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Corrected import path assuming standard shadcn setup

export default function AudioRecorderWrapper() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast(); // For giving user feedback

  // This function now primarily handles the transcription API call
  const handleRecordingComplete = async (blob: Blob) => {
    setIsLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    let transcriptText = '';

    try {
      // 1. Get Transcription
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const transcribeData = await transcribeResponse.json();
      if (!transcribeResponse.ok) throw new Error(transcribeData.error || 'Failed to transcribe audio');
      
      transcriptText = transcribeData.text;
      
      // 2. Process Transcription (fire-and-forget for now, or show loading)
      // We no longer need to setActionItems here as the page reloads/fetches
      await processTranscript(transcriptText);
      
      toast({
        title: "Processing Complete",
        description: "Your voice note is being processed and action items will appear shortly.",
      });
      // Optionally, trigger a page refresh or use router.refresh() from next/navigation
      // to force the server component to refetch data after processing
      // Example: import { useRouter } from 'next/navigation'; const router = useRouter(); router.refresh();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error Processing Recording",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // This function just calls the processing API endpoint
  const processTranscript = async (transcript: string) => {
    try {
      const response = await fetch('/api/process-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process transcript');
      }
      
      // No need to set state here, the main page will fetch the data
      console.log('Transcript processing initiated successfully.');

    } catch (error) {
      console.error('Error initiating transcript processing:', error);
      // Update error state or show toast if needed, but primary error handling is in handleRecordingComplete
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during processing initiation';
       setError(errorMessage); // Set error state here too
       toast({
        title: "Error Processing Transcript",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Voice Note</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing your recording...</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mt-2 w-full text-center">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 