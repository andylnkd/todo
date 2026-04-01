'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreHorizontal, Keyboard, Camera, X, Loader2, Check, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AudioRecorderWrapper from './AudioRecorderWrapper';
import QuickAddForm from './QuickAddForm';
import ImageUploadForm from './ImageUploadForm';
import ExperimentalLiveCapture from './ExperimentalLiveCapture';

// Define the shape of a category for the props
interface Category {
  id: string;
  name: string;
}

// Define the props for the InputHub
interface InputHubProps {
  categories: Category[];
  variant?: 'dashboard' | 'daily';
}

export default function InputHub({
  categories,
  variant = 'dashboard',
}: InputHubProps) {
  const isDaily = variant === 'daily';

  const [view, setView] = useState<'main' | 'type' | 'image' | 'live'>('main');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  const transcriptProcessed = async (transcript: string) => {
    const response = await fetch('/api/process-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        type: isDaily ? 'daily' : 'regular',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Failed to process transcript.');
    }

    router.refresh();
  };

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setExtractedItems([]);
    setSelectedItems({});

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract-action-items', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Failed to extract items from image.');
      }
      
      const result = await response.json();
      const items = result.items;

      if (items && items.length > 0) {
        setExtractedItems(items);
        const initialSelection: Record<number, boolean> = {};
        items.forEach((_: string, index: number) => {
          initialSelection[index] = true;
        });
        setSelectedItems(initialSelection);
      } else {
        toast({ title: "No action items found in the image." });
        setView('main');
      }
    } catch (error) {
      console.error("Error in handleFileSelected:", error);
      toast({ title: "Error extracting from image", description: error instanceof Error ? error.message : 'Please try again.', variant: "destructive" });
      setView('main');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    const itemsToSave = extractedItems.filter((_, index) => selectedItems[index]);
    if (itemsToSave.length === 0) {
      toast({ title: "No items selected to save." });
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/save-extracted-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave, itemType: isDaily ? 'daily' : 'regular' }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to save extracted items.');
      }
      toast({ title: "Items saved successfully!" });
      setExtractedItems([]);
      setSelectedItems({});
      router.refresh();
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({ title: "Error saving items", description: error instanceof Error ? error.message : 'Please try again.', variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'type':
        return <QuickAddForm categories={categories} variant={variant} onClose={() => setView('main')} />;
      case 'image':
        if (isProcessing && extractedItems.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
              <p className="font-semibold mb-1">Extracting Tasks From Image...</p>
              <p className="text-sm text-muted-foreground">This may take a moment.</p>
            </div>
          );
        }
        return (
          <>
            <ImageUploadForm onFileSelected={handleFileSelected} isProcessing={isProcessing} />
            <Button variant="ghost" onClick={() => setView('main')} className="w-full mt-2">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} className="w-full mt-4" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Save Selected & Categorize
            </Button>
          </>
        );
      case 'live':
        return (
          <>
            <ExperimentalLiveCapture
              itemType={isDaily ? 'daily' : 'regular'}
              onComplete={() => {
                setView('main');
                router.refresh();
              }}
            />
            <Button variant="ghost" onClick={() => setView('main')} className="w-full">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">Add New Items</h2>

        {/* This is the main bar, always visible when view is 'main' */}
        {view === 'main' && (
          <div className="flex items-center justify-center gap-3">
            <AudioRecorderWrapper onTranscriptProcessed={transcriptProcessed} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="grid gap-4">
                  <Button variant="ghost" onClick={() => setView('type')} className="w-full justify-start">
                    <Keyboard className="mr-2 h-4 w-4" />
                    Type
                  </Button>
                  <Button variant="ghost" onClick={() => setView('image')} className="w-full justify-start">
                    <Camera className="mr-2 h-4 w-4" />
                    Image
                  </Button>
                  <Button variant="ghost" onClick={() => setView('live')} className="w-full justify-start">
                    <Video className="mr-2 h-4 w-4" />
                    Live Camera
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* This area renders the selected view (Type or Image form) */}
        {renderView()}
      </div>
    </div>
  );
} 
