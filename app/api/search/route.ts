import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { and, eq, ilike, or } from 'drizzle-orm';
import { categories, actionItems, nextSteps } from '../../../drizzle/schema';

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
            dueDate: actionItems.dueDate
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

        // Process the flat results into a nested structure
        interface NextStep {
            id: string;
            text: string | null;
            completed: boolean | null;
            dueDate: Date | null;
        }

        interface ActionItem {
            actionItemId: string;
            actionItem: string | null;
            dueDate: Date | null;
            nextSteps: NextStep[];
        }

        interface Category {
            id: string;
            name: string | null;
            items: Map<string, ActionItem>;
        }
        const categoriesMap = results.reduce((acc: Map<string, Category>, row) => {
            if (!row.categoryId) return acc;
            
            const categoryId = row.categoryId;
            if (!acc.has(categoryId)) {
                acc.set(categoryId, {
                    id: categoryId,
                    name: row.categoryName,
                    items: new Map()
                });
            }
            
            const category = acc.get(categoryId);

            if (category && row.actionItemId && !category.items.has(row.actionItemId)) {
                category.items.set(row.actionItemId, {
                    actionItemId: row.actionItemId,
                    actionItem: row.actionItemText,
                    dueDate: row.dueDate,
                    nextSteps: []
                });
            }

            if (row.nextStepId && row.actionItemId) {
                const nextStep = {
                    id: row.nextStepId,
                    text: row.nextStepText,
                    completed: row.nextStepCompleted,
                    dueDate: row.dueDate ? new Date(row.dueDate) : null
                };
                const actionItem = acc.get(categoryId)?.items.get(row.actionItemId);
                if (actionItem) {
                    actionItem.nextSteps.push(nextStep);
                }
            }

            return acc;
        }, new Map<string, Category>());

        // Convert map to array
        const finalResults = Array.from(categoriesMap.values()).map(category => ({
            ...category,
            items: Array.from(category.items.values())
        }));

        console.log('Final results:', JSON.stringify(finalResults, null, 2));
        return NextResponse.json(finalResults);

    } catch (error) {
        console.error('Search error:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
} 