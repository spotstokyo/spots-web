import type { NextConfig } from "next";

const supabaseRemotePattern = (() => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;

  try {
    const { hostname } = new URL(rawUrl);
    return {
      protocol: "https" as const,
      hostname,
      pathname: "/storage/v1/object/**",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseRemotePattern ? [supabaseRemotePattern] : [],
  },
};

export default nextConfig;
