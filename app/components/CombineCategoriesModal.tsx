'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  actionItems: {
    id: string;
    text: string;
    nextSteps: {
      id: string;
      text: string;
    }[];
  }[];
}

interface CombineCategoriesModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CombineCategoriesModal({ 
  categories,
  isOpen,
  onClose,
  onSuccess 
}: CombineCategoriesModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCombine = async () => {
    if (selectedIds.length < 2) {
      toast({
        title: 'Error',
        description: 'Please select at least 2 categories to combine',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/categories/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: selectedIds })
      });

      if (!response.ok) throw new Error('Failed to combine categories');

      toast({
        title: 'Success',
        description: 'Categories combined successfully'
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to combine categories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Combine Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {categories.map(category => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={selectedIds.includes(category.id)}
                onCheckedChange={(checked: boolean) => {
                  setSelectedIds(prev => 
                    checked 
                      ? [...prev, category.id]
                      : prev.filter(id => id !== category.id)
                  );
                }}
              />
              <label
                htmlFor={category.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {category.name}
              </label>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCombine}
            disabled={isLoading || selectedIds.length < 2}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Combining...
              </>
            ) : (
              'Combine with AI'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 