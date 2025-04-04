'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useSelectedItems } from '../context/SelectedItemsContext';
import { useToast } from '@/hooks/use-toast';

interface SendWhatsAppButtonProps {
  categories: Array<{
    name: string;
    items: Array<{
      actionItemId: string;
      actionItem: string;
      nextSteps: Array<{
        text: string;
        completed: boolean;
        dueDate?: Date | null;
      }>;
    }>;
  }>;
}

export default function SendWhatsAppButton({ categories }: SendWhatsAppButtonProps) {
  const { selectedItems, clearSelection } = useSelectedItems();
  const { toast } = useToast();

  const formatMessage = (categories: SendWhatsAppButtonProps['categories']) => {
    let message = '📋 *Selected Action Items:*\n\n';
    
    categories.forEach(category => {
      const selectedItemsInCategory = category.items.filter(item => 
        selectedItems.has(item.actionItemId)
      );

      if (selectedItemsInCategory.length > 0) {
        message += `*${category.name}*\n`;
        selectedItemsInCategory.forEach(item => {
          message += `• ${item.actionItem}\n`;
          if (item.nextSteps.length > 0) {
            message += '  Next Steps:\n';
            item.nextSteps.forEach(step => {
              const status = step.completed ? '✅' : '⭕';
              const dueDate = step.dueDate ? ` (Due: ${new Date(step.dueDate).toLocaleDateString()})` : '';
              message += `  ${status} ${step.text}${dueDate}\n`;
            });
          }
          message += '\n';
        });
      }
    });

    // If no items are selected, return null
    if (message === '📋 *Selected Action Items:*\n\n') {
      return null;
    }

    // Ensure message doesn't exceed WhatsApp's URL length limit (~2000 chars)
    if (message.length > 2000) {
      message = message.substring(0, 1950) + '...\n\n(Message truncated due to length)';
    }

    return message;
  };

  const handleSend = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one action item to send.",
        variant: "destructive",
      });
      return;
    }

    const message = formatMessage(categories);
    if (!message) {
      toast({
        title: "No items to send",
        description: "Please select at least one action item to send.",
        variant: "destructive",
      });
      return;
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