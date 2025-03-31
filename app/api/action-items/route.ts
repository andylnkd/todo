import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { actionItems } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, actionItem, categoryId } = await request.json();
    if (!id || (!actionItem && !categoryId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update action item text and/or category
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (actionItem) updateData.actionItem = actionItem;
    if (categoryId) updateData.categoryId = categoryId;

    const result = await db
      .update(actionItems)
      .set(updateData)
      .where(
        and(
          eq(actionItems.id, id),
          eq(actionItems.userId, userId)
        )
      )
      .returning({ 
        id: actionItems.id, 
        actionItem: actionItems.actionItem,
        categoryId: actionItems.categoryId 
      });

    if (!result.length) {
      return NextResponse.json({ error: 'Action item not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
  }
} 