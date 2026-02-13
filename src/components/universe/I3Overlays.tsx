"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   I³ Packet Overlays — small floating indicators near archetypes
   
   Three packet types (from Shared Light I³ system):
     Information (COOL) — blue "i" circle
     Intention (HOT) — red "!" triangle
     Interaction (WARM) — amber "↔" diamond
   
   Assigned by element: Fire=Intention, Earth=Information, Water=Interaction.
   Only visible at L4+.
   ═══════════════════════════════════════════════════════════════ */

interface I3OverlaysProps {
  nodes: Array<{ id: string; position: [number, number, number]; element?: string }>;
  visible: boolean;
}

const PACKET_TYPES: Record<string, { symbol: string; color: string; bg: string; label: string }> = {
  fire:  { symbol: "!", color: "#ef4444", bg: "bg-red-500/20 border-red-500/40", label: "Intention" },
  earth: { symbol: "i", color: "#3b82f6", bg: "bg-blue-500/20 border-blue-500/40", label: "Information" },
  water: { symbol: "↔", color: "#f59e0b", bg: "bg-amber-500/20 border-amber-500/40", label: "Interaction" },
};

export function I3Overlays({ nodes, visible }: I3OverlaysProps) {
  if (!visible) return null;

  return (
    <group>
      {nodes.map((node) => {
        const pkt = PACKET_TYPES[node.element ?? ""];
        if (!pkt) return null;
        return (
          <I3Badge
            key={node.id}
            position={node.position}
            symbol={pkt.symbol}
            color={pkt.color}
            bg={pkt.bg}
          />
        );
      })}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Single I³ badge — floating, bobbing HTML overlay
   ═══════════════════════════════════════════════════════════════ */

interface I3BadgeProps {
  position: [number, number, number];
  symbol: string;
  color: string;
  bg: string;
}

function I3Badge({ position, symbol, color, bg }: I3BadgeProps) {
  const groupRef = useRef<THREE.Group>(null!);

  // Offset from node + gentle bob
  const offsetX = 1.5;
  const offsetY = 1.0;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const bob = Math.sin(t * 1.5 + position[0] * 0.5) * 0.3;
    groupRef.current.position.set(
      position[0] + offsetX,
      position[1] + offsetY + bob,
      position[2],
    );
  });

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={30} style={{ pointerEvents: "none" }}>
        <div
          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold select-none ${bg}`}
          style={{ color }}
          title={symbol}
        >
          {symbol}
        </div>
      </Html>
    </group>
  );
}
