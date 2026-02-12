"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { UNode, UEdge } from "@/hooks/useUniverseState";

/* ═══════════════════════════════════════════════════════════════
   Edge — line between two node positions
   Strength controls opacity. Dimmed if either node is unstable.
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  edge: UEdge;
  sourceNode: UNode;
  targetNode: UNode;
  dimmed: boolean; // true if inside a containment zone
}

export function UniverseEdge({ edge, sourceNode, targetNode, dimmed }: Props) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(...sourceNode.position),
      new THREE.Vector3(...targetNode.position),
    ];
  }, [sourceNode.position, targetNode.position]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  // Average stability of endpoints controls colour
  const avgStab = (sourceNode.stability + targetNode.stability) / 2;

  const baseOpacity = dimmed ? 0.03 : 0.06 + edge.strength * 0.12;
  const opacity = baseOpacity * (0.3 + avgStab * 0.7);

  const color = avgStab > 0.5 ? "#22c55e" : avgStab > 0.3 ? "#eab308" : "#ef4444";

  return (
    <line>
      <bufferGeometry attach="geometry" {...geometry} />
      <lineBasicMaterial
        attach="material"
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </line>
  );
}
