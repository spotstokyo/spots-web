"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SubmitPage() {
  const [form, setForm] = useState({
    name: "",
    category: "restaurant",
    price_tier: 1,
    address: "",
    lat: "",
    lng: "",
    website: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.from("places").insert([
      {
        name: form.name,
        category: form.category,
        price_tier: Number(form.price_tier),
        address: form.address,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        website: form.website,
      },
    ]);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Spot submitted successfully! 🎉");
      setForm({
        name: "",
        category: "restaurant",
        price_tier: 1,
        address: "",
        lat: "",
        lng: "",
        website: "",
      });
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#FFFAFA] via-gray-100 to-gray-200 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl p-6 space-y-4 transition-transform duration-200 ease-out hover:scale-[1.02]"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
          Submit a Spot
        </h1>

        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
        >
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
          <option value="club">Club</option>
          <option value="cafe">Cafe</option>
        


        </select>

        <select
          name="price_tier"
          value={form.price_tier}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
        >
          <option value={1}>¥ (¥1-1,000)</option>
          <option value={2}>¥ (¥1,000-2,000)</option>
          <option value={3}>¥¥ (¥2,000-3,000)</option>
          <option value={4}>¥¥ (¥3,000-5,000)</option>
          <option value={5}>¥¥¥ (¥5,000-10,000)</option>
          <option value={6}>¥¥¥ (¥10,000+)</option>
        </select>

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
        />

        <div className="flex gap-2">
          <input
            type="text"
            name="lat"
            placeholder="Latitude"
            value={form.lat}
            onChange={handleChange}
            className="w-1/2 rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
          />
          <input
            type="text"
            name="lng"
            placeholder="Longitude"
            value={form.lng}
            onChange={handleChange}
            className="w-1/2 rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
          />
        </div>

        <input
          type="url"
          name="website"
          placeholder="Website"
          value={form.website}
          onChange={handleChange}
          className="w-full rounded-lg border border-white/40 bg-white/30 backdrop-blur-sm px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-white/30 backdrop-blur-md border border-white/40 shadow-md text-gray-900 font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {loading ? "Submitting..." : "Submit Spot"}
        </button>

        {success && <p className="text-green-600 text-sm">{success}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </main>
  );
}
