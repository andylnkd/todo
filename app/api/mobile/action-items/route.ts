import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../drizzle/db';
import * as schema from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch categories for the user
    const categories = await db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.userId, userId));

    // Fetch action items for the user
    const actionItems = await db
      .select({
        id: schema.actionItems.id,
        actionItem: schema.actionItems.actionItem,
        status: schema.actionItems.status,
        categoryId: schema.actionItems.categoryId,
      })
      .from(schema.actionItems)
      .where(eq(schema.actionItems.userId, userId));

    // Fetch next steps for the user
    const nextSteps = await db
      .select({
        id: schema.nextSteps.id,
        actionItemId: schema.nextSteps.actionItemId,
        step: schema.nextSteps.step,
        completed: schema.nextSteps.completed,
      })
      .from(schema.nextSteps)
      .where(eq(schema.nextSteps.userId, userId));

    // Group action items by category
    const categoriesWithItems = categories.map((cat) => {
      const items = actionItems
        .filter((ai) => ai.categoryId === cat.id)
        .map((ai) => ({
          id: ai.id,
          actionItem: ai.actionItem,
          status: ai.status,
          nextSteps: nextSteps
            .filter((ns) => ns.actionItemId === ai.id)
            .map((ns) => ({ step: ns.step, completed: ns.completed })),
        }));
      return {
        name: cat.name,
        items,
      };
    });

    return NextResponse.json({ categories: categoriesWithItems });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 