import type { ValueTransition } from "motion/react";

export const springTransition: ValueTransition = {
  type: "spring",
  stiffness: 480,
  damping: 28,
  mass: 1.2,
};
export const easeInOutTransition: ValueTransition = {
  duration: 0.3,
  ease: "easeInOut",
};
