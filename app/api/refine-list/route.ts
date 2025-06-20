import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import * as schema from '../../../drizzle/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsonrepair } from 'jsonrepair';

// --- Type Definitions ---

// Structure matching data fetched from DB (includes IDs)
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date | null;
}
interface ActionItemWithNextSteps {
  actionItemId: string;
  actionItem: string;
  nextSteps: NextStepDetail[];
}
interface CategoryWithItems {
  id: string;
  name: string;
  items: ActionItemWithNextSteps[];
}

// Structure Gemini is expected to return (no IDs, simplified next steps)
interface GeminiActionItem {
    actionItem: string;
    nextSteps: string[];
}
interface GeminiCategory {
    name: string;
    items: GeminiActionItem[];
}

// New structure for the API response including the summary
interface GeminiSuggestions {
    proposedStructure: GeminiCategory[];
    changeSummary: string; // Textual summary of changes
}

// --- Gemini Initialization ---

let genAI: GoogleGenerativeAI | null = null;
try {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY environment variable not set. AI Refine feature will be disabled.");
    } else {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
    // genAI remains null, feature will be disabled
}

// --- Prompt Template ---

const PROMPT_TEMPLATE = `
You are a productivity assistant specializing in refining to-do lists.
Analyze the following JSON data representing a user's current categories, action items, and next steps.
Your goal is to consolidate categories where logical (merge similar themes), refine action item wording for clarity and conciseness, and ensure action items are grouped under the most appropriate category.

Return a revised structure as a valid JSON object containing ONLY the proposed list structure under the key "proposedStructure" AND a textual summary of the key changes made under the key "changeSummary".

IMPORTANT:
- The output MUST be ONLY the JSON object, with no markdown formatting, backticks, or any surrounding text.
- The structure of the JSON object must strictly follow this format:
  {
    "proposedStructure": [
      {
        "name": "string (refined category name)",
        "items": [
          {
            "actionItem": "string (refined action item text)",
            "nextSteps": ["string (original next step text)"]
          }
        ]
      }
    ],
    "changeSummary": "string (A concise summary of changes, e.g., 'Merged 'X' and 'Y' categories, renamed item 'Z'.')"
  }
- Do NOT include IDs in your proposed structure. Focus on names, items, and steps.
- If you merge categories or move action items, reflect that in the new structure and mention it in the summary.
- If the input list is empty or has no clear actions, return: {"proposedStructure": [], "changeSummary": "No changes suggested as the list is empty."}

Current List Data:
\`\`\`json
__LIST_DATA__
\`\`\`

Refined List JSON Output (including summary):
`;

// --- Data Fetching and Formatting ---

