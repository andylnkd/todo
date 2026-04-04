import React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import EditableTextItem from './EditableTextItem';
import { ActionItemRow } from './ActionItemRow';
import { cn } from '@/lib/utils';

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

interface Category {
  id: string;
  name: string;
  status: string;
  createdAt?: Date | string | null;
  items: ActionItemWithNextSteps[];
}

interface CategoryAccordionItemProps {
  category: Category;
  emoji: string;
  isSelected: (id: string) => boolean;
  setItemsSelected: (actionItemIds: string[], selected: boolean) => void;
  toggleItem: (id: string) => void;
  handleSaveCategory: (id: string, newName: string) => Promise<void>;
  handleSaveActionItem: (id: string, newText: string, newDueDate?: Date | null, priority?: 'high' | 'normal' | 'low') => Promise<void>;
  handleDeleteActionItem: (id: string) => void;
  setEnhanceTarget: (target: { id: string, type: 'actionItem' | 'category' }) => void;
  setEnhanceModalOpen: (open: boolean) => void;
  handleSaveNextStep: (id: string, newText: string, newCompleted: boolean, newDueDate: Date | null) => Promise<void>;
  handleDeleteNextStep: (id: string) => Promise<void>;
  isDailyView?: boolean;
  handleConvertToRegular?: (id: string) => Promise<void>;
  handleConvertCategoryToRegular: (id: string) => Promise<void>;
  handleDeleteCategory: (id: string) => void;
  handleCategoryComplete: (id: string, completed: boolean) => void;
}

export function CategoryAccordionItem({ 
  category, 
  emoji, 
  isSelected, 
  setItemsSelected,
  toggleItem, 
  handleSaveCategory, 
  handleSaveActionItem, 
  handleDeleteActionItem, 
  setEnhanceTarget, 
  setEnhanceModalOpen, 
  handleSaveNextStep, 
  handleDeleteNextStep, 
  isDailyView, 
  handleConvertToRegular, 
  handleConvertCategoryToRegular, 
  handleDeleteCategory,
  handleCategoryComplete
}: CategoryAccordionItemProps) {
  const itemIds = category.items.map((item) => item.actionItemId);
  const selectedCount = itemIds.filter((itemId) => isSelected(itemId)).length;
  const shareState = selectedCount === 0 ? false : selectedCount === itemIds.length ? true : 'indeterminate';
  const createdAt = category.createdAt ? new Date(category.createdAt) : null;
  const ageMs = createdAt ? Date.now() - createdAt.getTime() : Number.POSITIVE_INFINITY;
  const freshnessClass = ageMs <= 24 * 60 * 60 * 1000
    ? 'bg-green-500'
    : ageMs <= 72 * 60 * 60 * 1000
      ? 'bg-amber-400'
      : 'bg-slate-200';

  return (
    <AccordionItem key={category.id} value={category.id} className="relative overflow-hidden rounded-lg border">
      <div
        aria-hidden="true"
        className={cn('absolute inset-y-0 left-0 w-1.5', freshnessClass)}
      />
      <div className="flex items-center px-4 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Checkbox
                checked={shareState}
                onCheckedChange={(checked) => setItemsSelected(itemIds, !!checked)}
                className="mr-2"
                aria-label={`Select all items in ${category.name} for sharing`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select all items in this category for sharing</p>
          </TooltipContent>
        </Tooltip>
        <AccordionTrigger className="flex-1 flex items-center text-left">
          <span>{emoji}</span>
          <span className="ml-2 min-w-0 font-medium truncate">{category.name}</span>
        </AccordionTrigger>
        <div className="flex items-center gap-2 ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={category.status === 'completed' ? 'h-8 w-8 text-green-600 hover:text-green-700' : 'h-8 w-8 text-slate-500 hover:text-slate-700'}
                onClick={() => handleCategoryComplete(category.id, category.status !== 'completed')}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{category.status === 'completed' ? 'Mark category active' : 'Mark category complete'}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={() => {
                  setEnhanceTarget({ id: category.id, type: 'category' });
                  setEnhanceModalOpen(true);
                }}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enhance Category with Audio</p>
            </TooltipContent>
          </Tooltip>
          {isDailyView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                  onClick={() => handleConvertCategoryToRegular(category.id)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Convert All to Regular</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => handleDeleteCategory(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <AccordionContent className="px-4 pb-4">
        <div className="mb-4">
          <EditableTextItem
            id={category.id}
            initialText={category.name}
            onSave={handleSaveCategory}
            itemTypeLabel="Category"
          />
        </div>
        <div className="space-y-4">
          {category.items.map((item) => (
            <ActionItemRow
              key={item.actionItemId}
              item={item}
              isSelected={isSelected(item.actionItemId)}
              onSaveActionItem={handleSaveActionItem}
              toggleItem={toggleItem}
              handleDeleteActionItem={handleDeleteActionItem}
              setEnhanceTarget={setEnhanceTarget}
              setEnhanceModalOpen={setEnhanceModalOpen}
              handleSaveNextStep={handleSaveNextStep}
              handleDeleteNextStep={handleDeleteNextStep}
              isDailyItem={isDailyView}
              onConvertToRegular={isDailyView ? handleConvertToRegular : undefined}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
