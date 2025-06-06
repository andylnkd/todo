import React, { useRef, useState } from 'react';

const ImageUploadDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
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
      setError('Failed to extract action items. Please try again.');
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
      setOpen(false);
      setFile(null);
      setPreviewUrl(null);
      setExtractedItems(null);
      setError(null);
    } catch (err) {
      setError('Failed to save action items. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border rounded bg-white hover:bg-gray-50 shadow"
      >
        Extract from Image
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-1">Extract Action Items from Image</h2>
            <p className="text-sm text-gray-500 mb-4">Upload or take a photo of text or diagrams. We'll extract action items for you!</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={loading}
              className="mb-3"
            />
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="max-h-48 rounded border mx-auto mb-3" />
            )}
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            {extractedItems && (
              <div className="mb-3">
                <div className="font-medium mb-2">Extracted Items:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {extractedItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1" htmlFor="categoryNameInput">Category Name</label>
                  <input
                    id="categoryNameInput"
                    type="text"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    placeholder="Enter category name"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {!extractedItems ? (
                <button
                  onClick={handleExtract}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Extracting...' : 'Extract'}
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadDialog; 