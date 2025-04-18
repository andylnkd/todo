import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface RefineListButtonProps {
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
  onApplyRefinements: (refinements: any) => Promise<void>;
}

export function RefineListButton({ categories, onApplyRefinements }: RefineListButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [suggestionsText, setSuggestionsText] = useState<string>("");
  const [proposedStructure, setProposedStructure] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchRefinements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/refine-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get refinements");
      }

      const data = await response.json();
      
      setProposedStructure(data.proposedStructure);
      setSuggestionsText(data.changeSummary || "No specific summary provided, but here is the proposed structure:\n\n" + JSON.stringify(data.proposedStructure, null, 2));
      setIsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get refinements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!proposedStructure) {
      toast({
        title: "Error",
        description: "No proposed structure available to apply.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDialogOpen(false);
    try {
      await onApplyRefinements(proposedStructure);
    } catch (error) {
      console.error('Failed to apply refinements:', error);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={fetchRefinements}
        disabled={isLoading || categories.length === 0}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Refine with AI
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Refinement Suggestions</DialogTitle>
            <DialogDescription>
              Review the summary of suggested refinements below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 max-h-[400px] overflow-y-auto rounded-md border bg-secondary p-4">
            <p className="whitespace-pre-wrap text-sm">{suggestionsText}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Refinements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 