import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { 
    nextSteps as nextStepsTable, 
    actionItems as actionItemsTable, 
    categories as categoriesTable 
} from '../../../drizzle/schema'; 
import { eq, and, count, not } from 'drizzle-orm';

// Helper function to check and update parent statuses
async function checkAndUpdateParentStatuses(nextStepId: string, userId: string) {
    console.log(`Checking parent statuses for next step: ${nextStepId}`);
    // Use a transaction for atomicity
    await db.transaction(async (tx) => {
        // 1. Find the parent Action Item
        const [parentActionItem] = await tx
            .select({
                id: actionItemsTable.id,
                categoryId: actionItemsTable.categoryId,
                currentStatus: actionItemsTable.status,
            })
            .from(actionItemsTable)
            .innerJoin(nextStepsTable, eq(actionItemsTable.id, nextStepsTable.actionItemId))
            .where(and(eq(nextStepsTable.id, nextStepId), eq(actionItemsTable.userId, userId)));

        if (!parentActionItem) {
            console.warn(`Could not find parent action item for next step ID: ${nextStepId}`);
            return; // Exit if parent not found
        }

        const actionItemId = parentActionItem.id;
        const categoryId = parentActionItem.categoryId;
        console.log(`Found parent action item: ${actionItemId}, category: ${categoryId}`);

        // 2. Check if all Next Steps for this Action Item are complete
        const [{ count: incompleteNextStepsCount }] = await tx
            .select({ count: count() })
            .from(nextStepsTable)
            .where(and(
                eq(nextStepsTable.actionItemId, actionItemId),
                eq(nextStepsTable.userId, userId),
                not(eq(nextStepsTable.completed, true)) // Check for incomplete steps
            ));
        
        console.log(`Incomplete next steps count for action item ${actionItemId}: ${incompleteNextStepsCount}`);

        const isActionItemComplete = incompleteNextStepsCount === 0;
        const newActionItemStatus = isActionItemComplete ? 'completed' : 'pending'; // Use 'pending' to match schema default

        // 3. Update Action Item status if changed
        if (newActionItemStatus !== parentActionItem.currentStatus) {
            console.log(`Updating action item ${actionItemId} status from ${parentActionItem.currentStatus} to ${newActionItemStatus}`);
            await tx
                .update(actionItemsTable)
                .set({ status: newActionItemStatus, updatedAt: new Date() })
                .where(and(eq(actionItemsTable.id, actionItemId), eq(actionItemsTable.userId, userId)));

            // 4. If Action Item status changed to complete, check Category status
            if (newActionItemStatus === 'completed') {
                 console.log(`Action item ${actionItemId} completed. Checking category ${categoryId} status.`);
                // Find parent Category
                const [parentCategory] = await tx
                    .select({ currentStatus: categoriesTable.status })
                    .from(categoriesTable)
                    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)));
                
                if (!parentCategory) {
                    console.warn(`Could not find parent category ${categoryId} for action item ID: ${actionItemId}`);
                    return;
                }

                // 5. Check if all Action Items for this Category are complete
                const [{ count: incompleteActionItemsCount }] = await tx
                    .select({ count: count() })
                    .from(actionItemsTable)
                    .where(and(
                        eq(actionItemsTable.categoryId, categoryId),
                        eq(actionItemsTable.userId, userId),
                        not(eq(actionItemsTable.status, 'completed')) // Check for non-completed items
                    ));
                
                console.log(`Incomplete action items count for category ${categoryId}: ${incompleteActionItemsCount}`);

                const isCategoryComplete = incompleteActionItemsCount === 0;
                const newCategoryStatus = isCategoryComplete ? 'completed' : 'active'; // Use 'active' to match schema default

                // 6. Update Category status if changed
                if (newCategoryStatus !== parentCategory.currentStatus) {
                    console.log(`Updating category ${categoryId} status from ${parentCategory.currentStatus} to ${newCategoryStatus}`);
                    await tx
                        .update(categoriesTable)
                        .set({ status: newCategoryStatus, updatedAt: new Date() })
                        .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)));
                }
            }
        } // End Action Item status update block
    }); // End transaction
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, step, completed } = body; // Add completed to destructuring

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: 'Missing next step ID' }, { status: 400 });
    }
    // Validate that at least one field to update is provided
    if (step === undefined && completed === undefined) {
        return NextResponse.json({ error: 'Missing fields to update (step or completed required)' }, { status: 400 });
    }

    // Prepare the update object conditionally
    const updateData: Partial<{ step: string; completed: boolean; updatedAt: Date }> = {};
    if (step !== undefined) {
        updateData.step = step;
    }
    if (completed !== undefined) {
        updateData.completed = completed;
    }
    updateData.updatedAt = new Date(); // Always update timestamp

    // Ensure the user owns the next step being updated
    const [updatedNextStep] = await db
      .update(nextStepsTable) // Use table alias
      .set(updateData)
      .where(and(eq(nextStepsTable.id, id), eq(nextStepsTable.userId, userId))) // Use table alias
      .returning();

    if (!updatedNextStep) {
      // Either the step doesn't exist or the user doesn't own it
      return NextResponse.json({ error: 'Next step not found or access denied' }, { status: 404 });
    }

    // --- Call the status check logic --- 
    // Only check if the completion status was part of the update and potentially changed
    if (completed !== undefined) {
        try {
            await checkAndUpdateParentStatuses(id, userId);
        } catch (statusUpdateError) {
            console.error(`Error checking/updating parent statuses for next step ${id}:`, statusUpdateError);
            // Decide if this should be a fatal error. For now, log and continue.
            // return NextResponse.json({ error: 'Failed to update parent statuses' }, { status: 500 });
        }
    }
    // --- End status check logic ---

    return NextResponse.json(updatedNextStep);

  } catch (error) {
    console.error('Error updating next step:', error);
    return NextResponse.json({ error: 'Failed to update next step' }, { status: 500 });
  }
} 