"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

import { useUniverseState } from "@/hooks/useUniverseState";
import { UniverseNode } from "./UniverseNode";
import { ArchetypeNode } from "./ArchetypeNode";
import { CenterNode } from "./CenterNode";
import { UniverseEdge } from "./UniverseEdge";
import { DriftContainment, findClusters } from "./DriftContainment";
import { TorusContainer } from "./TorusContainer";
import { UniversePanel } from "./UniversePanel";
import { ViewSwitcher } from "./ViewSwitcher";
import { JourneyPath } from "./JourneyPath";
import { Portals } from "./Portals";
import { I3Overlays } from "./I3Overlays";
import { useViewLayer } from "@/hooks/useViewLayer";
import { CAMERA_PRESETS, type CameraPreset } from "@/lib/torus-layout";

/* ═══════════════════════════════════════════════════════════════
   Camera zoom tracker — drives label visibility
   ═══════════════════════════════════════════════════════════════ */

function CameraTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const { camera } = useThree();
  const lastZoom = useRef(0);

  useFrame(() => {
    const d = camera.position.length();
    const z = Math.max(0, 1 - d / 100);
    if (Math.abs(z - lastZoom.current) > 0.01) {
      lastZoom.current = z;
      onZoomChange(z);
    }
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Camera Preset Animator — smooth lerp to preset positions
   Uses makeDefault OrbitControls for target access.
   ═══════════════════════════════════════════════════════════════ */

function CameraPresetAnimator({ preset, onDone }: { preset: CameraPreset | null; onDone: () => void }) {
  const { camera, controls } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const animating = useRef(false);
  const frameCount = useRef(0);

  // When preset changes, set the target
  const prevPreset = useRef<CameraPreset | null>(null);
  if (preset !== prevPreset.current) {
    prevPreset.current = preset;
    if (preset) {
      const p = CAMERA_PRESETS[preset];
      targetPos.current.set(...p.position);
      targetLookAt.current.set(...p.lookAt);
      animating.current = true;
      frameCount.current = 0;
    }
  }

  useFrame(() => {
    if (!animating.current || !preset) return;
    frameCount.current += 1;

    const lerpFactor = 0.06;
    camera.position.lerp(targetPos.current, lerpFactor);

    // Update OrbitControls target for smooth look-at
    const ctrl = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (ctrl?.target) {
      ctrl.target.lerp(targetLookAt.current, lerpFactor);
      ctrl.update();
    }

    // Stop after converging (or max 120 frames ~2s)
    const dist = camera.position.distanceTo(targetPos.current);
    if (dist < 0.3 || frameCount.current > 120) {
      animating.current = false;
      onDone();
    }
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */

export default function UniverseMap() {
  const { state, selectNode, setTimeIndex, expandScope, returnToBaseline } =
    useUniverseState();

  const zoomRef = useRef(0);
  const handleZoomChange = useCallback((z: number) => {
    zoomRef.current = z;
  }, []);

  // View layer
  const { currentLayer, layerInfo, setLayer } = useViewLayer();

  // Camera preset state
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>(null);
  const handlePresetDone = useCallback(() => setCameraPreset(null), []);

  // L4 auto bird's-eye camera
  useEffect(() => {
    if (currentLayer === 4) setCameraPreset("above");
  }, [currentLayer]);

  const selectedNode = state.selectedId
    ? state.nodes.find((n) => n.id === state.selectedId) ?? null
    : null;

  // Compute which node IDs are inside containment zones (for edge dimming)
  const containedIds = useMemo(() => {
    const clusters = findClusters(state.nodes);
    const ids = new Set<string>();
    for (const c of clusters) {
      for (const id of c.nodeIds) ids.add(id);
    }
    return ids;
  }, [state.nodes]);

  // Build a node lookup for edges
  const nodeMap = useMemo(() => {
    const m = new Map<string, (typeof state.nodes)[number]>();
    for (const n of state.nodes) m.set(n.id, n);
    return m;
  }, [state.nodes]);

  return (
    <div className="relative w-full h-full bg-[#010409]">
      {/* ═══════ Three.js Canvas ═══════ */}
      <Canvas
        camera={{ position: [0, 20, 50], fov: 60, near: 0.1, far: 500 }}
        style={{ position: "absolute", inset: 0 }}
        onClick={() => layerInfo.canSelect && selectNode(null)}
      >
        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <pointLight position={[30, 40, 20]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-20, -10, -30]} intensity={0.4} color="#3b82f6" />

        {/* Starfield background */}
        <Stars radius={200} depth={100} count={5000} factor={3} saturation={0.1} fade speed={0.5} />

        {/* Camera controls — makeDefault so CameraPresetAnimator can access */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={150}
          rotateSpeed={0.5}
          panSpeed={0.5}
        />

        {/* Camera helpers */}
        <CameraTracker onZoomChange={handleZoomChange} />
        <CameraPresetAnimator preset={cameraPreset} onDone={handlePresetDone} />

        {/* Toroidal container wireframe — hidden at L1/L2 */}
        {layerInfo.showTorus && <TorusContainer />}

        {/* Edges */}
        {state.edges.map((edge) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;
          const dimmed =
            containedIds.has(edge.source) || containedIds.has(edge.target);
          return (
            <UniverseEdge
              key={`${edge.source}-${edge.target}`}
              edge={edge}
              sourceNode={src}
              targetNode={tgt}
              dimmed={dimmed}
              colorMode={layerInfo.colorMode}
            />
          );
        })}

        {/* Nodes — routed by type */}
        {state.nodes.map((node) => {
          if (node.id === "AIAM") {
            const archTargets = state.nodes
              .filter((n) => n.type === "Archetype")
              .map((n) => ({ id: n.id, position: n.position }));
            return (
              <CenterNode
                key={node.id}
                node={node}
                isSelected={state.selectedId === node.id}
                onClick={() => layerInfo.canSelect && selectNode(node.id)}
                archetypeTargets={archTargets}
                colorMode={layerInfo.colorMode}
              />
            );
          }
          if (node.type === "Archetype") {
            return (
              <ArchetypeNode
                key={node.id}
                node={node}
                isSelected={state.selectedId === node.id}
                onClick={() => layerInfo.canSelect && selectNode(node.id)}
                colorMode={layerInfo.colorMode}
              />
            );
          }
          return (
            <UniverseNode
              key={node.id}
              node={node}
              isSelected={state.selectedId === node.id}
              zoom={zoomRef.current}
              onClick={() => layerInfo.canSelect && selectNode(node.id)}
              colorMode={layerInfo.colorMode}
            />
          );
        })}

        {/* Drift containment spheres */}
        <DriftContainment nodes={state.nodes} />

        {/* Journey Path — visible at L3+ */}
        {layerInfo.showJourney && (
          <JourneyPath visible={true} colorMode={layerInfo.colorMode} />
        )}

        {/* QUEST/ACT Portals — visible at L3+ */}
        {layerInfo.showJourney && (
          <Portals visible={true} colorMode={layerInfo.colorMode} />
        )}

        {/* I³ Packet Overlays — visible at L4+ only */}
        {currentLayer >= 4 && (
          <I3Overlays
            nodes={state.nodes.filter((n) => n.type === "Archetype")}
            visible={true}
          />
        )}
      </Canvas>

      {/* ═══════ Camera Preset Buttons ═══════ */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {(["above", "equator", "inside"] as const).map((key) => {
          const labels: Record<CameraPreset, string> = {
            above: "Top",
            equator: "Side",
            inside: "Inside",
          };
          const active = cameraPreset === key;
          return (
            <button
              key={key}
              onClick={() => setCameraPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-colors border ${
                active
                  ? "bg-cyan-900/50 text-cyan-300 border-cyan-700/50"
                  : "bg-black/50 text-white/50 hover:text-white/80 border-white/[0.06] hover:border-white/[0.12] backdrop-blur"
              }`}
            >
              {labels[key]}
            </button>
          );
        })}
      </div>

      {/* ═══════ View Layer Switcher ═══════ */}
      <div className="absolute bottom-16 left-4 z-10">
        <ViewSwitcher currentLayer={currentLayer} onLayerChange={setLayer} />
      </div>

      {/* ═══════ Time Slider ═══════ */}
      <div className="absolute bottom-4 left-4 right-80 sm:right-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg px-4 py-2">
        <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider shrink-0">
          Time
        </span>
        <input
          type="range"
          min={0}
          max={state.maxTimeIndex}
          value={state.timeIndex}
          onChange={(e) => setTimeIndex(parseInt(e.target.value, 10))}
          className="flex-1 h-1 accent-cyan-500 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
        <span className="text-[10px] text-white/40 font-mono w-8 text-right">
          {state.timeIndex === state.maxTimeIndex
            ? "LIVE"
            : `t${state.timeIndex}`}
        </span>
      </div>

      {/* ═══════ Node count indicator ═══════ */}
      <div className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg px-3 py-1.5 hidden sm:flex items-center gap-3">
        <span className="text-sm font-semibold text-white/80">Universe Map</span>
        <span className="text-[10px] text-white/25 font-mono">
          {state.nodes.length} nodes • {state.edges.length} edges
        </span>
      </div>

      {/* ═══════ Interaction Panel ═══════ */}
      {layerInfo.showPanel && selectedNode && (
        <UniversePanel
          node={selectedNode}
          onClose={() => selectNode(null)}
          onExpand={() => expandScope(selectedNode.id)}
          onReturn={() => returnToBaseline(selectedNode.id)}
        />
      )}
    </div>
  );
}
