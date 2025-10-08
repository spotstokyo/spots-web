"use client";

import { useState } from "react";
import TimePickerInput from "@/components/TimePickerInput";
import { supabase } from "@/lib/supabase";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

type WeekdayValue = (typeof WEEKDAYS)[number]["value"];

type DayRange = {
  open: string;
  close: string;
};

const createInitialHours = (): Record<WeekdayValue, DayRange[]> => {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day.value] = [];
    return acc;
  }, {} as Record<WeekdayValue, DayRange[]>);
};

export default function SubmitPage() {
  const [form, setForm] = useState({
    name: "",
    category: "restaurant",
    price_tier: 1,
    address: "",
    lat: "",
    lng: "",
    website: "",
    phone: "", //added phone field
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState<Record<WeekdayValue, DayRange[]>>(createInitialHours());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (weekday: WeekdayValue, enabled: boolean) => {
    setHours((prev) => {
      const next = { ...prev };
      if (enabled) {
        next[weekday] = prev[weekday].length ? prev[weekday] : [{ open: "11:00", close: "21:00" }];
      } else {
        next[weekday] = [];
      }
      return next;
    });
  };

  const addRange = (weekday: WeekdayValue) => {
    setHours((prev) => ({
      ...prev,
      [weekday]: [...prev[weekday], { open: "11:00", close: "21:00" }],
    }));
  };

  const updateRange = (
    weekday: WeekdayValue,
    index: number,
    key: keyof DayRange,
    value: string,
  ) => {
    setHours((prev) => {
      const ranges = [...prev[weekday]];
      ranges[index] = { ...ranges[index], [key]: value };
      return { ...prev, [weekday]: ranges };
    });
  };

  const removeRange = (weekday: WeekdayValue, index: number) => {
    setHours((prev) => {
      const ranges = [...prev[weekday]];
      ranges.splice(index, 1);
      return { ...prev, [weekday]: ranges };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const {
      data: insertedPlace,
      error: insertError,
    } = await supabase
      .from("places")
      .insert([
        {
          name: form.name,
          category: form.category,
          price_tier: Number(form.price_tier),
          address: form.address || null,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
          website: form.website || null,
          phone: form.phone || null, //phone field
        },
      ])
      .select("id")
      .single();

    if (insertError || !insertedPlace) {
      setLoading(false);
      setError(insertError?.message ?? "Unable to save place.");
      return;
    }

    const placeId = insertedPlace.id;

    const hoursPayload = Object.entries(hours).flatMap(([weekday, ranges]) =>
      ranges
        .filter((range) => range.open && range.close)
        .map((range) => ({
          place_id: placeId,
          weekday: Number(weekday),
          open: range.open,
          close: range.close,
        })),
    );

    if (hoursPayload.length) {
      const { error: hoursError } = await supabase
        .from("place_hours")
        .insert(hoursPayload);

      if (hoursError) {
        setLoading(false);
        setError(hoursError.message);
        return;
      }
    }

    setLoading(false);

    setSuccess("Spot submitted successfully! 🎉");
    setForm({
      name: "",
      category: "restaurant",
      price_tier: 1,
      address: "",
      lat: "",
      lng: "",
      website: "",
      phone: "",
    });
    setHours(createInitialHours());
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#FFFAFA] via-gray-100 to-gray-200 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white/20 dark:bg-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-700/40 shadow-xl p-6 space-y-4 transition-transform duration-200 ease-out hover:scale-[1.02]"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
          Submit a Spot
        </h1>

        {/* Name (required) */}
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />

        {/* Category */}
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100"
        >
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
          <option value="club">Club</option>
          <option value="cafe">Café</option>
        </select>

        {/* Price tier */}
        <select
          name="price_tier"
          value={form.price_tier}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100"
        >
          <option value={1}>¥ (¥1–1,000)</option>
          <option value={2}>¥ (¥1,000–2,000)</option>
          <option value={3}>¥¥ (¥2,000–3,000)</option>
          <option value={4}>¥¥ (¥3,000–5,000)</option>
          <option value={5}>¥¥¥ (¥5,000–10,000)</option>
          <option value={6}>¥¥¥ (¥10,000+)</option>
        </select>

        {/* Address */}
        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />

        {/* Phone */}
        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />

        {/* Lat + Lng (optional) */}
        <div className="flex gap-2">
          <input
            type="text"
            name="lat"
            placeholder="Latitude (optional)"
            value={form.lat}
            onChange={handleChange}
            className="w-1/2 rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <input
            type="text"
            name="lng"
            placeholder="Longitude (optional)"
            value={form.lng}
            onChange={handleChange}
            className="w-1/2 rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Website (optional) */}
        <input
          type="url"
          name="website"
          placeholder="Website (optional)"
          value={form.website}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />

        {/* Opening hours */}
        <div className="space-y-3 rounded-2xl border border-white/40 dark:border-gray-700/40 bg-white/25 dark:bg-gray-900/30 px-4 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Opening hours (optional)
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Add one or more time ranges per day. Leave unchecked for closed days.
            </p>
          </div>
          <div className="space-y-3">
            {WEEKDAYS.map((day) => {
              const ranges = hours[day.value];
              const enabled = ranges.length > 0;
              return (
                <div
                  key={day.value}
                  className="flex flex-col gap-3 rounded-xl border border-white/40 bg-white/35 px-3 py-3 dark:border-gray-700/50 dark:bg-gray-900/35 sm:flex-row sm:items-center sm:justify-between"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => toggleDay(day.value, event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    />
                    {day.label}
                  </label>
                  {enabled ? (
                    <div className="flex w-full flex-col gap-3">
                      {ranges.map((range, index) => (
                        <div key={`${day.value}-${index}`} className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            Open
                            <TimePickerInput
                              value={range.open}
                              onChange={(newValue) => updateRange(day.value, index, "open", newValue)}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            Close
                            <TimePickerInput
                              value={range.close}
                              onChange={(newValue) => updateRange(day.value, index, "close", newValue)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeRange(day.value, index)}
                            className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-[#1d2742] transition hover:scale-[1.03]"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRange(day.value)}
                        className="self-start rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-[#1d2742] transition hover:scale-[1.03]"
                      >
                        Add another range
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Closed</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-white/30 dark:bg-gray-700/40 backdrop-blur-md border border-white/40 dark:border-gray-600/40 shadow-md text-gray-900 dark:text-gray-100 font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {loading ? "Submitting..." : "Submit Spot"}
        </button>

        {/* Feedback */}
        {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      </form>
    </main>
  );
}
