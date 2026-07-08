"use client";

import { MotionConfig } from "framer-motion";

// Respecte prefers-reduced-motion pour toutes les animations framer-motion
// descendantes : le kill-switch CSS de globals.css ne neutralise pas les
// animations pilotées en JS, MotionConfig s'en charge.
export default function MotionSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
