import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '@clerk/nextjs/server';
import { FLAT_EXTRACTION_PROMPT } from '@/app/lib/ai-prompts';
import { DEFAULT_GEMINI_MODEL, parseGeminiJson } from '@/app/lib/gemini-utils';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const imageBlob = file as Blob;
    
    const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
    
    const base64Data = Buffer.from(await imageBlob.arrayBuffer()).toString("base64");

    const result = await model.generateContent([FLAT_EXTRACTION_PROMPT, { inlineData: { data: base64Data, mimeType: imageBlob.type } }]);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return NextResponse.json({ items: [] });
    }

    const items = parseGeminiJson<string[]>(text);
    
    return NextResponse.json({ items });

  } catch (error) {
    console.error('[API extract-action-items] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to extract action items from image.', details: errorMessage }, { status: 500 });
  }
} 
