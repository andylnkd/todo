'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditableTextItemProps {
  id: string;
  initialText: string;
  itemTypeLabel: string;
  onSave: (id: string, newText: string) => Promise<void>;
}

export default function EditableTextItem({ id, initialText, itemTypeLabel, onSave }: EditableTextItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editedText.trim() === initialText.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(id, editedText.trim());
      toast({
        title: 'Updated successfully',
        description: `${itemTypeLabel} has been updated.`
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: `Failed to update ${itemTypeLabel}. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedText(initialText);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editedText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedText(e.target.value)}
          className="flex-1"
          placeholder={`Enter ${itemTypeLabel} text`}
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="flex-1 mr-1">{initialText}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="transition-opacity opacity-0 group-hover:opacity-100 h-8 w-8 flex-shrink-0"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
} 