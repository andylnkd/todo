import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/drizzle/db';
import { categories, actionItems, nextSteps } from '@/drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

      // Determine the new category name
      let newCategoryName = 'Merged Category';
      
      if (mode === 'smart') {
        // Use AI to suggest a name
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
        // First, fetch all next steps for these action items
        const nextStepsToMove = await tx
          .select()
          .from(nextSteps)
          .where(inArray(nextSteps.actionItemId, filteredItems.map(item => item.id)));

        // Create a map of old action item IDs to their next steps
        const nextStepsMap = new Map<string, typeof nextStepsToMove>();
        filteredItems.forEach(item => {
          nextStepsMap.set(item.id, nextStepsToMove.filter(step => step.actionItemId === item.id));
        });

        // Insert new action items and get their IDs
        const newActionItems = await tx.insert(actionItems).values(
          filteredItems.map(item => ({
            actionItem: item.actionItem,
            categoryId: newCategory.id,
            userId,
            transcriptionId: item.transcriptionId,
            status: item.status,
            type: item.type,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        ).returning();

        // Insert next steps for the new action items
        if (nextStepsToMove.length > 0) {
          await tx.insert(nextSteps).values(
            newActionItems.flatMap((newItem: typeof newActionItems[0]) => {
              const oldItem = filteredItems.find(item => item.actionItem === newItem.actionItem);
              if (!oldItem) return [];
              
              const oldNextSteps = nextStepsMap.get(oldItem.id) || [];
              return oldNextSteps.map(step => ({
                step: step.step,
                completed: step.completed,
                actionItemId: newItem.id,
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
              }));
            })
          );
        }

        // Delete old next steps
        await tx.delete(nextSteps)
          .where(inArray(nextSteps.actionItemId, filteredItems.map(item => item.id)));

        // Delete old action items
        await tx.delete(actionItems)
          .where(and(
            eq(actionItems.userId, userId),
            inArray(actionItems.categoryId, categoryIds)
          ));
      }

      // Finally, delete the original categories
      await tx.delete(categories)
        .where(and(
          eq(categories.userId, userId),
          inArray(categories.id, categoryIds)
        ));

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