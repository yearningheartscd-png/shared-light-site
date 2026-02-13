"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { UNode } from "@/hooks/useUniverseState";
import { getElementColor, ARCHETYPE_MAP } from "@/data/archetypes";

/* ═══════════════════════════════════════════════════════════════
   Node color: element-based, stability modulates brightness
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
   Component
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  node: UNode;
  isSelected: boolean;
  zoom: number;
  onClick: () => void;
  colorMode?: "mono" | "bw" | "full";
}

export function UniverseNode({ node, isSelected, zoom, onClick, colorMode = "full" }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const basePos = useMemo(() => new THREE.Vector3(...node.position), [node.position]);

  const isCenter = node.id === "AIAM";
  const baseRadius = 0.3 + node.intensity * 0.9;
  const radius = isCenter ? baseRadius * 1.5 : baseRadius;
  const color = useMemo(() => nodeColor(node, colorMode), [node.stability, node.id, colorMode]);

  const prevStab = useRef(node.stability);
  const pulsePhase = useRef(0);

  // Label: archetype name + action, or plain ID
  const archetype = ARCHETYPE_MAP[node.id];
  const label = archetype ? `${archetype.name} — ${archetype.action}` : isCenter ? "aIAM — Synergize" : node.id;

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

    /* Center node gentle rotation */
    if (isCenter) {
      mesh.rotation.y = t * 0.2;
    }

    /* Glow follow */
    if (glowRef.current) {
      const gs = node.active ? radius * 2.5 + Math.sin(t * 1.5) * 0.15 : radius * 1.8;
      glowRef.current.scale.setScalar(gs);
      glowRef.current.position.copy(mesh.position);
    }
  });

  return (
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

      {/* Label — hidden in mono mode */}
      {colorMode !== "mono" && zoom > 0.1 && (
        <Html position={[basePos.x, basePos.y + radius + 0.6, basePos.z]} center distanceFactor={30} style={{ pointerEvents: "none" }}>
          <div className="text-white/70 text-[10px] font-mono whitespace-nowrap select-none">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
