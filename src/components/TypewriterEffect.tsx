"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypewriterEffectProps {
  text: string;
  className?: string;
  duration?: number;
}

export default function TypewriterEffect({
  text,
  className,
  duration = 2,
}: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressFraction = Math.min(progress / (duration * 1000), 1);
      
      const charIndex = Math.floor(progressFraction * text.length);
      setDisplayedText(text.slice(0, charIndex + 1));

      if (progressFraction < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsTyping(false);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [text, duration]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: isTyping ? [1, 0] : 0 }}
        transition={isTyping ? { duration: 0.5, repeat: Infinity, repeatType: "reverse", ease: "linear" } : { duration: 0 }}
        className="inline-block w-[2px] h-[0.75em] bg-[#18223a] ml-[1px] align-middle"
        style={{ verticalAlign: "baseline" }}
      />
    </span>
  );
}
