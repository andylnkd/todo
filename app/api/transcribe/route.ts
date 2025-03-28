import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { type File } from 'openai/uploads'; // Import the File type if needed for casting
import { File as WebFile } from 'node:fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // --- Check the key name 'audio' matches your frontend form ---
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) { // More robust check
      return NextResponse.json(
        { error: 'No valid audio file provided under the key "audio"' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', {
        name: audioFile instanceof File ? audioFile.name : 'N/A', // Log name if it's a File
        size: audioFile.size,
        type: audioFile.type
    });

    // --- Attempt to pass the Blob/File directly ---
    const response = await openai.audio.transcriptions.create({
      // The library might handle Blob/File directly. Cast to File if necessary.
      // It needs a name, which Blob doesn't inherently have, so File is better.
      // If it's just a Blob, you might need Solution 2.
      file: audioFile as File, // Cast or ensure it IS a File object with a name
      model: 'whisper-1',
      response_format: "json" // Explicitly request JSON
    });

    // Assuming response_format: "json", the text is directly available
    const transcript = response.text;

    return NextResponse.json({ text: transcript });

  } catch (error: any) { // Catch specific error types if needed
    console.error('Transcription API Error:', error);
    // Log more detailed error info if available
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
      { status: 500 }
    );
  }
}

// Keep this config, it's necessary for FormData
export const config = {
  api: {
    bodyParser: false,
  },
};