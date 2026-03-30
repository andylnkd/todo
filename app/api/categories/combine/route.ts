import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/drizzle/db';
import { categories, actionItems, nextSteps } from '@/drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORY_MERGE_PROMPT } from '@/app/lib/ai-prompts';

// Define merge modes
type MergeMode = 'smart' | 'simple' | 'custom';

interface MergeRequest {
  categoryIds: string[];
  mode: MergeMode;
  customName?: string;
  selectedItemIds?: string[]; // For custom mode
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { categoryIds, mode = 'simple', customName, selectedItemIds } = await req.json() as MergeRequest;
    
    if (!Array.isArray(categoryIds) || categoryIds.length < 2) {
      return new NextResponse('At least two categories are required', { status: 400 });
    }

    // Use a transaction to ensure all operations are atomic
    return await db.transaction(async (tx) => {
      // Fetch categories
      const categoriesToMerge = await tx
        .select()
        .from(categories)
        .where(and(
          eq(categories.userId, userId),
          inArray(categories.id, categoryIds)
        ));

      if (categoriesToMerge.length !== categoryIds.length) {
        return new NextResponse('One or more categories not found', { status: 404 });
      }

      // Fetch action items for these categories
      const actionItemsToMove = await tx
        .select()
        .from(actionItems)
        .where(and(
          eq(actionItems.userId, userId),
          inArray(actionItems.categoryId, categoryIds)
        ));

      // Filter items if in custom mode
      const filteredItems = mode === 'custom' && selectedItemIds 
        ? actionItemsToMove.filter(item => selectedItemIds.includes(item.id))
        : actionItemsToMove;

      if (mode === 'custom' && filteredItems.length === 0) {
        return new NextResponse('At least one action item must be selected for custom merge', { status: 400 });
      }

      // Determine the new category name
      let newCategoryName = 'Merged Category';
      
      if (mode === 'smart') {
        // Use AI to suggest a name
        try {
          const geminiKey = process.env.GEMINI_API_KEY;
          if (!geminiKey) {
            throw new Error('GEMINI_API_KEY not configured');
          }
          const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview' });
          const prompt = CATEGORY_MERGE_PROMPT
            .replace('{numCategories}', categoriesToMerge.length.toString())
            .replace('{categoriesList}', categoriesToMerge.map(cat => `- ${cat.name}`).join('\n'));
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const suggestedName = response.text().trim();
          
          if (suggestedName) {
            newCategoryName = suggestedName;
          }
        } catch (error) {
          console.error('Error getting AI suggestion:', error);
          // Fall back to default name
        }
      } else if (mode === 'custom' && customName) {
        newCategoryName = customName;
      }

      // Create a new combined category
      const [newCategory] = await tx.insert(categories).values({
        name: newCategoryName,
        userId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Move all action items to the new category
      if (filteredItems.length > 0) {
        const filteredItemIds = filteredItems.map(item => item.id);

        // First, fetch all next steps for these action items
        const nextStepsToMove = await tx
          .select()
          .from(nextSteps)
          .where(inArray(nextSteps.actionItemId, filteredItemIds));

        // Create a map of old action item IDs to their next steps
        const nextStepsMap = new Map<string, typeof nextStepsToMove>();
        filteredItems.forEach(item => {
          nextStepsMap.set(item.id, nextStepsToMove.filter(step => step.actionItemId === item.id));
        });

        // Insert new action items and maintain an exact old->new ID map.
        const newActionItemIdByOldId = new Map<string, string>();
        for (const item of filteredItems) {
          const [newActionItem] = await tx.insert(actionItems).values({
            actionItem: item.actionItem,
            categoryId: newCategory.id,
            userId,
            transcriptionId: item.transcriptionId,
            status: item.status,
            type: item.type,
            priority: item.priority,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning({ id: actionItems.id });
          if (!newActionItem?.id) {
            throw new Error(`Failed to create merged action item for source item ${item.id}`);
          }
          newActionItemIdByOldId.set(item.id, newActionItem.id);
        }

        // Insert next steps for the new action items
        if (nextStepsToMove.length > 0) {
          await tx.insert(nextSteps).values(
            filteredItems.flatMap((oldItem) => {
              const newActionItemId = newActionItemIdByOldId.get(oldItem.id);
              if (!newActionItemId) return [];

              const oldNextSteps = nextStepsMap.get(oldItem.id) ?? [];
              return oldNextSteps.map(step => ({
                step: step.step,
                completed: step.completed,
                actionItemId: newActionItemId,
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
              }));
            })
          );
        }

        // Delete old next steps
        await tx.delete(nextSteps)
          .where(inArray(nextSteps.actionItemId, filteredItemIds));

        // Delete only the action items that were actually merged.
        await tx.delete(actionItems)
          .where(and(
            eq(actionItems.userId, userId),
            inArray(actionItems.id, filteredItemIds)
          ));
      }

      // In custom mode, keep categories that still have remaining items.
      let categoryIdsToDelete = categoryIds;
      if (mode === 'custom') {
        const remainingItems = await tx
          .select({ categoryId: actionItems.categoryId })
          .from(actionItems)
          .where(and(
            eq(actionItems.userId, userId),
            inArray(actionItems.categoryId, categoryIds)
          ));
        const remainingCategoryIds = new Set(remainingItems.map(item => item.categoryId));
        categoryIdsToDelete = categoryIds.filter((categoryId) => !remainingCategoryIds.has(categoryId));
      }

      if (categoryIdsToDelete.length > 0) {
        await tx.delete(categories)
          .where(and(
            eq(categories.userId, userId),
            inArray(categories.id, categoryIdsToDelete)
          ));
      }

      return NextResponse.json({ 
        success: true, 
        category: newCategory,
        mode,
        itemsMerged: filteredItems.length
      });
    });
  } catch (error) {
    console.error('Error combining categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
