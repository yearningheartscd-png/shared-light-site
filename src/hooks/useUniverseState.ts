"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { canonData } from "@/data/canon";
import { ARCHETYPES, CANON_TO_ARCHETYPE, ELEMENT_COLORS, AIAM_COLOR, type Element } from "@/data/archetypes";
import { archetypeTorusPosition, canonTorusPosition } from "@/lib/torus-layout";

/* ═══════════════════════════════════════════════════════════════
   Types — state-driven, no metaphysics
   ═══════════════════════════════════════════════════════════════ */

export interface UNode {
  id: string;
  type: string;
  name: string;
  position: [number, number, number];
  stability: number;   // 0-1  (bright → dim)
  intensity: number;   // 0-1  (controls radius)
  active: boolean;
  history: { stability: number; timestamp: number }[];
  lastUpdated: number;
  openTasks: number;
  lastClosure: number | null;
  element?: Element;   // "fire" | "earth" | "water" | undefined
}

export interface UEdge {
  source: string;
  target: string;
  strength: number; // 0-1
}

export interface UniverseState {
  nodes: UNode[];
  edges: UEdge[];
  timeIndex: number;
  maxTimeIndex: number;
  selectedId: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

function makeHistory(stability: number, seed: number, now: number) {
  return Array.from({ length: 10 }, (_, t) => ({
    stability: Math.max(0, Math.min(1, stability + Math.sin(t * 0.5 + seed * 6) * 0.15)),
    timestamp: now - (10 - t) * 5000,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   Build state from archetype geometry
   ═══════════════════════════════════════════════════════════════ */

function buildInitialState(): UniverseState {
  const now = Date.now();
  const nodes: UNode[] = [];
  const edges: UEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (a: string, b: string, str: number) => {
    const key = [a, b].sort().join("|");
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source: a, target: b, strength: str });
  };

  /* ── aIAM center node ── */
  nodes.push({
    id: "AIAM",
    type: "Center",
    name: "aIAM",
    position: [0, 0, 0],
    stability: 1.0,
    intensity: 0.5,
    active: true,
    history: makeHistory(1.0, 0.5, now),
    lastUpdated: now,
    openTasks: 0,
    lastClosure: now,
  });

  /* ── 12 archetype nodes on torus surface ── */
  for (const arch of ARCHETYPES) {
    const pos = archetypeTorusPosition(arch.angleDeg, arch.element);

    const seed = seedHash(arch.id);
    const stability = 0.3 + seed * 0.6;
    const intensity = 0.2 + seedHash(arch.id + "i") * 0.6;

    nodes.push({
      id: arch.id,
      type: "Archetype",
      name: arch.name,
      position: pos,
      stability,
      intensity,
      active: seed > 0.4,
      history: makeHistory(stability, seed, now),
      lastUpdated: now,
      openTasks: Math.floor(seed * 5),
      lastClosure: seed > 0.5 ? now - Math.floor(seed * 60000) : null,
      element: arch.element,
    });

    // Spoke to center
    addEdge(arch.id, "AIAM", 0.7);
  }

  /* ── Element square edges ── */
  const byElement: Record<Element, string[]> = { fire: [], earth: [], water: [] };
  for (const arch of ARCHETYPES) {
    byElement[arch.element].push(arch.id);
  }
  for (const ids of Object.values(byElement)) {
    // ids are already in angle-sorted order because ARCHETYPES is sorted by angleDeg
    for (let i = 0; i < ids.length; i++) {
      addEdge(ids[i], ids[(i + 1) % ids.length], 0.9);
    }
  }

  /* ── Canon objects as sub-ring nodes ── */
  // Track which canon IDs belong to which archetype for sub-positioning
  const archCanonIndex: Record<string, number> = {};
  for (const arch of ARCHETYPES) {
    arch.canonIds.forEach((cid, idx) => {
      archCanonIndex[cid] = idx;
    });
  }

  for (const obj of canonData.objects) {
    const parentArchId = CANON_TO_ARCHETYPE[obj.id];
    const parentArch = parentArchId
      ? ARCHETYPES.find((a) => a.id === parentArchId)
      : undefined;

    let position: [number, number, number];
    let element: Element | undefined;

    if (parentArch) {
      const subIdx = archCanonIndex[obj.id] ?? 0;
      const count = parentArch.canonIds.length;
      position = canonTorusPosition(parentArch.angleDeg, parentArch.element, subIdx, count);
      element = parentArch.element;
    } else {
      // Unmapped — place near origin
      const seed = seedHash(obj.id);
      position = [seed * 4 - 2, 0, seed * 4 - 2];
    }

    const seed = seedHash(obj.id);
    const stability = 0.3 + seed * 0.6;
    const intensity = 0.2 + seedHash(obj.id + "i") * 0.6;

    nodes.push({
      id: obj.id,
      type: obj.type,
      name: obj.name,
      position,
      stability,
      intensity,
      active: seed > 0.4,
      history: makeHistory(stability, seed, now),
      lastUpdated: now,
      openTasks: Math.floor(seed * 5),
      lastClosure: seed > 0.5 ? now - Math.floor(seed * 60000) : null,
      element,
    });
  }

  /* ── Canon link edges ── */
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const obj of canonData.objects) {
    for (const linkId of obj.links) {
      if (!nodeIds.has(linkId)) continue;
      const srcNode = nodes.find((n) => n.id === obj.id);
      const tgtNode = nodes.find((n) => n.id === linkId);
      const strength = srcNode && tgtNode
        ? (srcNode.stability + tgtNode.stability) / 2
        : 0.5;
      addEdge(obj.id, linkId, strength);
    }
  }

  return {
    nodes,
    edges,
    timeIndex: 9,
    maxTimeIndex: 9,
    selectedId: null,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════ */

export function useUniverseState() {
  const [state, setState] = useState<UniverseState>(buildInitialState);

  const selectNode = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedId: id }));
  }, []);

  const setTimeIndex = useCallback((idx: number) => {
    setState((s) => {
      const clamped = Math.max(0, Math.min(s.maxTimeIndex, idx));
      const nodes = s.nodes.map((n) => ({
        ...n,
        stability: n.history[clamped]?.stability ?? n.stability,
      }));
      return { ...s, timeIndex: clamped, nodes };
    });
  }, []);

  const expandScope = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        n.id === id && n.stability >= 0.4
          ? { ...n, intensity: Math.min(1, n.intensity + 0.1), openTasks: n.openTasks + 1, lastUpdated: Date.now() }
          : n,
      ),
    }));
  }, []);

  const returnToBaseline = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, stability: Math.min(1, n.stability + 0.08), intensity: Math.max(0, n.intensity - 0.12), lastClosure: Date.now(), openTasks: Math.max(0, n.openTasks - 1), lastUpdated: Date.now() }
          : n,
      ),
    }));
  }, []);

  const tickRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setState((s) => {
        if (s.timeIndex < s.maxTimeIndex) return s;
        return {
          ...s,
          nodes: s.nodes.map((n) => {
            const drift = Math.sin(tickRef.current * 0.3 + seedHash(n.id) * 10) * 0.008;
            return { ...n, stability: Math.max(0, Math.min(1, n.stability + drift)) };
          }),
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return { state, selectNode, setTimeIndex, expandScope, returnToBaseline };
}
