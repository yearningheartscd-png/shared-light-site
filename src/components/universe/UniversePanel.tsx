"use client";

import type { UNode } from "@/hooks/useUniverseState";
import { ARCHETYPE_MAP, ELEMENT_COLORS, JOURNEY_STEPS } from "@/data/archetypes";

/* ═══════════════════════════════════════════════════════════════
   Side panel — constraint-based interaction + archetype info
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  node: UNode;
  onClose: () => void;
  onExpand: () => void;
  onReturn: () => void;
}

function meter(value: number, low: string, mid: string, high: string) {
  const pct = Math.round(value * 100);
  const color = value < 0.3 ? low : value < 0.6 ? mid : high;
  return (
    <div className="w-full">
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right text-[10px] text-white/30 mt-0.5 font-mono">{pct}%</div>
    </div>
  );
}

const ELEMENT_LABELS: Record<string, string> = { fire: "Fire (9)", earth: "Earth (3)", water: "Water (6)" };

export function UniversePanel({ node, onClose, onExpand, onReturn }: Props) {
  const canExpand = node.stability >= 0.4;
  const suggestReturn = node.intensity > 0.7;
  const archetype = ARCHETYPE_MAP[node.id];
  const isCenter = node.id === "AIAM";
  const journeyStep = archetype
    ? JOURNEY_STEPS.find((s) => s.archetypeId === archetype.id)
    : isCenter
      ? JOURNEY_STEPS.find((s) => s.archetypeId === "AIAM")
      : undefined;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-black/85 backdrop-blur-xl border-l border-white/[0.06] p-5 flex flex-col z-30 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider">
            {archetype ? "Archetype" : isCenter ? "Center" : node.type}
          </div>
          <h2 className="text-lg font-bold text-white">{archetype ? archetype.name : node.name}</h2>
          <div className="text-xs text-white/40 font-mono">{node.id}</div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Archetype-specific info ── */}
      {archetype && (
        <div className="space-y-3 mb-6 pb-4 border-b border-white/[0.06]">
          {/* Element badge */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: ELEMENT_COLORS[archetype.element] }} />
            <span className="text-sm text-white/70">{ELEMENT_LABELS[archetype.element]}</span>
          </div>

          {/* Action verb */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Action</div>
            <div className="text-white/80 font-semibold">{archetype.action}</div>
          </div>

          {/* Domain */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Domain</div>
            <div className="text-white/60 text-sm">{archetype.domain}</div>
          </div>

          {/* Journey step */}
          {journeyStep && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Journey Step {journeyStep.step}</div>
              <div className="text-white/70 text-sm">{journeyStep.label}</div>
            </div>
          )}

          {/* Grouped canon objects */}
          {archetype.canonIds.length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Grouped Objects</div>
              <div className="flex flex-wrap gap-1">
                {archetype.canonIds.map((cid) => (
                  <span key={cid} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/50">
                    {cid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── aIAM center info ── */}
      {isCenter && (
        <div className="space-y-3 mb-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#06b6d4" }} />
            <span className="text-sm text-white/70">Center — Unity / Coherence</span>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Role</div>
            <div className="text-white/60 text-sm">
              Hub connecting all 12 archetypes. Step 9 of the journey: Synergize.
            </div>
          </div>
          {journeyStep && (
            <div className="bg-cyan-950/20 rounded-lg p-3 border border-cyan-800/20">
              <div className="text-[10px] text-cyan-400/60 uppercase tracking-wider mb-1">Journey Step {journeyStep.step}</div>
              <div className="text-cyan-300/70 text-sm">{journeyStep.label}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Metrics ── */}
      <div className="space-y-4 mb-8">
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Stability</span>
            <span className={node.stability < 0.3 ? "text-red-400" : node.stability < 0.6 ? "text-yellow-400" : "text-green-400"}>
              {node.stability < 0.3 ? "Unstable" : node.stability < 0.6 ? "Moderate" : "Stable"}
            </span>
          </div>
          {meter(node.stability, "#ef4444", "#eab308", "#22c55e")}
        </div>

        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Intensity</span>
            <span className={node.intensity > 0.7 ? "text-orange-400" : "text-white/40"}>
              {node.intensity > 0.7 ? "High — consider return" : "Normal"}
            </span>
          </div>
          {meter(node.intensity, "#3b82f6", "#eab308", "#f97316")}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Open Tasks</div>
            <div className="text-xl font-bold font-mono text-white">{node.openTasks}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Last Closure</div>
            <div className="text-sm font-mono text-white/70">
              {node.lastClosure ? `${Math.round((Date.now() - node.lastClosure) / 1000)}s ago` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="space-y-3 mt-auto">
        {suggestReturn && (
          <div className="bg-orange-950/30 border border-orange-800/30 rounded-lg p-3 text-xs text-orange-300/80">
            Intensity is elevated. Consider returning to baseline before expanding scope.
          </div>
        )}

        <button onClick={onExpand} disabled={!canExpand}
          className={`w-full py-2.5 rounded-lg font-mono text-sm transition-colors ${
            canExpand
              ? "bg-white/10 text-white hover:bg-white/15 border border-white/10"
              : "bg-white/[0.03] text-white/20 border border-white/[0.04] cursor-not-allowed"
          }`}>
          {canExpand ? "Expand Scope" : "Expand Scope (stability too low)"}
        </button>

        <button onClick={onReturn}
          className={`w-full py-2.5 rounded-lg font-mono text-sm transition-colors ${
            suggestReturn
              ? "bg-green-900/40 text-green-300 hover:bg-green-900/60 border border-green-700/40"
              : "bg-white/[0.05] text-white/60 hover:bg-white/10 border border-white/[0.06]"
          }`}>
          Return to Baseline
        </button>
      </div>

      {/* ── History sparkline ── */}
      <div className="mt-6 pt-4 border-t border-white/[0.06]">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Stability History</div>
        <div className="flex items-end gap-px h-8">
          {node.history.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${h.stability * 100}%`,
                background: h.stability < 0.3 ? "#ef4444" : h.stability < 0.6 ? "#eab308" : "#22c55e",
                opacity: 0.4 + (i / node.history.length) * 0.6,
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
