"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

import { useUniverseState } from "@/hooks/useUniverseState";
import { UniverseNode } from "./UniverseNode";
import { UniverseEdge } from "./UniverseEdge";
import { DriftContainment, findClusters } from "./DriftContainment";
import { UniversePanel } from "./UniversePanel";

/* ═══════════════════════════════════════════════════════════════
   Camera zoom tracker — drives label visibility
   ═══════════════════════════════════════════════════════════════ */

function CameraTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const { camera } = useThree();
  const lastZoom = useRef(0);

  // Check zoom level each frame (normalized 0-1 based on distance)
  useRef(null); // satisfy lint
  const checkZoom = useCallback(() => {
    const d = camera.position.length();
    const z = Math.max(0, 1 - d / 100); // 0=far, 1=close
    if (Math.abs(z - lastZoom.current) > 0.01) {
      lastZoom.current = z;
      onZoomChange(z);
    }
  }, [camera, onZoomChange]);

  // Run in animation loop via drei's useFrame
  const { gl } = useThree();
  gl.setAnimationLoop(() => {
    checkZoom();
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
        onClick={() => selectNode(null)}
      >
        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <pointLight position={[30, 40, 20]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-20, -10, -30]} intensity={0.4} color="#3b82f6" />

        {/* Starfield background */}
        <Stars radius={200} depth={100} count={5000} factor={3} saturation={0.1} fade speed={0.5} />

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={150}
          rotateSpeed={0.5}
          panSpeed={0.5}
        />

        {/* Zoom tracker */}
        <CameraTracker onZoomChange={handleZoomChange} />

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
            />
          );
        })}

        {/* Nodes */}
        {state.nodes.map((node) => (
          <UniverseNode
            key={node.id}
            node={node}
            isSelected={state.selectedId === node.id}
            zoom={zoomRef.current}
            onClick={() => selectNode(node.id)}
          />
        ))}

        {/* Drift containment spheres */}
        <DriftContainment nodes={state.nodes} />
      </Canvas>

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
      {selectedNode && (
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
