"use client";

import { useState } from "react";
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

type DayHours = {
  enabled: boolean;
  open: string;
  close: string;
};

const createInitialHours = (): Record<WeekdayValue, DayHours> => {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day.value] = { enabled: false, open: "", close: "" };
    return acc;
  }, {} as Record<WeekdayValue, DayHours>);
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
  const [hours, setHours] = useState<Record<WeekdayValue, DayHours>>(createInitialHours());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (weekday: WeekdayValue, enabled: boolean) => {
    setHours((prev) => ({
      ...prev,
      [weekday]: {
        enabled,
        open: enabled ? prev[weekday].open : "",
        close: enabled ? prev[weekday].close : "",
      },
    }));
  };

  const updateDayField = (
    weekday: WeekdayValue,
    key: "open" | "close",
    value: string,
  ) => {
    setHours((prev) => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        [key]: value,
      },
    }));
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

    const hoursPayload = Object.entries(hours)
      .filter(([, value]) => value.enabled && value.open && value.close)
      .map(([weekday, value]) => ({
        place_id: placeId,
        weekday: Number(weekday),
        open: value.open,
        close: value.close,
      }));

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

        {/* Phone */
        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 dark:border-gray-700/40 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        }

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
              Add one time range per day. Leave blank for closed days.
            </p>
          </div>
          <div className="space-y-3">
            {WEEKDAYS.map((day) => {
              const value = hours[day.value];
              return (
                <div
                  key={day.value}
                  className="flex flex-col gap-3 rounded-xl border border-white/40 bg-white/35 px-3 py-3 dark:border-gray-700/50 dark:bg-gray-900/35 sm:flex-row sm:items-center sm:justify-between"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <input
                      type="checkbox"
                      checked={value.enabled}
                      onChange={(event) => toggleDay(day.value, event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    />
                    {day.label}
                  </label>
                  {value.enabled ? (
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        Open
                        <input
                          type="time"
                          value={value.open}
                          onChange={(event) => updateDayField(day.value, "open", event.target.value)}
                          className="rounded-lg border border-white/40 bg-white/70 px-3 py-2 text-sm text-gray-900 dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-100"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        Close
                        <input
                          type="time"
                          value={value.close}
                          onChange={(event) => updateDayField(day.value, "close", event.target.value)}
                          className="rounded-lg border border-white/40 bg-white/70 px-3 py-2 text-sm text-gray-900 dark:border-gray-700/60 dark:bg-gray-900/40 dark:text-gray-100"
                        />
                      </label>
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
