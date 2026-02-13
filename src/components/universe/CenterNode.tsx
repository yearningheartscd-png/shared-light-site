"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { UNode } from "@/hooks/useUniverseState";
import { AIAM_COLOR, getElementColor } from "@/data/archetypes";

/* ═══════════════════════════════════════════════════════════════
   CenterNode — aIAM hub
   - Larger pulsing cyan sphere
   - 12 thin spoke lines radiating to each archetype
   - "Synergize" label
   - Gentle rotation animation
   ═══════════════════════════════════════════════════════════════ */

interface SpokeTarget {
  id: string;
  position: [number, number, number];
}

interface Props {
  node: UNode;
  isSelected: boolean;
  onClick: () => void;
  /** Archetype node positions for spoke rendering */
  archetypeTargets: SpokeTarget[];
  colorMode?: "mono" | "bw" | "full";
}

export function CenterNode({ node, isSelected, onClick, archetypeTargets, colorMode = "full" }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  const centerColor = useMemo(() => {
    if (colorMode === "mono") {
      const b = 0.2 + node.stability * 0.3;
      return new THREE.Color(b, b, b);
    }
    if (colorMode === "bw") {
      const b = 0.4 + node.stability * 0.4;
      return new THREE.Color(b, b, b);
    }
    return new THREE.Color(AIAM_COLOR);
  }, [colorMode, node.stability]);

  const baseRadius = 0.3 + node.intensity * 0.9;
  const radius = baseRadius * 1.5;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;

    /* Gentle rotation */
    mesh.rotation.y = t * 0.2;
    mesh.rotation.x = Math.sin(t * 0.1) * 0.05;

    /* Pulsing scale */
    const pulse = 1 + Math.sin(t * 1.2) * 0.04;
    mesh.scale.setScalar(pulse);

    /* Glow breathe */
    if (glowRef.current) {
      const gs = radius * 2.8 + Math.sin(t * 0.8) * 0.3;
      glowRef.current.scale.setScalar(gs);
    }
  });

  /* Spoke geometries — thin lines from [0,0,0] to each archetype */
  const spokeLines = useMemo(() => {
    return archetypeTargets.map((target) => {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...target.position)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = colorMode === "mono" ? "#333333" : colorMode === "bw" ? "#666666" : getElementColor(target.id);
      return { geometry, color, id: target.id };
    });
  }, [archetypeTargets, colorMode]);

  return (
    <group>
      {/* Atmospheric glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={centerColor} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* Body */}
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial
          color={centerColor}
          emissive={centerColor}
          emissiveIntensity={isSelected ? 0.7 : 0.35}
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[radius + 0.4, radius + 0.55, 48]} />
          <meshBasicMaterial color="white" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* 12 spoke lines */}
      {spokeLines.map((spoke) => (
        <line key={spoke.id}>
          <bufferGeometry attach="geometry" {...spoke.geometry} />
          <lineBasicMaterial attach="material" color={spoke.color} transparent opacity={0.12} depthWrite={false} />
        </line>
      ))}

      {/* Synergize label — hidden in mono mode */}
      {colorMode !== "mono" && <Html position={[0, radius + 0.8, 0]} center distanceFactor={40} style={{ pointerEvents: "none" }}>
        <div className="text-cyan-300/80 text-xs font-mono whitespace-nowrap select-none font-bold tracking-wider">
          Synergize
        </div>
      </Html>}
    </group>
  );
}
