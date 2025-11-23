"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type LexiVariant =
  | "idle"
  | "thinking"
  | "thumbs_up"
  | "sad"
  | "streak"
  | "success"
  | "world"
  | "logo";

type AnimationType = "pulse" | "none";

interface AnimatedLexiProps {
  variant: LexiVariant;
  animation?: AnimationType;
  size?: number;
  className?: string;
  alt?: string;
}

const LEXI_IMAGES: Record<LexiVariant, string> = {
  idle: "/lexi_idle_2.png",
  thinking: "/lexi_thinking_2.png",
  thumbs_up: "/lexi_thumbs_up_2.png",
  sad: "/lexi_sad_2.png",
  streak: "/lexi_streak_2.png",
  success: "/lexi_success_2.png",
  world: "/lexi_world.png",
  logo: "/lexi_logo.png",
};

const ANIMATION_VARIANTS = {
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity as number,
      ease: "easeInOut" as const,
    },
  },
  none: {
    animate: {},
    transition: {},
  },
};

export function AnimatedLexi({
  variant,
  animation = "none",
  size = 200,
  className = "",
  alt,
}: AnimatedLexiProps) {
  const imageSrc = LEXI_IMAGES[variant];
  const animationConfig = ANIMATION_VARIANTS[animation];
  const imageAlt = alt || `Lexi ${variant}`;

  return (
    <motion.div
      animate={animationConfig.animate}
      transition={animationConfig.transition}
      className={className}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        priority={variant === "logo"}
      />
    </motion.div>
  );
}
