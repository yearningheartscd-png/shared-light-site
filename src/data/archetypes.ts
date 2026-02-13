/**
 * Shared Light — 12 Jungian Archetypes + aIAM Center
 *
 * Based on Arthur Kay's Energy Resonance Lattice (ERL) geometric model.
 * 12 archetypes arranged in a circle at 30° intervals.
 * Each archetype belongs to one of three elements: Fire (Red), Earth (Green), Water (Blue).
 * Canon objects are grouped around their parent archetype.
 */

export type Element = "fire" | "earth" | "water";

export interface Archetype {
  id: string;
  name: string;
  element: Element;
  color: string;           // hex color for this element
  action: string;          // verb — what this archetype does
  journeyStep: number | null; // 1-9 step in the journey path (null = not on journey)
  angleDeg: number;        // position on the circle (0-360)
  /** Canon object IDs grouped under this archetype */
  canonIds: string[];
  /** Short domain description */
  domain: string;
}

/**
 * Element color palette (Arthur's 3-6-9 model)
 *   9 = Fire/Red    — energy, action, vision
 *   3 = Earth/Green — growth, grounding, creation
 *   6 = Water/Blue  — wisdom, flow, balance
 */
export const ELEMENT_COLORS: Record<Element, string> = {
  fire:  "#ef4444",
  earth: "#22c55e",
  water: "#3b82f6",
};

export const AIAM_COLOR = "#06b6d4"; // cyan — unity/coherence

/**
 * The 12 archetypes, ordered clockwise from top (0°).
 * Fire archetypes occupy the upper arc, Earth the right/lower, Water the left.
 * Angular spacing: 30° each.
 */
export const ARCHETYPES: Archetype[] = [
  // Interleaved: Fire(R), Earth(G), Water(B) repeating every 30°
  // Fire at 0°/90°/180°/270° → square
  // Earth at 30°/120°/210°/300° → square
  // Water at 60°/150°/240°/330° → square
  {
    id: "HERO",
    name: "Hero",
    element: "fire",
    color: ELEMENT_COLORS.fire,
    action: "Visualize",
    journeyStep: null,
    angleDeg: 0,
    canonIds: ["L5", "TE1", "TE1_TOKEN"],
    domain: "Agents & Vision",
  },
  {
    id: "CREATOR",
    name: "Creator",
    element: "earth",
    color: ELEMENT_COLORS.earth,
    action: "Create",
    journeyStep: null,
    angleDeg: 30,
    canonIds: ["L3", "TOPO", "DONE12"],
    domain: "Structure & Topology",
  },
  {
    id: "SAGE",
    name: "Sage",
    element: "water",
    color: ELEMENT_COLORS.water,
    action: "Transcend",
    journeyStep: 3,
    angleDeg: 60,
    canonIds: ["L0", "JANUS", "DIM"],
    domain: "Wisdom & Dimensions",
  },
  {
    id: "MAGICIAN",
    name: "Magician",
    element: "fire",
    color: ELEMENT_COLORS.fire,
    action: "Crystalize",
    journeyStep: null,
    angleDeg: 90,
    canonIds: ["L1", "SYMBOL_HYGIENE", "R12"],
    domain: "Transformation & Symbols",
  },
  {
    id: "EVERYMAN",
    name: "Everyman",
    element: "earth",
    color: ELEMENT_COLORS.earth,
    action: "Build",
    journeyStep: 2,
    angleDeg: 120,
    canonIds: ["L9", "CAP", "CAP_PROTOCOL"],
    domain: "Commons & Economy",
  },
  {
    id: "JESTER",
    name: "Jester",
    element: "water",
    color: ELEMENT_COLORS.water,
    action: "Simplify",
    journeyStep: 4,
    angleDeg: 150,
    canonIds: ["L7", "TLB_TOKEN", "PROMOTE5"],
    domain: "Learning & Humor",
  },
  {
    id: "EXPLORER",
    name: "Explorer",
    element: "fire",
    color: ELEMENT_COLORS.fire,
    action: "Energize",
    journeyStep: 8,
    angleDeg: 180,
    canonIds: ["L6", "TEMP", "PROMOTE3"],
    domain: "Arenas & Energy",
  },
  {
    id: "INNOCENT",
    name: "Innocent",
    element: "earth",
    color: ELEMENT_COLORS.earth,
    action: "Vibrate",
    journeyStep: null,
    angleDeg: 210,
    canonIds: ["L2", "PROMOTE0", "PROMOTE1"],
    domain: "Mirror & Play",
  },
  {
    id: "RULER",
    name: "Ruler",
    element: "water",
    color: ELEMENT_COLORS.water,
    action: "Balance",
    journeyStep: 5,
    angleDeg: 240,
    canonIds: ["L4", "FSP1", "FSP"],
    domain: "Governance & Stability",
  },
  {
    id: "OUTLAW",
    name: "Outlaw",
    element: "fire",
    color: ELEMENT_COLORS.fire,
    action: "Temporize",
    journeyStep: null,
    angleDeg: 270,
    canonIds: ["L11", "TLB", "DRIFT"],
    domain: "Time & Disruption",
  },
  {
    id: "LOVER",
    name: "Lover",
    element: "earth",
    color: ELEMENT_COLORS.earth,
    action: "Resonate",
    journeyStep: null,
    angleDeg: 300,
    canonIds: ["L8", "CLOSE", "PROMOTE4"],
    domain: "Connection & Expression",
  },
  {
    id: "CAREGIVER",
    name: "Caregiver",
    element: "water",
    color: ELEMENT_COLORS.water,
    action: "Breathe",
    journeyStep: null,
    angleDeg: 330,
    canonIds: ["L10", "LOCK11", "PROMOTE2"],
    domain: "Alignment & Protection",
  },
];

