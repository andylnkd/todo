'use client';

import { Button } from '@/components/ui/button';
import { CheckSquare, Square, X } from 'lucide-react';
import { useSelectedItems } from '@/app/context/SelectedItemsContext';
import type { ShareCategory } from '@/app/lib/selected-items-share';

interface SelectAllShareButtonProps {
  categories: ShareCategory[];
}

export default function SelectAllShareButton({ categories }: SelectAllShareButtonProps) {
  const { selectedItems, setItemsSelected, clearSelection } = useSelectedItems();
  const itemIds = categories.flatMap((category) => category.items.map((item) => item.actionItemId));
  const uniqueItemIds = Array.from(new Set(itemIds));
  const selectedCount = uniqueItemIds.filter((itemId) => selectedItems.has(itemId)).length;
  const hasAnyItems = uniqueItemIds.length > 0;
  const allSelected = hasAnyItems && selectedCount === uniqueItemIds.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasAnyItems}
        onClick={() => setItemsSelected(uniqueItemIds, !allSelected)}
        className="flex items-center gap-2"
      >
        {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
        <span>{allSelected ? 'Deselect All' : 'Select All'}{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
      </Button>
      {selectedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          <span>Clear</span>
        </Button>
      )}
    </>
  );
}
