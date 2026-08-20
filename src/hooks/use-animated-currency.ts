"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "framer-motion";

import { formatCurrency } from "@/lib/format";

/**
 * Anima a transição de um valor monetário entre trocas (ex: mudança de
 * range/escopo no dashboard), retornando a string já formatada em BRL a
 * cada frame — o efeito "count-up" dos cards de KPI.
 */
export function useAnimatedCurrency(value: number, duration = 0.6) {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(() => formatCurrency(value));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(formatCurrency(latest));
  });

  return display;
}
