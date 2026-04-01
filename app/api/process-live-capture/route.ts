import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processLiveCaptureAndSave, ParsedTranscriptResponse } from '@/app/server-actions/transcriptActions';

interface LiveCaptureFrame {
  dataUrl: string;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    const itemType = body.type;
    const frames = Array.isArray(body.frames) ? (body.frames as LiveCaptureFrame[]) : [];

    if (!transcript && frames.length === 0) {
      return NextResponse.json(
        { error: 'No transcript or frames provided' },
        { status: 400 }
      );
    }

    const normalizedFrames = frames
      .map((frame) => frame.dataUrl)
      .filter((dataUrl): dataUrl is string => typeof dataUrl === 'string' && dataUrl.startsWith('data:image/'))
      .slice(0, 12)
      .map((dataUrl) => {
        const [prefix, data] = dataUrl.split(',');
        const mimeType = prefix.match(/data:(.*);base64/)?.[1];
        if (!data || !mimeType) {
          return null;
        }
        return { data, mimeType };
      })
      .filter((frame): frame is { data: string; mimeType: string } => frame !== null);

    const parsedData: ParsedTranscriptResponse = await processLiveCaptureAndSave({
      transcript,
      frames: normalizedFrames,
      userId,
      itemType,
    });

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error in /api/process-live-capture route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process live capture', details: errorMessage },
      { status: 500 }
    );
  }
}
