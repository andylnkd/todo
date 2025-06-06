import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processExtractedItemsAndSave } from '@/app/server-actions/transcriptActions';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items, categoryName } = await req.json();
    if (!Array.isArray(items) || !categoryName) {
      return NextResponse.json({ error: 'Missing items or categoryName' }, { status: 400 });
    }
    const result = await processExtractedItemsAndSave({ items, userId, categoryName });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
} 