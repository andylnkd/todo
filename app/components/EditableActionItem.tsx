'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface EditableActionItemProps {
  id: string;
  text: string;
  type: 'category' | 'actionItem';
  onSave: (id: string, newText: string) => Promise<void>;
}

export default function EditableActionItem({ id, text, type, onSave }: EditableActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editedText.trim() === text.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(id, editedText.trim());
      toast({
        title: 'Updated successfully',
        description: `${type === 'category' ? 'Category' : 'Action item'} has been updated.`
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: `Failed to update ${type}. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editedText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedText(e.target.value)}
          className="flex-1"
          placeholder={`Enter ${type} text`}
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
    <div className="flex items-center gap-2">
      <span className="flex-1 mr-1">{text}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="transition-opacity h-8 w-8 flex-shrink-0"
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
} 