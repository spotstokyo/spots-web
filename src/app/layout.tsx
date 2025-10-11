import type { Metadata, Viewport } from "next";
import AppRoot from "@/components/AppRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "spots",
  description: "find your spot",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
    address: true,
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
      <body className="bg-[var(--background-mid)] text-foreground antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_58%),radial-gradient(circle_at_bottom,rgba(156,187,255,0.32),transparent_65%),linear-gradient(180deg,#f7f9ff 0%,#eef1f9 55%,#e7ecf6 100%)]" />
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
