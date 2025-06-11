'use client';

import { useState } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Corrected import path assuming standard shadcn setup

interface AudioRecorderWrapperProps {
  onTranscriptProcessed: (transcript: string) => Promise<void> | void;
}

export default function AudioRecorderWrapper({ onTranscriptProcessed }: AudioRecorderWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast(); // For giving user feedback

  // This function now primarily handles the transcription API call
  const handleRecordingComplete = async (blob: Blob) => {
    setIsLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      // 1. Get Transcription
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const transcribeData = await transcribeResponse.json();
      if (!transcribeResponse.ok) throw new Error(transcribeData.error || 'Failed to transcribe audio');
      
      const transcriptText = transcribeData.text;
      
      // 2. Call the provided callback with the transcript
      await onTranscriptProcessed(transcriptText);
      
      // General toast message, parent can show more specific ones if needed
      toast({
        title: "Recording Processed",
        description: "Your voice note is being processed.",
      });

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

  return (
    <div className="flex flex-col items-center gap-4">
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
    </div>
  );
} 