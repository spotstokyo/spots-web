import { parseSearchQuery, type ParsedSearchQuery } from "./search-query";

const cache = new Map<string, ParsedSearchQuery>();

export const resolveSearchIntent = async (query: string, signal?: AbortSignal): Promise<ParsedSearchQuery> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return parseSearchQuery("");
  }

  const cached = cache.get(trimmed);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch("/api/search-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Intent request failed: ${response.status}`);
    }

    const payload = (await response.json()) as { intent: ParsedSearchQuery | null };
    if (payload.intent) {
      cache.set(trimmed, payload.intent);
      return payload.intent;
    }
  } catch {
    // ignore and fall back
  }

  const fallback = parseSearchQuery(trimmed);
  cache.set(trimmed, fallback);
  return fallback;
};
