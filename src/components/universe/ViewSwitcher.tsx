"use client";

import { type ViewLayer, VIEW_LAYERS } from "@/hooks/useViewLayer";

/* ═══════════════════════════════════════════════════════════════
   View Switcher — compact L1-L5 layer buttons
   ═══════════════════════════════════════════════════════════════ */

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
