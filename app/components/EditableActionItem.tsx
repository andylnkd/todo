'use client';

import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface EditableActionItemProps {
  id: string;
  initialText: string;
  initialDueDate: string | null;
  onSave: (id: string, newText: string, newDueDate: Date | null) => Promise<void>;
  itemTypeLabel: 'Action Item' | 'Category';
}

const EditableActionItem: React.FC<EditableActionItemProps> = ({ id, initialText, initialDueDate, onSave, itemTypeLabel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(initialText);
  const [dueDate, setDueDate] = useState<Date | null>(initialDueDate ? new Date(initialDueDate) : null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (newText: string, newDueDate?: Date | null) => {
    setIsEditing(false);
    setIsLoading(true);
    try {
      await onSave(id, newText, newDueDate ?? null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // Revert text on failure if needed, or show a toast
      console.error(`Failed to save ${itemTypeLabel}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setText(initialText);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              handleSave(text, dueDate);
            }
          }}
          className="flex-1"
          placeholder={`Enter ${itemTypeLabel} text`}
          disabled={isLoading}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <CalendarIcon className="h-4 w-4" />
              {dueDate && <span className="text-sm">{format(dueDate, 'MMM d')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dueDate || undefined}
              onSelect={(date: Date | undefined) => setDueDate(date || null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSave(text, dueDate)}
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
            {dueDate && <span className="text-sm">{format(dueDate, 'MMM d')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dueDate ?? undefined}
            onSelect={(newDate) => {
              if (newDate) {
                setDueDate(newDate);
                handleSave(text, newDate);
              }
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
};

export default EditableActionItem; 