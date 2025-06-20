'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadFormProps {
  onImageUploaded: (formData: FormData) => Promise<void>;
  onClose: () => void;
}

export default function ImageUploadForm({ onImageUploaded, onClose }: ImageUploadFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      const formData = new FormData();
      formData.append('file', selectedFile);
      await onImageUploaded(formData);
      toast({ title: "Image uploaded successfully!" });
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "Error uploading image", variant: "destructive", description: error.message });
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
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <FileIcon className="h-4 w-4 mr-2" />
          {selectedFile ? selectedFile.name : 'Choose File'}
        </Button>
        <Button onClick={handleUpload} disabled={!selectedFile}>
          <Upload className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>
    </div>
  );
} 