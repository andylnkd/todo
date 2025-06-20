import React, { useRef, useState } from 'react';
import { Camera, Wand2, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const ImageUploadDialog: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<string[] | null>(null);
  const [categoryName, setCategoryName] = useState<string>('Extracted from Image');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setExtractedItems(null);
    setError(null);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setExtractedItems(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryName', categoryName);
      const res = await fetch('/api/extract-action-items', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to extract action items');
      const data = await res.json();
      setExtractedItems(data.items || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Extraction failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedItems) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/save-extracted-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: extractedItems, categoryName }),
      });
      if (!res.ok) throw new Error('Failed to save action items');
      setFile(null);
      setPreviewUrl(null);
      setExtractedItems(null);
      setError(null);
      setCategoryName('Extracted from Image');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to save items to the database:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setExtractedItems(null);
    setError(null);
    setCategoryName('Extracted from Image');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="text-blue-500" size={24} />
        <span className="font-semibold">Extract from Image</span>
      </div>
      {/* Upload Section */}
      {!file && (
        <div
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="text-gray-400 mb-2" size={36} />
          <span className="text-gray-500 text-sm mb-1">Click or tap to upload/take a photo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
      {/* Preview & Extract Section */}
      {file && !extractedItems && (
        <div className="flex flex-col items-center gap-2">
          {previewUrl && (
            <div className="mt-4 p-4 border rounded-lg max-h-60 overflow-y-auto">
              <div className="mb-4">
                <Image 
                  src={previewUrl} 
                  alt="Selected preview" 
                  className="max-w-full h-auto rounded-md"
                  width={500}
                  height={300}
                />
              </div>
            </div>
          )}
          <button
            onClick={handleExtract}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {loading ? 'Extracting...' : 'Extract Action Items'}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-1"
            type="button"
          >
            <XCircle size={14} /> Clear
          </button>
        </div>
      )}
      {/* Review & Name Section */}
      {extractedItems && (
        <div className="flex flex-col gap-2">
          <div className="font-medium flex items-center gap-2 mb-1">
            <Wand2 className="text-green-500" size={18} /> Extracted Items:
          </div>
          <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto border rounded bg-gray-50 p-2">
            {extractedItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2">
            <label className="block text-sm font-medium" htmlFor="categoryNameInput">
              <span className="inline-flex items-center gap-1"><CheckCircle className="text-blue-400" size={16} />Category Name</span>
            </label>
            <input
              id="categoryNameInput"
              type="text"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              className="border rounded px-2 py-1 flex-1"
              placeholder="Enter category name"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              type="button"
            >
              <XCircle size={16} /> Cancel
            </button>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 text-sm mt-2 flex items-center gap-1"><XCircle size={16} />{error}</div>}
    </div>
  );
};

export default ImageUploadDialog; 