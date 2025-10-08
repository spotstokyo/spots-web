"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import GlassCard from "@/components/GlassCard";
import { getCroppedImage } from "@/utils/crop-image";

export type BannerFilter = "none" | "warm" | "cool" | "mono" | "contrast";

export interface BannerEditorResult {
  dataUrl: string;
  filter: BannerFilter;
}

interface BannerEditorProps {
  initialImage?: string | null;
  initialFilter?: BannerFilter;
  onApply: (result: BannerEditorResult) => Promise<void>;
  onCancel: () => void;
}

export const filterClassMap: Record<BannerFilter, string> = {
  none: "",
  warm: "contrast-[1.05] saturate-[1.2] hue-rotate-[-5deg]",
  cool: "contrast-[1.05] saturate-[1.05] hue-rotate-[12deg]", 
  mono: "saturate-0 contrast-[1.1]",
  contrast: "contrast-[1.25] saturate-[1.05]",
};

export default function BannerEditor({
  initialImage,
  initialFilter = "none",
  onApply,
  onCancel,
}: BannerEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage ?? null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<BannerFilter>(initialFilter);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<
    { width: number; height: number; x: number; y: number } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(typeof reader.result === "string" ? reader.result : null);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setError(null);
    };
    reader.onerror = () => setError("Could not read the selected image.");
    reader.readAsDataURL(file);
  }, []);

  const handleCropComplete = useCallback(
    (
      _croppedArea: { width: number; height: number; x: number; y: number },
      croppedPixels: { width: number; height: number; x: number; y: number },
    ) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const applyEdits = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Upload an image to edit the banner.");
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const dataUrl = await getCroppedImage({
        imageSrc,
        pixelCrop: croppedAreaPixels,
        rotation,
        filter: filter === "none" ? undefined : getComputedFilter(filter),
      });
      await onApply({ dataUrl, filter });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong while processing the image.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [croppedAreaPixels, filter, imageSrc, onApply, rotation]);

  const previewFilterClass = filterClassMap[filter];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,20,33,0.55)] px-4 py-8 backdrop-blur-sm">
      <GlassCard className="relative w-full max-w-4xl space-y-6 border-white/70 bg-white/85 p-6">
        <h2 className="text-xl font-semibold text-[#18223a]">Edit banner</h2>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative h-[320px] flex-1 overflow-hidden rounded-2xl border border-white/60 bg-[#f3f4fb]">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={3}
                onCropChange={setCrop}
                onRotationChange={setRotation}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
                classes={{ containerClassName: previewFilterClass }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-[#4c5a7a]">
                <p>Upload an image to start editing.</p>
                <label className="cursor-pointer rounded-full border border-[#1d2742] bg-[#1d2742] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:scale-[1.02]">
                  Choose image
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>

          <div className="flex w-full max-w-xs flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm text-[#18223a]">
              <span className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block cursor-pointer rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[#18223a]">
              <span className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[#18223a]">
              <span className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Straighten</span>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value))}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[#18223a]">
              <span className="text-xs uppercase tracking-[0.2em] text-[#4d5f91]">Filter</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as BannerFilter)}
                className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs"
              >
                <option value="none">None</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="mono">Monochrome</option>
                <option value="contrast">Contrast</option>
              </select>
            </label>

            {imageSrc ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#4d5f91]">Preview</p>
                <div
                  className={`h-20 w-full overflow-hidden rounded-2xl border border-white/60 bg-[#f3f4fb] ${previewFilterClass}`}
                  style={{
                    backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
                    backgroundPosition: "center",
                    backgroundSize: `${zoom * 100}%`,
                    transform: `rotate(${rotation}deg)` as string,
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/60 bg-white/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1d2742] transition hover:scale-[1.02]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyEdits}
            disabled={submitting}
            className="rounded-full border border-[#1d2742] bg-[#1d2742] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving…" : "Save banner"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

const getComputedFilter = (filter: BannerFilter): string | undefined => {
  switch (filter) {
    case "warm":
      return "contrast(1.05) saturate(1.2) hue-rotate(-5deg)";
    case "cool":
      return "contrast(1.05) saturate(1.05) hue-rotate(12deg)";
    case "mono":
      return "grayscale(1) contrast(1.1)";
    case "contrast":
      return "contrast(1.25) saturate(1.05)";
    default:
      return undefined;
  }
};
