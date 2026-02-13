"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { UNode, UEdge } from "@/hooks/useUniverseState";
import { getElementColor } from "@/data/archetypes";

/* ═══════════════════════════════════════════════════════════════
   Edge — element-colored lines
   Same-element = element color (forms visible squares)
   Cross-element = white/neutral, lower opacity
   Center spokes = archetype's element color
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  edge: UEdge;
  sourceNode: UNode;
  targetNode: UNode;
  dimmed: boolean;
  colorMode?: "mono" | "bw" | "full";
}

export function UniverseEdge({ edge, sourceNode, targetNode, dimmed, colorMode = "full" }: Props) {
  const points = useMemo(
    () => [new THREE.Vector3(...sourceNode.position), new THREE.Vector3(...targetNode.position)],
    [sourceNode.position, targetNode.position],
  );

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  // colorMode overrides for mono/bw
  let edgeColor: string;
  let baseOpacity: number;

  if (colorMode === "mono") {
    edgeColor = "#333333";
    baseOpacity = dimmed ? 0.02 : 0.15;
  } else if (colorMode === "bw") {
    edgeColor = "#666666";
    baseOpacity = dimmed ? 0.03 : 0.25;
  } else {
    // Full element-based coloring
    const srcColor = getElementColor(sourceNode.id);
    const tgtColor = getElementColor(targetNode.id);
    const isCenter = sourceNode.id === "AIAM" || targetNode.id === "AIAM";
    const sameElement = srcColor === tgtColor;

    if (isCenter) {
      edgeColor = sourceNode.id === "AIAM" ? tgtColor : srcColor;
    } else if (sameElement) {
      edgeColor = srcColor;
    } else {
      edgeColor = "#ffffff";
    }

    baseOpacity = dimmed
      ? 0.02
      : sameElement
        ? 0.25
        : isCenter
          ? 0.15
          : 0.04;
  }

  return (
    <line>
      <bufferGeometry attach="geometry" {...geometry} />
      <lineBasicMaterial
        attach="material"
        color={edgeColor}
        transparent
        opacity={baseOpacity}
        depthWrite={false}
      />
    </line>
  );
}
