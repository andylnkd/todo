"use client";
import AudioRecorderWrapper from "./AudioRecorderWrapper";
import ImageUploadDialog from "./ImageUploadDialog";

interface AddNewItemsCardProps {
  onTranscriptProcessed: (transcript: string) => void;
}

export default function AddNewItemsCard({ onTranscriptProcessed }: AddNewItemsCardProps) {
  return (
    <div>
      <AudioRecorderWrapper onTranscriptProcessed={onTranscriptProcessed} />
      <div className="mt-4">
        <ImageUploadDialog />
      </div>
    </div>
  );
} 