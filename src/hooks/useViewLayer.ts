"use client";

import { useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   View Layer State — Progressive Disclosure (L1-L5)
   
   The current layer determines HOW the user sees the 3D model.
   L1 = minimal wireframe, L3 = full color (default), L5 = future.
   ═══════════════════════════════════════════════════════════════ */

export type ViewLayer = 1 | 2 | 3 | 4 | 5;

export interface ViewLayerInfo {
  level: ViewLayer;
  name: string;
  description: string;
  canSelect: boolean;    // can click nodes?
  canOrbit: boolean;     // can orbit/pan?
  showLabels: boolean;   // show node labels?
  showPanel: boolean;    // show detail panel on select?
  showTorus: boolean;    // show torus wireframe?
  showJourney: boolean;  // show journey path + portals?
  colorMode: "mono" | "bw" | "full";
}

export const VIEW_LAYERS: Record<ViewLayer, ViewLayerInfo> = {
  1: {
    level: 1, name: "Terminal", description: "Structure only",
    canSelect: false, canOrbit: true, showLabels: false,
    showPanel: false, showTorus: false, showJourney: false, colorMode: "mono",
  },
  2: {
    level: 2, name: "Chalkboard", description: "Labels visible",
    canSelect: false, canOrbit: true, showLabels: true,
    showPanel: false, showTorus: false, showJourney: false, colorMode: "bw",
  },
  3: {
    level: 3, name: "Color Mandala", description: "Full color + interaction",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, showJourney: true, colorMode: "full",
  },
  4: {
    level: 4, name: "Altitude", description: "Bird's-eye overview",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, showJourney: true, colorMode: "full",
  },
  5: {
    level: 5, name: "Perspective", description: "First-person view",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, showJourney: true, colorMode: "full",
  },
};

export function useViewLayer() {
  const [currentLayer, setCurrentLayer] = useState<ViewLayer>(3);

  const layerInfo = VIEW_LAYERS[currentLayer];

  const setLayer = useCallback((layer: ViewLayer) => {
    setCurrentLayer(layer);
  }, []);

  return { currentLayer, layerInfo, setLayer };
}
