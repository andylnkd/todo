import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is not set.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY!,
});

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
    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        // The OpenAI SDK can handle the file directly
        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        return NextResponse.json({ transcript: response.text }, { headers: corsHeaders() });
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error in transcription:', error);
        return NextResponse.json({ error: 'Transcription failed.', details: error.message }, { status: 500, headers: corsHeaders() });
    }
}

// // Keep this config, it's necessary for FormData
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };