import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import {
  categories as categoriesTable,
  actionItems as actionItemsTable,
  nextSteps as nextStepsTable,
} from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      actionItemId: actionItemsTable.id,
      actionItemText: actionItemsTable.actionItem,
      nextStepId: nextStepsTable.id,
      nextStepText: nextStepsTable.step,
      nextStepCompleted: nextStepsTable.completed,
      actionItemCreatedAt: actionItemsTable.createdAt,
    })
    .from(categoriesTable)
    .leftJoin(
      actionItemsTable,
      eq(categoriesTable.id, actionItemsTable.categoryId)
    )
    .leftJoin(
      nextStepsTable,
      eq(actionItemsTable.id, nextStepsTable.actionItemId)
    )
    .where(eq(categoriesTable.userId, userId))
    .orderBy(
      desc(actionItemsTable.createdAt),
      categoriesTable.name,
      actionItemsTable.id,
      nextStepsTable.id
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

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response from Gemini
    let parsedSuggestions: GeminiSuggestions;
    try {
      // Remove potential markdown fences (```json ... ```)
      const cleanJson = text.replace(/^```json\s*|^\s*```$|\s*```$/gm, '').trim();
      if (!cleanJson) {
          throw new Error("Cleaned JSON string is empty after removing markdown fences.");
      }
      parsedSuggestions = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Gemini response parsing error:', parseError);
      console.error('Raw Gemini response:', text);
      // Attempt to find JSON within the text if parsing failed directly
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
          try {
              parsedSuggestions = JSON.parse(jsonMatch[0]);
              console.warn("Successfully parsed JSON found within Gemini's raw response.");
          } catch (nestedError) {
               console.error('Nested parsing error after trying to extract JSON:', nestedError);
               return NextResponse.json(
                   { error: 'Failed to parse AI suggestions, even after attempting extraction.' },
                   { status: 500 }
               );
          }
      } else {
          return NextResponse.json(
              { error: 'Failed to parse AI suggestions. No valid JSON found.' },
              { status: 500 }
          );
      }
    }

    // Validate the structure
    if (!parsedSuggestions || !Array.isArray(parsedSuggestions.proposedStructure) || typeof parsedSuggestions.changeSummary !== 'string') {
         console.error('Invalid structure in AI suggestions (expected proposedStructure array and changeSummary string):', parsedSuggestions);
         return NextResponse.json(
            { error: 'Received invalid structure from AI.' },
            { status: 500 }
         );
    }

    // Return the suggestions including the summary
    return NextResponse.json({
      proposedStructure: parsedSuggestions.proposedStructure,
      changeSummary: parsedSuggestions.changeSummary
    });

  } catch (error) {
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
} 