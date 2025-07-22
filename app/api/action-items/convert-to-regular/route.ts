import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../drizzle/db';
import { actionItems } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionItemId } = await request.json();
    
    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 });
    }

    // Update the action item type from 'daily' to 'regular'
    const result = await db.update(actionItems)
      .set({ 
        type: 'regular',
        updatedAt: new Date()
      })
      .where(and(
        eq(actionItems.id, actionItemId),
        eq(actionItems.userId, userId),
        eq(actionItems.type, 'daily') // Only allow converting daily items
      ))
      .returning({ id: actionItems.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Action item not found or not a daily item' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Action item converted to regular todo successfully' 
    });

  } catch (error) {
    console.error('Error converting action item to regular:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 