async function fetchAndFormatData(userId: string): Promise<CategoryWithItems[]> {
  // Fetch data (similar to dashboard)
  const userCategories = await db
    .select({
      categoryId: schema.categories.id,
      categoryName: schema.categories.name,
      actionItemId: schema.actionItems.id,
      actionItemText: schema.actionItems.actionItem,
      nextStepId: schema.nextSteps.id,
      nextStepText: schema.nextSteps.step,
      nextStepCompleted: schema.nextSteps.completed,
      actionItemCreatedAt: schema.actionItems.createdAt,
    })
    .from(schema.categories)
    .leftJoin(
      schema.actionItems,
      eq(schema.categories.id, schema.actionItems.categoryId)
    )
    .leftJoin(
      schema.nextSteps,
      eq(schema.actionItems.id, schema.nextSteps.actionItemId)
    )
    .where(eq(schema.categories.userId, userId))
    .orderBy(
      desc(schema.actionItems.createdAt),
      schema.categories.name,
      schema.actionItems.id,
      schema.nextSteps.id
    );

  // Process data (similar to dashboard)
  const actionItemsFormatted: CategoryWithItems[] = [];
  const categoryMap = new Map<
    string,
    {
      id: string;
      name: string;
      items: Map<
        string,
        { id: string; actionItem: string; nextSteps: Map<string, NextStepDetail> }
      >;
    }
  >();

  for (const row of userCategories) {
    if (!row.categoryId) continue;
    let category = categoryMap.get(row.categoryId);
    if (!category) {
      category = { id: row.categoryId, name: row.categoryName!, items: new Map() };
      categoryMap.set(row.categoryId, category);
    }
    if (row.actionItemId) {
      let actionItem = category.items.get(row.actionItemId);
      if (!actionItem) {
        actionItem = {
          id: row.actionItemId,
          actionItem: row.actionItemText!,
          nextSteps: new Map(),
        };
        category.items.set(row.actionItemId, actionItem);
      }
      if (row.nextStepId && row.nextStepText !== null) {
        if (!actionItem.nextSteps.has(row.nextStepId)) {
          actionItem.nextSteps.set(row.nextStepId, {
            id: row.nextStepId,
            text: row.nextStepText,
            completed: row.nextStepCompleted!,
          });
        }
      }
    }
  }

  categoryMap.forEach((categoryData) => {
    const itemsArray: ActionItemWithNextSteps[] = [];
    categoryData.items.forEach((itemData) => {
      const nextStepsArray = Array.from(itemData.nextSteps.values());
      itemsArray.push({
        actionItemId: itemData.id, // Keep ID here for internal processing
        actionItem: itemData.actionItem,
        nextSteps: nextStepsArray, // Pass the full details internally
      });
    });
    actionItemsFormatted.push({
      id: categoryData.id, // Keep ID here for internal processing
      name: categoryData.name,
      items: itemsArray,
    });
  });
  actionItemsFormatted.sort((a, b) => a.name.localeCompare(b.name));
  return actionItemsFormatted;
}

// Helper to format data specifically for the Gemini prompt (removing IDs, simplifying next steps)
function formatDataForPrompt(data: CategoryWithItems[]): any[] {
    return data.map(category => ({
        name: category.name,
        items: category.items.map(item => ({
            actionItem: item.actionItem,
            // Extract just the text for the prompt as requested
            nextSteps: item.nextSteps.map(ns => ns.text)
        }))
    }));
}

// Helper function to generate a unique request ID for logging
function genRequestId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Define the structure for suggestions from Gemini
interface GeminiSuggestion {
  category: string;
  actionItem: string;
  nextSteps: string[];
}

const PROMPT = `
You are an expert at organizing tasks. Based on the following list of action items and categories, please refine and reorganize them into a more logical structure.
The user wants a clear, actionable list. You can re-categorize items, merge similar tasks, and suggest new, more concise wording.
Return the suggestions as a JSON object with a single key "suggestions" which is an array of objects.
Each object should have "category", "actionItem", and "nextSteps" (an array of strings).

Example:
{
  "suggestions": [
    { "category": "Work", "actionItem": "Finish quarterly report", "nextSteps": ["Analyze sales data", "Create presentation slides"] }
  ]
}

Here is the user's list:
`;

// --- API Route Handler ---

