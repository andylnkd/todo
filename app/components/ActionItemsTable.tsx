'use client'; // Make this a client component

import React, { useState, useEffect, useMemo } from 'react';
import EditableActionItem from './EditableActionItem'; // This should be removed too as it's replaced
import { useRouter } from 'next/navigation'; // For refreshing data after update
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import EditableTextItem from './EditableTextItem'; // Import the renamed component
import EditableNextStep from './EditableNextStep'; // Import the new component
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { useSelectedItems } from '../context/SelectedItemsContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/app/utils';

// Define the detailed structure for a next step
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date | null;
}

// Define the structure for an action item, containing its details and next steps
interface ActionItemWithNextSteps {
  actionItemId: string;
  actionItem: string;
  nextSteps: NextStepDetail[]; // Use the detailed structure
}

// Define the structure for a category, containing its details and action items
interface Category {
  id: string;
  name: string;
  items: ActionItemWithNextSteps[]; // Use the updated action item structure
}

// Define the props for the table component
interface ActionItemsTableProps {
  categories: Category[]; // Expect an array of the updated Category structure
  onSaveCategory: (id: string, newName: string) => Promise<void>;
  onSaveActionItem: (id: string, newText: string) => Promise<void>;
  onSaveNextStep: (id: string, newText: string) => Promise<void>;
  onToggleNextStepCompleted: (id: string, completed: boolean) => Promise<void>;
  onAddNextStep: (actionItemId: string, text: string) => Promise<void>;
  onDeleteNextStep: (id: string) => Promise<void>;
  onAddActionItem: (categoryId: string, text: string) => Promise<void>;
  onDeleteActionItem: (id: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

type SortOption = 'dueDate' | 'name' | 'recent';

const ActionItemsTable: React.FC<ActionItemsTableProps> = ({ categories, onSaveCategory, onSaveActionItem, onSaveNextStep, onToggleNextStepCompleted, onAddNextStep, onDeleteNextStep, onAddActionItem, onDeleteActionItem, onAddCategory, onDeleteCategory }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const { toggleItem, isSelected } = useSelectedItems();

  // Function to handle saving category edits
  const handleSaveCategory = async (id: string, newName: string) => {
    try {
      await onSaveCategory(id, newName);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to update category:', error);
      toast({
        title: "Error",
        description: "Failed to update category name.",
        variant: "destructive",
      });
    }
  };

  // Function to handle saving action item edits
  const handleSaveActionItem = async (id: string, newText: string) => {
    try {
      await onSaveActionItem(id, newText);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to update action item:', error);
      toast({
        title: "Error",
        description: "Failed to update action item.",
        variant: "destructive",
      });
    }
  };

  // Function to handle saving next step edits
  const handleSaveNextStep = async (id: string, newText: string, newCompleted: boolean, newDueDate: Date | null) => {
    try {
      await onSaveNextStep(id, newText);
      if (newCompleted !== undefined) {
        await onToggleNextStepCompleted(id, newCompleted);
      }
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to update next step:', error);
      toast({
        title: "Error",
        description: "Failed to update next step.",
        variant: "destructive",
      });
    }
  };

  // Function to handle adding a new next step
  const handleAddNextStep = async (actionItemId: string, text: string) => {
    try {
      await onAddNextStep(actionItemId, text);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to add next step:', error);
      toast({
        title: "Error",
        description: "Failed to add next step.",
        variant: "destructive",
      });
    }
  };

  // Function to handle deleting a next step
  const handleDeleteNextStep = async (id: string) => {
    try {
      await onDeleteNextStep(id);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to delete next step:', error);
      toast({
        title: "Error",
        description: "Failed to delete next step.",
        variant: "destructive",
      });
    }
  };

  // Function to handle adding a new action item
  const handleAddActionItem = async (categoryId: string, text: string) => {
    try {
      await onAddActionItem(categoryId, text);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to add action item:', error);
      toast({
        title: "Error",
        description: "Failed to add action item.",
        variant: "destructive",
      });
    }
  };

  // Function to handle deleting an action item
  const handleDeleteActionItem = async (id: string) => {
    try {
      await onDeleteActionItem(id);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to delete action item:', error);
      toast({
        title: "Error",
        description: "Failed to delete action item.",
        variant: "destructive",
      });
    }
  };

  // Function to handle adding a new category
  const handleAddCategory = async (name: string) => {
    try {
      await onAddCategory(name);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to add category:', error);
      toast({
        title: "Error",
        description: "Failed to add category.",
        variant: "destructive",
      });
    }
  };

  // Function to handle deleting a category
  const handleDeleteCategory = async (id: string) => {
    try {
      await onDeleteCategory(id);
      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    }
  };

  // Add search handler
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
          if (!response.ok) {
            throw new Error('Search failed');
          }
          const results = await response.json();
          setSearchResults(results);
        } catch (error) {
          toast({
            title: "Search failed",
            description: "Could not perform search. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, toast]);

  // Function to get the earliest due date from a category
  const getEarliestDueDate = (category: Category): Date | null => {
    let earliestDate: Date | null = null;
    
    for (const item of category.items) {
      for (const step of item.nextSteps) {
        if (step.dueDate) {
          const stepDate = new Date(step.dueDate);
          if (!earliestDate || stepDate < earliestDate) {
            earliestDate = stepDate;
          }
        }
      }
    }
    
    return earliestDate;
  };

  // Sort categories based on selected sort option
  const sortedCategories = useMemo(() => {
    const categoriesToSort = [...(searchQuery.trim() ? searchResults : categories)];
    
    switch (sortBy) {
      case 'dueDate':
        return categoriesToSort.sort((a, b) => {
          const dateA = getEarliestDueDate(a);
          const dateB = getEarliestDueDate(b);
          
          if (dateA && !dateB) return -1;
          if (!dateA && dateB) return 1;
          if (!dateA && !dateB) return 0;
          
          return dateA!.getTime() - dateB!.getTime();
        });
      
      case 'name':
        return categoriesToSort.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      
      case 'recent':
        // Assuming items are already in chronological order
        return categoriesToSort;
      
      default:
        return categoriesToSort;
    }
  }, [categories, searchResults, searchQuery, sortBy]);

  const displayCategories = searchQuery.trim() ? searchResults : categories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="Sort by..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Due Date</SelectItem>
            <SelectItem value="name">Category Name</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <TooltipProvider>
        <Accordion type="multiple" className="w-full space-y-4">
          {sortedCategories.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex-1 text-left font-medium">
                  {category.name}
                </div>
              </AccordionTrigger>
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
                    <div 
                      key={item.actionItemId} 
                      className={cn(
                        "space-y-2 p-3 rounded-lg border transition-colors",
                        isSelected(item.actionItemId) && "bg-secondary/30 border-secondary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <Checkbox
                                id={`select-${item.actionItemId}`}
                                checked={isSelected(item.actionItemId)}
                                onCheckedChange={() => toggleItem(item.actionItemId)}
                                className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select for sharing</p>
                          </TooltipContent>
                        </Tooltip>
                        <EditableTextItem
                          id={item.actionItemId}
                          initialText={item.actionItem}
                          onSave={handleSaveActionItem}
                          itemTypeLabel="Action Item"
                        />
                      </div>
                      <div className="space-y-2 pl-7">
                        {item.nextSteps.map((nextStep) => (
                          <EditableNextStep
                            key={nextStep.id}
                            id={nextStep.id}
                            initialText={nextStep.text}
                            initialCompleted={nextStep.completed}
                            initialDueDate={nextStep.dueDate}
                            onSave={handleSaveNextStep}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TooltipProvider>
    </div>
  );
};

export default ActionItemsTable; 