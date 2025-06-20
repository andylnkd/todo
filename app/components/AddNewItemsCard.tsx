"use client";
import { useState } from "react";
import AudioRecorderWrapper from "./AudioRecorderWrapper";
import ImageUploadDialog from "./ImageUploadDialog";
import { MoreHorizontal, Keyboard, Camera } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
}

interface AddNewItemsCardProps {
  categories: Category[];
  onAddCategory: (name: string) => Promise<string | null>;
  onAddActionItem: (categoryId: string, text: string) => Promise<void>;
  onTranscriptProcessed: (transcript: string) => Promise<void>;
}

export default function AddNewItemsCard({
  categories,
  onAddCategory,
  onAddActionItem,
  onTranscriptProcessed,
}: AddNewItemsCardProps) {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [actionItemText, setActionItemText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      if (selectedCategoryId === '__new__') {
        if (!newCategoryName.trim() || !actionItemText.trim()) {
          toast({ title: "Category and action item names are required.", variant: "destructive" });
          return;
        }
        const newCategoryId = await onAddCategory(newCategoryName);
        if (newCategoryId) {
          await onAddActionItem(newCategoryId, actionItemText);
          toast({ title: "New category and item added!" });
          setNewCategoryName('');
          setActionItemText('');
          setSelectedCategoryId('');
        }
      } else if (selectedCategoryId) {
        if (!actionItemText.trim()) {
          toast({ title: "Action item text cannot be empty.", variant: "destructive" });
          return;
        }
        await onAddActionItem(selectedCategoryId, actionItemText);
        toast({ title: "Action item added!" });
        setActionItemText('');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({ title: "An error occurred", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto pt-8">
      {/* Hero Mic and More Options */}
      <div className="flex items-center gap-3 mb-4">
        <AudioRecorderWrapper onTranscriptProcessed={onTranscriptProcessed} />
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="rounded-full p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="More input options"
              tabIndex={0}
            >
              <MoreHorizontal className="h-7 w-7" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 flex flex-col gap-3 items-center py-4">
            <button
              className="flex items-center gap-2 w-full justify-center py-3 rounded-lg hover:bg-gray-100 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => { setShowTextInput(true); setShowImageInput(false); }}
              aria-label="Type action item"
            >
              <Keyboard className="h-6 w-6" /> Type
            </button>
            <button
              className="flex items-center gap-2 w-full justify-center py-3 rounded-lg hover:bg-gray-100 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => { setShowImageInput(true); setShowTextInput(false); }}
              aria-label="Add from image"
            >
              <Camera className="h-6 w-6" /> Image
            </button>
          </PopoverContent>
        </Popover>
      </div>
      {/* Show Text Input Below Hero if Selected */}
      {showTextInput && (
        <div className="flex flex-col gap-2 w-full mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span role="img" aria-label="Keyboard" className="text-2xl">⌨️</span>
            <span className="font-semibold">Quick Add (Manual)</span>
          </div>
          <select
            className="border rounded px-2 py-1 w-full mb-1"
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
            <option value="__new__">+ New Category</option>
          </select>
          {selectedCategoryId === "__new__" && (
            <input
              type="text"
              className="border rounded px-2 py-1 w-full mb-1"
              placeholder="New category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
          )}
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            placeholder="Type an action item and press Enter"
            value={actionItemText}
            onChange={e => setActionItemText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && actionItemText.trim() && (selectedCategoryId && (selectedCategoryId !== "__new__" || newCategoryName.trim()))) {
                handleAdd();
              }
            }}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white rounded px-3 py-1 mt-1 hover:bg-blue-700 disabled:opacity-50"
            onClick={handleAdd}
            disabled={loading || !actionItemText.trim() || !selectedCategoryId || (selectedCategoryId === "__new__" && !newCategoryName.trim())}
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </div>
      )}
      {/* Show Image Input Below Hero if Selected */}
      {showImageInput && (
        <div className="w-full mt-2">
          <ImageUploadDialog />
        </div>
      )}
    </div>
  );
} 