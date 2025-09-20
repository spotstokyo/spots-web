"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";
import { getCroppedImage } from "@/lib/image";
import GlassCard from "@/components/GlassCard";

type PlaceSummary = Pick<Tables<"places">, "id" | "name" | "address" | "price_tier">;

const steps = [
  {
    title: "Upload photo",
    helper: "Crop the banner you want to share.",
  },
  {
    title: "Choose place",
    helper: "Search existing spots or add a new one.",
  },
  {
    title: "Price tier",
    helper: "How much did you spend this time?",
  },
  {
    title: "Add note",
    helper: "Share a quick detail or memory (optional).",
  },
];

function formatPriceLabel(tier: number | null | undefined) {
  if (!tier) return "Not specified";
  if (tier <= 1) return "¥";
  if (tier === 2) return "¥¥";
  if (tier === 3) return "¥¥¥";
  return "¥¥¥";
}

export default function PostForm() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [step, setStep] = useState(1);
  const totalSteps = steps.length;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSummary[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showNewPlace, setShowNewPlace] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: "", address: "", price_tier: 1 });
  const [savingPlace, setSavingPlace] = useState(false);

  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setSessionLoading(false);
    };

    fetchSession();
  }, []);

  useEffect(() => {
    if (!placeQuery.trim() || showNewPlace) {
      setPlaceResults([]);
      return;
    }

    const handler = window.setTimeout(async () => {
      setIsSearchingPlaces(true);
      const { data, error } = await supabase
        .from("places")
        .select("id, name, address, price_tier")
        .or(`name.ilike.%${placeQuery.trim()}%,address.ilike.%${placeQuery.trim()}%`)
        .order("name")
        .limit(8);

      if (!error && data) {
        setPlaceResults(data);
      }
      setIsSearchingPlaces(false);
    }, 300);

    return () => window.clearTimeout(handler);
  }, [placeQuery, showNewPlace]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(file);
      setImagePreview(reader.result as string);
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1.2);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePlace = async () => {
    if (!newPlace.name.trim()) {
      setToast({ message: "Please add a place name.", tone: "error" });
      return;
    }

    setSavingPlace(true);
    const { data, error } = await supabase
      .from("places")
      .insert([
        {
          name: newPlace.name.trim(),
          address: newPlace.address.trim() || null,
          category: "restaurant",
          price_tier: newPlace.price_tier,
        },
      ])
      .select("id, name, address, price_tier")
      .single<PlaceSummary>();

    setSavingPlace(false);

    if (error || !data) {
      setToast({ message: error?.message ?? "Unable to save place.", tone: "error" });
      return;
    }

    setSelectedPlace(data);
    setPlaceQuery(data.name);
    setShowNewPlace(false);
    setToast({ message: "Place added.", tone: "success" });
  };

  const canAdvance = useMemo(() => {
    if (step === 1) return Boolean(imagePreview && croppedAreaPixels);
    if (step === 2) return Boolean(selectedPlace);
    if (step === 3) return priceTier !== null;
    return true;
  }, [step, imagePreview, croppedAreaPixels, selectedPlace, priceTier]);

  const canSubmit = Boolean(
    session?.user?.id &&
      selectedPlace?.id &&
      priceTier !== null &&
      croppedAreaPixels &&
      imagePreview
  );

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !session?.user?.id || !selectedPlace || !imageFile || !croppedAreaPixels || !imagePreview) {
      setToast({ message: "Please complete all steps before submitting.", tone: "error" });
      return;
    }

    try {
      setSubmitting(true);

      const extension = imageFile.type.split("/")[1] ?? "jpg";
      const baseName = `${session.user.id}-${Date.now()}`;
      const originalPath = `original/${baseName}.${extension}`;
      const croppedPath = `cropped/${baseName}.jpg`;

      const { error: originalError } = await supabase.storage
        .from("post-images")
        .upload(originalPath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (originalError) {
        throw originalError;
      }

      const croppedBlob = await getCroppedImage(imagePreview, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], `${baseName}-cropped.jpg`, {
        type: "image/jpeg",
      });

      const { error: croppedError } = await supabase.storage
        .from("post-images")
        .upload(croppedPath, croppedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (croppedError) {
        throw croppedError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(croppedPath);

      const { error: insertError } = await supabase.from("posts").insert([
        {
          user_id: session.user.id,
          place_id: selectedPlace.id,
          photo_url: publicUrl,
          price_tier: priceTier,
          note: note.trim() || null,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      setToast({ message: "Post shared! Redirecting to feed.", tone: "success" });

      window.setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit post.";
      setToast({ message, tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="rounded-3xl border border-white/55 bg-white/55 px-6 py-8 text-center text-sm text-[#4c5a7a] shadow-[0_18px_40px_-28px_rgba(31,41,55,0.28)]">
        Loading your account…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-3xl border border-white/55 bg-white/55 px-6 py-8 text-center shadow-[0_22px_48px_-28px_rgba(31,41,55,0.3)]">
        <p className="text-lg font-semibold text-[#18223a]">Sign in to post</p>
        <p className="mt-2 text-sm text-[#4c5a7a]">
          You need to be logged in to share a new spot.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_48px_-28px_rgba(19,28,46,0.55)] transition hover:scale-[1.03]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-white/45 bg-white/55 px-4 py-2 text-sm text-[#1d2742] shadow-sm transition hover:scale-[1.02]"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = steps[step - 1];

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
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

      <GlassCard className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.32em] text-[#4d5f91]">
              Step {step} of {totalSteps}
            </p>
            <h2 className="text-2xl font-semibold text-[#18223a]">{currentStep.title}</h2>
            <p className="text-sm text-[#4c5a7a]">{currentStep.helper}</p>
          </div>
          <div className="flex gap-2">
            {steps.map((stepItem, index) => (
              <span
                key={stepItem.title}
                className={`h-1 w-12 rounded-full transition ${
                  index < step ? "bg-[#1d2742]" : "bg-white/55"
                }`}
              />
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-6">
        {step === 1 ? (
          <div className="space-y-6">
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-white/60 bg-black/60">
                  <Cropper
                    image={imagePreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9}
                    cropShape="rect"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#4c5a7a]">
                    Zoom
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                      className="h-1 w-48 cursor-pointer appearance-none rounded-full bg-[#1d2742]/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={resetImageState}
                    className="rounded-full border border-white/55 bg-white/60 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                  >
                    Choose another photo
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/55 bg-white/15 text-sm text-[#4c5a7a] transition hover:bg-white/25">
                <span className="text-base font-medium text-[#18223a]">Drag & drop or browse</span>
                <span className="text-xs text-[#7c89aa]">JPG, PNG or HEIC up to 15MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <input
              type="text"
              value={placeQuery}
              onChange={(event) => {
                setPlaceQuery(event.target.value);
                setShowNewPlace(false);
              }}
              placeholder="Search by name or address"
              className="w-full rounded-2xl border border-white/55 bg-white/50 px-4 py-3 text-[#18223a] placeholder:text-[#7c89aa] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2a3554]/30"
            />
            {isSearchingPlaces ? (
              <div className="rounded-2xl border border-white/45 bg-white/25 px-4 py-3 text-sm text-[#4c5a7a]">
                Searching…
              </div>
            ) : null}
            <div className="space-y-3">
              {placeResults.map((place) => {
                const isActive = selectedPlace?.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlace(place);
                      setShowNewPlace(false);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-[#1d2742]/70 bg-white/65 text-[#18223a] shadow-[0_24px_50px_-28px_rgba(19,28,46,0.45)]"
                        : "border-white/45 bg-white/20 text-[#2a3554] hover:bg-white/35"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#18223a]">{place.name}</p>
                    <p className="text-xs text-[#7c89aa]">{place.address ?? "Address coming soon"}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewPlace(true);
                  setSelectedPlace(null);
                }}
                className="rounded-full border border-white/45 bg-white/45 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
              >
                Can’t find it? Add new place
              </button>
              {selectedPlace ? (
                <span className="rounded-full border border-white/45 bg-white/45 px-4 py-2 text-sm text-[#1d2742]">
                  Selected: {selectedPlace.name}
                </span>
              ) : null}
            </div>

            {showNewPlace ? (
              <div className="space-y-3 rounded-2xl border border-white/55 bg-white/35 p-4 shadow-inner">
                <input
                  type="text"
                  value={newPlace.name}
                  onChange={(event) => setNewPlace((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Place name"
                  className="w-full rounded-xl border border-white/55 bg-white/55 px-4 py-2 text-sm text-[#18223a] placeholder:text-[#7c89aa]"
                />
                <input
                  type="text"
                  value={newPlace.address}
                  onChange={(event) => setNewPlace((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Address (optional)"
                  className="w-full rounded-xl border border-white/55 bg-white/55 px-4 py-2 text-sm text-[#18223a] placeholder:text-[#7c89aa]"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#4c5a7a]">Typical spend</span>
                  <select
                    value={newPlace.price_tier}
                    onChange={(event) =>
                      setNewPlace((prev) => ({ ...prev, price_tier: Number(event.target.value) }))
                    }
                    className="rounded-xl border border-white/55 bg-white/55 px-3 py-2 text-sm text-[#18223a]"
                  >
                    <option value={1}>¥</option>
                    <option value={2}>¥¥</option>
                    <option value={3}>¥¥¥</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCreatePlace}
                    disabled={savingPlace}
                    className="rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(19,28,46,0.52)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingPlace ? "Saving…" : "Add place"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewPlace(false)}
                    className="rounded-full border border-white/45 bg-white/45 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((tier) => {
                const active = priceTier === tier;
                const label = formatPriceLabel(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPriceTier(tier)}
                    className={`rounded-2xl border px-4 py-6 text-center transition ${
                      active
                        ? "border-[#1d2742]/70 bg-white/65 text-[#18223a] shadow-[0_26px_55px_-30px_rgba(19,28,46,0.45)]"
                        : "border-white/45 bg-white/20 text-[#2a3554] hover:bg-white/35"
                    }`}
                  >
                    <span className="text-2xl font-semibold text-[#18223a]">{label}</span>
                    <p className="mt-2 text-xs text-[#4c5a7a]">{tier === 1 ? "Casual" : tier === 2 ? "Treat" : "Splurge"}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#7c89aa]">
              This reflects what you spent on this visit. It can differ from the spot’s usual price tier.
            </p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Add a quick memory, tip, or dish you loved."
              className="w-full rounded-2xl border border-white/55 bg-white/50 px-4 py-3 text-sm text-[#18223a] placeholder:text-[#7c89aa] shadow-inner"
            />
            <div className="rounded-2xl border border-white/55 bg-white/35 p-4 shadow-inner">
              <p className="text-sm font-semibold text-[#18223a]">You’re sharing</p>
              <ul className="mt-2 space-y-1 text-sm text-[#2a3554]">
                <li>
                  Place:
                  <span className="ml-1 font-medium text-[#18223a]">
                    {selectedPlace?.name ?? "Select a place"}
                  </span>
                </li>
                <li>
                  Spending:
                  <span className="ml-1 font-medium text-[#18223a]">
                    {formatPriceLabel(priceTier)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </GlassCard>

      <footer className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || submitting}
          className="rounded-full border border-white/45 bg-white/45 px-4 py-2 text-sm text-[#1d2742] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>

        {step === totalSteps ? (
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Submit post"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-sm font-semibold text-white shadow-[0_24px_52px_-32px_rgba(19,28,46,0.58)] transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next step
          </button>
        )}
      </footer>
    </form>
  );
}
