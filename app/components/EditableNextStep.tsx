'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit2, Check, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EditableNextStepProps {
  id: string;
  initialText: string;
  initialCompleted: boolean;
  initialDueDate?: Date | null;
  onSave: (id: string, newText: string, newCompleted: boolean, newDueDate: Date | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function EditableNextStep({
  id,
  initialText,
  initialCompleted,
  initialDueDate = null,
  onSave,
  onDelete
}: EditableNextStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(initialText);
  const [isChecked, setIsChecked] = useState(initialCompleted);
  const [dueDate, setDueDate] = useState<Date | null>(initialDueDate ? new Date(initialDueDate) : null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckboxChange = async (checked: boolean) => {
    const previousState = isChecked;
    setIsChecked(checked);
    setIsLoading(true);
    try {
      await onSave(id, editedText, checked, dueDate);
      toast({
        title: checked ? 'Next step completed' : 'Next step marked active',
      });
    } catch {
      toast({
        title: 'Update failed',
        description: `Failed to update next step status. Please try again.`,
        variant: 'destructive',
      });
      setIsChecked(previousState); // Revert to previous state
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
      await onSave(id, editedText.trim(), isChecked, dueDate);
      toast({
        title: 'Next step updated successfully',
      });
      setIsEditing(false);
    } catch {
      toast({
        title: 'Update failed',
        description: `Failed to update next step text. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = async (date: Date | null) => {
    setDueDate(date);
    try {
      await onSave(id, editedText, isChecked, date);
      toast({
        title: date ? 'Due date updated' : 'Due date removed',
      });
    } catch {
      toast({
        title: 'Update failed',
        description: `Failed to update due date. Please try again.`,
        variant: 'destructive',
      });
      setDueDate(dueDate); // Revert on error
    }
  };

  const handleCancelEdit = () => {
    setEditedText(initialText);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      if (onDelete) {
        await onDelete(id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Failed to delete next step:", error);
      // Optionally show a toast to the user
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 pl-8">
        <Checkbox 
          id={`edit-check-${id}`} 
          checked={isChecked} 
          disabled 
          className="opacity-50 border-muted data-[state=checked]:bg-muted data-[state=checked]:text-muted-foreground"
        />
        <Input
          value={editedText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              handleSaveText();
            }
          }}
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
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Checkbox 
              id={`view-check-${id}`} 
              checked={isChecked} 
              onCheckedChange={handleCheckboxChange}
              disabled={isLoading}
              className="border-muted data-[state=checked]:bg-green-600 data-[state=checked]:text-white transition-colors"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mark as completed</p>
        </TooltipContent>
      </Tooltip>
      <label 
        htmlFor={`view-check-${id}`}
        className={cn(
          "flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          isChecked && "line-through text-muted-foreground"
        )}
      >
        {initialText}
      </label>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 transition-opacity flex items-center gap-1",
                !dueDate && "opacity-50 group-hover:opacity-100"
              )}
              disabled={isLoading}
            >
              <CalendarIcon className="h-4 w-4" />
              {dueDate && (
                <span className="text-sm">
                  {format(dueDate, 'MMM d')}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dueDate || undefined}
              onSelect={(date: Date | undefined) => handleDateChange(date || null)}
              disabled={isLoading}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="transition-opacity opacity-0 group-hover:opacity-100 h-8 w-8"
          disabled={isLoading}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={handleDelete}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
} 