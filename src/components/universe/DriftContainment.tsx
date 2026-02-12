"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { UNode } from "@/hooks/useUniverseState";

/* ═══════════════════════════════════════════════════════════════
   Drift Containment — detects instability clusters
   If 3+ nearby nodes have stability < 0.3:
     → render a faint containment sphere around them
   ═══════════════════════════════════════════════════════════════ */

interface Cluster {
  center: [number, number, number];
  radius: number;
  nodeIds: string[];
}

/** Euclidean distance in 3D */
function dist(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

/**
 * Simple clustering: find groups of unstable nodes within `threshold` distance.
 * Returns clusters with 3+ members.
 */
function findClusters(nodes: UNode[], stabThreshold = 0.3, distThreshold = 15): Cluster[] {
  const unstable = nodes.filter((n) => n.stability < stabThreshold);
  if (unstable.length < 3) return [];

  // Greedy clustering — assign each unstable node to nearest existing cluster or start a new one
  const clusters: { members: UNode[] }[] = [];

  for (const node of unstable) {
    let assigned = false;
    for (const cluster of clusters) {
      const center = clusterCenter(cluster.members);
      if (dist(node.position, center) < distThreshold) {
        cluster.members.push(node);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      clusters.push({ members: [node] });
    }
  }

  return clusters
    .filter((c) => c.members.length >= 3)
    .map((c) => {
      const ctr = clusterCenter(c.members);
      const maxDist = Math.max(...c.members.map((m) => dist(m.position, ctr)));
      return {
        center: ctr,
        radius: maxDist + 3, // padding
        nodeIds: c.members.map((m) => m.id),
      };
    });
}

function clusterCenter(nodes: UNode[]): [number, number, number] {
  const n = nodes.length;
  return [
    nodes.reduce((s, nd) => s + nd.position[0], 0) / n,
    nodes.reduce((s, nd) => s + nd.position[1], 0) / n,
    nodes.reduce((s, nd) => s + nd.position[2], 0) / n,
  ];
}

/* ═══════════════════════════════════════════════════════════════
   Component — renders containment spheres
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  nodes: UNode[];
}

export function DriftContainment({ nodes }: Props) {
  const clusters = useMemo(() => findClusters(nodes), [nodes]);

  if (clusters.length === 0) return null;

  return (
    <group>
      {clusters.map((c, i) => (
        <mesh key={i} position={new THREE.Vector3(...c.center)}>
          <sphereGeometry args={[c.radius, 24, 24]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.04}
            wireframe
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Export for edge dimming logic */
export { findClusters };
