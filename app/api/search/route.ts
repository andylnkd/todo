import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '../../../lib/db';
import { and, eq, ilike, or } from 'drizzle-orm';
import { categories, actionItems, nextSteps } from '../../../lib/db/schema';

export async function GET(req: NextRequest) {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get search query from URL params
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query) {
            return new NextResponse("Search query is required", { status: 400 });
        }

        // Search across all relevant tables
        const results = await db.select({
            categoryId: categories.id,
            categoryName: categories.name,
            actionItemId: actionItems.id,
            actionItemText: actionItems.actionItem,
            nextStepId: nextSteps.id,
            nextStepText: nextSteps.step,
            nextStepCompleted: nextSteps.completed,
        })
        .from(categories)
        .leftJoin(actionItems, eq(categories.id, actionItems.categoryId))
        .leftJoin(nextSteps, eq(actionItems.id, nextSteps.actionItemId))
        .where(
            and(
                eq(categories.userId, userId),
                or(
                    ilike(categories.name, `%${query}%`),
                    ilike(actionItems.actionItem, `%${query}%`),
                    ilike(nextSteps.step, `%${query}%`)
                )
            )
        );

        // Process results to create a hierarchical structure
        const processedResults = results.reduce((acc: any, row) => {
            if (!acc[row.categoryId]) {
                acc[row.categoryId] = {
                    id: row.categoryId,
                    name: row.categoryName,
                    items: {}
                };
            }
            
            if (row.actionItemId && !acc[row.categoryId].items[row.actionItemId]) {
                acc[row.categoryId].items[row.actionItemId] = {
                    actionItemId: row.actionItemId,
                    actionItem: row.actionItemText,
                    nextSteps: []
                };
            }

            if (row.nextStepId && row.actionItemId) {
                acc[row.categoryId].items[row.actionItemId].nextSteps.push({
                    id: row.nextStepId,
                    text: row.nextStepText,
                    completed: row.nextStepCompleted
                });
            }

            return acc;
        }, {});

        // Convert to array format matching our frontend structure
        const finalResults = Object.values(processedResults).map((category: any) => ({
            ...category,
            items: Object.values(category.items)
        }));

        return NextResponse.json(finalResults);

    } catch (error) {
        console.error('Search error:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
} 