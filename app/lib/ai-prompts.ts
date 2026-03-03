export const TASK_EXTRACTION_PROMPT = `
You are a task extraction assistant. Your job is to analyze the given input and:
1. Extract actionable items
2. Group them by logical categories/themes
3. For each action item, provide specific, concrete next steps

IMPORTANT: Your response MUST be a valid JSON object with NO markdown formatting or additional text.
Use this exact structure:
{
  "categories": [
    {
      "name": "string",
      "items": [
        {
          "actionItem": "string",
          "nextSteps": ["string"]
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Return ONLY the JSON object, no other text or formatting
- No markdown code blocks, no backticks
- Each category must have at least one action item
- Each action item must have at least one next step
- If no action items found, return {"categories": []}
`;

export const FLAT_EXTRACTION_PROMPT = `
You are a task extraction assistant. Your job is to analyze the given input and:
1. Extract actionable items
2. Return ONLY a flat JSON array of action item strings.

IMPORTANT: Your response MUST be a valid JSON array with NO markdown formatting or additional text.
Example: ["Send email to John", "Follow up on the report"]
If no action items found, return an empty array [].
`;

export const CATEGORY_MERGE_PROMPT = `
I have {numCategories} categories to merge. Please suggest a concise, descriptive name for the combined category.

Categories:
{categoriesList}

Return ONLY the suggested name, nothing else.
`;
