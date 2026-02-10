"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type TargetAndTransition, type Variants } from "framer-motion";
import { useMemo } from "react";

export const appearPresets = {
  fade: {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.45,
        ease: [0.24, 0.74, 0.31, 0.99],
      },
    },
  },
  "fade-up": {
    hidden: {
      opacity: 0,
      y: 28,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.24,
        duration: 0.72,
      },
    },
  },
  "fade-up-soft": {
    hidden: {
      opacity: 0,
      y: 36,
      scale: 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 20,
        mass: 0.9,
      },
    },
  },
  "lift-tilt": {
    hidden: {
      opacity: 0,
      y: 32,
      rotateX: 8,
      transformPerspective: 900,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transformPerspective: 900,
      transition: {
        type: "spring",
        bounce: 0.18,
        duration: 0.8,
      },
    },
  },
  "slide-left": {
    hidden: {
      opacity: 0,
      x: 40,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        bounce: 0.2,
        duration: 0.7,
      },
    },
  },
} satisfies Record<string, Variants>;

export type AppearPresetName = keyof typeof appearPresets;

const defaultDelayStep = 0.08;

type AppearBaseProps = Omit<HTMLMotionProps<"div">, "animate" | "initial" | "variants" | "whileInView">;

export interface AppearProps extends AppearBaseProps {
  preset?: AppearPresetName;
  variants?: Variants;
  once?: boolean;
  amount?: number | "some" | "all";
  margin?: string;
  delay?: number;
  delayOrder?: number;
  delayStep?: number;
  forceMotion?: boolean;
  trigger?: "view" | "immediate";
}

const adjustVisibleTransition = (visible: TargetAndTransition, additionalDelay: number | undefined): TargetAndTransition => {
  if (additionalDelay == null || additionalDelay === 0) {
    return visible;
  }

  const { transition: baseTransition, ...rest } = visible;
  return {
    ...rest,
    transition: {
      ...(baseTransition ?? {}),
      delay: ((baseTransition?.delay as number | undefined) ?? 0) + additionalDelay,
    },
  };
};

export default function Appear({
  children,
  preset = "fade-up",
  variants,
  once = true,
  amount = 0.18,
  margin = "0px 0px -15% 0px",
  delay,
  delayOrder,
  delayStep = defaultDelayStep,
  forceMotion = false,
  trigger = "view",
  ...rest
}: AppearProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = forceMotion || !prefersReducedMotion;

  const resolvedDelay = useMemo(() => {
    if (typeof delay === "number") {
      return delay;
    }
    if (typeof delayOrder === "number") {
      const order = Math.max(0, delayOrder);
      return order * delayStep;
    }
    return undefined;
  }, [delay, delayOrder, delayStep]);

  const baseVariants = useMemo<Variants>(() => {
    if (variants) return variants;
    return appearPresets[preset] ?? appearPresets["fade-up"];
  }, [preset, variants]);

  const preparedVariants = useMemo<Variants>(() => {
    if (resolvedDelay == null) {
      return baseVariants;
    }

    const visible = baseVariants.visible as TargetAndTransition | undefined;

    if (!visible) {
      return baseVariants;
    }

    const adjustedVisible = adjustVisibleTransition(visible, resolvedDelay);

    return {
      ...baseVariants,
      visible: adjustedVisible,
    };
  }, [baseVariants, resolvedDelay]);

  const motionProps = shouldAnimate
    ? trigger === "immediate"
      ? {
          initial: "hidden" as const,
          animate: "visible" as const,
          variants: preparedVariants,
        }
      : {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          variants: preparedVariants,
          viewport: { once, amount, margin },
        }
    : {};

  return (
    <motion.div {...rest} {...motionProps}>
      {children}
    </motion.div>
  );
}
