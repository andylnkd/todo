import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, Trash2, ArrowRight, CalendarIcon, Timer, Share2 } from 'lucide-react';
import EditableTextItem from './EditableTextItem';
import EditableNextStep from './EditableNextStep';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import PomodoroTimer from './PomodoroTimer';
import { format } from 'date-fns';

// Move the ActionItemWithNextSteps type definition here for use in ActionItemRow
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date | null;
}

interface ActionItemWithNextSteps {
  actionItemId: string;
  actionItem: string;
  dueDate?: string | null;
  priority?: 'high' | 'normal' | 'low';
  nextSteps: NextStepDetail[];
}

// Add this new child component above the main ActionItemsTable component
interface ActionItemRowProps {
  item: ActionItemWithNextSteps;
  isSelected: boolean;
  onSaveActionItem: (id: string, newText: string, newDueDate?: Date | null, priority?: 'high' | 'normal' | 'low') => Promise<void>;
  toggleItem: (id: string) => void;
  handleDeleteActionItem: (id: string) => void;
  setEnhanceTarget: (target: { id: string, type: 'actionItem' | 'category' }) => void;
  setEnhanceModalOpen: (open: boolean) => void;
  handleSaveNextStep: (id: string, newText: string, newCompleted: boolean, newDueDate: Date | null) => Promise<void>;
  handleDeleteNextStep: (id: string) => Promise<void>;
  isDailyItem?: boolean;
  onConvertToRegular?: (id: string) => Promise<void>;
}

export function ActionItemRow({ item, isSelected, onSaveActionItem, toggleItem, handleDeleteActionItem, setEnhanceTarget, setEnhanceModalOpen, handleSaveNextStep, handleDeleteNextStep, isDailyItem, onConvertToRegular }: ActionItemRowProps) {
  const [dueDate, setDueDate] = React.useState<Date | null>(item.dueDate ? new Date(item.dueDate) : null);
  const [isSavingDueDate, setIsSavingDueDate] = React.useState(false);
  const [showTimer, setShowTimer] = React.useState(false);
  const [pomodoroCount, setPomodoroCount] = React.useState(0);
  const [priority, setPriority] = React.useState<'high' | 'normal' | 'low'>(item.priority || 'normal');

  React.useEffect(() => {
    setPriority(item.priority || 'normal');
  }, [item.priority]);

  const handleDueDateChange = async (date: Date | null) => {
    setDueDate(date);
    setIsSavingDueDate(true);
    try {
      await onSaveActionItem(item.actionItemId, item.actionItem, date);
    } finally {
      setIsSavingDueDate(false);
    }
  };

  const priorityLabel = (value: 'high' | 'normal' | 'low') => {
    switch (value) {
      case 'high':
        return 'High';
      case 'low':
        return 'Low';
      default:
        return 'Normal';
    }
  };

  const priorityClass = (value: 'high' | 'normal' | 'low') => {
    switch (value) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const cyclePriority = async () => {
    const next = priority === 'high' ? 'normal' : priority === 'normal' ? 'low' : 'high';
    setPriority(next);
    try {
      await onSaveActionItem(item.actionItemId, item.actionItem, dueDate, next);
    } catch {
      // Revert on failure
      setPriority(priority);
    }
  };

  const handlePomodoroComplete = () => {
    setPomodoroCount(count => count + 1);
    setShowTimer(false);
  };

  return (
    <div className={cn(
      "space-y-2 p-3 rounded-lg border transition-colors",
      isSelected && "bg-secondary/30 border-secondary"
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-2 border-dashed",
                isSelected && "border-primary bg-primary/10 text-primary"
              )}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleItem(item.actionItemId);
              }}
              aria-pressed={isSelected}
              aria-label={isSelected ? 'Remove from sharing selection' : 'Select for sharing'}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {isSelected ? 'Selected' : 'Share'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSelected ? 'Remove from sharing selection' : 'Select for sharing'}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary"
              onClick={() => {
                setEnhanceTarget({ id: item.actionItemId, type: 'actionItem' });
                setEnhanceModalOpen(true);
              }}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enhance with Audio</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex-1 min-w-[150px]">
          <EditableTextItem
            id={item.actionItemId}
            initialText={item.actionItem}
            onSave={onSaveActionItem}
            itemTypeLabel="Action Item"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isSavingDueDate}>
              <CalendarIcon className="h-4 w-4" />
              {dueDate && <span className="ml-1 text-xs">{format(dueDate, 'MMM d')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dueDate || undefined}
              onSelect={(date: Date | undefined) => handleDueDateChange(date || null)}
              disabled={isSavingDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 border', priorityClass(priority))}
              onClick={cyclePriority}
              aria-label={`Set priority: ${priorityLabel(priority)}`}
            >
              {priorityLabel(priority)}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to cycle priority</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimer(!showTimer)}
              className={cn("h-6 gap-1", showTimer && "bg-secondary")}
            >
              <Timer className="h-3 w-3" />
              {pomodoroCount > 0 && (
                <span className="text-xs">{pomodoroCount}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showTimer ? 'Hide' : 'Start'} Pomodoro Timer</p>
          </TooltipContent>
        </Tooltip>
        {isDailyItem && onConvertToRegular && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-600 hover:text-blue-700"
                onClick={() => onConvertToRegular(item.actionItemId)}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Convert to Regular Todo</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => handleDeleteActionItem(item.actionItemId)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {showTimer && (
        <div className="flex justify-center pt-2">
          <PomodoroTimer onComplete={handlePomodoroComplete} />
        </div>
      )}
      <div className="space-y-2 pl-7">
        {item.nextSteps.map((nextStep) => (
          <EditableNextStep
            key={nextStep.id}
            id={nextStep.id}
            initialText={nextStep.text}
            initialCompleted={nextStep.completed}
            initialDueDate={nextStep.dueDate ? new Date(nextStep.dueDate) : null}
            onSave={handleSaveNextStep}
            onDelete={handleDeleteNextStep}
          />
        ))}
      </div>
    </div>
  );
}
