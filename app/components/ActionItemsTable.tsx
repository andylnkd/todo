'use client'; // Make this a client component

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // For refreshing data after update
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import EditableTextItem from './EditableTextItem'; // Import the renamed component
import EditableNextStep from './EditableNextStep'; // Import the new component
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, X, Merge, Sparkles, Trash2, Mic, Plus, CalendarIcon, Timer } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import AudioRecorderWrapper from './AudioRecorderWrapper';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import PomodoroTimer from './PomodoroTimer';
import { getEmojiForCategory } from '@/lib/utils'; // Import the function

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
  nextSteps: NextStepDetail[];
}

// Define the structure for a category, containing its details and action items
interface Category {
  id: string;
  name: string;
  status: string;  // Add status field
  items: ActionItemWithNextSteps[];
}

// Define the props for the table component
interface ActionItemsTableProps {
  categories: Category[]; // Expect an array of the updated Category structure
  onSaveCategory: (id: string, newName: string) => Promise<void>;
  onSaveActionItem: (id: string, newText: string, newDueDate?: Date | null) => Promise<void>;
  onSaveNextStep: (id: string, newText: string) => Promise<void>;
  onToggleNextStepCompleted: (id: string, completed: boolean) => Promise<void>;
  onAddNextStep: (actionItemId: string, text: string) => Promise<void>;
  onDeleteNextStep: (id: string) => Promise<void>;
  onAddActionItem: (categoryId: string, text: string) => Promise<void>;
  onDeleteActionItem: (id: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<string | null>;
  onDeleteCategory: (id: string) => Promise<void>;
}

type SortOption = 'dueDate' | 'name' | 'recent';

// Add this new child component above the main ActionItemsTable component
interface ActionItemRowProps {
  item: ActionItemWithNextSteps;
  isSelected: boolean;
  onSaveActionItem: (id: string, newText: string, newDueDate?: Date | null) => Promise<void>;
  toggleItem: (id: string) => void;
  handleDeleteActionItem: (id: string) => void;
  setEnhanceTarget: (target: { id: string, type: 'actionItem' | 'category' }) => void;
  setEnhanceModalOpen: (open: boolean) => void;
  handleSaveNextStep: (id: string, newText: string, newCompleted: boolean, newDueDate: Date | null) => Promise<void>;
  handleDeleteNextStep: (id: string) => Promise<void>;
}

function ActionItemRow({ item, isSelected, onSaveActionItem, toggleItem, handleDeleteActionItem, setEnhanceTarget, setEnhanceModalOpen, handleSaveNextStep, handleDeleteNextStep }: ActionItemRowProps) {
  const [dueDate, setDueDate] = React.useState<Date | null>(item.dueDate ? new Date(item.dueDate) : null);
  const [isSavingDueDate, setIsSavingDueDate] = React.useState(false);
  const [showTimer, setShowTimer] = React.useState(false);
  const [pomodoroCount, setPomodoroCount] = React.useState(0);

  const handleDueDateChange = async (date: Date | null) => {
    setDueDate(date);
    setIsSavingDueDate(true);
    try {
      await onSaveActionItem(item.actionItemId, item.actionItem, date);
    } finally {
      setIsSavingDueDate(false);
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
            <div className="flex items-center">
              <Checkbox
                id={`select-${item.actionItemId}`}
                checked={isSelected}
                onCheckedChange={() => toggleItem(item.actionItemId)}
                className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select for sharing</p>
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

const ActionItemsTable: React.FC<ActionItemsTableProps> = ({ categories, onSaveCategory, onSaveActionItem, onSaveNextStep, onToggleNextStepCompleted, onAddNextStep, onDeleteNextStep, onAddActionItem, onDeleteActionItem, onAddCategory, onDeleteCategory }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const { toggleItem, isSelected } = useSelectedItems();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeMode, setMergeMode] = useState<'smart' | 'simple' | 'custom'>('simple');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);
  const [enhanceTarget, setEnhanceTarget] = useState<{ id: string, type: 'actionItem' | 'category' } | null>(null);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quickInputText, setQuickInputText] = useState('');
  const [quickActionItemText, setQuickActionItemText] = useState('');

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
  const handleSaveActionItem = async (id: string, newText: string, newDueDate?: Date | null) => {
    try {
      await onSaveActionItem(id, newText, newDueDate || null);
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
      // Make a single API call with all updates
      const response = await fetch('/api/next-steps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          step: newText,
          completed: newCompleted,
          dueDate: newDueDate ? newDueDate.toISOString() : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update next step');
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
      const newCategoryId = await onAddCategory(name);
      router.refresh(); // Refresh to show changes
      return newCategoryId;
    } catch (error) {
      console.error('Failed to add category:', error);
      toast({
        title: "Error",
        description: "Failed to add category.",
        variant: "destructive",
      });
      return null;
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
          
          // Categories with due dates come first
          if (dateA && !dateB) return -1;
          if (!dateA && dateB) return 1;
          if (!dateA && !dateB) return 0;
          
          // Sort by earliest date
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

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleMergeCategories = async () => {
    if (selectedCategories.length < 2) return;
    
    setIsMerging(true);
    try {
      const response = await fetch('/api/categories/combine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: selectedCategories,
          mode: mergeMode,
          customName: mergeMode === 'custom' ? customCategoryName : undefined,
          selectedItemIds: mergeMode === 'custom' ? selectedItems : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to merge categories');
      }

      const result = await response.json();
      
      toast({
        title: 'Categories merged successfully',
        description: `Created "${result.category.name}" with ${result.itemsMerged} items.`,
      });

      setSelectedCategories([]);
      setMergeMode('simple');
      setCustomCategoryName('');
      setSelectedItems([]);
      router.refresh();
    } catch (error) {
      console.error('Error merging categories:', error);
      toast({
        title: 'Error merging categories',
        description: 'There was a problem merging your categories. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
    }
  };

  // Get all items from selected categories for the custom mode
  const itemsFromSelectedCategories = useMemo(() => {
    if (selectedCategories.length < 2) return [];
    
    return categories
      .filter(cat => selectedCategories.includes(cat.id))
      .flatMap(cat => cat.items);
  }, [categories, selectedCategories]);

  // Compute emojis for all categories once using useMemo
  const categoryEmojis = useMemo(() => {
    const map: Record<string, string> = {};
    sortedCategories.forEach((category) => {
      map[category.id] = getEmojiForCategory(category.name);
    });
    return map;
  }, [sortedCategories]);

  const handleQuickAdd = async () => {
    if (selectedCategoryId === '__new__') {
      if (!quickInputText.trim() || !quickActionItemText.trim()) return;
      try {
        const newCategoryId = await handleAddCategory(quickInputText);
        if (newCategoryId) {
          await onAddActionItem(newCategoryId, quickActionItemText);
          setSelectedCategoryId('');
        }
        setQuickInputText('');
        setQuickActionItemText('');
        router.refresh();
      } catch (error) {
        toast({ title: "Error adding item", variant: "destructive" });
      }
    } else if (selectedCategoryId) {
      if (!quickInputText.trim()) return;
      try {
        await onAddActionItem(selectedCategoryId, quickInputText);
        setSelectedCategoryId('');
        setQuickInputText('');
        router.refresh();
      } catch (error) {
        toast({ title: "Error adding item", variant: "destructive" });
      }
    }
  };

  // Fix the useMemo hooks to properly check category status
  const completedCategories = useMemo(() =>
    sortedCategories.filter(cat => 
      cat.status === 'completed' || 
      (cat.items.length > 0 && cat.items.every(item => 
        item.nextSteps.length > 0 && item.nextSteps.every(step => step.completed)
      ))
    ),
    [sortedCategories]
  );

  const activeCategories = useMemo(() =>
    sortedCategories.filter(cat => 
      cat.status !== 'completed' && 
      (!cat.items.length || cat.items.some(item => 
        !item.nextSteps.length || item.nextSteps.some(step => !step.completed)
      ))
    ),
    [sortedCategories]
  );

  // Add this function to handle category completion
  const handleCategoryComplete = async (categoryId: string, completed: boolean) => {
    try {
      const response = await fetch('/api/categories/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId, completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category completion status');
      }

      router.refresh(); // Refresh to show changes
    } catch (error) {
      console.error('Failed to update category completion:', error);
      toast({
        title: "Error",
        description: "Failed to update category completion status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Controls at the Top */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between pb-2 border-b">
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <Button
            onClick={handleQuickAdd}
            disabled={selectedCategoryId === '__new__' ? !(quickInputText && quickActionItemText) : !quickInputText}
            className="flex-shrink-0"
            aria-label="Add item"
            variant="secondary"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <span role="img" aria-label="Keyboard" className="text-2xl">⌨️</span>
          <Select value={selectedCategoryId} onValueChange={(value: string) => setSelectedCategoryId(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {getEmojiForCategory(category.name)} {category.name}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ New Category</SelectItem>
            </SelectContent>
          </Select>
          {selectedCategoryId === '__new__' ? (
            <>
              <Input
                placeholder="New category name..."
                value={quickInputText}
                onChange={e => setQuickInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                className="w-full sm:w-48"
                aria-label="New category name"
              />
              <Input
                placeholder="First action item..."
                value={quickActionItemText}
                onChange={e => setQuickActionItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                className="w-full sm:w-64"
                aria-label="First action item"
              />
            </>
          ) : (
            <Input
              placeholder="Type to add..."
              value={quickInputText}
              onChange={e => setQuickInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              className="w-full sm:w-64"
              aria-label="Add new item"
            />
          )}
        </div>
        {/* Existing controls: Search, Sort, etc. */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto mt-2 sm:mt-0">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-8"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[140px]">
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
      </div>
      
      {selectedCategories.length >= 2 && (
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                disabled={isMerging}
                className="gap-2"
              >
                <Merge className="h-4 w-4" />
                Merge Selected ({selectedCategories.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Merge Categories</DialogTitle>
                <DialogDescription>
                  Choose how you want to merge {selectedCategories.length} categories.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <RadioGroup 
                  value={mergeMode} 
                  onValueChange={(value) => setMergeMode(value as 'smart' | 'simple' | 'custom')}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="smart" id="smart" className="mt-1" />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="smart" className="flex items-center gap-2">
                        Smart Merge <Sparkles className="h-4 w-4 text-amber-500" />
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Use AI to suggest a name and organize items intelligently.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="simple" id="simple" className="mt-1" />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="simple">Simple Merge</Label>
                      <p className="text-sm text-muted-foreground">
                        Combine all items into a new category with a default name.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="custom">Custom Merge</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose which items to include and name the new category.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
                
                {mergeMode === 'custom' && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName">New Category Name</Label>
                      <Input
                        id="categoryName"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Enter a name for the merged category"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Items to Include</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowItemSelection(!showItemSelection)}
                        >
                          {showItemSelection ? 'Hide' : 'Show'} Items
                        </Button>
                      </div>
                      
                      {showItemSelection && (
                        <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                          {itemsFromSelectedCategories.map(item => (
                            <div key={item.actionItemId} className="flex items-start space-x-2">
                              <Checkbox
                                id={`item-${item.actionItemId}`}
                                checked={selectedItems.includes(item.actionItemId)}
                                onCheckedChange={() => handleItemSelect(item.actionItemId)}
                              />
                              <Label 
                                htmlFor={`item-${item.actionItemId}`} 
                                className="text-sm font-normal"
                              >
                                {item.actionItem}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedCategories([])}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMergeCategories}
                  disabled={isMerging || (mergeMode === 'custom' && !customCategoryName)}
                >
                  {isMerging ? 'Merging...' : 'Merge Categories'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Active Categories Section */}
      <h2 className="text-xl font-bold mt-6 mb-2">In Progress</h2>
      <TooltipProvider>
        <Accordion type="multiple" className="w-full space-y-4">
          {activeCategories.length === 0 && (
            <div className="text-muted-foreground px-4 py-8">No active categories.</div>
          )}
          {activeCategories.map((category) => {
            const emoji = categoryEmojis[category.id];
            return (
              <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
                <div className="flex items-center px-4 py-2">
                  <Checkbox
                    checked={category.status === 'completed'}
                    onCheckedChange={(checked: boolean) => handleCategoryComplete(category.id, checked)}
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
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </TooltipProvider>
      {/* Completed Categories Section */}
      <h2 className="text-xl font-bold mt-10 mb-2">Completed</h2>
      <TooltipProvider>
        <Accordion type="multiple" className="w-full space-y-4">
          {completedCategories.length === 0 && (
            <div className="text-muted-foreground px-4 py-8">No completed categories yet.</div>
          )}
          {completedCategories.map((category) => {
            const emoji = categoryEmojis[category.id];
            return (
              <AccordionItem key={category.id} value={category.id} className="border rounded-lg opacity-60">
                <div className="flex items-center px-4 py-2">
                  <Checkbox
                    checked={category.status === 'completed'}
                    onCheckedChange={(checked: boolean) => handleCategoryComplete(category.id, checked)}
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
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </TooltipProvider>
      {/* Enhance with Audio Modal */}
      <Dialog open={enhanceModalOpen} onOpenChange={setEnhanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enhance {enhanceTarget ? (enhanceTarget.type === 'category' ? 'Category' : 'Action Item') : ''} with Audio</DialogTitle>
            <DialogDescription>
              Record a voice note to enhance this {enhanceTarget ? (enhanceTarget.type === 'category' ? 'category' : 'action item') : ''}. The new audio will be used to update the description or next steps.
            </DialogDescription>
          </DialogHeader>
          {enhanceTarget && (
            <AudioRecorderWrapper
              onTranscriptProcessed={async (transcript) => {
                setEnhanceLoading(true);
                try {
                  const res = await fetch('/api/enhance-item-or-category', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: enhanceTarget.id,
                      type: enhanceTarget.type,
                      transcript,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to enhance item');
                  }
                  toast({ title: 'Item enhanced!', description: 'The item was updated with your audio.' });
                  router.refresh();
                } catch (err) {
                  toast({ title: 'Enhancement failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
                } finally {
                  setEnhanceLoading(false);
                  setEnhanceModalOpen(false);
                  setEnhanceTarget(null);
                }
              }}
            />
          )}
          {enhanceLoading && (
            <div className="text-center py-4 text-muted-foreground">Enhancing, please wait...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionItemsTable; 