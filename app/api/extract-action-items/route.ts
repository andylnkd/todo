import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from '@google/genai';

const DEBUG = process.env.GEMINI_DEBUG === 'true';

function genRequestId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const PROMPT_FOR_EXTRACTION = `
You are a task extraction assistant. Your job is to analyze the given image (which may contain text or diagrams) and:
1. Extract actionable items
2. Return ONLY a flat JSON array of action item strings, no categories or next steps

IMPORTANT: Your response MUST be a valid JSON array with NO markdown formatting or additional text.
If no action items found, return []
`;

export async function POST(req: NextRequest) {
  const requestId = genRequestId();
  const log = (...args: (string | number | object)[]) => console.log(`[extract-action-items][${requestId}]`, ...args);

  if (!process.env.GEMINI_API_KEY) {
    log('GEMINI_API_KEY not configured.');
    return NextResponse.json({ error: 'Gemini AI not configured.' }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  log('Request received');
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    log('No file uploaded');
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Convert file to a Buffer
  const imageBlob = file as Blob;
  const arrayBuffer = await imageBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  log('File info:', { size: buffer.length, type: imageBlob.type });

  try {
    // Upload the image to Gemini
    const uploaded = await ai.files.upload({
      file: imageBlob,
      config: { mimeType: imageBlob.type },
    });
    log('Image uploaded to Gemini. URI:', uploaded.uri || '');

    // Build the prompt
    const contents = createUserContent([
      createPartFromUri(uploaded.uri || '', uploaded.mimeType || imageBlob.type),
      PROMPT_FOR_EXTRACTION,
    ]);

    // Call Gemini with the correct model
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
    });
    const text = response.text;
    if (!text) {
      log('Gemini response missing text field:', JSON.stringify(response));
      return NextResponse.json({ error: 'Gemini response missing text field', requestId }, { status: 500 });
    }
    log('Gemini raw response (truncated):', text.slice(0, 500));
    // Try to parse as JSON array
    let items: string[] = [];
    let parseError: Error | null = null;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        items = JSON.parse(text);
      }
      log('Parsed items array:', JSON.stringify(items));
      log('Parsed items count:', items.length);
    } catch (err) {
      parseError = err instanceof Error ? err : new Error(String(err));
      log('Failed to parse AI response:', String(err), '\nRaw:', text);
      if (DEBUG) {
        return NextResponse.json({ error: 'Failed to parse AI response', requestId, raw: text, parseError: parseError.message }, { status: 500 });
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }
    // Only return the extracted items, do not save to DB
    return NextResponse.json({ items, requestId });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log('Gemini extraction error:', error.stack ? error.stack : error);
    if (DEBUG) {
      return NextResponse.json({ error: 'Failed to extract action items', requestId, details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Failed to extract action items' }, { status:500 });
    }
  }
} 