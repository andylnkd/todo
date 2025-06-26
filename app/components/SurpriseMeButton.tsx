'use client';

import { useState } from 'react';
import { generateTextWithGemma } from '@/app/lib/gemma-model';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

export default function SurpriseMeButton() {
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setGeneratedContent(null);
    try {
      const prompt = "Give me a surprising, interesting, or thought-provoking fact or idea. Keep it concise.";
      const output = await generateTextWithGemma(prompt, { max_new_tokens: 100, do_sample: true, temperature: 0.9 });
      if (output && output.length > 0 && output[0].generated_text) {
        // Remove the prompt from the generated text if it's echoed
        let text = output[0].generated_text;
        if (text.startsWith(prompt)) {
            text = text.substring(prompt.length).trim();
        }
        setGeneratedContent(text);
      } else {
        setGeneratedContent("Could not generate content. Please try again.");
      }
    } catch (err) {
      console.error("Error generating surprise content:", err);
      setError("Failed to generate content. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-4">
      <CardContent className="flex flex-col items-center gap-4">
        <Button onClick={handleClick} disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Surprise Me!</>
          )}
        </Button>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        {generatedContent && (
          <div className="mt-4 p-3 border rounded-md bg-gray-50 text-gray-800 w-full">
            <p className="text-sm italic">{generatedContent}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
