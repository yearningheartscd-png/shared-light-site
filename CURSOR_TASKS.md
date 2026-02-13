# CURSOR_TASKS.md — Shared Light: Unified 3D Universe Model

> **Updated**: 2026-02-12 evening
> **Context**: Merging Atlas + Universe into ONE 3D model based on Arthur Kay's geometric vision.
> **Master Plan**: `~/.claude/plans/valiant-roaming-pizza.md`
> **Reference Diagrams**: `~/.openclaw/workspace/Shared Light docs/` (TOP VIEW, SIDE VIEW, System Architecture)
> **Site**: `~/.openclaw/workspace/shared-light-site/`

---

## RULES (read first, follow always)

1. **Minimal diffs only.** Don't refactor unrelated files.
2. **One sub-task at a time.** Run `npm run build` after each. Stop if errors.
3. **No new jargon.** Public UI = REAL language only. No TRUE protocol names visible.
4. **No identity amplification.** No followers, reputation, feeds, engagement.
5. **No "system activation" claims.** No guarantees, no metaphysics in UI.
6. **Don't rewrite large portions.** Additive/surgical changes only.
7. **Stop if unclear.** Ask for exact file path or spec clarification.
8. **Don't rename routes or folders** that already exist.
9. **Preserve existing features.** Time slider, drift containment, selection panel, sparklines must keep working.

---

## PHASE 1: Three Interlocking Squares Layout (MVP)

Execute these tasks IN ORDER. Each builds on the previous.

---

### TASK 1A: Fix Archetype Angles in `src/data/archetypes.ts`

**What:** The file exists but has WRONG angles. Same-element nodes are grouped together (Fire 0-90°, Earth 120-210°, Water 240-330°). They need to INTERLEAVE so same-element nodes form squares.

**Corrected angles:**
```
HERO      → angleDeg: 0     (Fire)
CREATOR   → angleDeg: 30    (Earth)
SAGE      → angleDeg: 60    (Water)
MAGICIAN  → angleDeg: 90    (Fire)
EVERYMAN  → angleDeg: 120   (Earth)
JESTER    → angleDeg: 150   (Water)
EXPLORER  → angleDeg: 180   (Fire)
INNOCENT  → angleDeg: 210   (Earth)
RULER     → angleDeg: 240   (Water)
OUTLAW    → angleDeg: 270   (Fire)
LOVER     → angleDeg: 300   (Earth)
CAREGIVER → angleDeg: 330   (Water)
```

**Also reorder the ARCHETYPES array** to match this sequence (interleaved R,G,B,R,G,B...).

**Result:** Fire nodes at 0°/90°/180°/270° (square), Earth at 30°/120°/210°/300° (square), Water at 60°/150°/240°/330° (square). Three interlocking squares.

**Acceptance:** All existing exports (CANON_TO_ARCHETYPE, ARCHETYPE_MAP, getElementColor, JOURNEY_STEPS) still work. `npm run build` passes.

---

### TASK 1B: Replace Layout Engine in `src/hooks/useUniverseState.ts`

**What:** Replace the `spherePoint()` golden-angle distribution with Arthur's circular archetype layout.

**Changes to `buildInitialState()`:**

1. **Import archetypes:**
```typescript
import { ARCHETYPES, CANON_TO_ARCHETYPE, ELEMENT_COLORS, AIAM_COLOR, type Element } from "@/data/archetypes";
```

2. **Remove `spherePoint()` function** (no longer needed).

3. **Remove the `typeRadius` / `typeGroups` logic.** Replace with archetype-based positioning.

4. **New positioning logic:**

```
For each archetype in ARCHETYPES:
  - Convert angleDeg to radians
  - x = cos(angle) * RING_RADIUS  (RING_RADIUS = 20)
  - z = sin(angle) * RING_RADIUS
  - y = element === "fire" ? 8 : element === "water" ? 0 : -8
  - Create a UNode for this archetype with:
    - id: archetype.id (e.g., "HERO")
    - type: "Archetype"
    - name: archetype.name
    - position: [x, y, z]
    - stability, intensity, history: generate same way as before (seedHash)

For each canon object in canonData.objects:
  - Look up parent archetype via CANON_TO_ARCHETYPE[obj.id]
  - If found, position in a sub-ring around parent:
    - parentAngle = parent archetype's angle in radians
    - subIndex = index of this canon object within parent's canonIds
    - subAngle = parentAngle + (subIndex - 1) * (2*PI/6)  // spread around parent
    - SUB_RADIUS = 3
    - x = cos(parentAngle) * RING_RADIUS + cos(subAngle) * SUB_RADIUS
    - z = sin(parentAngle) * RING_RADIUS + sin(subAngle) * SUB_RADIUS
    - y = same as parent's y level
  - If NOT found (shouldn't happen), fall back to old positioning

Add aIAM center node:
  - id: "AIAM"
  - type: "Center"
  - name: "aIAM"
  - position: [0, 0, 0]
  - stability: 1.0, intensity: 0.5, active: true
```

