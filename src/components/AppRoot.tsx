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
  const height = window.visualViewport?.height ?? window.innerHeight;
  const unit = height * 0.01;
  document.documentElement.style.setProperty("--vh", `${unit}px`);
};

export default function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

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
    if (!isHome) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHome]);

  return (
    <MapTransitionProvider>
      <div
        className={`relative min-h-viewport full-viewport ${
          isHome ? "full-viewport-lock overflow-hidden" : ""
        }`}
      >
        <NavBar />
        <div className={isHome ? "pt-0 pb-0" : "content-top-offset pb-12"}>{children}</div>
      </div>
    </MapTransitionProvider>
  );
}
