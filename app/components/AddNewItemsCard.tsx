"use client";
import { useEffect, useState } from "react";
import AudioRecorderWrapper from "./AudioRecorderWrapper";
import ImageUploadDialog from "./ImageUploadDialog";
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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Voice Input Card (Primary) */}
      <AudioRecorderWrapper onTranscriptProcessed={onTranscriptProcessed} />

      {/* Image Upload Card (Secondary) */}
      <ImageUploadDialog />

      {/* Manual Input Card */}
      <div className="bg-white rounded-lg shadow p-4 border flex flex-col gap-2">
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

      {/* Smart Actions Bar (Coming soon) */}
      <div className="flex gap-4 justify-center mt-2">
        <button className="flex flex-col items-center text-gray-400" disabled>
          <span role="img" aria-label="Text" className="text-xl">💬</span>
          <span className="text-xs">Text</span>
        </button>
        <button className="flex flex-col items-center text-gray-400" disabled>
          <span role="img" aria-label="Email" className="text-xl">✉️</span>
          <span className="text-xs">Email</span>
        </button>
        <button className="flex flex-col items-center text-gray-400" disabled>
          <span role="img" aria-label="Copy" className="text-xl">📋</span>
          <span className="text-xs">Copy</span>
        </button>
      </div>
    </div>
  );
} 