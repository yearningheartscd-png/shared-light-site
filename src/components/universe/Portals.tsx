"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ARCHETYPE_MAP } from "@/data/archetypes";
import { archetypeTorusPosition } from "@/lib/torus-layout";

/* ═══════════════════════════════════════════════════════════════
   QUEST / ACT Portals — two glowing rings on opposite sides
   
   QUEST (entry) — near step 1 (entry point, before Everyman)
   ACT (exit) — near step 8 (Explorer at 180°)
   ═══════════════════════════════════════════════════════════════ */

interface PortalsProps {
  visible: boolean;
  colorMode?: "mono" | "bw" | "full";
}

/**
 * Compute portal positions.
 * QUEST: midpoint between origin and Everyman (first archetype on journey)
 * ACT: at Explorer's position (step 8, 180°)
 */
function usePortalPositions() {
  return useMemo(() => {
    const everyman = ARCHETYPE_MAP["EVERYMAN"];
    const explorer = ARCHETYPE_MAP["EXPLORER"];

    // QUEST: offset in front of Everyman's position, pushed outward
    const evPos = everyman
      ? archetypeTorusPosition(everyman.angleDeg, everyman.element)
      : [15, -8, 10] as [number, number, number];
    const questPos: [number, number, number] = [evPos[0] * 1.35, evPos[1], evPos[2] * 1.35];

    // ACT: offset in front of Explorer's position, pushed outward
    const exPos = explorer
      ? archetypeTorusPosition(explorer.angleDeg, explorer.element)
      : [-15, 8, 0] as [number, number, number];
    const actPos: [number, number, number] = [exPos[0] * 1.35, exPos[1], exPos[2] * 1.35];

    return { questPos, actPos };
  }, []);
}

export function Portals({ visible, colorMode = "full" }: PortalsProps) {
  const { questPos, actPos } = usePortalPositions();

  if (!visible) return null;

  return (
    <group>
      <PortalRing
        position={questPos}
        label="QUEST"
        color={colorMode === "full" ? "#06b6d4" : colorMode === "bw" ? "#999999" : "#444444"}
        colorMode={colorMode}
      />
      <PortalRing
        position={actPos}
        label="ACT"
        color={colorMode === "full" ? "#f59e0b" : colorMode === "bw" ? "#999999" : "#444444"}
        colorMode={colorMode}
      />
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Single portal ring
   ═══════════════════════════════════════════════════════════════ */

interface PortalRingProps {
  position: [number, number, number];
  label: string;
  color: string;
  colorMode: "mono" | "bw" | "full";
}

function PortalRing({ position, label, color, colorMode }: PortalRingProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  // Orient ring to face center [0,0,0]
  const lookRotation = useMemo(() => {
    const dir = new THREE.Vector3(...position).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    return e;
  }, [position]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Slow rotation around local z-axis
      groupRef.current.rotation.z = t * 0.3;
    }
    if (ringRef.current) {
      // Gentle pulsing
      const pulse = 1 + Math.sin(t * 1.8) * 0.06;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  const showLabel = colorMode !== "mono";

  return (
    <group position={position} rotation={lookRotation}>
      <group ref={groupRef}>
        {/* Ring */}
        <mesh ref={ringRef}>
          <torusGeometry args={[2, 0.15, 16, 32]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>

        {/* Inner glow disc */}
        <mesh>
          <circleGeometry args={[1.8, 32]} />
          <meshBasicMaterial
            color={threeColor}
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Label */}
      {showLabel && (
        <Html
          position={[0, 2.8, 0]}
          center
          distanceFactor={35}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="text-[11px] font-mono font-bold whitespace-nowrap select-none tracking-wider"
            style={{ color }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
