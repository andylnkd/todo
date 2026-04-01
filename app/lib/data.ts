import { db } from '@/drizzle/db';
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '@/drizzle/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

export interface FormattedCategoryData {
  name: string;
  items: {
    actionItem: string;
    nextSteps: string[];
  }[];
}

export async function getFormattedActionItems(userId: string, selectedItemIds?: string[]): Promise<FormattedCategoryData[]> {
  const filters = [eq(categoriesTable.userId, userId)];
  if (selectedItemIds && selectedItemIds.length > 0) {
    filters.push(inArray(actionItemsTable.id, selectedItemIds));
  }

  const userCategories = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      actionItemId: actionItemsTable.id,
      actionItemText: actionItemsTable.actionItem,
      nextStepText: nextStepsTable.step,
      actionItemCreatedAt: actionItemsTable.createdAt,
    })
    .from(categoriesTable)
    .leftJoin(actionItemsTable, eq(categoriesTable.id, actionItemsTable.categoryId))
    .leftJoin(nextStepsTable, eq(actionItemsTable.id, nextStepsTable.actionItemId))
    .where(and(...filters))
    .orderBy(desc(actionItemsTable.createdAt), categoriesTable.name, actionItemsTable.id, nextStepsTable.id);

  // Process the fetched data
  const categoryMap = new Map<string, { name: string; items: Map<string, { actionItem: string; nextSteps: Set<string> }> }>();
  for (const row of userCategories) {
    if (!row.categoryId || !row.actionItemId) continue;
    let category = categoryMap.get(row.categoryId);
    if (!category) {
      category = { name: row.categoryName!, items: new Map() };
      categoryMap.set(row.categoryId, category);
    }
    let actionItem = category.items.get(row.actionItemId);
    if (!actionItem) {
      actionItem = { actionItem: row.actionItemText!, nextSteps: new Set() };
      category.items.set(row.actionItemId, actionItem);
    }
    if (row.nextStepText) {
      actionItem.nextSteps.add(row.nextStepText);
    }
  }

  // Convert maps to the final array structure
  const actionItemsFormatted: FormattedCategoryData[] = [];
  categoryMap.forEach(categoryData => {
    const itemsArray: { actionItem: string; nextSteps: string[] }[] = [];
    categoryData.items.forEach(itemData => {
      itemsArray.push({ actionItem: itemData.actionItem, nextSteps: Array.from(itemData.nextSteps) });
    });
    actionItemsFormatted.push({ name: categoryData.name, items: itemsArray });
  });
  actionItemsFormatted.sort((a, b) => a.name.localeCompare(b.name));
  return actionItemsFormatted;
}
