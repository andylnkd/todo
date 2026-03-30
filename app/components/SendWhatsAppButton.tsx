'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useSelectedItems } from '../context/SelectedItemsContext';
import { useToast } from '@/hooks/use-toast';
import { formatSelectedItemsText, type ShareCategory } from '@/app/lib/selected-items-share';

interface SendWhatsAppButtonProps {
  categories: ShareCategory[];
  title?: string;
}

export default function SendWhatsAppButton({ categories, title = 'Selected Action Items' }: SendWhatsAppButtonProps) {
  const { selectedItems, clearSelection } = useSelectedItems();
  const { toast } = useToast();

  const handleSend = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one action item to send.",
        variant: "destructive",
      });
      return;
    }

    let message = formatSelectedItemsText(categories, selectedItems, title);
    if (!message) {
      toast({
        title: "No items to send",
        description: "Please select at least one action item to send.",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 2000) {
      message = message.substring(0, 1950) + '\n\n(Message truncated due to length)';
    }

    // Get WhatsApp number from environment variable
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    if (!whatsappNumber) {
      toast({
        title: "Configuration error",
        description: "WhatsApp number not configured.",
        variant: "destructive",
      });
      return;
    }

    // Construct WhatsApp URL
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in a new tab
    window.open(url, '_blank');
    
    // Clear selection after sending
    clearSelection();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      className="flex items-center gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      <span>Send to WhatsApp{selectedItems.size > 0 ? ` (${selectedItems.size})` : ''}</span>
    </Button>
  );
} 
