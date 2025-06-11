"use client";
import { useEffect, useState } from "react";
import AudioRecorderWrapper from "./AudioRecorderWrapper";
import ImageUploadDialog from "./ImageUploadDialog";
import { MoreHorizontal, Keyboard, Camera } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// Placeholder for manual input and smart actions

interface AddNewItemsCardProps {
  onTranscriptProcessed: (transcript: string) => void;
}

export default function AddNewItemsCard({ onTranscriptProcessed }: AddNewItemsCardProps) {
  // Manual input state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [actionItemText, setActionItemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/mobile/action-items");
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategories(data.categories.map((cat: any) => ({ id: cat.id, name: cat.name })));
        }
      } catch {
        setCategories([]);
      }
    }
    fetchCategories();
  }, []);

  // Handle save
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      let categoryNameToUse = "";
      console.log("selectedCategoryId:", selectedCategoryId);
      console.log("categories:", categories);
      if (selectedCategoryId === "__new__") {
        categoryNameToUse = newCategoryName.trim();
      } else {
        const selectedCat = categories.find(cat => String(cat.id) === String(selectedCategoryId));
        console.log("selectedCat:", selectedCat);
        if (!selectedCat) throw new Error("No category selected");
        categoryNameToUse = selectedCat.name;
      }
      if (!categoryNameToUse) throw new Error("Category name required");
      // Use the same backend as image flow
      const res = await fetch("/api/save-extracted-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [actionItemText], categoryName: categoryNameToUse }),
      });
      const data = await res.json();
      console.log("Manual input save response:", res.status, data);
      if (!res.ok) throw new Error(data.error || "Failed to add action item");
      setActionItemText("");
      setNewCategoryName("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err: any) {
      console.error("Manual input error:", err);
      setError(err.message || "Failed to add item");
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
                handleSave();
              }
            }}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white rounded px-3 py-1 mt-1 hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={loading || !actionItemText.trim() || !selectedCategoryId || (selectedCategoryId === "__new__" && !newCategoryName.trim())}
          >
            {loading ? "Saving..." : "Add"}
          </button>
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-1">Added!</div>}
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