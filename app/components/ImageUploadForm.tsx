'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadFormProps {
  onImageUploaded: (file: File) => Promise<void>;
  onClose: () => void;
}

export default function ImageUploadForm({ onImageUploaded, onClose }: ImageUploadFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    try {
      await onImageUploaded(selectedFile);
      toast({ title: "Image uploaded successfully!" });
      onClose();
    } catch (error) {
      toast({ title: "Error uploading image", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Add from Image</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="flex-1"
        />
        <Button onClick={handleUpload} disabled={!selectedFile}>
          <Upload className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>
    </div>
  );
} 