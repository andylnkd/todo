'use client';

import { useState } from 'react';
import { AudioRecorder } from './components/AudioRecorder'
import ActionItemsTable from './components/ActionItemsTable';

export default function Home() {
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
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-center">
            Voice to Text
          </h1>

          <div className="w-full flex flex-col items-center gap-8">
            <div className="w-full max-w-md aspect-square flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm shadow-lg">
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </div>
            
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-t-blue-600 border-r-blue-600 border-b-blue-600 border-l-transparent"></div>
                <span className="text-sm font-medium">Transcribing...</span>
              </div>
            )}

            {error && (
              <div className="w-full max-w-md p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {transcription && !isLoading && (
              <div className="w-full max-w-md">
                <h2 className="text-lg font-semibold mb-2">Transcription</h2>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <p className="text-sm leading-relaxed">{transcription}</p>
                </div>
              </div>
            )}

            {actionItems && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Action Items</h2>
                <ActionItemsTable categories={actionItems.categories} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
