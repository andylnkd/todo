import { jsonrepair } from 'jsonrepair';

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

export function extractJsonPayload(text: string): string {
  const cleaned = text.replace(/```json\s*|```\s*/gi, '').trim();

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return cleaned;
}

export function parseGeminiJson<T>(text: string): T {
  const payload = extractJsonPayload(text);
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    try {
      return JSON.parse(jsonrepair(payload)) as T;
    } catch {
      const originalMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini returned invalid JSON. ${originalMessage}`);
    }
  }
}
