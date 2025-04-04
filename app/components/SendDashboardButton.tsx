'use client';

import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSelectedItems } from '../context/SelectedItemsContext';

export default function SendDashboardButton() {
  const { toast } = useToast();
  const { selectedItems, clearSelection } = useSelectedItems();

  const handleSend = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one action item to send.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/send-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedItems: Array.from(selectedItems)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send dashboard');
      }

      toast({
        title: 'Success',
        description: 'Selected items sent successfully!',
      });

      // Clear selection after successful send
      clearSelection();
    } catch (error) {
      console.error('Error sending dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to send dashboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      className="flex items-center gap-2"
    >
      <Mail className="h-4 w-4" />
      <span>Send to Email{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}</span>
    </Button>
  );
} 