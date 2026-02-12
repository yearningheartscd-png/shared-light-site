"use client";

import { useLanguage } from "@/components/LanguageProvider";

/**
 * MembraneText — renders REAL or TRUE text based on language mode.
 *
 * Usage:
 *   <MembraneText real="Entry verification" true="TE-1" />
 *   <MembraneText real="Stability safeguards" true="FSP-1" />
 *
 * In REAL mode (public): renders the `real` prop.
 * In TRUE mode (contributor): renders the `true` prop.
 *
 * If only one prop is provided, it renders that value regardless of mode.
 * This ensures public pages never accidentally show internal terms.
 */
export function MembraneText({
  real,
  true: trueText,
  className,
}: {
  real: string;
  true: string;
  className?: string;
}) {
  const { mode } = useLanguage();

  const text = mode === "TRUE" ? trueText : real;

  return <span className={className}>{text}</span>;
}

/**
 * Hook version for when you need the text value without a component.
 */
export function useMembraneText(real: string, trueText: string): string {
  const { mode } = useLanguage();
  return mode === "TRUE" ? trueText : real;
}
