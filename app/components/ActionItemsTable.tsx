'use client'; // Make this a client component

import React, { useState, useEffect } from 'react';
import EditableActionItem from './EditableActionItem'; // This should be removed too as it's replaced
import { useRouter } from 'next/navigation'; // For refreshing data after update
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import EditableTextItem from './EditableTextItem'; // Import the renamed component
import EditableNextStep from './EditableNextStep'; // Import the new component
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Define the detailed structure for a next step
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean; // Keep track of completion status
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
}

const ActionItemsTable: React.FC<ActionItemsTableProps> = ({ categories, onSaveCategory, onSaveActionItem }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Function to handle saving category edits
  const handleSaveCategory = async (id: string, newName: string) => {
    // Call the API endpoint
    const response = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: newName }),
    });

    if (!response.ok) {
      // Handle error (toast notification is handled within EditableActionItem)
      console.error('Failed to update category');
      throw new Error('Failed to update category'); // Propagate error to EditableActionItem
    }
    // Optionally refresh data or update state locally
    router.refresh(); // Simple refresh for now
  };

  // Function to handle saving action item edits
  const handleSaveActionItem = async (id: string, newText: string) => {
    // Call the API endpoint
    const response = await fetch('/api/action-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, actionItem: newText }), // Only updating text here
    });

    if (!response.ok) {
      // Handle error
      console.error('Failed to update action item');
      throw new Error('Failed to update action item');
    }
    // Optionally refresh data or update state locally
    router.refresh();
  };

  // Updated function to handle saving next steps (text and completion)
  const handleSaveNextStep = async (id: string, newText: string, newCompleted: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/next-steps', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            id, 
            step: newText,       // Send updated text
            completed: newCompleted // Send updated completion status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update next step');
      }
      // Toast is now handled within EditableNextStep, no need here
    } catch (error) {
      console.error("Failed to save next step:", error);
      // Re-throw error to be caught in EditableNextStep for toast message
      throw error; 
    } finally {
      setIsLoading(false);
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

  const displayCategories = searchQuery.trim() ? searchResults : categories;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
      </div>
      
      <Accordion type="multiple" className="w-full">
        {displayCategories.map((category) => (
          <AccordionItem key={category.id} value={`category-${category.id}`}>
            <AccordionTrigger>
              <span className="flex-1 text-left mr-2">{category.name}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mb-4 font-medium"> 
                  <EditableTextItem 
                      id={category.id}
                      initialText={category.name}
                      itemTypeLabel="Category"
                      onSave={onSaveCategory}
                  />
              </div>
              {category.items.map((item) => (
                <div key={item.actionItemId} className="ml-4 mb-4 p-4 border rounded-md">
                  {/* Use EditableTextItem for Action Item Text */}
                  <EditableTextItem 
                      id={item.actionItemId}
                      initialText={item.actionItem}
                      itemTypeLabel="Action Item"
                      onSave={onSaveActionItem}
                  />
                  <ul className="mt-2 space-y-1">
                    {item.nextSteps.map((step) => (
                      <li key={step.id}>
                        {/* Use EditableNextStep for Next Steps */}
                        <EditableNextStep 
                          id={step.id}
                          initialText={step.text}
                          initialCompleted={step.completed}
                          onSave={handleSaveNextStep}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ActionItemsTable; 