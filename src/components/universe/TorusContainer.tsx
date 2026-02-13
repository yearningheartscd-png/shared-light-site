"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { TORUS_MAJOR, TORUS_MINOR } from "@/lib/torus-layout";

/* ═══════════════════════════════════════════════════════════════
   Toroidal Container — Universal Egg / Disc-Spindle
   
   Semi-transparent wireframe torus with three-zone vertex coloring:
     Red (upper)  → Fire zone
     Blue (middle) → Water zone
     Green (lower) → Earth zone
   
   Plus a central spine axis line.
   ═══════════════════════════════════════════════════════════════ */

// Element zone colors (matching ELEMENT_COLORS from archetypes.ts)
const FIRE_COLOR = new THREE.Color("#ef4444");
const WATER_COLOR = new THREE.Color("#3b82f6");
const EARTH_COLOR = new THREE.Color("#22c55e");

/**
 * Build a TorusGeometry with per-vertex colors based on
 * the vertex's y-position on the tube cross-section.
 * Upper third → red, middle → blue, lower third → green.
 */
function useColoredTorusGeometry() {
  return useMemo(() => {
    const radialSegments = 32;
    const tubularSegments = 64;
    const geometry = new THREE.TorusGeometry(
      TORUS_MAJOR,
      TORUS_MINOR,
      radialSegments,
      tubularSegments,
    );

    const posAttr = geometry.attributes.position;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    // The torus lies in XZ with Y as the tube height axis.
    // φ on the minor circle determines y = r·sin(φ).
    // y > r·sin(π/6) ≈ r/2  → Fire zone (top)
    // y < r·sin(-π/6) ≈ -r/2 → Earth zone (bottom)
    // Otherwise → Water zone (middle)
    const yThreshold = TORUS_MINOR * Math.sin(Math.PI / 6); // ~4

    const tmpColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      if (y > yThreshold) {
        tmpColor.copy(FIRE_COLOR);
      } else if (y < -yThreshold) {
        tmpColor.copy(EARTH_COLOR);
      } else {
        tmpColor.copy(WATER_COLOR);
      }
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, []);
}

/**
 * Central spine axis — vertical line through the torus center.
 */
function useSpineGeometry() {
  return useMemo(() => {
    const height = TORUS_MINOR * 2;
    const points = [
      new THREE.Vector3(0, -height, 0),
      new THREE.Vector3(0, height, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
}

/**
 * Spiral flow lines connecting top and bottom vortexes.
 * Two helical paths wrapping around the central axis.
 */
function useSpiralGeometry() {
  return useMemo(() => {
    const spirals: THREE.BufferGeometry[] = [];
    const turns = 2;
    const steps = 80;
    const spiralR = 3; // radius of the spiral around the axis

    for (let s = 0; s < 2; s++) {
      const phaseOffset = s * Math.PI;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = TORUS_MINOR * (1 - 2 * t); // top to bottom
        const angle = t * turns * Math.PI * 2 + phaseOffset;
        const x = Math.cos(angle) * spiralR;
        const z = Math.sin(angle) * spiralR;
        points.push(new THREE.Vector3(x, y, z));
      }
      spirals.push(new THREE.BufferGeometry().setFromPoints(points));
    }
    return spirals;
  }, []);
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function TorusContainer() {
  const torusGeo = useColoredTorusGeometry();
  const spineGeo = useSpineGeometry();
  const spiralGeos = useSpiralGeometry();

  return (
    <group>
      {/* Main torus wireframe — vertex-colored by zone */}
      <mesh geometry={torusGeo} rotation={[0, 0, 0]}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* Central spine axis */}
      <line>
        <bufferGeometry attach="geometry" {...spineGeo} />
        <lineBasicMaterial
          attach="material"
          color="#06b6d4"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </line>

      {/* Spiral flow lines between vortexes */}
      {spiralGeos.map((geo, i) => (
        <line key={i}>
          <bufferGeometry attach="geometry" {...geo} />
          <lineBasicMaterial
            attach="material"
            color="#06b6d4"
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}
