import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FLAT_EXTRACTION_PROMPT } from '@/app/server-actions/transcriptActions';

// Ensure the API key is available
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const imageBlob = file as Blob;
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const base64Data = Buffer.from(await imageBlob.arrayBuffer()).toString("base64");

    const result = await model.generateContent([FLAT_EXTRACTION_PROMPT, { inlineData: { data: base64Data, mimeType: imageBlob.type } }]);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return NextResponse.json({ items: [] });
    }

    let items: string[] = [];
    // The response is often wrapped in markdown, so we extract the JSON part.
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      items = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if no array is found in the text
      console.warn("Could not find a JSON array in the AI response, attempting to parse full text. Raw:", text);
      items = JSON.parse(text);
    }
    
    return NextResponse.json({ items });

  } catch (error) {
    console.error('[API extract-action-items] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to extract action items from image.', details: errorMessage }, { status: 500 });
  }
} 