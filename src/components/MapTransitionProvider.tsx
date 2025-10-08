"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

type TransitionStage = "idle" | "entering" | "exiting";

interface MapTransitionContextValue {
  startTransition: (navigate: () => void) => void;
  completeTransition: () => void;
  isTransitioning: boolean;
  stage: TransitionStage;
}

const MapTransitionContext = createContext<MapTransitionContextValue | null>(null);

const NAVIGATION_DELAY_MS = 220;
const EXIT_DURATION_MS = 720;
const FALLBACK_COMPLETE_MS = 2800;

const clearTimer = (ref: MutableRefObject<number | null>) => {
  if (ref.current != null) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
};

export function MapTransitionProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<TransitionStage>("idle");
  const stageRef = useRef<TransitionStage>("idle");
  const navigateTimeoutRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    return () => {
      clearTimer(navigateTimeoutRef);
      clearTimer(fallbackTimeoutRef);
      clearTimer(exitTimeoutRef);
    };
  }, []);

  const scheduleExit = useCallback(() => {
    clearTimer(exitTimeoutRef);
    exitTimeoutRef.current = window.setTimeout(() => {
      setStage("idle");
    }, EXIT_DURATION_MS);
  }, []);

  const startTransition = useCallback<MapTransitionContextValue["startTransition"]>(
    (navigate) => {
      if (typeof window === "undefined") {
        navigate();
        return;
      }

      if (stageRef.current !== "idle") {
        navigate();
        return;
      }

      clearTimer(navigateTimeoutRef);
      clearTimer(fallbackTimeoutRef);
      clearTimer(exitTimeoutRef);

      setStage("entering");

      navigateTimeoutRef.current = window.setTimeout(() => {
        navigate();

        clearTimer(fallbackTimeoutRef);
        fallbackTimeoutRef.current = window.setTimeout(() => {
          setStage("exiting");
          scheduleExit();
        }, FALLBACK_COMPLETE_MS);
      }, NAVIGATION_DELAY_MS);
    },
    [scheduleExit],
  );

  const completeTransition = useCallback<MapTransitionContextValue["completeTransition"]>(() => {
    clearTimer(navigateTimeoutRef);
    clearTimer(fallbackTimeoutRef);

    let shouldSchedule = false;
    setStage((current) => {
      if (current === "idle") {
        return current;
      }
      if (current !== "exiting") {
        shouldSchedule = true;
      }
      return "exiting";
    });

    if (shouldSchedule) {
      scheduleExit();
    }
  }, [scheduleExit]);

  const value = useMemo<MapTransitionContextValue>(
    () => ({
      startTransition,
      completeTransition,
      isTransitioning: stage !== "idle",
      stage,
    }),
    [completeTransition, startTransition, stage],
  );

  const pointerClass = stage === "entering" ? "pointer-events-auto" : "pointer-events-none";
  const overlayStageClass =
    stage === "entering"
      ? "opacity-100"
      : stage === "exiting"
        ? "opacity-0"
        : "opacity-0";

  return (
    <MapTransitionContext.Provider value={value}>
      {children}
      <div
        aria-hidden
        className={`${pointerClass} fixed inset-0 z-[60] transform-gpu transition-opacity duration-600 ease-[cubic-bezier(0.22,0.61,0.36,1)] ${overlayStageClass}`}
      >
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-base font-medium uppercase tracking-[0.32em] text-[#1d2742]">
            loading spots...
          </p>
        </div>
      </div>
    </MapTransitionContext.Provider>
  );
}

export const useMapTransition = (): MapTransitionContextValue => {
  const context = useContext(MapTransitionContext);
  if (!context) {
    throw new Error("useMapTransition must be used within a MapTransitionProvider");
  }
  return context;
};
