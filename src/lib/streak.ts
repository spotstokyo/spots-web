const MS_IN_DAY = 86_400_000;

function toUtcDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const utc = new Date(date.getTime());
  utc.setUTCHours(0, 0, 0, 0);
  return utc.toISOString().slice(0, 10);
}

export function calculateStreakFromDates(dates: readonly string[], now = new Date()) {
  if (!dates.length) return 0;

  const uniqueDays = new Set<string>();
  dates.forEach((raw) => {
    const dateKey = toUtcDateKey(raw);
    if (dateKey) {
      uniqueDays.add(dateKey);
    }
  });

  let streak = 0;
  const cursor = new Date(now.getTime());
  cursor.setUTCHours(0, 0, 0, 0);

  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setTime(cursor.getTime() - MS_IN_DAY);
  }

  return streak;
}

export function calculateLongestStreakFromDates(dates: readonly string[]) {
  if (!dates.length) return 0;

  const uniqueDays = Array.from(new Set(dates.map((value) => toUtcDateKey(value))));
  if (!uniqueDays.length) return 0;

  const sortedDays = uniqueDays
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let longest = 1;
  let current = 1;

  for (let index = 1; index < sortedDays.length; index += 1) {
    const previous = new Date(sortedDays[index - 1]).getTime();
    const currentDay = new Date(sortedDays[index]).getTime();
    const diff = Math.round((currentDay - previous) / MS_IN_DAY);

    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}
