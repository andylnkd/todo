import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { actionItems, categories } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';



export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, actionItem, categoryId, dueDate, priority } = await request.json();
    if (!id || (!actionItem && !categoryId && dueDate === undefined && priority === undefined)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update action item text, category, and/or due date
    const updateData: {
      updatedAt: Date;
      actionItem?: string;
      categoryId?: string;
      dueDate?: Date | null;
      priority?: 'high' | 'normal' | 'low';
    } = {
      updatedAt: new Date()
    };
    if (actionItem) updateData.actionItem = actionItem;
    if (categoryId) {
      const [targetCategory] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .limit(1);

      if (!targetCategory) {
        return NextResponse.json({ error: 'Invalid category or unauthorized category access' }, { status: 403 });
      }
      updateData.categoryId = categoryId;
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) {
      if (!['high', 'normal', 'low'].includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
      }
      updateData.priority = priority;
    }
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
        dueDate: actionItems.dueDate,
        priority: actionItems.priority
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

 
