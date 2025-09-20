import Image from "next/image";

interface PlaceBannerProps {
  name: string;
  bannerUrl: string | null;
  logoUrl: string | null;
}

export default function PlaceBanner({ name, bannerUrl, logoUrl }: PlaceBannerProps) {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-white/40 bg-white/10 shadow-xl">
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt={`${name} banner`}
          fill
          priority
          sizes="(min-width: 1024px) 960px, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-white/40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

      {logoUrl ? (
        <div className="absolute bottom-6 left-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-lg">
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
      ) : (
        <div className="absolute bottom-6 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/50 bg-white/70 text-lg font-semibold text-gray-700 shadow-lg">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
