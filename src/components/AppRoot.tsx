"use client";

import { useEffect } from "react";
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

  return (
    <MapTransitionProvider>
      <div className="relative min-h-screen min-h-viewport">
        <NavBar />
        <div className="content-top-offset pb-12">{children}</div>
      </div>
    </MapTransitionProvider>
  );
}
