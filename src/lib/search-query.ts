const LOCATION_KEYWORDS = [
  "tokyo",
  "meguro",
  "nakameguro",
  "shibuya",
  "shinjuku",
  "roppongi",
  "ebisu",
  "daikanyama",
  "ginza",
  "setagaya",
  "shimokitazawa",
  "kichijoji",
  "asakusa",
  "ikebukuro",
  "yokohama",
  "hiyoshi",
  "kamimeguro",
  "meguroku",
];

const TIME_KEYWORD_RULES: Array<{ pattern: string; minutes: number }> = [
  { pattern: "\\b(late night|after hours|after-hours|night owl|midnight)\\b", minutes: 23 * 60 },
  { pattern: "\\b(brunch)\\b", minutes: 11 * 60 },
  { pattern: "\\b(breakfast|morning)\\b", minutes: 8 * 60 },
  { pattern: "\\b(lunch|midday)\\b", minutes: 12 * 60 },
  { pattern: "\\b(dinner|evening)\\b", minutes: 19 * 60 },
];

const STOP_WORDS = new Set(["in", "at", "near", "for", "the", "a", "an", "to", "on", "with", "of", "best", "open", "spots"]);

const BUDGET_HINTS: Array<{ pattern: RegExp; value: number }> = [
  { pattern: /\b(cheap|affordable|budget|low[-\s]*cost|inexpensive)\b/g, value: 1000 },
  { pattern: /\b(mid[-\s]*range|moderate|casual)\b/g, value: 3000 },
];

const NEAR_ME_PATTERNS = [/\bnear\s*me\b/gi, /\bnearby\b/gi, /\bclose\s*by\b/gi, /\baround\s*me\b/gi];

const UNDER_VALUE_REGEX = /\b(?:under|below|less\s*than)\s*(?:¥\s*)?(\d[\d,]*)\s*(?:yen|円)?\b/g;
const PREFIX_YEN_REGEX = /\b¥\s*(\d[\d,]*)\b/g;
const SUFFIX_YEN_REGEX = /\b(\d[\d,]*)\s*(?:yen|円)\b/g;
const K_SUFFIX_REGEX = /\b(\d+)\s?[kＫ]\b/g;

export interface ParsedSearchQuery {
  terms: string[];
  locationTerms: string[];
  targetMinutes: number | null;
  maxBudgetYen: number | null;
  wantsNearby: boolean;
}

export const sanitizeToken = (token: string) =>
  token
    .replace(/[%_]/g, "")
    .replace(/'/g, "''")
    .trim()
    .toLowerCase();

export const toMinutes = (value: string): number | null => {
  const [hourPart, minutePart] = value.split(":");
  const hour = Number.parseInt(hourPart ?? "", 10);
  const minute = Number.parseInt((minutePart ?? "").slice(0, 2), 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return hour * 60 + minute;
};

const parseExplicitTime = (match: RegExpMatchArray): number | null => {
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "0", 10);
  if (!Number.isFinite(hour) || hour > 24) return null;
  const meridiem = match[3]?.toLowerCase();

  let normalizedHour = hour;
  if (meridiem === "am") {
    normalizedHour = hour % 12;
  } else if (meridiem === "pm") {
    normalizedHour = hour % 12 + 12;
  } else if (!meridiem && hour === 24) {
    normalizedHour = 0;
  }

  return normalizedHour * 60 + (Number.isFinite(minute) ? minute : 0);
};

const tryParseNumber = (value: string): number | null => {
  const normalized = value.replace(/[,\s]/g, "");
  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const applyBudgetValue = (current: number | null, incoming: number | null) => {
  if (incoming == null) return current;
  if (incoming <= 0) return current;
  if (current == null) return incoming;
  return Math.min(current, incoming);
};

export const parseSearchQuery = (raw: string): ParsedSearchQuery => {
  let working = raw.toLowerCase();
  const locationTerms: string[] = [];

  LOCATION_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    if (regex.test(working)) {
      locationTerms.push(keyword);
      working = working.replace(regex, " ");
    }
  });

  let targetMinutes: number | null = null;
  TIME_KEYWORD_RULES.forEach(({ pattern, minutes }) => {
    const regex = new RegExp(pattern, "gi");
    if (regex.test(working)) {
      targetMinutes = Math.max(targetMinutes ?? 0, minutes);
      working = working.replace(regex, " ");
    }
  });

  const explicitMatches = [...working.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)];
  if (explicitMatches.length) {
    const match = explicitMatches[explicitMatches.length - 1];
    const parsed = parseExplicitTime(match);
    if (parsed != null) {
      targetMinutes = parsed;
      working = working.replace(match[0], " ");
    }
  }

  let maxBudgetYen: number | null = null;
  let wantsNearby = false;

  UNDER_VALUE_REGEX.lastIndex = 0;
  working = working.replace(UNDER_VALUE_REGEX, (match, rawValue) => {
    maxBudgetYen = applyBudgetValue(maxBudgetYen, tryParseNumber(rawValue));
    return " ";
  });

  PREFIX_YEN_REGEX.lastIndex = 0;
  working = working.replace(PREFIX_YEN_REGEX, (match, rawValue) => {
    maxBudgetYen = applyBudgetValue(maxBudgetYen, tryParseNumber(rawValue));
    return " ";
  });

  SUFFIX_YEN_REGEX.lastIndex = 0;
  working = working.replace(SUFFIX_YEN_REGEX, (match, rawValue) => {
    maxBudgetYen = applyBudgetValue(maxBudgetYen, tryParseNumber(rawValue));
    return " ";
  });

  K_SUFFIX_REGEX.lastIndex = 0;
  working = working.replace(K_SUFFIX_REGEX, (match, rawValue) => {
    const parsed = tryParseNumber(rawValue);
    maxBudgetYen = applyBudgetValue(maxBudgetYen, parsed != null ? parsed * 1000 : null);
    return " ";
  });

  BUDGET_HINTS.forEach(({ pattern, value }) => {
    pattern.lastIndex = 0;
    if (pattern.test(working)) {
      maxBudgetYen = applyBudgetValue(maxBudgetYen, value);
      working = working.replace(pattern, " ");
      pattern.lastIndex = 0;
    }
  });

  NEAR_ME_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;
    if (pattern.test(working)) {
      wantsNearby = true;
      working = working.replace(pattern, " ");
      pattern.lastIndex = 0;
    }
  });

  const terms = working
    .split(/\s+/)
    .map((term) => sanitizeToken(term))
    .filter((term) => term.length && !STOP_WORDS.has(term));

  return {
    terms,
    locationTerms,
    targetMinutes,
    maxBudgetYen,
    wantsNearby,
  };
};

const PRICE_THRESHOLDS = [1000, 2000, 3000, 5000, 10000];

export const inferPriceTierFromBudget = (budgetYen: number | null): number | null => {
  if (budgetYen == null || !Number.isFinite(budgetYen)) return null;
  for (let index = 0; index < PRICE_THRESHOLDS.length; index += 1) {
    if (budgetYen <= PRICE_THRESHOLDS[index]) {
      return index + 1;
    }
  }
  return PRICE_THRESHOLDS.length + 1;
};

export const resolveNumericPriceTier = (priceTier: number | null | undefined, priceIcon: string | null | undefined) => {
  if (priceTier != null) {
    const numeric = Number(priceTier);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  if (priceIcon) {
    const yenMatches = priceIcon.match(/¥/g);
    if (yenMatches?.length) {
      return yenMatches.length;
    }
  }

  return null;
};
