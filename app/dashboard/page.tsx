'use client';

import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { AudioRecorder } from '../components/AudioRecorder';
import ActionItemsTable from '../components/ActionItemsTable';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [actionItems, setActionItems] = useState<any>(null);

  const handleRecordingComplete = async (blob: Blob) => {
    setIsLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setTranscription(data.text);
      await processTranscript(data.text);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
        throw new Error('Failed to process transcript');
      }

      const data = await response.json();
      setActionItems(data);
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Voice Notes Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Record Voice Note</CardTitle>
            </CardHeader>
            <CardContent>
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing your recording...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {transcription && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Transcription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{transcription}</p>
              </CardContent>
            </Card>
          )}

          {actionItems && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionItemsTable categories={actionItems.categories} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
} 