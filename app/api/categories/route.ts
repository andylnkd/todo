import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { categories } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update category name
    const result = await db
      .update(categories)
      .set({ 
        name,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.userId, userId)
        )
      )
      .returning({ id: categories.id, name: categories.name });

    if (!result.length) {
      return NextResponse.json({ error: 'Category not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
} 