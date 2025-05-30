import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { enhanceItemOrCategory } from '@/app/server-actions/transcriptActions';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, type, transcript } = await request.json();
    if (!id || !type || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await enhanceItemOrCategory({ id, type, transcript, userId });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 