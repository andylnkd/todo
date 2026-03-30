'use client';

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSelectedItems } from '@/app/context/SelectedItemsContext';
import { formatSelectedItemsText, type ShareCategory } from '@/app/lib/selected-items-share';

interface NativeShareButtonProps {
  categories: ShareCategory[];
  title?: string;
}

export default function NativeShareButton({ categories, title = 'Selected Action Items' }: NativeShareButtonProps) {
  const { selectedItems, clearSelection } = useSelectedItems();
  const { toast } = useToast();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const text = formatSelectedItemsText(categories, selectedItems, title);
        if (!text) {
          toast({
            title: 'No items selected',
            description: 'Please select at least one action item to share.',
            variant: 'destructive',
          });
          return;
        }

        try {
          if (navigator.share) {
            await navigator.share({
              title,
              text,
            });
          } else {
            await navigator.clipboard.writeText(text);
            toast({
              title: 'Copied to clipboard',
              description: 'Native share is unavailable in this browser, so the text was copied instead.',
            });
          }
          clearSelection();
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          toast({
            title: 'Share failed',
            description: 'Could not share the selected items.',
            variant: 'destructive',
          });
        }
      }}
      className="flex items-center gap-2"
    >
      <Share2 className="h-4 w-4" />
      <span>Share{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}</span>
    </Button>
  );
}
