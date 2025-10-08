"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const TIME_INTERVAL_MINUTES = 15;

const padTime = (value: number) => value.toString().padStart(2, "0");

const buildTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += TIME_INTERVAL_MINUTES) {
      options.push(`${padTime(hour)}:${padTime(minute)}`);
    }
  }
  return options;
};

const TIME_OPTIONS = buildTimeOptions();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseUserTime = (rawValue: string): string | null => {
  const trimmed = rawValue.trim().toLowerCase();
  if (!trimmed) return "";

  const suffixMatch = trimmed.match(/(am|pm|a|p)$/);
  const suffix = suffixMatch?.[1];
  const numericPart = suffix ? trimmed.slice(0, -suffix.length) : trimmed;
  const clean = numericPart.replace(/[^0-9:]/g, "");

  let hours: number | null = null;
  let minutes: number | null = null;

  if (clean.includes(":")) {
    const [rawHours, rawMinutes] = clean.split(":");
    if (!rawHours) return null;
    hours = Number.parseInt(rawHours, 10);
    minutes = rawMinutes ? Number.parseInt(rawMinutes.padEnd(2, "0").slice(0, 2), 10) : 0;
  } else if (clean.length <= 2) {
    hours = Number.parseInt(clean, 10);
    minutes = 0;
  } else if (clean.length === 3) {
    hours = Number.parseInt(clean.slice(0, 1), 10);
    minutes = Number.parseInt(clean.slice(1), 10);
  } else {
    hours = Number.parseInt(clean.slice(0, 2), 10);
    minutes = Number.parseInt(clean.slice(2).padEnd(2, "0").slice(0, 2), 10);
  }

  if (
    hours == null ||
    Number.isNaN(hours) ||
    minutes == null ||
    Number.isNaN(minutes) ||
    minutes > 59 ||
    hours > 99
  ) {
    return null;
  }

  if (suffix) {
    const isPM = suffix.startsWith("p");
    const isAM = suffix.startsWith("a");
    hours %= 24;
    if (isPM && hours < 12) {
      hours += 12;
    }
    if (isAM && hours === 12) {
      hours = 0;
    }
  }

  hours = clamp(hours, 0, 23);
  minutes = clamp(minutes, 0, 59);

  return `${padTime(hours)}:${padTime(minutes)}`;
};

const findClosestOption = (time: string): string => {
  const existingIndex = TIME_OPTIONS.indexOf(time);
  if (existingIndex >= 0) return TIME_OPTIONS[existingIndex];

  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  const totalMinutes = hours * 60 + minutes;

  let closest = TIME_OPTIONS[0];
  let minDiff = Number.POSITIVE_INFINITY;

  for (const option of TIME_OPTIONS) {
    const [optHours, optMinutes] = option.split(":").map((part) => Number.parseInt(part, 10));
    const optTotal = optHours * 60 + optMinutes;
    const diff = Math.abs(optTotal - totalMinutes);
    if (diff < minDiff) {
      minDiff = diff;
      closest = option;
    }
  }

  return closest;
};

const getAdjacentTime = (current: string, step: number) => {
  const index = TIME_OPTIONS.indexOf(findClosestOption(current));
  const nextIndex = (index + step + TIME_OPTIONS.length) % TIME_OPTIONS.length;
  return TIME_OPTIONS[nextIndex];
};

export default function TimePickerInput({
  value,
  onChange,
  id,
  name,
  placeholder,
  className,
  disabled,
}: TimePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraft(value);
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | globalThis.MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeTime = findClosestOption(draft || value || "09:00");
    const activeIndex = TIME_OPTIONS.indexOf(activeTime);
    if (activeIndex < 0) return;
    const itemHeight = 36;
    listRef.current.scrollTo({
      top: Math.max(activeIndex * itemHeight - itemHeight * 2, 0),
      behavior: "smooth",
    });
  }, [draft, isOpen, value]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  const commitDraft = () => {
    const parsed = parseUserTime(draft);
    if (parsed === null) {
      setDraft(value);
      return;
    }
    const normalized = parsed;
    if (normalized !== value) {
      onChange(normalized);
    }
    setDraft(normalized);
  };

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
      return;
    }
    commitDraft();
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = getAdjacentTime(draft || value || "00:00", 1);
      setDraft(next);
      onChange(next);
      setIsOpen(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = getAdjacentTime(draft || value || "00:00", -1);
      setDraft(prev);
      onChange(prev);
      setIsOpen(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      setIsOpen(false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
      setIsOpen(false);
    }
  };

  const handleOptionClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const selectedTime = event.currentTarget.value;
    onChange(selectedTime);
    setDraft(selectedTime);
    setIsOpen(false);
  };

  const inputClasses = [
    "w-24 rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-[#18223a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2742]/40 shadow-[0_6px_16px_-12px_rgba(20,30,50,0.45)]",
    disabled ? "cursor-not-allowed opacity-60" : "cursor-text",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className="relative inline-flex flex-col">
      <input
        id={id}
        name={name}
        value={draft}
        placeholder={placeholder ?? "HH:MM"}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className={inputClasses}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
      />

      {isOpen ? (
        <ul
          ref={listRef}
          className="absolute left-0 top-[calc(100%+0.25rem)] z-50 max-h-60 w-32 overflow-auto rounded-xl border border-white/70 bg-white/95 shadow-[0_18px_52px_-28px_rgba(20,30,50,0.5)] backdrop-blur"
          role="listbox"
        >
          {TIME_OPTIONS.map((option) => {
            const isActive = option === findClosestOption(draft || value || "00:00");
            return (
              <li key={option}>
                <button
                  type="button"
                  value={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleOptionClick}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-[#1d2742]/10 font-medium text-[#1d2742]"
                      : "text-[#4c5a7a] hover:bg-[#1d2742]/5"
                  }`}
                >
                  <span>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
