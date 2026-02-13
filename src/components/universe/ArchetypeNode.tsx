"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { UNode } from "@/hooks/useUniverseState";
import { ARCHETYPE_MAP, ELEMENT_COLORS, getElementColor } from "@/data/archetypes";
import { NodeLOD } from "./NodeLOD";

/* ═══════════════════════════════════════════════════════════════
   Color helper — element-based, stability modulates brightness
   ═══════════════════════════════════════════════════════════════ */

function nodeColor(node: UNode, colorMode: "mono" | "bw" | "full" = "full"): THREE.Color {
  if (colorMode === "mono") {
    const b = 0.2 + node.stability * 0.3;
    return new THREE.Color(b, b, b);
  }
  if (colorMode === "bw") {
    const b = 0.4 + node.stability * 0.4;
    return new THREE.Color(b, b, b);
  }
  const hex = getElementColor(node.id);
  const base = new THREE.Color(hex);
  base.multiplyScalar(0.4 + node.stability * 0.6);
  return base;
}

/* ═══════════════════════════════════════════════════════════════
   3-6-9 Orbiting Dots — visible at LOD 2
   Three small spheres orbiting the archetype sphere:
     Fire/9 = red    (△ triangle shape implicit via grouping)
     Water/6 = blue  (○)
     Earth/3 = green (□)
   ═══════════════════════════════════════════════════════════════ */

const DOT_DEFS = [
  { color: ELEMENT_COLORS.fire,  label: "9", offset: 0 },
  { color: ELEMENT_COLORS.water, label: "6", offset: (2 * Math.PI) / 3 },
  { color: ELEMENT_COLORS.earth, label: "3", offset: (4 * Math.PI) / 3 },
] as const;

function OrbitDots({ radius }: { radius: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.6;
    }
  });

  const orbitR = radius + 0.8;

  return (
    <group ref={groupRef}>
      {DOT_DEFS.map((d, i) => {
        const x = Math.cos(d.offset) * orbitR;
        const z = Math.sin(d.offset) * orbitR;
        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ArchetypeNode component
   LOD 0: sphere + glow
   LOD 1: sphere + glow + Html label
   LOD 2: sphere + glow + Html label + 3-6-9 orbiting dots
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  node: UNode;
  isSelected: boolean;
  onClick: () => void;
  colorMode?: "mono" | "bw" | "full";
}

export function ArchetypeNode({ node, isSelected, onClick, colorMode = "full" }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const basePos = useMemo(() => new THREE.Vector3(...node.position), [node.position]);

  const baseRadius = 0.3 + node.intensity * 0.9;
  const radius = baseRadius;
  const color = useMemo(() => nodeColor(node, colorMode), [node.stability, node.id, colorMode]);

  const prevStab = useRef(node.stability);
  const pulsePhase = useRef(0);

  const archetype = ARCHETYPE_MAP[node.id];
  const label = archetype ? `${archetype.name} — ${archetype.action}` : node.id;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;

    /* Jitter for unstable nodes */
    const jitterAmp = node.stability < 0.4 ? (0.4 - node.stability) * 0.8 : 0;
    mesh.position.set(
      basePos.x + Math.sin(t * 3.1 + node.position[0]) * jitterAmp,
      basePos.y + Math.cos(t * 2.7 + node.position[1]) * jitterAmp,
      basePos.z + Math.sin(t * 2.3 + node.position[2]) * jitterAmp,
    );

    /* Pulse on stability change */
    const stabDelta = node.stability - prevStab.current;
    if (Math.abs(stabDelta) > 0.01) {
      pulsePhase.current = stabDelta > 0 ? 1.0 : -0.5;
      prevStab.current = node.stability;
    }
    if (pulsePhase.current !== 0) pulsePhase.current *= 0.95;
    mesh.scale.setScalar(1 + pulsePhase.current * 0.3);

    /* Glow follow */
    if (glowRef.current) {
      const gs = node.active ? radius * 2.5 + Math.sin(t * 1.5) * 0.15 : radius * 1.8;
      glowRef.current.scale.setScalar(gs);
      glowRef.current.position.copy(mesh.position);
    }
  });

  return (
    <NodeLOD position={node.position}>
      {(lod) => (
        <group>
          {/* Atmospheric glow */}
          <mesh ref={glowRef}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={node.active ? 0.08 : 0.03} depthWrite={false} />
          </mesh>

          {/* Body */}
          <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 0.6 : node.active ? 0.25 : 0.1}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>

          {/* Selection ring */}
          {isSelected && (
            <mesh position={basePos}>
              <ringGeometry args={[radius + 0.3, radius + 0.45, 48]} />
              <meshBasicMaterial color="white" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )}

          {/* LOD 1+: Label — hidden in mono mode */}
          {colorMode !== "mono" && lod >= 1 && (
            <Html
              position={[basePos.x, basePos.y + radius + 0.6, basePos.z]}
              center
              distanceFactor={30}
              style={{ pointerEvents: "none" }}
            >
              <div className="text-white/80 text-[11px] font-mono whitespace-nowrap select-none font-semibold">
                {label}
              </div>
            </Html>
          )}

          {/* LOD 2: 3-6-9 orbiting dots */}
          {lod >= 2 && (
            <group position={basePos}>
              <OrbitDots radius={radius} />
            </group>
          )}
        </group>
      )}
    </NodeLOD>
  );
}
