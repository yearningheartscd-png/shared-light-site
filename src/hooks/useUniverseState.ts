"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { canonData } from "@/data/canon";

/* ═══════════════════════════════════════════════════════════════
   Types — state-driven, no metaphysics
   ═══════════════════════════════════════════════════════════════ */

export interface UNode {
  id: string;
  type: string;
  name: string;
  position: [number, number, number];
  stability: number;   // 0-1  (red → green)
  intensity: number;   // 0-1  (controls radius)
  active: boolean;
  history: { stability: number; timestamp: number }[];
  lastUpdated: number;
  openTasks: number;
  lastClosure: number | null;
}

export interface UEdge {
  source: string;
  target: string;
  strength: number; // 0-1
}

export interface UniverseState {
  nodes: UNode[];
  edges: UEdge[];
  timeIndex: number;      // current playback position
  maxTimeIndex: number;   // total history depth
  selectedId: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   Position generation — golden-angle sphere distribution
   ═══════════════════════════════════════════════════════════════ */

function spherePoint(index: number, total: number, radius: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2; // -1 to 1
  const r = Math.sqrt(1 - y * y);
  const theta = golden * index;
  return [
    Math.cos(theta) * r * radius,
    y * radius,
    Math.sin(theta) * r * radius,
  ];
}

/* ═══════════════════════════════════════════════════════════════
   Seed data from canon — deterministic initial state
   ═══════════════════════════════════════════════════════════════ */

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

function buildInitialState(): UniverseState {
  const typeRadius: Record<string, number> = {
    Layer: 10,
    Protocol: 18,
    Token: 24,
    Receipt: 14,
    Gate: 20,
    Artifact: 16,
  };

  const typeGroups: Record<string, typeof canonData.objects> = {};
  for (const obj of canonData.objects) {
    if (!typeGroups[obj.type]) typeGroups[obj.type] = [];
    typeGroups[obj.type].push(obj);
  }

  const now = Date.now();
  const nodes: UNode[] = [];

  for (const [type, group] of Object.entries(typeGroups)) {
    const r = typeRadius[type] ?? 16;
    group.forEach((obj, i) => {
      const pos = spherePoint(i, Math.max(group.length, 2), r);
      const seed = seedHash(obj.id);
      const stability = 0.3 + seed * 0.6;                     // 0.3-0.9
      const intensity = 0.2 + seedHash(obj.id + "i") * 0.6;   // 0.2-0.8

      // Build synthetic history (10 past snapshots)
      const history = Array.from({ length: 10 }, (_, t) => ({
        stability: Math.max(0, Math.min(1, stability + (Math.sin(t * 0.5 + seed * 6) * 0.15))),
        timestamp: now - (10 - t) * 5000,
      }));

      nodes.push({
        id: obj.id,
        type: obj.type,
        name: obj.name,
        position: pos,
        stability,
        intensity,
        active: seed > 0.4,
        history,
        lastUpdated: now,
        openTasks: Math.floor(seed * 5),
        lastClosure: seed > 0.5 ? now - Math.floor(seed * 60000) : null,
      });
    });
  }

  // Edges from canon links
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: UEdge[] = [];
  const edgeSet = new Set<string>();

  for (const obj of canonData.objects) {
    for (const linkId of obj.links) {
      if (!nodeIds.has(linkId)) continue;
      const key = [obj.id, linkId].sort().join("|");
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      const srcNode = nodes.find((n) => n.id === obj.id);
      const tgtNode = nodes.find((n) => n.id === linkId);
      const strength = srcNode && tgtNode
        ? (srcNode.stability + tgtNode.stability) / 2
        : 0.5;

      edges.push({ source: obj.id, target: linkId, strength });
    }
  }

  return {
    nodes,
    edges,
    timeIndex: 9,  // latest
    maxTimeIndex: 9,
    selectedId: null,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════ */

export function useUniverseState() {
  const [state, setState] = useState<UniverseState>(buildInitialState);

  /* ── Select a node ── */
  const selectNode = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedId: id }));
  }, []);

  /* ── Time scrub ── */
  const setTimeIndex = useCallback((idx: number) => {
    setState((s) => {
      const clamped = Math.max(0, Math.min(s.maxTimeIndex, idx));
      // Apply historical stability at this time index
      const nodes = s.nodes.map((n) => ({
        ...n,
        stability: n.history[clamped]?.stability ?? n.stability,
      }));
      return { ...s, timeIndex: clamped, nodes };
    });
  }, []);

  /* ── Expand Scope — only if stability >= 0.4 ── */
  const expandScope = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        n.id === id && n.stability >= 0.4
          ? {
              ...n,
              intensity: Math.min(1, n.intensity + 0.1),
              openTasks: n.openTasks + 1,
              lastUpdated: Date.now(),
            }
          : n,
      ),
    }));
  }, []);

  /* ── Return to Baseline — increases stability, reduces intensity ── */
  const returnToBaseline = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              stability: Math.min(1, n.stability + 0.08),
              intensity: Math.max(0, n.intensity - 0.12),
              lastClosure: Date.now(),
              openTasks: Math.max(0, n.openTasks - 1),
              lastUpdated: Date.now(),
            }
          : n,
      ),
    }));
  }, []);

  /* ── Live drift simulation — subtle state evolution ── */
  const tickRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setState((s) => {
        if (s.timeIndex < s.maxTimeIndex) return s; // paused in history
        return {
          ...s,
          nodes: s.nodes.map((n) => {
            const drift = Math.sin(tickRef.current * 0.3 + seedHash(n.id) * 10) * 0.008;
            const newStab = Math.max(0, Math.min(1, n.stability + drift));
            return { ...n, stability: newStab };
          }),
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return {
    state,
    selectNode,
    setTimeIndex,
    expandScope,
    returnToBaseline,
  };
}
