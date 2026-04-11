'use client';

import { RefineListButton } from "./RefineListButton";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { parseApiError, parseApiResponse } from '@/app/lib/api-client';

interface Category {
  id: string;
  name: string;
  items: {
    actionItemId: string;
    actionItem: string;
    nextSteps: { id: string; text: string; completed: boolean; dueDate?: Date | null; }[];
  }[];
}

interface RefinedStructure {
    name: string;
    items: {
        actionItem: string;
        nextSteps: string[];
    }[];
}

interface RefineListWrapperProps {
  categories: Category[];
}

export default function RefineListWrapper({ categories }: RefineListWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleApplyRefinements = async (refinedStructure: RefinedStructure[]) => {
    try {
      const response = await fetch('/api/apply-refinements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedStructure: refinedStructure }),
      });

      if (!response.ok) {
        throw await parseApiError(response, 'Failed to apply refinements');
      }
      await parseApiResponse(response);

      toast({
        title: "Success",
        description: "Refinements applied successfully!",
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to apply refinements:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply refinements",
        variant: "destructive",
      });
    }
  };

  return (
    <RefineListButton
      categories={categories}
      onApply={handleApplyRefinements}
    />
  );
} 
