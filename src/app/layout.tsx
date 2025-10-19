import type { Metadata, Viewport } from "next";
import AppRoot from "@/components/AppRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "spots",
  description: "find your spot",
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff00" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a00" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
    address: true,
  },
  icons: {
    icon: [
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: [{ url: "/icon-32x32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-transparent text-foreground antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_58%),radial-gradient(circle_at_bottom,rgba(156,187,255,0.32),transparent_65%),linear-gradient(180deg,#f7f9ff 0%,#eef1f9 55%,#e7ecf6 100%)]" />
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
