import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processExtractedItemsAndSave } from '@/app/server-actions/transcriptActions';
import { db } from '../../../drizzle/db';
import * as schema from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

interface RequestBody {
    items: {
        category: string;
        actionItem: string;
        nextSteps: string[];
    }[];
    itemType: 'regular' | 'daily';
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: RequestBody = await req.json();
    const { items, itemType } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items format. Expected an array.' }, { status: 400 });
    }

    // The processExtractedItemsAndSave expects a simple array of strings.
    // We will need to decide how to handle the structured data.
    // For now, let's just extract the actionItem text and use a default category name.
    const actionItemTexts = items.map(item => item.actionItem);
    
    const result = await processExtractedItemsAndSave({ items: actionItemTexts, userId, categoryName: 'Extracted Items' });
    return NextResponse.json(result);

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error in POST /api/save-extracted-items:', error);
    return NextResponse.json({ error: 'Failed to save extracted items', details: error.message }, { status: 500 });
  }
} 