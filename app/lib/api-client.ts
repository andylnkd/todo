export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (contentType.includes('application/json')) {
    return rawText ? (JSON.parse(rawText) as T) : ({} as T);
  }

  if (rawText.trim().startsWith('<')) {
    const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim();
    throw new Error(title ? `Server returned HTML instead of JSON: ${title}` : 'Server returned HTML instead of JSON.');
  }

  throw new Error(rawText || 'Server returned a non-JSON response.');
}

export async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  try {
    const data = await parseApiResponse<{ error?: string; details?: string }>(response);
    const details = data.details ? ` ${data.details}` : '';
    return new Error((data.error || fallbackMessage) + details);
  } catch (error) {
    return error instanceof Error ? error : new Error(fallbackMessage);
  }
}
