'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreHorizontal, Keyboard, Camera, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import AudioRecorderWrapper from './AudioRecorderWrapper';
import QuickAddForm from './QuickAddForm';
import ImageUploadForm from './ImageUploadForm';
import { Card } from './ui/card';

// Define the shape of a category for the props
interface Category {
  id: string;
  name: string;
}

// Define the props for the InputHub
interface InputHubProps {
  categories: Category[];
  onTranscriptProcessed: (transcript: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<string | null>;
  onAddActionItem: (categoryId: string, text: string) => Promise<void>;
  onImageProcessed: (formData: FormData) => Promise<void>;
}

export default function InputHub({
  categories,
  onTranscriptProcessed,
  onAddCategory,
  onAddActionItem,
  onImageProcessed,
}: InputHubProps) {
  const [view, setView] = useState<'main' | 'type' | 'image'>('main');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      await onImageProcessed(formData);
      toast({ title: "Image processed successfully!", description: "Categorized items have been added to your list." });
      setView('main');
    } catch (error) {
      console.error("Error in handleFileSelected:", error);
      toast({ title: "Error processing image", description: error instanceof Error ? error.message : 'Please try again.', variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'type':
        return <QuickAddForm categories={categories} onAddCategory={onAddCategory} onAddActionItem={onAddActionItem} onClose={() => setView('main')} />;
      case 'image':
        if (isProcessing) {
          return (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
              <p className="font-semibold mb-1">Analyzing Image & Creating Tasks...</p>
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
            <AudioRecorderWrapper onTranscriptProcessed={onTranscriptProcessed} />
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