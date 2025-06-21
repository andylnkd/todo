'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadFormProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export default function ImageUploadForm({ onFileSelected, isProcessing }: ImageUploadFormProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelected(event.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "p-4 border-2 border-dashed rounded-lg bg-background space-y-3 transition-colors",
        isDragging && !isProcessing && "bg-primary/10 border-primary"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragEnter}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="font-semibold mb-1">Drag & drop an image here</p>
        <p className="text-sm text-muted-foreground mb-3">or</p>
        <label
          htmlFor="file-upload"
          className={cn(
            "text-primary underline cursor-pointer",
            isProcessing && "cursor-not-allowed opacity-50"
          )}
        >
          Choose File
        </label>
        <Input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
      </div>
    </div>
  );
} 