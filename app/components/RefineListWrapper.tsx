'use client';

import { RefineListButton } from "./RefineListButton";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  items: {
    actionItemId: string;
    actionItem: string;
    nextSteps: { id: string; text: string; completed: boolean; dueDate?: Date | null; }[];
  }[];
}

interface RefineListWrapperProps {
  categories: Category[];
}

export default function RefineListWrapper({ categories }: RefineListWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleApplyRefinements = async (refinedStructure: any) => {
    try {
      const response = await fetch('/api/refine-list', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedStructure: refinedStructure }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply refinements');
      }

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