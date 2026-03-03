'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '../../drizzle/db';
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { processTranscriptAndSave } from './transcriptActions';

export async function saveCategoryName(id: string, newName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.update(categoriesTable)
      .set({ name: newName, updatedAt: new Date() })
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to save category:", error);
    throw new Error("Failed to update category name.");
  }
}

export async function saveActionItemText(id: string, newText: string, newDueDate?: Date | null) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const updateData: { actionItem: string; updatedAt: Date; dueDate?: Date | null } = { actionItem: newText, updatedAt: new Date() };
    if (newDueDate !== undefined) {
      updateData.dueDate = newDueDate;
    }
    
    await db.update(actionItemsTable)
      .set(updateData)
      .where(and(eq(actionItemsTable.id, id), eq(actionItemsTable.userId, userId)));
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to save action item:", error);
    throw new Error("Failed to update action item text.");
  }
}

export async function deleteNextStep(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.delete(nextStepsTable)
      .where(and(eq(nextStepsTable.id, id), eq(nextStepsTable.userId, userId)));
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to delete next step:", error);
    throw new Error("Failed to delete next step.");
  }
}

export async function addActionItem(categoryId: string, text: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.insert(actionItemsTable)
      .values({
        categoryId,
        actionItem: text,
        userId
      });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to add action item:", error);
    throw new Error("Failed to add action item.");
  }
}

export async function deleteActionItem(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.delete(actionItemsTable)
      .where(and(eq(actionItemsTable.id, id), eq(actionItemsTable.userId, userId)));
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to delete action item:", error);
    throw new Error("Failed to delete action item.");
  }
}

export async function addCategory(name: string): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const [inserted] = await db.insert(categoriesTable)
      .values({ name, userId })
      .returning({ id: categoriesTable.id });
    revalidatePath('/dashboard');
    return inserted.id;
  } catch (error) {
    console.error("Failed to add category:", error);
    return null;
  }
}

export async function deleteCategory(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const actionItems = await db.select({ id: actionItemsTable.id })
      .from(actionItemsTable)
      .where(and(eq(actionItemsTable.categoryId, id), eq(actionItemsTable.userId, userId)));
    const actionItemIds = actionItems.map((ai: { id: string }) => ai.id);

    if (actionItemIds.length > 0) {
      await db.delete(nextStepsTable)
        .where(and(
          inArray(nextStepsTable.actionItemId, actionItemIds),
          eq(nextStepsTable.userId, userId)
        ));
      await db.delete(actionItemsTable)
        .where(and(
          inArray(actionItemsTable.id, actionItemIds),
          eq(actionItemsTable.userId, userId)
        ));
    }
    await db.delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Failed to delete category:", error);
    throw new Error("Failed to delete category.");
  }
}

export async function handleDashboardTranscriptProcessed(transcript: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('User not authenticated for dashboard processing');

  try {
    await processTranscriptAndSave({
      transcript,
      userId,
      itemType: 'regular',
    });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Dashboard transcript processing error:", error);
  }
}

export async function handleSaveExtractedItems(items: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('User not authenticated');

  const transcript = items.join('\n');
  if (!transcript) return;

  try {
    await processTranscriptAndSave({
      transcript,
      userId,
      itemType: 'regular',
    });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Dashboard extracted items processing error:", error);
    throw error;
  }
}
