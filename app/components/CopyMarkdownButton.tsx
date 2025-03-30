'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';

// Reuse the type from the dashboard page
interface NextStep {
  actionItem: string;
  nextSteps: string[];
}
interface CategoryWithItems {
  name: string;
  items: NextStep[];
}

interface CopyMarkdownButtonProps {
  categories: CategoryWithItems[];
}

export default function CopyMarkdownButton({ categories }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const formatToMarkdown = (): string => {
    let markdown = '# Action Items\n\n';
    if (!categories || categories.length === 0) {
        return '# Action Items\n\nNo action items found.\n';
    }

    categories.forEach(category => {
      markdown += `## ${category.name}\n`;
      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          markdown += `- **${item.actionItem}:**\n`;
          if (item.nextSteps && item.nextSteps.length > 0) {
            item.nextSteps.forEach(step => {
              markdown += `  - ${step}\n`;
            });
          }
        });
      } else {
          markdown += '- (No items in this category)\n'
      }
      markdown += '\n'; // Add space between categories
    });
    return markdown.trim(); // Remove trailing newline
  };

  const copyToClipboard = async () => {
    const markdownText = formatToMarkdown();
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      toast({ title: 'Copied to clipboard!', description: 'Markdown formatted action items copied.' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      toast({ title: 'Copy Failed', description: 'Could not copy text to clipboard.', variant: 'destructive' });
    }
  };

  // Render nothing if there are no categories to copy
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy action items as Markdown">
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
} 