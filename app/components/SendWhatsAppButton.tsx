'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

interface SendWhatsAppButtonProps {
  categories: {
    id: string;
    name: string;
    items: {
      actionItemId: string;
      actionItem: string;
      nextSteps: {
        id: string;
        text: string;
        completed: boolean;
      }[];
    }[];
  }[];
}

export default function SendWhatsAppButton({ categories }: SendWhatsAppButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const formatMessage = () => {
    let message = "*My Action Items:*\n\n";
    
    categories.forEach(category => {
      message += `*${category.name}:*\n`;
      category.items.forEach(item => {
        message += `- ${item.actionItem}\n`;
        item.nextSteps.forEach(step => {
          message += `  • ${step.text}\n`;
        });
      });
      message += "\n";
    });

    // Truncate if message is too long
    if (message.length > 2000) {
      message = message.substring(0, 1997) + "...";
      toast({
        title: "Message Truncated",
        description: "The message was too long and has been shortened.",
        variant: "destructive",
      });
    }

    return encodeURIComponent(message);
  };

  const handleSend = () => {
    setIsLoading(true);
    try {
      const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "1234567890"; // Default number or from env
      const message = formatMessage();
      const url = `https://wa.me/${phoneNumber}?text=${message}`;
      
      window.open(url, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to prepare WhatsApp message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSend}
      disabled={isLoading || categories.length === 0}
    >
      {isLoading ? (
        <div className="flex items-center">
          <span className="mr-2">Preparing...</span>
        </div>
      ) : (
        <div className="flex items-center">
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>Send via WhatsApp</span>
        </div>
      )}
    </Button>
  );
} 