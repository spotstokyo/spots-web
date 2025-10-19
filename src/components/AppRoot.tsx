"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import { MapTransitionProvider } from "@/components/MapTransitionProvider";

interface AppRootProps {
  children: React.ReactNode;
}

const parsePxValue = (value: string) => {
  const match = value.trim().match(/^([\d.+-]+)px$/);
  if (!match) {
    return 0;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const setViewportUnit = () => {
  if (typeof window === "undefined") {
    return;
  }
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const unit = height * 0.01;
  const root = document.documentElement;

  root.style.setProperty("--vh", `${unit}px`);

  const computed = window.getComputedStyle(root);
  const envTop = parsePxValue(computed.getPropertyValue("--safe-area-top"));
  const envBottom = parsePxValue(computed.getPropertyValue("--safe-area-bottom"));
  const envLeft = parsePxValue(computed.getPropertyValue("--safe-area-left"));
  const envRight = parsePxValue(computed.getPropertyValue("--safe-area-right"));
  root.style.setProperty("--nav-mobile-offset", "0.75rem");

  if (!viewport) {
    return;
  }

  const pageTop = Math.max(viewport.pageTop ?? 0, envTop);
  const pageLeft = Math.max(viewport.pageLeft ?? 0, envLeft);
  const pageRight = Math.max(
    window.innerWidth - viewport.width - (viewport.pageLeft ?? 0),
    envRight,
  );
  const bottomCandidate = Math.max(
    window.innerHeight - viewport.height - (viewport.pageTop ?? 0),
    0,
  );
  const pageBottom = Math.max(bottomCandidate, envBottom);

  root.style.setProperty("--safe-area-top", `${pageTop}px`);
  root.style.setProperty("--safe-area-left", `${pageLeft}px`);
  root.style.setProperty("--safe-area-right", `${pageRight}px`);
  root.style.setProperty("--safe-area-bottom", `${pageBottom}px`);

  const extraBottom = Math.max(pageBottom - envBottom, 0);
  const extraHeightLoss = Math.max(window.innerHeight - height, 0);
  const keyboardOpen = extraBottom > 80 || extraHeightLoss > 160;
  root.style.setProperty("--nav-mobile-offset", keyboardOpen ? "0rem" : "0.75rem");
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
