'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSelectedItems } from '@/app/context/SelectedItemsContext';
import { formatSelectedItemsText, type ShareCategory } from '@/app/lib/selected-items-share';

interface CopySelectedItemsButtonProps {
  categories: ShareCategory[];
  title?: string;
}

export default function CopySelectedItemsButton({ categories, title = 'Selected Action Items' }: CopySelectedItemsButtonProps) {
  const { selectedItems } = useSelectedItems();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const text = formatSelectedItemsText(categories, selectedItems, title);
        if (!text) {
          toast({
            title: 'No items selected',
            description: 'Please select at least one action item to copy.',
            variant: 'destructive',
          });
          return;
        }

        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast({
            title: 'Copied',
            description: 'Selected items copied to your clipboard.',
          });
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          toast({
            title: 'Copy failed',
            description: 'Could not copy the selected items.',
            variant: 'destructive',
          });
        }
      }}
      className="flex items-center gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span>Copy Share Text{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}</span>
    </Button>
  );
}
