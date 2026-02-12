/**
 * TRUE → REAL translation membrane
 *
 * Public routes must use REAL language only.
 * Contributor/admin routes may use TRUE (internal) terms.
 *
 * This file defines the translation map and a runtime guard.
 */

export type LanguageMode = "REAL" | "TRUE";

/**
 * Translation map: TRUE internal term → REAL public-facing term.
 * Add new terms here as the system grows.
 */
export const MEMBRANE_MAP: Record<string, string> = {
  // Protocols
  "TE-1": "Entry verification",
  "TE1": "Entry verification",
  "CAP": "Shared space rules",
  "FSP-1": "Stability safeguards",
  "FSP1": "Stability safeguards",
  "TLB": "Pacing controls",
  "Janus Keyhole": "Meaning boundary",
  "JANUS": "Meaning boundary",
  "Symbol Hygiene": "Consistency checking",
  "SYMBOL_HYGIENE": "Consistency checking",

  // Layers
  "KayOS": "Foundation layer",
  "GEM Engine": "Core rules",
  "Mirror": "Baseline practice",

  // Tokens / Signals
  "Drift Bucket": "Stability signal",
  "DRIFT": "Stability signal",
  "Temperature": "Activity level",
  "TEMP": "Activity level",
  "COOL": "Low",
  "WARM": "Medium",
  "HOT": "High",
  "DIM Cap": "Access tier",
  "DIM": "Access tier",

  // Receipts / Closure
  "DONE12": "Session complete",
  "LOCK11": "Session paused",
  "R12": "Session record",

  // Gates
  "PROMOTE0": "Progress gate 0",
  "PROMOTE1": "Progress gate 1",
  "PROMOTE2": "Progress gate 2",
  "PROMOTE3": "Progress gate 3",
  "PROMOTE4": "Progress gate 4",
  "PROMOTE5": "Progress gate 5",

  // Packets
  "I3 Packet": "Interaction unit",
  "I3": "Interaction unit",

  // General
  "CAP_PROTOCOL": "Shared space rules",
  "TRUE-language": "Internal terms",
  "REAL-language": "Public terms",
};

/**
 * List of banned tokens that must NEVER appear on public pages.
 * Used by the runtime guard.
 */
export const BANNED_IN_REAL: string[] = [
  "TE-1", "TE1", "FSP-1", "FSP1", "TLB",
  "JANUS", "Janus Keyhole",
  "SYMBOL_HYGIENE", "Symbol Hygiene",
  "KayOS", "GEM Engine",
  "DONE12", "LOCK11", "R12",
  "PROMOTE0", "PROMOTE1", "PROMOTE2", "PROMOTE3", "PROMOTE4", "PROMOTE5",
  "CAP_PROTOCOL",
  "I3 Packet",
  "DIM Cap", "Drift Bucket",
  "TRUE-language",
];

/**
 * Translate a TRUE term to REAL language.
 * Returns the REAL version if found, or the original if no mapping exists.
 */
export function toReal(trueTerm: string): string {
  return MEMBRANE_MAP[trueTerm] ?? trueTerm;
}

/**
 * Runtime guard: check if text contains any banned internal terms.
 * Returns an array of found violations.
 * Use this in development to catch leaks.
 */
export function checkForLeaks(text: string): string[] {
  const violations: string[] = [];
  for (const term of BANNED_IN_REAL) {
    if (text.includes(term)) {
      violations.push(term);
    }
  }
  return violations;
}

/**
 * Sanitize text for REAL mode: replace any leaked internal terms with "[internal]".
 */
export function sanitizeForReal(text: string): string {
  let result = text;
  for (const term of BANNED_IN_REAL) {
    if (result.includes(term)) {
      if (typeof console !== "undefined" && process.env.NODE_ENV === "development") {
        console.error(`[MEMBRANE LEAK] Internal term "${term}" found in REAL-mode content`);
      }
      result = result.replaceAll(term, "[internal]");
    }
  }
  return result;
}
