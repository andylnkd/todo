'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditableNextStepProps {
  id: string;
  initialText: string;
  initialCompleted: boolean;
  onSave: (id: string, newText: string, newCompleted: boolean) => Promise<void>;
}

export default function EditableNextStep({
  id,
  initialText,
  initialCompleted,
  onSave,
}: EditableNextStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(initialText);
  const [isChecked, setIsChecked] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckboxChange = async (checked: boolean) => {
    setIsChecked(checked);
    setIsLoading(true);
    try {
      await onSave(id, editedText, checked);
      toast({
        title: checked ? 'Next step completed' : 'Next step marked active',
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: `Failed to update next step status. Please try again.`,
        variant: 'destructive',
      });
      setIsChecked(!checked);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveText = async () => {
    if (editedText.trim() === initialText.trim()) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await onSave(id, editedText.trim(), isChecked);
      toast({
        title: 'Next step updated successfully',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: `Failed to update next step text. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedText(initialText);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 pl-8">
        <Checkbox id={`edit-check-${id}`} checked={isChecked} disabled className="opacity-50"/>
        <Input
          value={editedText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedText(e.target.value)}
          className="flex-1 h-8"
          placeholder="Enter next step"
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSaveText}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancelEdit}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group pl-8">
      <Checkbox 
        id={`view-check-${id}`} 
        checked={isChecked} 
        onCheckedChange={handleCheckboxChange}
        disabled={isLoading}
      />
      <label 
        htmlFor={`view-check-${id}`}
        className={cn(
            "flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            isChecked && "line-through text-muted-foreground"
        )}
      >
        {initialText}
      </label>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="transition-opacity opacity-0 group-hover:opacity-100 h-8 w-8 flex-shrink-0"
        disabled={isLoading}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
} 