5. **Add new edges:**
```
For each archetype:
  - Add edge from archetype.id → "AIAM" (spoke to center)

For each element (fire, earth, water):
  - Get the 4 archetypes of that element
  - Add edges forming a square: [0]→[1], [1]→[2], [2]→[3], [3]→[0]
```

Keep existing canon link edges too.

6. **Add `element` field to UNode interface:**
```typescript
export interface UNode {
  // ... existing fields ...
  element?: Element;  // "fire" | "earth" | "water" | undefined
}
```

Set `element` on each node based on its archetype mapping. aIAM gets no element (it's center).

**Acceptance:**
- `npm run build` passes
- All 37 nodes created (12 archetypes + 1 aIAM + 24 canon objects... note: some canon objects may not map, just position remaining at origin)
- Edge count includes element squares + center spokes + canon links
- No console errors

---

### TASK 1C: Update Node Colors in `src/components/universe/UniverseNode.tsx`

**What:** Replace stability-only red/yellow/green coloring with element-based colors.

**Changes:**

1. **Import:**
```typescript
import { getElementColor, AIAM_COLOR } from "@/data/archetypes";
```

2. **Replace `stabilityColor()` function:**
```typescript
function nodeColor(node: UNode): THREE.Color {
  const elementHex = getElementColor(node.id);
  const baseColor = new THREE.Color(elementHex);
  // Stability modulates brightness: low stability = dimmer
  const brightness = 0.4 + node.stability * 0.6;
  baseColor.multiplyScalar(brightness);
  return baseColor;
}
```

3. **Update all `stabilityColor()` calls** to use `nodeColor(node)` instead.

4. **Update label display** to show archetype name + action verb (if archetype node):
```typescript
import { ARCHETYPE_MAP } from "@/data/archetypes";
// In label section:
const archetype = ARCHETYPE_MAP[node.id];
const label = archetype ? `${archetype.name} — ${archetype.action}` : node.id;
```

5. **aIAM center node:** should use cyan color (#06b6d4) and render slightly larger (radius * 1.5).

**Acceptance:**
- Fire nodes appear red, Earth green, Water blue, aIAM cyan
- Stability still affects brightness (dim when unstable, bright when stable)
- Labels show archetype names for archetype nodes
- `npm run build` passes

---

### TASK 1D: Update Edge Colors in `src/components/universe/UniverseEdge.tsx`

**What:** Color edges by element type instead of stability.

**Changes:**

1. **Import:**
```typescript
import { getElementColor } from "@/data/archetypes";
```

2. **Determine edge color based on endpoint elements:**
```typescript
const srcElement = getElementColor(sourceNode.id);
const tgtElement = getElementColor(targetNode.id);

let edgeColor: string;
if (srcElement === tgtElement) {
  // Same element = element color (forms the square)
  edgeColor = srcElement;
} else {
  // Cross-element = white/neutral
  edgeColor = "#ffffff";
}
```

3. **Increase opacity slightly for same-element edges** (they form the visible squares).

4. **Center spoke edges** (to/from AIAM): use the archetype's element color.

**Acceptance:**
- Same-element edges clearly form colored squares (red, green, blue)
- Cross-element edges are white/neutral, lower opacity
- Center spokes are colored by archetype element
- `npm run build` passes

---

### TASK 1E: Atlas Redirect in `src/app/atlas/page.tsx`

**What:** Make Atlas page load the Universe 3D model instead of the D3 visualizer.

**Change `src/app/atlas/page.tsx` to:**
```typescript
"use client";

import dynamic from "next/dynamic";

const UniverseMap = dynamic(
  () => import("@/components/universe/UniverseMap"),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-[#010409] flex items-center justify-center">
      <div className="text-white/30 font-mono text-sm">Loading universe...</div>
    </div>
  )},
);

export default function AtlasPage() {
  return <UniverseMap />;
}
```

**Do NOT delete** `src/components/AtlasVisualizer.tsx` — it will be reused as L2 Chalkboard view later.

**Acceptance:**
- `/atlas` and `/universe` both show the same 3D model
- No console errors
- `npm run build` passes

---

### TASK 1F: Update UniversePanel with Archetype Info

**What:** Extend the side panel to show archetype-specific information when an archetype node is selected.

**In `src/components/universe/UniversePanel.tsx`:**

1. **Import:**
```typescript
import { ARCHETYPE_MAP, ELEMENT_COLORS } from "@/data/archetypes";
```

2. **After the header section**, add archetype info if the selected node is an archetype:
```typescript
const archetype = ARCHETYPE_MAP[node.id];
// If archetype, show:
// - Element badge (colored dot + "Fire" / "Earth" / "Water")
// - Action verb
// - Journey step (if on the path)
// - Domain description
// - List of grouped canon objects
```

**Acceptance:**
- Selecting an archetype node shows element, action, domain
- Selecting a canon object shows standard panel (unchanged)
- aIAM shows special center info
- `npm run build` passes

---

## STOP POINT — PHASE 1 COMPLETE

After ALL tasks 1A-1F pass:
1. Run `npm run build` — must be zero errors
2. Run `npm run dev` — site must load
3. Navigate to `/universe` — 3D model should show:
   - 12 colored nodes in a circle (4 red top, 4 blue middle, 4 green bottom)
   - aIAM cyan node at center
   - Canon objects clustered around parent archetypes
   - Colored square edges (red/green/blue)
   - Time slider, drift containment still working
4. Navigate to `/atlas` — should show same 3D model

**Wait for Claude Code verification before proceeding to Phase 2.**

---

## PHASE 2: 3-6-9 Node Geometry (after Phase 1 verified)

### TASK 2A: LOD Manager — `src/components/universe/NodeLOD.tsx`

Create a new component that wraps node rendering with distance-based detail:

```typescript
interface NodeLODProps {
  position: [number, number, number];
  children: (lod: 0 | 1 | 2) => React.ReactNode;
}
```

- Use `useFrame` to compute distance from camera to node position each frame
- LOD 0: distance > 40 units
- LOD 1: 15-40 units
- LOD 2: < 15 units
- Pass LOD level to children render function

### TASK 2B: Archetype Node — `src/components/universe/ArchetypeNode.tsx`

New component for archetype-type nodes (replaces generic UniverseNode for archetypes):

- LOD 0: Simple element-colored sphere with glow (current behavior)
- LOD 1: Sphere + Html overlay with archetype symbol/name + action verb
- LOD 2: Sphere + three small orbiting dots (red △, blue ○, green □) representing 3-6-9
- Labels always visible at LOD 1+

### TASK 2C: Center Node — `src/components/universe/CenterNode.tsx`

Special aIAM center node:
- Larger pulsing cyan sphere
- 12 thin lines radiating outward to each archetype (spokes)
- "Synergize" label
- Gentle rotation animation

### TASK 2D: Wire into UniverseMap

Update `UniverseMap.tsx` to use ArchetypeNode for archetype-type nodes and CenterNode for aIAM, keeping UniverseNode for canon objects.

**Wait for Claude Code verification before Phase 3.**

---

## PHASE 3: Toroidal Container — COMPLETE ✓

## PHASE 4: Dimensional View System (Progressive Disclosure)

The user's current "view layer" determines HOW they see the 3D model. This is progressive disclosure — start simple, earn richer views. For now we implement L1–L5 as switchable views (no auth gating yet, just the rendering modes).

Execute these tasks IN ORDER. Each builds on the previous.

---

### TASK 4A: View Layer State Hook — `src/hooks/useViewLayer.ts`

**What:** Create a new hook to manage the current view layer.

**Create `src/hooks/useViewLayer.ts`:**
```typescript
"use client";

import { useState, useCallback } from "react";

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
  colorMode: "mono" | "bw" | "full";  // coloring mode
}

export const VIEW_LAYERS: Record<ViewLayer, ViewLayerInfo> = {
  1: {
    level: 1, name: "Terminal", description: "Structure only",
    canSelect: false, canOrbit: true, showLabels: false,
    showPanel: false, showTorus: false, colorMode: "mono",
  },
  2: {
    level: 2, name: "Chalkboard", description: "Labels visible",
    canSelect: false, canOrbit: true, showLabels: true,
    showPanel: false, showTorus: false, colorMode: "bw",
  },
  3: {
    level: 3, name: "Color Mandala", description: "Full color + interaction",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, colorMode: "full",
  },
  4: {
    level: 4, name: "Altitude", description: "Bird's-eye overview",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, colorMode: "full",
  },
  5: {
    level: 5, name: "Perspective", description: "First-person view",
    canSelect: true, canOrbit: true, showLabels: true,
    showPanel: true, showTorus: true, colorMode: "full",
  },
};

export function useViewLayer() {
  const [currentLayer, setCurrentLayer] = useState<ViewLayer>(3); // default L3

  const layerInfo = VIEW_LAYERS[currentLayer];

  const setLayer = useCallback((layer: ViewLayer) => {
    setCurrentLayer(layer);
  }, []);

  return { currentLayer, layerInfo, setLayer };
}
```

**Acceptance:** `npm run build` passes. Hook exports correctly.

---

### TASK 4B: View Switcher UI — `src/components/universe/ViewSwitcher.tsx`

**What:** A compact layer switcher control positioned bottom-left, above the time slider.

**Create `src/components/universe/ViewSwitcher.tsx`:**

```typescript
"use client";

import { type ViewLayer, VIEW_LAYERS } from "@/hooks/useViewLayer";

interface ViewSwitcherProps {
  currentLayer: ViewLayer;
  onLayerChange: (layer: ViewLayer) => void;
}

export function ViewSwitcher({ currentLayer, onLayerChange }: ViewSwitcherProps) {
  const layers = Object.values(VIEW_LAYERS);

  return (
    <div className="flex items-center gap-1.5">
      {layers.map((info) => {
        const active = currentLayer === info.level;
        const locked = false; // Future: gate by stability score
        return (
          <button
            key={info.level}
            onClick={() => !locked && onLayerChange(info.level)}
            disabled={locked}
            title={`${info.name} — ${info.description}`}
            className={`
              px-2.5 py-1 rounded text-[10px] font-mono transition-colors border
              ${active
                ? "bg-cyan-900/50 text-cyan-300 border-cyan-700/50"
                : locked
                  ? "bg-black/30 text-white/15 border-white/[0.03] cursor-not-allowed"
                  : "bg-black/50 text-white/40 hover:text-white/70 border-white/[0.06] hover:border-white/[0.12]"
              }
            `}
          >
            L{info.level}
          </button>
        );
      })}
      <span className="text-[9px] text-white/25 font-mono ml-1">
        {VIEW_LAYERS[currentLayer].name}
      </span>
    </div>
  );
}
```

**Acceptance:** Component renders 5 buttons (L1–L5) with active state highlighting. `npm run build` passes.

---

### TASK 4C: Apply View Layer Effects in UniverseMap.tsx

**What:** Wire the view layer hook into UniverseMap so the rendering changes based on current layer.

**Changes to `src/components/universe/UniverseMap.tsx`:**

1. **Import the hook and switcher:**
```typescript
import { useViewLayer } from "@/hooks/useViewLayer";
import { ViewSwitcher } from "./ViewSwitcher";
```

2. **Call the hook in the component:**
```typescript
const { currentLayer, layerInfo, setLayer } = useViewLayer();
```

3. **Pass `colorMode` to nodes:**
   - Add a `colorMode` prop to `UniverseNode`, `ArchetypeNode`, and `CenterNode`
   - `"mono"` = all nodes render as white/gray wireframe (no element colors)
   - `"bw"` = black & white, slightly brighter than mono, labels visible
   - `"full"` = current behavior (element colors)

4. **Conditionally show/hide based on layerInfo:**
   - `{layerInfo.showTorus && <TorusContainer />}` — hide torus at L1/L2
   - Node click handler: `onClick={() => layerInfo.canSelect && selectNode(node.id)}`
   - Panel: `{layerInfo.showPanel && selectedNode && <UniversePanel ... />}`

5. **Camera preset for L4 (Altitude):**
   When layer changes to 4, auto-trigger the "above" camera preset.

6. **Add ViewSwitcher to the UI** — place it in a new row ABOVE the time slider bar:
```tsx
{/* View Layer Switcher */}
<div className="absolute bottom-16 left-4 z-10">
  <ViewSwitcher currentLayer={currentLayer} onLayerChange={setLayer} />
</div>
```

**Acceptance:**
- L1: Monochrome wireframe, no labels, no torus, no selection, orbit only
- L2: B&W nodes, labels visible, no selection, no torus
- L3: Full color (current default behavior), selection + panel + torus
- L4: Full color + auto bird's-eye camera
- L5: Full color (same as L3 for now — first-person is future)
- Switching layers is smooth, no flicker
- `npm run build` passes

---

### TASK 4D: Update Node Components for colorMode

**What:** Add `colorMode` prop to UniverseNode, ArchetypeNode, and CenterNode.

**In each component, add to props interface:**
```typescript
colorMode?: "mono" | "bw" | "full";
```

**Color logic:**
```typescript
// In the color calculation function:
if (colorMode === "mono") {
  // Return grayscale: THREE.Color(0.3, 0.3, 0.3) modulated by stability
  const brightness = 0.2 + stability * 0.3;
  return new THREE.Color(brightness, brightness, brightness);
}
if (colorMode === "bw") {
  // Return slightly brighter grayscale
  const brightness = 0.4 + stability * 0.4;
  return new THREE.Color(brightness, brightness, brightness);
}
// "full" = existing element-based coloring
```

**Label visibility:**
- `ArchetypeNode`: Only show Html label if `colorMode !== "mono"` (L1 hides labels)
- `CenterNode`: Only show "Synergize" label if `colorMode !== "mono"`
- `UniverseNode`: Only show label if `colorMode !== "mono"`

**Acceptance:**
- At L1, all nodes are gray wireframe, no labels
- At L2, all nodes are B&W, labels visible
- At L3+, full element colors
- `npm run build` passes

---

### TASK 4E: Update Edge Component for colorMode

**What:** Add `colorMode` prop to UniverseEdge.

**In `src/components/universe/UniverseEdge.tsx`:**
```typescript
colorMode?: "mono" | "bw" | "full";
```

**Edge color logic:**
```typescript
if (colorMode === "mono") {
  edgeColor = "#333333"; // dark gray
  opacity = 0.15;
}
if (colorMode === "bw") {
  edgeColor = "#666666"; // medium gray
  opacity = 0.25;
}
// "full" = existing element-based coloring
```

**Pass `colorMode` from UniverseMap when rendering edges:**
```tsx
<UniverseEdge ... colorMode={layerInfo.colorMode} />
```

**Acceptance:**
- L1 edges are faint gray lines
- L2 edges are medium gray
- L3+ edges are full element colors
- `npm run build` passes

---

## STOP POINT — PHASE 4 COMPLETE

After ALL tasks 4A-4E pass:
1. Run `npm run build` — must be zero errors
2. Run `npm run dev` — site must load
3. Navigate to `/atlas`:
   - View switcher shows L1–L5 buttons, L3 active by default
   - Click L1: everything goes monochrome wireframe, no labels, no torus
   - Click L2: B&W, labels appear, still no torus or selection
   - Click L3: Full color returns, torus visible, can select nodes + see panel
   - Click L4: Full color + camera snaps to bird's-eye
   - Click L5: Same as L3 for now
4. Time slider, drift containment, camera presets all still working

**Wait for Claude Code verification before proceeding to Phase 5.**

---

## PHASE 5: Journey Path + I³ Overlays

The 9-step journey path connects specific archetypes in sequence. QUEST/ACT portals mark entry/exit. I³ packet overlays appear at L4+ only.

Execute these tasks IN ORDER. Each builds on the previous.

---

### TASK 5A: Journey Path — `src/components/universe/JourneyPath.tsx`

**What:** A golden ribbon/tube connecting the 9 journey steps through archetype positions on the torus.

**Create `src/components/universe/JourneyPath.tsx`:**

The journey steps are defined in `src/data/archetypes.ts` as `JOURNEY_STEPS`:
```
Step 1: "Support an ACT"         — no archetype (entry point)
Step 2: "Seek Ground"            — EVERYMAN (Earth, 120°)
Step 3: "Set Time"               — SAGE (Water, 60°)
Step 4: "Simplify Mind"          — JESTER (Water, 150°)
Step 5: "Stay Balanced"          — RULER (Water, 240°)
Step 6: "Synchronize Knowledge"  — no archetype (between nodes)
Step 7: "Serve Entertainment"    — no archetype (between nodes)
Step 8: "Shine on Journey"       — EXPLORER (Fire, 180°)
Step 9: "Synergize"              — AIAM (center, [0,0,0])
```

**Implementation:**

1. **Import:**
```typescript
import { JOURNEY_STEPS, ARCHETYPE_MAP } from "@/data/archetypes";
import { archetypeTorusPosition } from "@/lib/torus-layout";
```

2. **Build waypoints array** from JOURNEY_STEPS:
   - For steps with `archetypeId`: use that archetype's torus position via `archetypeTorusPosition()`
   - For steps with `archetypeId: null` (steps 1, 6, 7): interpolate between the previous and next known archetype positions
   - Step 9 (AIAM): position [0, 0, 0]

3. **Render a CatmullRomCurve3** through the waypoints:
```typescript
const curve = new THREE.CatmullRomCurve3(waypoints);
const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
```

4. **Material:** Golden/amber color (#f59e0b), slightly transparent (opacity 0.6), emissive glow

5. **Step markers:** At each waypoint, render a small sphere (radius 0.3) with:
   - An Html label showing the step number and label: "1. Support an ACT"
   - Current step: brighter, pulsing
   - Completed steps: dimmer
   - For now, all steps are "available" (no progression state yet)

6. **Props interface:**
```typescript
interface JourneyPathProps {
  visible: boolean;          // controlled by view layer
  currentStep?: number;      // which step is active (default: 1)
  colorMode?: "mono" | "bw" | "full";
}
```

7. **In mono/bw mode:** Path renders as gray tube, labels hidden in mono

**Acceptance:**
- Golden tube connects waypoints in correct order
- 9 numbered markers visible at each step
- Path curves smoothly through archetype positions
- `npm run build` passes

---

### TASK 5B: QUEST and ACT Portals — `src/components/universe/Portals.tsx`

**What:** Two glowing portal rings on opposite sides of the torus — QUEST (entry/inward) and ACT (exit/outward).

**Create `src/components/universe/Portals.tsx`:**

1. **QUEST portal** — positioned at step 1 location (entry point of journey):
   - Ring geometry: `TorusGeometry(2, 0.15, 16, 32)`
   - Color: cyan (#06b6d4), emissive glow
   - Oriented to face the center
   - Label: "QUEST" above the ring
   - Gentle pulsing animation (scale oscillation)

2. **ACT portal** — positioned opposite QUEST (near step 8, Explorer at 180°):
   - Same ring geometry
   - Color: amber (#f59e0b), emissive glow
   - Label: "ACT" above the ring
   - Gentle pulsing animation

3. **Both portals:**
   - Slow rotation around their local axis
   - Clickable — on click, could trigger a callback (for now just visual)
   - Inner glow effect: a slightly larger, very transparent disc inside the ring

4. **Props interface:**
```typescript
interface PortalsProps {
  visible: boolean;
  colorMode?: "mono" | "bw" | "full";
}
```

5. **In mono mode:** Portals render as gray wireframe rings, labels hidden

**Acceptance:**
- Two portal rings visible on opposite sides
- QUEST = cyan, ACT = amber
- Gentle rotation + pulse animation
- Labels visible
- `npm run build` passes

---

### TASK 5C: I³ Packet Overlays — `src/components/universe/I3Overlays.tsx`

**What:** Small floating indicators near archetype nodes showing information packet types. Only visible at L4+.

**Create `src/components/universe/I3Overlays.tsx`:**

1. **Three packet types** (from Shared Light I³ system):
   - **Information** (COOL) — blue icon (#3b82f6), small "i" circle
   - **Intention** (HOT) — red icon (#ef4444), small "!" triangle
   - **Interaction** (WARM) — amber icon (#f59e0b), small "↔" diamond

2. **For each archetype node**, show 1-3 small packet indicators floating nearby:
   - Position: offset from node position by [1.5, 1, 0] rotated by random angle
   - Use Html overlays (small 16x16px colored badges)
   - Assign packet types based on archetype element:
     - Fire archetypes: show Intention (HOT) indicator
     - Earth archetypes: show Information (COOL) indicator
     - Water archetypes: show Interaction (WARM) indicator

3. **Animation:** Gentle float/bob up and down (sin wave on y, 0.3 amplitude)

4. **Props interface:**
```typescript
interface I3OverlaysProps {
  nodes: Array<{ id: string; position: [number, number, number]; element?: string }>;
  visible: boolean;  // only true at L4+
}
```

5. **In mono/bw mode:** Don't render (only meaningful in full color)

**Acceptance:**
- Small colored badges float near archetype nodes
- Fire = red "!", Earth = blue "i", Water = amber "↔"
- Gentle bobbing animation
- Only visible when `visible` prop is true
- `npm run build` passes

---

### TASK 5D: Wire Phase 5 Components into UniverseMap.tsx

**What:** Add JourneyPath, Portals, and I3Overlays to the 3D scene with proper view layer gating.

**Changes to `src/components/universe/UniverseMap.tsx`:**

1. **Import new components:**
```typescript
import { JourneyPath } from "./JourneyPath";
import { Portals } from "./Portals";
import { I3Overlays } from "./I3Overlays";
```

2. **Add to Canvas, after the nodes section:**
```tsx
{/* Journey Path — visible at L3+ */}
<JourneyPath
  visible={currentLayer >= 3}
  colorMode={layerInfo.colorMode}
/>

{/* QUEST/ACT Portals — visible at L3+ */}
<Portals
  visible={currentLayer >= 3}
  colorMode={layerInfo.colorMode}
/>

{/* I³ Packet Overlays — visible at L4+ only */}
<I3Overlays
  nodes={state.nodes.filter(n => n.type === "Archetype")}
  visible={currentLayer >= 4}
/>
```

3. **Add `showJourney` flag to ViewLayerInfo** (in `useViewLayer.ts`):
```typescript
// Add to interface:
showJourney: boolean;

// Add to each layer config:
// L1: showJourney: false
// L2: showJourney: false
// L3: showJourney: true
// L4: showJourney: true
// L5: showJourney: true
```

4. **Use the flag:**
```tsx
{layerInfo.showJourney && <JourneyPath visible={true} colorMode={layerInfo.colorMode} />}
{layerInfo.showJourney && <Portals visible={true} colorMode={layerInfo.colorMode} />}
{currentLayer >= 4 && <I3Overlays nodes={...} visible={true} />}
```

**Acceptance:**
- L1/L2: No journey path, no portals, no I³
- L3: Journey path + portals visible, no I³
- L4+: Journey path + portals + I³ overlays visible
- No console errors
- `npm run build` passes

---

## STOP POINT — PHASE 5 COMPLETE (ALL PHASES DONE)

After ALL tasks 5A-5D pass:
1. Run `npm run build` — must be zero errors
2. Run `npm run dev` — site must load
3. Navigate to `/atlas`:
   - At L3: golden journey path visible connecting 9 steps, QUEST/ACT portals glowing
   - At L4: I³ packet badges appear near archetype nodes
   - At L1: everything hidden except gray wireframe structure
   - All existing features still working (camera presets, time slider, node selection, panel)
4. Performance check: should still be smooth (60fps desktop)

**Wait for Claude Code verification. All 5 phases complete after this.**

---

## Reference Files

| File | What |
|------|------|
| `src/data/archetypes.ts` | 12 archetype definitions (interleaved squares) |
| `src/data/canon.ts` + `canon.json` | 36 canon objects |
| `src/hooks/useUniverseState.ts` | State hook (torus layout) |
| `src/hooks/useViewLayer.ts` | View layer state (NEW in Phase 4) |
| `src/lib/torus-layout.ts` | Torus positioning math |
| `src/components/universe/UniverseNode.tsx` | Canon node rendering |
| `src/components/universe/ArchetypeNode.tsx` | Archetype node with LOD |
| `src/components/universe/CenterNode.tsx` | aIAM center node |
| `src/components/universe/UniverseEdge.tsx` | Edge rendering |
| `src/components/universe/UniverseMap.tsx` | Main canvas (wire view layer here) |
| `src/components/universe/UniversePanel.tsx` | Side detail panel |
| `src/components/universe/TorusContainer.tsx` | Wireframe torus shell |
| `src/components/universe/ViewSwitcher.tsx` | Layer switcher UI (NEW in Phase 4) |
| `src/components/universe/DriftContainment.tsx` | Clustering (KEEP AS-IS) |
| `src/app/atlas/page.tsx` | Atlas page (loads UniverseMap) |

## Diagram References

- **TOP VIEW** (three interlocking squares): `~/.openclaw/workspace/Shared Light docs/febda0f1-*.jpg`
- **SIDE VIEW** (three vertical levels): `~/.openclaw/workspace/Shared Light docs/e4af6602-*.jpg`
- **System Architecture**: `~/.openclaw/workspace/Shared Light docs/0910b44d-*.jpg`
