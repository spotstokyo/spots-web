"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import TimePickerInput from "./TimePickerInput";
import type { Tables } from "@/lib/database.types";

interface OpeningTimesEditorProps {
  placeId: string;
  initialHours: Array<Pick<Tables<"place_hours">, "id" | "weekday" | "open" | "close">>;
  canEdit?: boolean;
}

interface DayRange {
  open: string;
  close: string;
}

const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

const createEmptyHours = (): Record<number, DayRange[]> => ({
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
});

const buildHoursByDay = (
  hours: Array<Pick<Tables<"place_hours">, "id" | "weekday" | "open" | "close">>,
): Record<number, DayRange[]> => {
  const base = createEmptyHours();
  hours.forEach((entry) => {
    const weekday = Number(entry.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return;
    }
    base[weekday] = [
      ...base[weekday],
      { open: normalizeTime(entry.open), close: normalizeTime(entry.close) },
    ];
  });

  return base;
};

export default function OpeningTimesEditor({ placeId, initialHours, canEdit = false }: OpeningTimesEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const [hoursByDay, setHoursByDay] = useState<Record<number, DayRange[]>>(() => buildHoursByDay(initialHours));

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setHoursByDay(buildHoursByDay(initialHours));
  }, [initialHours, isOpen]);

  const readOnlyHours = useMemo(() => buildHoursByDay(initialHours), [initialHours]);

  useEffect(() => {
    if (!isOpen) {
      setHoursByDay(readOnlyHours);
    }
  }, [isOpen, readOnlyHours]);

  const summarySource = isOpen ? hoursByDay : readOnlyHours;

  const summary = useMemo(() => {
    return weekdayLabels.map((label, index) => {
      const ranges = summarySource[index] ?? [];
      if (!ranges.length) {
        return { label, text: "Closed" };
      }
      const text = ranges
        .map(({ open, close }) => `${open} – ${close}`)
        .join(", ");
      return { label, text };
    });
  }, [summarySource]);

  const addRange = (weekday: number) => {
    setHoursByDay((prev) => {
      const next = { ...prev };
      next[weekday] = [...(next[weekday] ?? []), { open: "11:00", close: "21:00" }];
      return next;
    });
  };

  const updateRange = (weekday: number, index: number, key: keyof DayRange, value: string) => {
    setHoursByDay((prev) => {
      const ranges = [...(prev[weekday] ?? [])];
      ranges[index] = { ...ranges[index], [key]: value };
      return { ...prev, [weekday]: ranges };
    });
  };

  const removeRange = (weekday: number, index: number) => {
    setHoursByDay((prev) => {
      const ranges = [...(prev[weekday] ?? [])];
      ranges.splice(index, 1);
      return { ...prev, [weekday]: ranges };
    });
  };

  const handleSave = async () => {
    if (!canEdit) {
      setToast({ message: "You don’t have permission to edit.", tone: "error" });
      return;
    }
    const payload: Array<Pick<Tables<"place_hours">, "place_id" | "weekday" | "open" | "close">> = [];

    for (const [weekdayString, ranges] of Object.entries(hoursByDay)) {
      const weekday = Number(weekdayString);
      ranges.forEach(({ open, close }) => {
        if (!open || !close) {
          return;
        }
        payload.push({ place_id: placeId, weekday, open, close });
      });
    }

    const hasInvalidRange = payload.some((entry) => entry.open >= entry.close);
    if (hasInvalidRange) {
      setToast({ message: "Close time must be after open time for each range.", tone: "error" });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/places/${placeId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours: payload.map(({ weekday, open, close }) => ({ weekday, open, close })),
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = result?.error ?? "Unable to save opening times.";
        throw new Error(message);
      }

      setToast({ message: "Opening times updated.", tone: "success" });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save opening times.";
      setToast({ message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="space-y-5">
      {toast ? (
        <div
          className={`fixed right-6 top-28 z-50 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            toast.tone === "success"
              ? "border-[#8fc7a6]/70 bg-[#e9fff3]/90 text-[#204836]"
              : "border-rose-200/80 bg-rose-50/90 text-rose-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#18223a]">Opening times</h2>
          <p className="text-sm text-[#4c5a7a]">
            {canEdit ? "Tap edit to update the schedule." : "Only admins can edit hours."}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-full border border-white/55 bg-white/55 px-4 py-2 text-sm font-medium text-[#1d2742] transition hover:scale-[1.01]"
          >
            Edit opening times
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {summary.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/55 bg-white/40 px-4 py-3 text-sm text-[#1d2742]"
          >
            <span className="font-medium text-[#18223a]">{item.label}</span>
            <span className="text-right text-[#4c5a7a]">{item.text}</span>
          </div>
        ))}
      </div>

      {mounted && isOpen && canEdit
        ? createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(12,18,31,0.45)] px-4 py-8 backdrop-blur-sm">
              <div className="relative flex h-[min(85vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.9)] shadow-[0_48px_120px_-48px_rgba(22,34,64,0.72)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-4 rounded-full border border-white/60 bg-white/65 px-3 py-1 text-xs text-[#1d2742] transition hover:bg-white"
                >
                  Close
                </button>
                <div className="flex-1 overflow-hidden px-6 pb-4 pt-14">
                  <h3 className="text-lg font-semibold text-[#18223a]">Edit opening times</h3>
                  <p className="text-sm text-[#4c5a7a]">Add one or more time ranges per day.</p>

                  <div className="mt-4 h-full overflow-y-auto pr-2">
                    {weekdayLabels.map((label, weekday) => {
                      const ranges = hoursByDay[weekday] ?? [];
                      return (
                        <div key={label} className="mb-6 rounded-2xl border border-white/55 bg-white/60 p-4 shadow-inner">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-[#18223a]">{label}</span>
                            <button
                              type="button"
                              onClick={() => addRange(weekday)}
                              className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-[#1d2742] transition hover:scale-[1.01]"
                            >
                              Add range
                            </button>
                          </div>
                          {ranges.length ? (
                            <div className="space-y-3">
                              {ranges.map((range, index) => (
                                <div key={`${weekday}-${index}`} className="flex flex-wrap items-center gap-3">
                                  <label className="flex items-center gap-2 text-xs text-[#4c5a7a]">
                                    Open
                                    <TimePickerInput
                                      value={range.open}
                                      onChange={(newValue) => updateRange(weekday, index, "open", newValue)}
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 text-xs text-[#4c5a7a]">
                                    Close
                                    <TimePickerInput
                                      value={range.close}
                                      onChange={(newValue) => updateRange(weekday, index, "close", newValue)}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeRange(weekday, index)}
                                    className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-[#1d2742] transition hover:scale-[1.01]"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#7c89aa]">Closed. Add a range to set hours.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/60 bg-white/70 px-6 py-4">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-white/55 bg-white/55 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </GlassCard>
  );
}
