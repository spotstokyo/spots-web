const fallbackFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatRelativeTime(dateString: string) {
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) {
    return fallbackFormatter.format(new Date());
  }

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absMinutes < 1) {
    return rtf.format(0, "minute");
  }

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);
  if (absDays < 7) {
    return rtf.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  const absWeeks = Math.abs(diffWeeks);
  if (absWeeks < 5) {
    return rtf.format(diffWeeks, "week");
  }

  const diffMonths = Math.round(diffDays / 30);
  const absMonths = Math.abs(diffMonths);
  if (absMonths < 12) {
    return rtf.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}
