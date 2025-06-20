'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getEmojiForCategory } from '@/lib/utils';

// Define Category structure locally for this component's props
interface Category {
  id: string;
  name: string;
}

// Define props for the new component
interface QuickAddFormProps {
  categories: Category[];
  onAddCategory: (name: string) => Promise<string | null>;
  onAddActionItem: (categoryId: string, text: string) => Promise<void>;
  onClose: () => void; // Function to close the form view
}

export default function QuickAddForm({ categories, onAddCategory, onAddActionItem, onClose }: QuickAddFormProps) {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [actionItemText, setActionItemText] = useState('');

  const handleAdd = async () => {
    try {
      if (selectedCategoryId === '__new__') {
        if (!newCategoryName.trim() || !actionItemText.trim()) return;
        const newCategoryId = await onAddCategory(newCategoryName);
        if (newCategoryId) {
          await onAddActionItem(newCategoryId, actionItemText);
        }
      } else if (selectedCategoryId) {
        if (!actionItemText.trim()) return;
        await onAddActionItem(selectedCategoryId, actionItemText);
      }
      toast({ title: "Item added successfully!" });
      onClose(); // Close the form on success
    } catch (error) {
      toast({ title: "Error adding item", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Add by Typing</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-full sm:w-[180px]">
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

        {selectedCategoryId === '__new__' && (
          <Input
            placeholder="New category name..."
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
          />
        )}

        <Input
          placeholder="Action item..."
          value={actionItemText}
          onChange={e => setActionItemText(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
    </div>
  );
} 