import React from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mic, Trash2, ArrowRight } from 'lucide-react';
import EditableTextItem from './EditableTextItem';
import { ActionItemRow } from './ActionItemRow';

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
  nextSteps: NextStepDetail[];
}

interface Category {
  id: string;
  name: string;
  status: string;
  items: ActionItemWithNextSteps[];
}

interface CategoryAccordionItemProps {
  category: Category;
  emoji: string;
  isSelected: (id: string) => boolean;
  toggleItem: (id: string) => void;
  handleSaveCategory: (id: string, newName: string) => Promise<void>;
  handleSaveActionItem: (id: string, newText: string, newDueDate?: Date | null) => Promise<void>;
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
  return (
    <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
      <div className="flex items-center px-4 py-2">
        <Checkbox
          checked={category.status === 'completed'}
          onCheckedChange={(checked) => handleCategoryComplete(category.id, !!checked)}
          className="mr-2"
        />
        <AccordionTrigger className="flex-1 flex items-center text-left">
          <span>{emoji}</span>
          <span className="font-medium ml-2">{category.name}</span>
        </AccordionTrigger>
        <div className="flex items-center gap-2 ml-2">
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
