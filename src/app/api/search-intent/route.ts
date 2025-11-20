import { NextResponse } from "next/server";
import {
  parseSearchQuery,
  sanitizeToken,
  type ParsedSearchQuery,
} from "@/lib/search-query";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

const normalizeIntent = (payload: unknown): ParsedSearchQuery | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const intent = payload as Partial<ParsedSearchQuery>;
  const sanitizeArray = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => (typeof entry === "string" ? sanitizeToken(entry) : ""))
      .map((entry) => entry.trim())
      .filter(Boolean);
  };

  const terms = sanitizeArray(intent.terms);
  const locationTerms = sanitizeArray(intent.locationTerms);

  const targetMinutes =
    typeof intent.targetMinutes === "number" && Number.isFinite(intent.targetMinutes)
      ? Math.max(0, Math.min(24 * 60, Math.round(intent.targetMinutes)))
      : null;

  const maxBudgetYen =
    typeof intent.maxBudgetYen === "number" && Number.isFinite(intent.maxBudgetYen)
      ? Math.max(0, Math.round(intent.maxBudgetYen))
      : null;

  const wantsNearby = Boolean(intent.wantsNearby);

  return {
    terms,
    locationTerms,
    targetMinutes,
    maxBudgetYen,
    wantsNearby,
  };
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof (body as { query?: unknown })?.query === "string" ? (body as { query: string }).query : "";
  const trimmed = query.trim();
  if (!trimmed) {
    return NextResponse.json({ intent: null, source: "empty" });
  }

  const fallbackIntent = parseSearchQuery(trimmed);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ intent: fallbackIntent, source: "heuristic" });
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              [
                "You extract search intents for a Tokyo spots app.",
                "Respond ONLY with strict JSON containing keys:",
                "- terms: array of lowercase descriptive keywords (e.g. cuisine, vibe).",
                "- locationTerms: array of lowercase neighborhoods/cities.",
                "- targetMinutes: integer minutes past midnight for desired time (null if none).",
                "- maxBudgetYen: integer budget cap in yen (null if not mentioned).",
                "- wantsNearby: boolean true when the user wants places near their current location (phrases like \"near me\", \"around me\", \"nearby\", \"close by\").",
                "Rules:",
                "- Map words cheap/affordable/inexpensive/low-cost to maxBudgetYen = 1000.",
                "- Map mid-range/moderate/casual to maxBudgetYen = 3000.",
                "- If user states an amount like '3000 yen', '¥2k', or 'budget is 4000', set maxBudgetYen to that numeric value.",
                "- Set wantsNearby true for \"near me\", \"around me\", \"nearby\", \"close by\".",
                "- When no explicit keywords exist, terms can be empty.",
                "- Never include extra text outside JSON.",
              ].join(" "),
          },
          {
            role: "user",
            content: trimmed,
          },
        ],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Groq request failed: ${response.status} ${
          responseText.length <= 256 ? responseText : `${responseText.slice(0, 252)}…`
        }`,
      );
    }

    let completion: {
      choices?: Array<{ message?: { content?: string } }>;
    };

    try {
      completion = JSON.parse(responseText) as typeof completion;
    } catch {
      throw new Error("Groq response was not valid JSON");
    }
    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty Groq response");
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawContent);
    } catch {
      try {
        parsedPayload = JSON.parse(responseText);
      } catch (error) {
        throw new Error(`Unable to parse Groq JSON: ${(error as Error).message}`);
      }
    }

    const intent = normalizeIntent(parsedPayload) ?? fallbackIntent;
    return NextResponse.json({ intent, source: "groq" });
  } catch (error) {
    console.warn("[search-intent] Falling back to heuristic parser", error);
    return NextResponse.json({ intent: fallbackIntent, source: "heuristic" });
  }
}
