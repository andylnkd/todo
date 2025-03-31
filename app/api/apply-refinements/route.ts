import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Structure expected from the frontend (matches Gemini's proposed structure)
interface GeminiActionItem {
    actionItem: string;
    nextSteps: string[]; // Simple array of strings
}
interface GeminiCategory {
    name: string;
    items: GeminiActionItem[];
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const proposedStructure: GeminiCategory[] = body.proposedStructure;

        if (!Array.isArray(proposedStructure)) {
            return NextResponse.json({ error: 'Invalid payload: proposedStructure must be an array.' }, { status: 400 });
        }

        // --- Transaction to Apply Refinements --- 
        await db.transaction(async (tx) => {
            // 1. Get IDs of all existing categories, items, and steps for this user
            const existingCategories = await tx.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.userId, userId));
            const existingCategoryIds = existingCategories.map(c => c.id);

            if (existingCategoryIds.length > 0) {
                const existingActionItems = await tx.select({ id: actionItemsTable.id }).from(actionItemsTable).where(and(eq(actionItemsTable.userId, userId), eq(actionItemsTable.categoryId, existingCategoryIds[0]))); // Example: Adjust if needed for multiple categories
                const existingActionItemIds = existingActionItems.map(a => a.id);
                
                // 2. Delete existing steps, items, and categories for the user
                if (existingActionItemIds.length > 0) {
                   await tx.delete(nextStepsTable).where(and(eq(nextStepsTable.userId, userId))); // Consider more precise deletion if needed
                }
                if (existingCategoryIds.length > 0) { // Re-check, might be empty
                    await tx.delete(actionItemsTable).where(and(eq(actionItemsTable.userId, userId)));
                    await tx.delete(categoriesTable).where(eq(categoriesTable.userId, userId));
                }
            }

            // 3. Insert the new structure
            for (const category of proposedStructure) {
                if (!category.name || !Array.isArray(category.items)) continue; // Basic validation

                const [newCategory] = await tx.insert(categoriesTable).values({
                    name: category.name,
                    userId: userId,
                }).returning({ id: categoriesTable.id });

                for (const item of category.items) {
                    if (!item.actionItem || !Array.isArray(item.nextSteps)) continue; // Basic validation

                    const [newItem] = await tx.insert(actionItemsTable).values({
                        actionItem: item.actionItem,
                        categoryId: newCategory.id,
                        userId: userId, // Ensure userId is set for action items too
                        transcriptionId: null, // Set missing field to null
                    }).returning({ id: actionItemsTable.id });

                    for (const stepText of item.nextSteps) {
                        if (!stepText) continue;
                        await tx.insert(nextStepsTable).values({
                            step: stepText,
                            actionItemId: newItem.id,
                            userId: userId, // Ensure userId is set for next steps too
                            completed: false, // Default to not completed
                        });
                    }
                }
            }
        });

        return NextResponse.json({ message: 'Refinements applied successfully.' });

    } catch (error) {
        console.error('Error applying refinements:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to apply refinements: ${errorMessage}` }, { status: 500 });
    }
} 