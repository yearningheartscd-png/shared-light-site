"use client";

import { useState, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   LOD Manager — distance-based detail levels
   LOD 0: distance > 40 units  (far — sphere only)
   LOD 1: 15-40 units          (medium — labels appear)
   LOD 2: < 15 units           (close — internal geometry)
   ═══════════════════════════════════════════════════════════════ */

interface NodeLODProps {
  position: [number, number, number];
  children: (lod: 0 | 1 | 2) => ReactNode;
}

export function NodeLOD({ position, children }: NodeLODProps) {
  const [lod, setLod] = useState<0 | 1 | 2>(0);
  const lodRef = useRef<0 | 1 | 2>(0);
  const posVec = useRef(new THREE.Vector3(...position));

  // Update posVec when position changes
  posVec.current.set(position[0], position[1], position[2]);

  useFrame(({ camera }) => {
    const dist = camera.position.distanceTo(posVec.current);
    const newLod: 0 | 1 | 2 = dist > 40 ? 0 : dist > 15 ? 1 : 2;
    if (newLod !== lodRef.current) {
      lodRef.current = newLod;
      setLod(newLod);
    }
  });

  return <>{children(lod)}</>;
}
