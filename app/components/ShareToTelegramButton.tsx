'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSelectedItems } from '@/app/context/SelectedItemsContext';
import { formatSelectedItemsText, type ShareCategory } from '@/app/lib/selected-items-share';

interface ShareToTelegramButtonProps {
  categories: ShareCategory[];
  title?: string;
}

export default function ShareToTelegramButton({ categories, title = 'Selected Action Items' }: ShareToTelegramButtonProps) {
  const { selectedItems, clearSelection } = useSelectedItems();
  const { toast } = useToast();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const text = formatSelectedItemsText(categories, selectedItems, title);
        if (!text) {
          toast({
            title: 'No items selected',
            description: 'Please select at least one action item to share.',
            variant: 'destructive',
          });
          return;
        }

        const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        clearSelection();
      }}
      className="flex items-center gap-2"
    >
      <Send className="h-4 w-4" />
      <span>Export to Telegram{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}</span>
    </Button>
  );
}
