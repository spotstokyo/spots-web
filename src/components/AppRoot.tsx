"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import { MapTransitionProvider } from "@/components/MapTransitionProvider";

interface AppRootProps {
  children: React.ReactNode;
}

const setViewportUnit = () => {
  if (typeof window === "undefined") {
    return;
  }
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const unit = height * 0.01;
  const root = document.documentElement;

  root.style.setProperty("--vh", `${unit}px`);

  if (viewport) {
    const topInset = Math.max(viewport.offsetTop, 0);
    const leftInset = Math.max(viewport.offsetLeft, 0);
    const rightInset = Math.max(window.innerWidth - viewport.width - viewport.offsetLeft, 0);
    const bottomInset = Math.max(window.innerHeight - viewport.height - viewport.offsetTop, 0);

    root.style.setProperty("--safe-area-top", `${topInset}px`);
    root.style.setProperty("--safe-area-left", `${leftInset}px`);
    root.style.setProperty("--safe-area-right", `${rightInset}px`);
    root.style.setProperty("--safe-area-bottom", `${bottomInset}px`);
  }
};

export default function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isMap = pathname === "/map";
  const isOverlayLayout = isHome || isMap;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setViewportUnit();

    const handleResize = () => {
      setViewportUnit();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", handleResize);
    viewport?.addEventListener("scroll", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      viewport?.removeEventListener("resize", handleResize);
      viewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!isOverlayLayout) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOverlayLayout]);

  return (
    <MapTransitionProvider>
      <div
        className={`relative min-h-viewport full-viewport ${
          isOverlayLayout ? "full-viewport-lock overflow-hidden" : ""
        }`}
      >
        <NavBar />
        <div className={isOverlayLayout ? "pt-0 pb-0" : "content-top-offset pb-12"}>
          {children}
        </div>
      </div>
    </MapTransitionProvider>
  );
}
