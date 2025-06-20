import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { actionItems } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

interface RequestBody {
    actionItemIds: string[];
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, actionItem, categoryId, dueDate } = await request.json();
    if (!id || (!actionItem && !categoryId && dueDate === undefined)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update action item text, category, and/or due date
    const updateData: {
      updatedAt: Date;
      actionItem?: string;
      categoryId?: string;
      dueDate?: Date | null;
    } = {
      updatedAt: new Date()
    };
    if (actionItem) updateData.actionItem = actionItem;
    if (categoryId) updateData.categoryId = categoryId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    console.log('Updating action item:', { id, actionItem, categoryId, dueDate });

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
        categoryId: actionItems.categoryId,
        dueDate: actionItems.dueDate
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

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { actionItemIds } = body;

    if (!actionItemIds || !Array.isArray(actionItemIds) || actionItemIds.length === 0) {
      return new Response("Action item IDs are required", { status: 400 });
    }

    // ... existing code ...
  } catch (error) {
    console.error('Error processing action item:', error);
    return new Response("Failed to process action items", { status: 500 });
  }
} 