import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function POST(request: NextRequest) {
  // For development, you might want to bypass auth temporarily
  // const { userId } = await auth();
  // if (!userId) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'No valid audio file provided under the key "audio"' },
        { status: 400, headers: corsHeaders() }
      );
    }

    console.log('Received audio file:', {
        name: audioFile instanceof File ? audioFile.name : 'N/A',
        size: audioFile.size,
        type: audioFile.type
    });

    const file = new File([audioFile], 'audio.webm', { type: audioFile.type });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: "json"
    });

    const transcript = response.text;
    console.log('Transcript:', transcript);

    return NextResponse.json({ text: transcript }, { headers: corsHeaders() });

  } catch (error: any) {
    console.error('Transcription API Error:', error);
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error Request Data:', error.request);
    } else {
      console.error('Error Message:', error.message);
    }
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error.message || 'Unknown error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// // Keep this config, it's necessary for FormData
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };