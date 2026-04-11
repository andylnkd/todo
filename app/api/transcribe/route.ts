import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/app/lib/gemini-utils';

// Add CORS headers helper function
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // In production, replace with your Android app's domain
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500, headers: corsHeaders() });
    }
    const geminiModel = DEFAULT_GEMINI_MODEL;

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400, headers: corsHeaders() });
        }

        const audioBlob = file as Blob;
        const mimeType = audioBlob.type || 'audio/webm';
        const audioBase64 = Buffer.from(await audioBlob.arrayBuffer()).toString('base64');

        const client = new GoogleGenAI({ apiKey: geminiKey });
        const response = await client.models.generateContent({
          model: geminiModel,
          contents: [
            { text: 'Transcribe this audio file. Return only the transcript text with no extra formatting.' },
            { inlineData: { data: audioBase64, mimeType } },
          ],
        });
        const transcript = response.text?.trim();

        if (!transcript) {
          return NextResponse.json(
            { error: 'Transcription failed.', details: 'Gemini returned an empty transcript.' },
            { status: 502, headers: corsHeaders() }
          );
        }

        return NextResponse.json({ transcript }, { headers: corsHeaders() });
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error in transcription:', error);
        const status = error.message.includes('[429') || error.message.includes('quota')
          ? 429
          : 500;
        return NextResponse.json({ error: 'Transcription failed.', details: error.message }, { status, headers: corsHeaders() });
    }
}

// // Keep this config, it's necessary for FormData
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };
