'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreHorizontal, Keyboard, Camera } from 'lucide-react';
import AudioRecorderWrapper from './AudioRecorderWrapper';
import QuickAddForm from './QuickAddForm';
import ImageUploadForm from './ImageUploadForm';

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
  onImageUploaded: (formData: FormData) => Promise<void>;
}

export default function InputHub({
  categories,
  onTranscriptProcessed,
  onAddCategory,
  onAddActionItem,
  onImageUploaded,
}: InputHubProps) {
  const [view, setView] = useState<'main' | 'type' | 'image'>('main');

  const renderView = () => {
    switch (view) {
      case 'type':
        return (
          <QuickAddForm
            categories={categories}
            onAddCategory={onAddCategory}
            onAddActionItem={onAddActionItem}
            onClose={() => setView('main')}
          />
        );
      case 'image':
        return (
          <ImageUploadForm
            onImageUploaded={onImageUploaded}
            onClose={() => setView('main')}
          />
        );
      case 'main':
      default:
        return null; // The main view is the bar below, so we render nothing here
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