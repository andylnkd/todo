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
import { Search, ArrowUpDown, X, Merge, Check, Sparkles, Trash2, Mic } from 'lucide-react';
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeMode, setMergeMode] = useState<'smart' | 'simple' | 'custom'>('simple');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);
  const [enhanceTarget, setEnhanceTarget] = useState<{ id: string, type: 'actionItem' | 'category' } | null>(null);
  const [enhanceLoading, setEnhanceLoading] = useState(false);

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

  const displayCategories = searchQuery.trim() ? searchResults : categories;

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8"
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
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

      <TooltipProvider>
        <Accordion type="multiple" className="w-full space-y-4">
          {sortedCategories.map((category) => (
            <AccordionItem key={category.id} value={category.id} className="border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategorySelect(category.id)}
                  className="mt-4"
                />
                <AccordionTrigger className="flex-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>{category.name}</span>
                    {getEarliestDueDate(category) && (
                      <span className="text-sm text-muted-foreground">
                        Due: {format(getEarliestDueDate(category)!, 'MMM d')}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
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
                        <EditableTextItem
                          id={item.actionItemId}
                          initialText={item.actionItem}
                          onSave={handleSaveActionItem}
                          itemTypeLabel="Action Item"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteActionItem(item.actionItemId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TooltipProvider>
      {/* Enhance with Audio Modal */}
      <Dialog open={enhanceModalOpen} onOpenChange={setEnhanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enhance {enhanceTarget?.type === 'category' ? 'Category' : 'Action Item'} with Audio</DialogTitle>
            <DialogDescription>
              Record a voice note to enhance this {enhanceTarget?.type === 'category' ? 'category' : 'action item'}. The new audio will be used to update the description or next steps.
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