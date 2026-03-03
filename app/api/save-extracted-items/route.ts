import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processExtractedItemsAndSave } from '@/app/server-actions/transcriptActions';

interface RequestBody {
    items: string[] | {
      category?: string;
      actionItem: string;
      nextSteps?: string[];
    }[];
    itemType?: 'regular' | 'daily';
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: RequestBody = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items format. Expected an array.' }, { status: 400 });
    }

    const actionItemTexts = items
      .map((item) => (typeof item === 'string' ? item : item.actionItem))
      .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);

    if (actionItemTexts.length === 0) {
      return NextResponse.json({ error: 'No valid extracted items provided.' }, { status: 400 });
    }
    
    const categoryName = body.itemType === 'daily' ? 'Daily Extracted Items' : 'Extracted Items';
    const result = await processExtractedItemsAndSave({ items: actionItemTexts, userId, categoryName });
    return NextResponse.json(result);

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in POST /api/save-extracted-items:', error);
    return NextResponse.json({ error: 'Failed to save extracted items', details: error.message }, { status: 500 });
  }
} 
