import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processTranscriptAndSave, ParsedTranscriptResponse } from '@/app/server-actions/transcriptActions'; // Using alias

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const transcript = body.transcript;
    const itemType = body.type; // 'daily', 'regular', or undefined (for default)

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // Call the shared processing function
    const parsedData: ParsedTranscriptResponse = await processTranscriptAndSave({
      transcript,
      userId,
      itemType,
    });

    // Return the processed data 
    return NextResponse.json(parsedData);

  } catch (error) {
    console.error('Error in /api/process-transcript route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process transcript and save action items', details: errorMessage },
      { status: 500 }
    );
  }
} 