import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsonrepair } from 'jsonrepair';
import { getFormattedActionItems, FormattedCategoryData } from '@/app/lib/data';

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

// Structure for the data sent to the prompt
interface PromptActionItem {
    actionItem: string;
    nextSteps: string[];
}
interface PromptCategory {
    name: string;
    items: PromptActionItem[];
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

const PROMPT_TEMPLATE = "You are a productivity assistant specializing in refining to-do lists.\n" +
  "Analyze the following JSON data representing a user's current categories, action items, and next steps.\n" +
  "Your goal is to consolidate categories where logical (merge similar themes), refine action item wording for clarity and conciseness, and ensure action items are grouped under the most appropriate category.\n\n" +
  "Return a revised structure as a valid JSON object containing ONLY the proposed list structure under the key \"proposedStructure\" AND a textual summary of the key changes made under the key \"changeSummary\".\n\n" +
  "IMPORTANT:\n" +
  "- The output MUST be ONLY the JSON object, with no markdown formatting, backticks, or any surrounding text.\n" +
  "- The structure of the JSON object must strictly follow this format:\n" +
  "  {\n" +
  "    \"proposedStructure\": [\n" +
  "      {\n" +
  "        \"name\": \"string (refined category name)\",\n" +
  "        \"items\": [\n" +
  "          {\n" +
  "            \"actionItem\": \"string (refined action item text)\",\n" +
  "            \"nextSteps\": [\"string (original next step text)\"]\n" +
  "          }\n" +
  "        ]\n" +
  "      }\n" +
  "    ],\n" +
  "    \"changeSummary\": \"string (A concise summary of changes, e.g., 'Merged 'X' and 'Y' categories, renamed item 'Z'.')\"\n" +
  "  }\n" +
  "- Do NOT include IDs in your proposed structure. Focus on names, items, and steps.\n" +
  "- If you merge categories or move action items, reflect that in the new structure and mention it in the summary.\n" +
  "- If the input list is empty or has no clear actions, return: {\"proposedStructure\": [], \"changeSummary\": \"No changes suggested as the list is empty.\"}\n\n" +
  "Current List Data:\n" +
  "```json\n" +
  "__LIST_DATA__\n" +
  "```\n\n" +
  "Refined List JSON Output (including summary):\n";

// Helper to format data specifically for the Gemini prompt (removing IDs, simplifying next steps)
function formatDataForPrompt(data: FormattedCategoryData[]): PromptCategory[] {
    return data.map(category => ({
        name: category.name,
        items: category.items.map(item => ({
            actionItem: item.actionItem,
            // Extract just the text for the prompt as requested
            nextSteps: item.nextSteps
        }))
    }));
}

// --- API Route Handler ---

export async function POST() {
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
     const currentDataFull = await getFormattedActionItems(userId);

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
     const step = 'first';
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