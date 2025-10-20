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

  let pageTop = envTop;
  let pageBottom = envBottom;
  let pageLeft = envLeft;
  let pageRight = envRight;
  let keyboardInset = 0;

  if (viewport) {
    const rawTop = Math.max(viewport.pageTop ?? 0, 0);
    const rawLeft = Math.max(viewport.pageLeft ?? 0, 0);
    const rawRight = Math.max(
      window.innerWidth - viewport.width - (viewport.pageLeft ?? 0),
      0,
    );
    const rawBottom = Math.max(
      window.innerHeight - viewport.height - (viewport.pageTop ?? 0),
      0,
    );
    const extraHeightLoss = Math.max(window.innerHeight - height, 0);
    const keyboardOpen = extraHeightLoss > 150;

    keyboardInset = keyboardOpen ? extraHeightLoss : 0;

    pageTop = Math.max(rawTop, envTop);
    pageLeft = Math.max(rawLeft, envLeft);
    pageRight = Math.max(rawRight, envRight);

    if (keyboardOpen) {
      const trimmedBottom = Math.max(rawBottom - keyboardInset, 0);
      pageBottom = Math.max(trimmedBottom, envBottom);
    } else {
      pageBottom = Math.max(rawBottom, envBottom);
      keyboardInset = 0;
    }
  }

  root.style.setProperty("--safe-area-top", `${pageTop}px`);
  root.style.setProperty("--safe-area-left", `${pageLeft}px`);
  root.style.setProperty("--safe-area-right", `${pageRight}px`);
  root.style.setProperty("--safe-area-bottom", `${pageBottom}px`);
  root.style.setProperty("--keyboard-bottom-inset", `${keyboardInset}px`);
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
