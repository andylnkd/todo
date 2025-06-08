'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface EditableActionItemProps {
  id: string;
  text: string;
  dueDate?: string | null;
  type: 'category' | 'actionItem';
  onSave: (id: string, newText: string, newDueDate: Date | null) => Promise<void>;
}

export default function EditableActionItem({ id, text, dueDate = null, type, onSave }: EditableActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState<Date | null>(dueDate ? new Date(dueDate) : null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editedText.trim() === text.trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Saving action item with due date:', editedDueDate);
      await onSave(id, editedText.trim(), editedDueDate);
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <CalendarIcon className="h-4 w-4" />
              {editedDueDate && <span className="text-sm">{format(editedDueDate, 'MMM d')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={editedDueDate || undefined}
              onSelect={(date: Date | undefined) => setEditedDueDate(date || null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
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
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <CalendarIcon className="h-4 w-4" />
            {dueDate && <span className="text-sm">{format(new Date(dueDate), 'MMM d')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dueDate ? new Date(dueDate) : undefined}
            onSelect={(date: Date | undefined) => {
              // This is a placeholder implementation. You might want to handle the selection of a date
              // to update the dueDate state.
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
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