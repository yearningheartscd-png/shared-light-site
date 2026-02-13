"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { JOURNEY_STEPS, ARCHETYPE_MAP } from "@/data/archetypes";
import { archetypeTorusPosition } from "@/lib/torus-layout";

/* ═══════════════════════════════════════════════════════════════
   Journey Path — golden tube through 9 steps
   
   Connects the numbered journey steps through archetype positions.
   Steps without a direct archetype are interpolated between neighbors.
   ═══════════════════════════════════════════════════════════════ */

interface JourneyPathProps {
  visible: boolean;
  currentStep?: number;
  colorMode?: "mono" | "bw" | "full";
}

/**
 * Resolve a journey step to a 3D waypoint.
 * Steps with archetypeId use that archetype's torus position.
 * Steps without (1, 6, 7) are interpolated later.
 */
function resolveWaypoints(): THREE.Vector3[] {
  // First pass: resolve known positions
  const raw: (THREE.Vector3 | null)[] = JOURNEY_STEPS.map((step) => {
    if (step.archetypeId === "AIAM") return new THREE.Vector3(0, 0, 0);
    if (step.archetypeId) {
      const arch = ARCHETYPE_MAP[step.archetypeId];
      if (arch) {
        const pos = archetypeTorusPosition(arch.angleDeg, arch.element);
        return new THREE.Vector3(...pos);
      }
    }
    return null; // needs interpolation
  });

  // Second pass: interpolate nulls from nearest known neighbors
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== null) continue;
    // Find prev known
    let prev: THREE.Vector3 | null = null;
    for (let p = i - 1; p >= 0; p--) {
      if (raw[p]) { prev = raw[p]; break; }
    }
    // Find next known
    let next: THREE.Vector3 | null = null;
    for (let n = i + 1; n < raw.length; n++) {
      if (raw[n]) { next = raw[n]; break; }
    }
    if (prev && next) {
      raw[i] = prev.clone().lerp(next, 0.5);
    } else if (prev) {
      raw[i] = prev.clone().add(new THREE.Vector3(0, 2, 3));
    } else if (next) {
      raw[i] = next.clone().add(new THREE.Vector3(0, 2, -3));
    } else {
      raw[i] = new THREE.Vector3(0, 5, 15);
    }
  }

  return raw as THREE.Vector3[];
}

export function JourneyPath({ visible, currentStep = 1, colorMode = "full" }: JourneyPathProps) {
  const waypoints = useMemo(() => resolveWaypoints(), []);

  const { tubeGeometry, markerPositions } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(waypoints, false, "catmullrom", 0.5);
    const tube = new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
    // Sample marker positions along the curve at even t values
    const markers = JOURNEY_STEPS.map((_, i) => {
      const t = i / (JOURNEY_STEPS.length - 1);
      return curve.getPointAt(t);
    });
    return { tubeGeometry: tube, markerPositions: markers };
  }, [waypoints]);

  const tubeColor = colorMode === "full" ? "#f59e0b" : colorMode === "bw" ? "#888888" : "#444444";
  const showLabels = colorMode !== "mono";

  if (!visible) return null;

  return (
    <group>
      {/* Golden tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={tubeColor}
          emissive={tubeColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          roughness={0.5}
          metalness={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Step markers */}
      {markerPositions.map((pos, i) => (
        <StepMarker
          key={i}
          position={pos}
          step={JOURNEY_STEPS[i]}
          index={i}
          isCurrent={i + 1 === currentStep}
          showLabel={showLabels}
          colorMode={colorMode}
        />
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Individual step marker — sphere + label
   ═══════════════════════════════════════════════════════════════ */

interface StepMarkerProps {
  position: THREE.Vector3;
  step: (typeof JOURNEY_STEPS)[number];
  index: number;
  isCurrent: boolean;
  showLabel: boolean;
  colorMode: "mono" | "bw" | "full";
}

function StepMarker({ position, step, index, isCurrent, showLabel, colorMode }: StepMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const baseColor = colorMode === "full" ? "#f59e0b" : colorMode === "bw" ? "#aaaaaa" : "#555555";

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (isCurrent) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.5) * 0.15;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isCurrent ? 0.8 : 0.2}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {showLabel && (
        <Html
          position={[0, 0.7, 0]}
          center
          distanceFactor={35}
          style={{ pointerEvents: "none" }}
        >
          <div className="text-amber-300/70 text-[9px] font-mono whitespace-nowrap select-none">
            {index + 1}. {step.label}
          </div>
        </Html>
      )}
    </group>
  );
}
