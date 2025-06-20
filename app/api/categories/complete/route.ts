import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../drizzle/db';
import { 
    categories as categoriesTable,
    actionItems as actionItemsTable,
    nextSteps as nextStepsTable
} from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { categoryId, completed } = await request.json();
        if (!categoryId) {
            return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
        }

        // Use a transaction to ensure all updates are atomic
        await db.transaction(async (tx) => {
            // 1. Update category status
            await tx
                .update(categoriesTable)
                .set({ 
                    status: completed ? 'completed' : 'active',
                    updatedAt: new Date()
                })
                .where(and(
                    eq(categoriesTable.id, categoryId),
                    eq(categoriesTable.userId, userId)
                ));

            // 2. Get all action items for this category
            const actionItems = await tx
                .select({ id: actionItemsTable.id })
                .from(actionItemsTable)
                .where(and(
                    eq(actionItemsTable.categoryId, categoryId),
                    eq(actionItemsTable.userId, userId)
                ));

            // 3. Update all action items status
            if (actionItems.length > 0) {
                await tx
                    .update(actionItemsTable)
                    .set({ 
                        status: completed ? 'completed' : 'pending',
                        updatedAt: new Date()
                    })
                    .where(and(
                        eq(actionItemsTable.categoryId, categoryId),
                        eq(actionItemsTable.userId, userId)
                    ));

                // 4. Update all next steps for these action items
                for (const item of actionItems) {
                    await tx
                        .update(nextStepsTable)
                        .set({ 
                            completed: completed,
                            updatedAt: new Date()
                        })
                        .where(and(
                            eq(nextStepsTable.actionItemId, item.id),
                            eq(nextStepsTable.userId, userId)
                        ));
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating category completion:', error);
        return NextResponse.json(
            { error: 'Failed to update category completion status' },
            { status: 500 }
        );
    }
} 