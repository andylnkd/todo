import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../../../../drizzle/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { categories, actionItems, nextSteps } from '../../../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface Category {
  id: string;
  name: string;
  actionItems: {
    id: string;
    text: string;
    nextSteps: {
      id: string;
      text: string;
    }[];
  }[];
}

interface MergedData {
  categoryName: string;
  actionItems: {
    text: string;
    nextSteps: string[];
  }[];
}

interface ActionItem {
  id: string;
  text: string;
  nextSteps: {
    id: string;
    text: string;
  }[];
}

interface ProcessedCategory {
  id: string;
  name: string;
  actionItems: ActionItem[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { categoryIds } = await req.json();

    // 1. Fetch categories with their action items using regular joins
    const rows = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.userId, userId),
        inArray(categories.id, categoryIds)
      ))
      .leftJoin(
        actionItems,
        eq(categories.id, actionItems.categoryId)
      )
      .leftJoin(
        nextSteps,
        eq(actionItems.id, nextSteps.actionItemId)
      );

    // Process the rows into the required format
    const categoriesMap = new Map();
    
    rows.forEach((row) => {
      if (!row.categories) return;
      
      const categoryId = row.categories.id;
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: row.categories.name,
          actionItems: new Map()
        });
      }
      
      const category = categoriesMap.get(categoryId);
      
      if (row.action_items) {
        const actionItemId = row.action_items.id;
        if (!category.actionItems.has(actionItemId)) {
          category.actionItems.set(actionItemId, {
            id: actionItemId,
            text: row.action_items.actionItem,
            nextSteps: []
          });
        }
        
        if (row.next_steps) {
          const nextStep = {
            id: row.next_steps.id,
            text: row.next_steps.step
          };
          category.actionItems.get(actionItemId).nextSteps.push(nextStep);
        }
      }
    });

    // Convert Maps to arrays for the final structure
    const categoriesToCombine = Array.from(categoriesMap.values()).map(category => ({
      ...category,
      actionItems: Array.from(category.actionItems.values())
    })) as ProcessedCategory[];

    // 2. Prepare data for Gemini
    const prompt = `
      I have ${categoriesToCombine.length} categories to combine. Please help me merge them intelligently.
      
      Categories and their items:
      ${categoriesToCombine.map((cat: ProcessedCategory) => `
        Category: ${cat.name}
        Action Items:
        ${cat.actionItems.map((item: ActionItem) => `
          - ${item.text}
            Next Steps:
            ${item.nextSteps.map((step: { text: string }) => `  * ${step.text}`).join('\n')}
        `).join('\n')}
      `).join('\n')}

      Please provide:
      1. A new category name that best represents the combined categories
      2. A list of merged action items, combining similar items and their next steps
      3. For each merged item, include all relevant next steps
      
      Format the response as JSON:
      {
        "categoryName": "string",
        "actionItems": [
          {
            "text": "string",
            "nextSteps": ["string"]
          }
        ]
      }
    `;

    // 3. Get AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean and parse the response
    let mergedData;
    try {
      // Remove potential markdown fences
      text = text.replace(/^```json\s*|^\s*```$|\s*```$/gm, '').trim();
      if (!text) {
        throw new Error("Cleaned JSON string is empty after removing markdown fences.");
      }
      mergedData = JSON.parse(text);
    } catch (parseError) {
      console.error('Initial JSON parsing error:', parseError);
      // Attempt to find JSON within the text if parsing failed directly
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        try {
          mergedData = JSON.parse(jsonMatch[0]);
          console.log("Successfully parsed JSON found within response.");
        } catch (nestedError) {
          console.error('Failed to parse extracted JSON:', nestedError);
          throw new Error('Failed to parse AI response into valid JSON');
        }
      } else {
        console.error('Original AI response text:', text);
        throw new Error('No valid JSON found in AI response');
      }
    }

    // 4. Create new combined category
    const [combinedCategory] = await db.insert(categories).values({
      name: mergedData.categoryName,
      userId: userId,
      status: 'active'
    }).returning();

    // 5. Create merged action items
    for (const item of mergedData.actionItems) {
      const [newActionItem] = await db.insert(actionItems).values({
        categoryId: combinedCategory.id,
        actionItem: item.text,
        userId: userId,
        status: 'pending'
      }).returning();

      // Create next steps for this action item
      for (const stepText of item.nextSteps) {
        await db.insert(nextSteps).values({
          actionItemId: newActionItem.id,
          step: stepText,
          completed: false,
          userId: userId
        });
      }
    }

    // 6. Delete original categories and their associated items
    for (const categoryId of categoryIds) {
      // First get all action items for this category
      const categoryActionItems = await db
        .select()
        .from(actionItems)
        .where(eq(actionItems.categoryId, categoryId));

      // Delete next steps for each action item
      for (const item of categoryActionItems) {
        await db
          .delete(nextSteps)
          .where(eq(nextSteps.actionItemId, item.id));
      }

      // Delete all action items for this category
      await db
        .delete(actionItems)
        .where(eq(actionItems.categoryId, categoryId));

      // Finally delete the category
      await db
        .delete(categories)
        .where(eq(categories.id, categoryId));
    }

    revalidatePath('/dashboard');
    return Response.json({ success: true, category: combinedCategory });
  } catch (error) {
    console.error('Error combining categories:', error);
    return Response.json({ error: 'Failed to combine categories' }, { status: 500 });
  }
} 