'use client';

import { RefineListButton } from "./RefineListButton";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface RefineListWrapperProps {
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

export default function RefineListWrapper({ categories }: RefineListWrapperProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyRefinements = async (refinements: any) => {
    setIsApplying(true);
    try {
      const response = await fetch('/api/apply-refinements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedStructure: refinements }),
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
    }
  };

  return (
    <RefineListButton
      categories={categories}
      onApplyRefinements={handleApplyRefinements}
    />
  );
} 