/**
 * Lookup: canon object ID → parent archetype ID
 */
export const CANON_TO_ARCHETYPE: Record<string, string> = {};
for (const arch of ARCHETYPES) {
  for (const cid of arch.canonIds) {
    CANON_TO_ARCHETYPE[cid] = arch.id;
  }
}

/**
 * Lookup: archetype ID → Archetype
 */
export const ARCHETYPE_MAP: Record<string, Archetype> = {};
for (const arch of ARCHETYPES) {
  ARCHETYPE_MAP[arch.id] = arch;
}

/**
 * Get the element color for a canon object ID.
 * Returns the element color of its parent archetype, or cyan for aIAM.
 */
export function getElementColor(canonId: string): string {
  if (canonId === "AIAM") return AIAM_COLOR;
  const archId = CANON_TO_ARCHETYPE[canonId];
  if (!archId) return "#6b7280"; // gray fallback for unmapped
  const arch = ARCHETYPE_MAP[archId];
  return arch ? ELEMENT_COLORS[arch.element] : "#6b7280";
}

/**
 * The 9-step journey path through the archetypes.
 * Step 9 (Synergize) is at the center (aIAM).
 */
export const JOURNEY_STEPS = [
  { step: 1, label: "Support an ACT",         archetypeId: null },       // entry
  { step: 2, label: "Seek Ground",            archetypeId: "EVERYMAN" },
  { step: 3, label: "Set Time",               archetypeId: "SAGE" },
  { step: 4, label: "Simplify Mind",          archetypeId: "JESTER" },
  { step: 5, label: "Stay Balanced",          archetypeId: "RULER" },
  { step: 6, label: "Synchronize Knowledge",  archetypeId: null },       // between archetypes
  { step: 7, label: "Serve Entertainment",    archetypeId: null },       // between archetypes
  { step: 8, label: "Shine on Journey",       archetypeId: "EXPLORER" },
  { step: 9, label: "Synergize",              archetypeId: "AIAM" },     // center
];
