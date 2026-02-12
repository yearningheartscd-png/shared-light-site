// Shared Light Atlas Canon Data v0.1
// Source of truth: canon.json (synced from SL_canon_v0_1)
// This file provides TypeScript types, helpers, and color maps.

import rawCanon from "./canon.json";

export type NodeType = "Layer" | "Protocol" | "Token" | "Receipt" | "Gate" | "Artifact";
export type TempLevel = "COOL" | "WARM" | "HOT" | "NEUTRAL";
export type DimCap = "T0" | "T1" | "T2" | "T3" | "T4";

export interface CanonObject {
  id: string;
  type: NodeType;
  name: string;
  one_liner: string;
  description: string;
  temp_primary: TempLevel;
  dim_cap: DimCap;
  reads_tokens: string[];
  writes_tokens: string[];
  produces_receipts: string[];
  constraints: string[];
  links: string[];
  // D3 simulation properties (added at runtime)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface CanonLink {
  source: string | CanonObject;
  target: string | CanonObject;
}

// Cast the imported JSON to our typed structure
export const canonData = rawCanon as {
  meta: {
    schema_version: string;
    generated_at: string;
    notes: string[];
  };
  enums: {
    temp: TempLevel[];
    dim: DimCap[];
    types: NodeType[];
  };
  objects: CanonObject[];
};

// Helper lookups
export const TYPE_COLORS: Record<NodeType, { border: string; bg: string; text: string }> = {
  Layer:    { border: "border-cyan-500",    bg: "bg-cyan-950/80",    text: "text-cyan-200" },
  Protocol: { border: "border-violet-500",  bg: "bg-violet-950/80",  text: "text-violet-200" },
  Token:    { border: "border-emerald-500", bg: "bg-emerald-950/80", text: "text-emerald-200" },
  Receipt:  { border: "border-amber-500",   bg: "bg-amber-950/80",   text: "text-amber-200" },
  Gate:     { border: "border-rose-500",    bg: "bg-rose-950/80",    text: "text-rose-200" },
  Artifact: { border: "border-gray-500",    bg: "bg-gray-950/80",    text: "text-gray-200" },
};

export const TEMP_COLORS: Record<TempLevel, string> = {
  COOL: "bg-blue-500",
  WARM: "bg-orange-500",
  HOT: "bg-red-500",
  NEUTRAL: "bg-slate-400",
};

export function getNodesByType(type: NodeType): CanonObject[] {
  return canonData.objects.filter(o => o.type === type);
}

export function getNodeById(id: string): CanonObject | undefined {
  return canonData.objects.find(o => o.id === id);
}
