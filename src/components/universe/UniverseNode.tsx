"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { UNode } from "@/hooks/useUniverseState";

/* ═══════════════════════════════════════════════════════════════
   Stability → colour:  0 = red,  0.5 = yellow,  1 = green
   ═══════════════════════════════════════════════════════════════ */

const colLow = new THREE.Color("#ef4444");
const colMid = new THREE.Color("#eab308");
const colHigh = new THREE.Color("#22c55e");

function stabilityColor(s: number): THREE.Color {
  return s < 0.5
    ? colLow.clone().lerp(colMid, s * 2)
    : colMid.clone().lerp(colHigh, (s - 0.5) * 2);
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  node: UNode;
  isSelected: boolean;
  zoom: number;
  onClick: () => void;
}

export function UniverseNode({ node, isSelected, zoom, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const basePos = useMemo(() => new THREE.Vector3(...node.position), [node.position]);

  const radius = 0.3 + node.intensity * 0.9;
  const color = useMemo(() => stabilityColor(node.stability), [node.stability]);

  // Previous stability for pulse detection
  const prevStab = useRef(node.stability);
  const pulsePhase = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;

    /* ── Jitter: unstable nodes oscillate ── */
    const jitterAmp = node.stability < 0.4 ? (0.4 - node.stability) * 0.8 : 0;
    mesh.position.set(
      basePos.x + Math.sin(t * 3.1 + node.position[0]) * jitterAmp,
      basePos.y + Math.cos(t * 2.7 + node.position[1]) * jitterAmp,
      basePos.z + Math.sin(t * 2.3 + node.position[2]) * jitterAmp,
    );

    /* ── Pulse: brief scale bump when stability improves ── */
    const stabDelta = node.stability - prevStab.current;
    if (Math.abs(stabDelta) > 0.01) {
      pulsePhase.current = stabDelta > 0 ? 1.0 : -0.5;
      prevStab.current = node.stability;
    }
    if (pulsePhase.current > 0) {
      pulsePhase.current *= 0.95; // decay
    } else if (pulsePhase.current < 0) {
      pulsePhase.current *= 0.95;
    }
    const scaleFactor = 1 + pulsePhase.current * 0.3;
    mesh.scale.setScalar(scaleFactor);

    /* ── Active glow ── */
    if (glowRef.current) {
      const glowScale = node.active
        ? radius * 2.5 + Math.sin(t * 1.5) * 0.15
        : radius * 1.8;
      glowRef.current.scale.setScalar(glowScale);
      glowRef.current.position.copy(mesh.position);
    }
  });

  return (
    <group>
      {/* Atmospheric glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={node.active ? 0.08 : 0.03}
          depthWrite={false}
        />
      </mesh>

      {/* Planet body */}
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
          <meshBasicMaterial
            color="white"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Label — visible when zoomed in enough */}
      {zoom > 0.15 && (
        <Html
          position={[basePos.x, basePos.y + radius + 0.6, basePos.z]}
          center
          distanceFactor={30}
          style={{ pointerEvents: "none" }}
        >
          <div className="text-white/70 text-[10px] font-mono whitespace-nowrap select-none">
            {node.id}
          </div>
        </Html>
      )}
    </group>
  );
}
