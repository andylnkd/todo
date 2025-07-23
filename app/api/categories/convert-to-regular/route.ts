import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../drizzle/db';
import { actionItems, categories } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await request.json();
    
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // First, verify the category exists and belongs to the user.
    const [category] = await db.select()
      .from(categories)
      .where(and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId)
      ));

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Update all 'daily' action items in this category to 'regular'
    const result = await db.update(actionItems)
      .set({ 
        type: 'regular',
        updatedAt: new Date()
      })
      .where(and(
        eq(actionItems.categoryId, categoryId),
        eq(actionItems.userId, userId),
        eq(actionItems.type, 'daily')
      ))
      .returning({ id: actionItems.id });

    return NextResponse.json({ 
      success: true, 
      message: `Converted ${result.length} action items to regular todos.`,
      convertedCount: result.length
    });

  } catch (error) {
    console.error('Error converting category to regular:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