export async function POST(request: NextRequest) {
    // Check if genAI was initialized
    if (!genAI) {
        console.error("GoogleGenerativeAI is not initialized. Check API Key. AI Refine feature unavailable.");
        return NextResponse.json({ error: 'AI service not available due to configuration error.' }, { status: 503 }); // Service Unavailable
    }

   try {
     const { userId } = await auth();
     if (!userId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     // Fetch and format the current user data (full details)
     const currentDataFull = await fetchAndFormatData(userId);

     if (currentDataFull.length === 0) {
       return NextResponse.json({ proposedStructure: [], changeSummary: "No changes suggested as the list is empty." }); // Return empty if no data
     }

     // Format data specifically for the prompt
     const dataForPrompt = formatDataForPrompt(currentDataFull);

     // Prepare the prompt for Gemini
     const prompt = PROMPT_TEMPLATE.replace(
       '__LIST_DATA__',
       JSON.stringify(dataForPrompt, null, 2) // Pretty print simplified data for prompt
     );

     // Call Gemini API (first attempt)
     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
     let result, response, text;
     let parsedSuggestions: GeminiSuggestions;
     let parseError: unknown, jsonMatch;
     let step = 'first';
     try {
       result = await model.generateContent(prompt);
       response = await result.response;
       text = response.text();

       try {
           // Clean up potential markdown wrapping the JSON
           const cleanedText = text.replace(/^```json\s*|```\s*$/g, '');
           const repairedJson = jsonrepair(cleanedText);
           parsedSuggestions = JSON.parse(repairedJson);
       } catch (e) {
           console.error("Failed to parse JSON from Gemini:", e);
           console.error("Original Gemini response text for debugging:", text);
           return NextResponse.json({ error: 'AI service returned invalid data format.' }, { status: 502 });
       }

       console.log(`[Refine] Successfully parsed suggestions at step: ${step}`);
       return NextResponse.json({
         proposedStructure: parsedSuggestions.proposedStructure,
         changeSummary: parsedSuggestions.changeSummary
       });

     } catch (error: unknown) {
       console.error('Error in /api/refine-list:', error);
        // More robust check for Gemini API errors if possible (check error object structure)
        if (error instanceof Error && error.message.includes('Request failed with status code')) { // Example check
            console.error('Gemini API Request Error:', error);
            return NextResponse.json({ error: 'AI service request failed.' }, { status: 502 }); // Bad Gateway
        }
       return NextResponse.json(
         { error: 'Failed to get AI refinement suggestions due to an internal error.' },
         { status: 500 }
       );
     }
   } catch (err) {
     const error = err instanceof Error ? err : new Error(String(err));
     console.error('Error refining list:', error.stack || error.message);
     return NextResponse.json({ error: 'Failed to refine list', details: error.message }, { status: 500 });
   }
}

// This is the new endpoint that the mobile app will call to save the refined list.
export async function PUT(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { suggestions } = body;

        // Start a transaction
        await db.transaction(async (tx) => {
            // Clear existing items for this user
            // This is a destructive action, be careful.
            // You might want a different strategy, like marking old items as archived.
            const actionItemsToDelete = await tx.select({ id: schema.actionItems.id }).from(schema.actionItems).where(eq(schema.actionItems.userId, userId));
            if (actionItemsToDelete.length > 0) {
                const ids = actionItemsToDelete.map(i => i.id);
                await tx.delete(schema.nextSteps).where(inArray(schema.nextSteps.actionItemId, ids));
                await tx.delete(schema.actionItems).where(eq(schema.actionItems.userId, userId));
            }
            await tx.delete(schema.categories).where(eq(schema.categories.userId, userId));


            // Insert new items
            for (const suggestion of suggestions) {
                // Find or create category
                let [category] = await tx.select().from(schema.categories).where(and(eq(schema.categories.name, suggestion.category), eq(schema.categories.userId, userId)));
                if (!category) {
                    [category] = await tx.insert(schema.categories).values({ name: suggestion.category, userId }).returning();
                }

                // Insert action item
                const [actionItem] = await tx.insert(schema.actionItems).values({
                    categoryId: category.id,
                    actionItem: suggestion.actionItem,
                    userId,
                }).returning();

                // Insert next steps
                if (suggestion.nextSteps && suggestion.nextSteps.length > 0) {
                    await tx.insert(schema.nextSteps).values(
                        suggestion.nextSteps.map((step: string) => ({
                            actionItemId: actionItem.id,
                            step,
                            userId,
                            completed: false,
                        }))
                    );
                }
            }
        });

        return NextResponse.json({ message: 'List refined and saved successfully' });
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error saving refined list:', error.stack || error.message);
        return NextResponse.json({ error: 'Failed to save refined list', details: error.message }, { status: 500 });
    }
} 