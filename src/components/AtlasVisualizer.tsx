"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import {
  canonData,
  CanonObject,
  CanonLink,
  TYPE_COLORS,
  TEMP_COLORS,
  NodeType,
} from "@/data/canon";

/* ═══════════════════════════════════════════════════════════════
   Colour palettes — native SVG values (no Tailwind in SVG attrs)
   ═══════════════════════════════════════════════════════════════ */

const PLANET_PALETTE: Record<
  NodeType,
  { main: string; light: string; dark: string }
> = {
  Layer: { main: "#06b6d4", light: "#67e8f9", dark: "#0c3d4a" },
  Protocol: { main: "#8b5cf6", light: "#c4b5fd", dark: "#3b1a7e" },
  Token: { main: "#10b981", light: "#6ee7b7", dark: "#064e3b" },
  Receipt: { main: "#f59e0b", light: "#fcd34d", dark: "#713f12" },
  Gate: { main: "#f43f5e", light: "#fda4af", dark: "#6e1429" },
  Artifact: { main: "#6b7280", light: "#d1d5db", dark: "#1f2937" },
};

/** Base planet radius by type — Layers are largest */
const PLANET_R: Record<NodeType, number> = {
  Layer: 22,
  Protocol: 16,
  Gate: 15,
  Token: 13,
  Receipt: 12,
  Artifact: 10,
};

const TEMP_RING_COLOR: Record<string, string> = {
  COOL: "#3b82f6",
  WARM: "#f97316",
  HOT: "#ef4444",
};

/* ═══════════════════════════════════════════════════════════════
   Star-field generation  — three parallax layers
   ═══════════════════════════════════════════════════════════════ */

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinkle: boolean;
  dur: number;
  color: string;
}

const STAR_COLORS = [
  "#ffffff",
  "#ffffff",
  "#ffffff",
  "#cad5e8",
  "#e8d5ca",
  "#cae8e8",
  "#d5cae8",
];

function makeStars(
  count: number,
  lo: number,
  hi: number,
  rMin: number,
  rMax: number,
  opMin: number,
  opMax: number,
  twinkleChance: number,
): Star[] {
  const span = hi - lo;
  return Array.from({ length: count }, () => ({
    x: lo + Math.random() * span,
    y: lo + Math.random() * span,
    r: rMin + Math.random() * (rMax - rMin),
    opacity: opMin + Math.random() * (opMax - opMin),
    twinkle: Math.random() < twinkleChance,
    dur: 2.5 + Math.random() * 5,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  }));
}

/* ═══════════════════════════════════════════════════════════════
   Geometry helpers
   ═══════════════════════════════════════════════════════════════ */

function nodeBounds(nodes: CanonObject[], pad = 140) {
  if (!nodes.length) return { x: 0, y: 0, w: 800, h: 600 };
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const n of nodes) {
    if (n.x != null && n.y != null) {
      x0 = Math.min(x0, n.x);
      y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x);
      y1 = Math.max(y1, n.y);
    }
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

function zoomToFit(
  bounds: { x: number; y: number; w: number; h: number },
  vw: number,
  vh: number,
  maxK = 1.0,
) {
  const k = Math.min(maxK, vw / bounds.w, vh / bounds.h);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return d3.zoomIdentity.translate(vw / 2 - cx * k, vh / 2 - cy * k).scale(k);
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export default function AtlasVisualizer() {
  /* refs */
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const sizeRef = useRef({ w: 800, h: 600 });

  /* state */
  const [sel, setSel] = useState<CanonObject | null>(null);
  const [tf, setTf] = useState({ k: 1, x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const simRef = useRef<{ nodes: CanonObject[]; links: CanonLink[] }>({
    nodes: [],
    links: [],
  });
  const [, kick] = useState(0);

  /* ── Stars (generated once) ──────────────────────────── */
  const starsRef = useRef<{ far: Star[]; mid: Star[]; near: Star[] } | null>(
    null,
  );
  if (!starsRef.current) {
    starsRef.current = {
      far: makeStars(300, -3000, 5000, 0.3, 1.0, 0.12, 0.35, 0.08),
      mid: makeStars(120, -2000, 4000, 0.5, 1.4, 0.18, 0.5, 0.18),
      near: makeStars(50, -1000, 3000, 0.8, 2.2, 0.25, 0.65, 0.35),
    };
  }
  const stars = starsRef.current;

  /* ── Fit to content ──────────────────────────────────── */
  const fitAll = useCallback((anim = true) => {
    if (!svgRef.current || !zoomRef.current) return;
    const { w, h } = sizeRef.current;
    const t = zoomToFit(nodeBounds(simRef.current.nodes), w, h);
    const svg = d3.select(svgRef.current);
    if (anim) svg.transition().duration(750).call(zoomRef.current.transform, t);
    else svg.call(zoomRef.current.transform, t);
  }, []);

  /* ── D3 simulation ───────────────────────────────────── */
  useEffect(() => {
    const nodes: CanonObject[] = JSON.parse(JSON.stringify(canonData.objects));
    const links: CanonLink[] = nodes.flatMap((src) =>
      src.links
        .filter((tid) => nodes.some((n) => n.id === tid))
        .map((tid) => ({ source: src.id, target: tid })),
    );
    simRef.current = { nodes, links };

    const el = boxRef.current;
    const w = el?.clientWidth ?? 800;
    const h = el?.clientHeight ?? 600;
    sizeRef.current = { w, h };

    const mobile = w < 640;

    const sim = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(
            links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[],
          )
          .id((d: any) => d.id)
          .distance(mobile ? 160 : 300),
      )
      .force("charge", d3.forceManyBody().strength(mobile ? -600 : -2500))
      .force("x", d3.forceX(w / 2).strength(0.04))
      .force("y", d3.forceY(h / 2).strength(0.04))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius(mobile ? 45 : 85)
          .iterations(3),
      )
      .on("tick", () => kick((v) => v + 1));

    sim.on("end", () => fitAll(false));
    const earlyFit = setTimeout(() => fitAll(false), 1200);

    /* zoom behaviour — Google-Earth-style: zooms toward pointer */
    const svg = d3.select(svgRef.current!);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.04, 5])
      .on("zoom", (e) => setTf(e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);

    /* resize */
    let ro: ResizeObserver | null = null;
    if (el) {
      ro = new ResizeObserver((entries) => {
        for (const e of entries)
          sizeRef.current = {
            w: e.contentRect.width,
            h: e.contentRect.height,
          };
      });
      ro.observe(el);
    }

    return () => {
      sim.stop();
      ro?.disconnect();
      clearTimeout(earlyFit);
    };
  }, [fitAll]);

  /* ── Zoom helpers ────────────────────────────────────── */
  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const { w, h } = sizeRef.current;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, factor, [w / 2, h / 2]);
  };

  /* ── Navigate to node ────────────────────────────────── */
  const flyToNode = useCallback(
    (node: CanonObject) => {
      if (!node || !svgRef.current || !zoomRef.current) return;
      const { w, h } = sizeRef.current;
      const mobile = w < 640;
      const k = mobile ? 1.0 : Math.max(1.6, tf.k);
      const yAnchor = mobile ? h * 0.28 : h / 2;
      d3.select(svgRef.current)
        .transition()
        .duration(900)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity
            .translate(w / 2 - (node.x || 0) * k, yAnchor - (node.y || 0) * k)
            .scale(k),
        );
    },
    [tf.k],
  );

  const selectNode = useCallback(
    (node: CanonObject) => {
      setSel(node);
      setPanelOpen(true);
      flyToNode(node);
    },
    [flyToNode],
  );

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase();
    const hit = simRef.current.nodes.find(
      (n) =>
        n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q),
    );
    if (hit) {
      selectNode(hit);
      setSearchOpen(false);
    }
  };

  /* ── Destructure transform for readability ───────────── */
  const { x: tx, y: ty, k } = tf;

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */
  return (
    <div
      ref={boxRef}
      className="relative w-full h-full bg-[#010409] text-slate-200 overflow-hidden"
    >
      {/* ════════ HUD controls ════════ */}
      <header className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Title — desktop only */}
        <div className="pointer-events-auto bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg px-3 py-1.5 hidden sm:flex items-center gap-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="text-sm font-semibold text-white/80 tracking-wide">
            Shared Light Atlas
          </span>
          <span className="text-[10px] text-white/25 font-mono">
            v{canonData.meta.schema_version}
          </span>
        </div>

        {/* Right-side controls */}
        <div className="pointer-events-auto flex gap-1.5 items-center ml-auto">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 active:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Desktop search */}
          <form onSubmit={doSearch} className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search nodes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/40 w-48 text-white/70 placeholder:text-white/25"
            />
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-2.5 top-2.5 text-white/25"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </form>

          {/* Zoom bar */}
          <div className="flex bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg overflow-hidden">
            <button
              onClick={() => zoomBy(1.5)}
              className="p-2 hover:bg-white/[0.06] active:bg-white/10 text-white/50 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center text-sm font-bold"
            >
              +
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={() => zoomBy(1 / 1.5)}
              className="p-2 hover:bg-white/[0.06] active:bg-white/10 text-white/50 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center text-sm font-bold"
            >
              &minus;
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button
              onClick={() => fitAll(true)}
              className="p-2 hover:bg-white/[0.06] active:bg-white/10 text-white/50 hover:text-white min-w-[40px] min-h-[40px] flex items-center justify-center text-[10px] font-semibold tracking-wider"
            >
              FIT
            </button>
          </div>
        </div>
      </header>

      {/* ════════ Mobile search overlay ════════ */}
      {searchOpen && (
        <div className="absolute top-14 left-2 right-2 z-20 sm:hidden">
          <form onSubmit={doSearch} className="relative">
            <input
              type="text"
              placeholder="Search nodes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="bg-black/90 backdrop-blur border border-white/[0.06] rounded-lg pl-9 pr-12 py-3 text-sm focus:outline-none focus:border-cyan-500/40 w-full text-white/70 placeholder:text-white/25"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-3.5 text-white/25"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 top-1.5 p-2 text-white/30 hover:text-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SVG — the universe
          ════════════════════════════════════════════════════ */}
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => {
          const tag = (e.target as Element).tagName;
          if (tag === "svg" || tag === "rect") {
            setPanelOpen(false);
            setSearchOpen(false);
          }
        }}
      >
        <defs>
          {/* Deep space radial background */}
          <radialGradient id="deep-space" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0d1117" />
            <stop offset="100%" stopColor="#010409" />
          </radialGradient>

          {/* Planet gradients — off-centre highlight = 3-D sphere */}
          {(Object.keys(PLANET_PALETTE) as NodeType[]).map((t) => (
            <radialGradient
              key={t}
              id={`planet-${t}`}
              cx="35%"
              cy="30%"
              r="65%"
            >
              <stop offset="0%" stopColor={PLANET_PALETTE[t].light} />
              <stop offset="55%" stopColor={PLANET_PALETTE[t].main} />
              <stop offset="100%" stopColor={PLANET_PALETTE[t].dark} />
            </radialGradient>
          ))}

          {/* Nebula fills */}
          <radialGradient id="neb-a">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="neb-b">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="neb-c">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#deep-space)" />

        {/* ──── Parallax layer : FAR stars ──── */}
        <g transform={`translate(${tx * 0.06},${ty * 0.06})`}>
          {stars.far.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.color}
              opacity={s.opacity}
            >
              {s.twinkle && (
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${s.opacity * 0.15};${s.opacity}`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* ──── Parallax layer : MID stars ──── */}
        <g transform={`translate(${tx * 0.2},${ty * 0.2})`}>
          {stars.mid.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.color}
              opacity={s.opacity}
            >
              {s.twinkle && (
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${s.opacity * 0.1};${s.opacity}`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* ──── Parallax layer : NEAR stars ──── */}
        <g transform={`translate(${tx * 0.5},${ty * 0.5})`}>
          {stars.near.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.color}
              opacity={s.opacity}
            >
              {s.twinkle && (
                <animate
                  attributeName="opacity"
                  values={`${s.opacity};${s.opacity * 0.08};${s.opacity}`}
                  dur={`${s.dur}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </g>

        {/* ════════════════════════════════════════════════
            Main content layer — moves 1:1 with user input
            ════════════════════════════════════════════════ */}
        <g transform={`translate(${tx},${ty}) scale(${k})`}>
          {/* Nebula clouds */}
          <circle
            cx={sizeRef.current.w / 2 - 200}
            cy={sizeRef.current.h / 2 - 100}
            r={700}
            fill="url(#neb-a)"
          />
          <circle
            cx={sizeRef.current.w / 2 + 400}
            cy={sizeRef.current.h / 2 + 250}
            r={500}
            fill="url(#neb-b)"
          />
          <circle
            cx={sizeRef.current.w / 2 + 80}
            cy={sizeRef.current.h / 2 - 380}
            r={420}
            fill="url(#neb-c)"
          />

          {/* ── Entanglement lines : outer glow ── */}
          <g>
            {simRef.current.links.map((link, i) => {
              const s = link.source as CanonObject;
              const t = link.target as CanonObject;
              if (s.x == null || s.y == null || t.x == null || t.y == null)
                return null;
              const col =
                PLANET_PALETTE[s.type as NodeType]?.main ?? "#334155";
              return (
                <line
                  key={i}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={col}
                  strokeWidth={4}
                  opacity={0.06}
                />
              );
            })}
          </g>

          {/* ── Entanglement lines : bright core ── */}
          <g>
            {simRef.current.links.map((link, i) => {
              const s = link.source as CanonObject;
              const t = link.target as CanonObject;
              if (s.x == null || s.y == null || t.x == null || t.y == null)
                return null;
              const col =
                PLANET_PALETTE[s.type as NodeType]?.main ?? "#334155";
              return (
                <line
                  key={i}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={col}
                  strokeWidth={0.8}
                  opacity={k < 0.3 ? 0.2 : 0.4}
                />
              );
            })}
          </g>

          {/* ── Planets ── */}
          <g>
            {simRef.current.nodes.map((node) => {
              if (node.x == null || node.y == null) return null;
              const type = node.type as NodeType;
              const r = PLANET_R[type] ?? 10;
              const pal = PLANET_PALETTE[type];
              const selected = sel?.id === node.id;
              const hitR = Math.max(r * 2, 24);

              return (
                <g key={node.id}>
                  {/* Atmospheric glow — large faint halo */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r * 3}
                    fill={pal.main}
                    opacity={0.045}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r * 1.8}
                    fill={pal.main}
                    opacity={0.08}
                  />

                  {/* Temperature ring */}
                  {node.temp_primary !== "NEUTRAL" &&
                    TEMP_RING_COLOR[node.temp_primary] && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={r + 4}
                        fill="none"
                        stroke={TEMP_RING_COLOR[node.temp_primary]}
                        strokeWidth={1.5}
                        opacity={0.3}
                      />
                    )}

                  {/* Planet sphere (3-D gradient) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={`url(#planet-${type})`}
                  />

                  {/* Specular highlight — top-left glint */}
                  <circle
                    cx={node.x - r * 0.25}
                    cy={node.y - r * 0.3}
                    r={r * 0.3}
                    fill="white"
                    opacity={0.14}
                  />

                  {/* Selection pulse */}
                  {selected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 6}
                      fill="none"
                      stroke="white"
                      strokeWidth={1.5}
                    >
                      <animate
                        attributeName="r"
                        values={`${r + 4};${r + 12};${r + 4}`}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.7;0.15;0.7"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* ── Semantic zoom labels ── */}
                  {/* ID — fades in at k ≥ 0.3 */}
                  {k >= 0.3 && (
                    <text
                      x={node.x}
                      y={node.y + r + 16}
                      textAnchor="middle"
                      fill="white"
                      opacity={Math.min(0.7, (k - 0.3) * 2.5)}
                      fontSize={11}
                      fontFamily="ui-monospace, monospace"
                      fontWeight="600"
                    >
                      {node.id}
                    </text>
                  )}
                  {/* Name — fades in at k ≥ 0.55 */}
                  {k >= 0.55 && (
                    <text
                      x={node.x}
                      y={node.y + r + 30}
                      textAnchor="middle"
                      fill="white"
                      opacity={Math.min(0.5, (k - 0.55) * 2)}
                      fontSize={10}
                      fontFamily="system-ui, sans-serif"
                    >
                      {node.name}
                    </text>
                  )}
                  {/* One-liner — appears at k ≥ 1.2 */}
                  {k >= 1.2 && (
                    <text
                      x={node.x}
                      y={node.y + r + 44}
                      textAnchor="middle"
                      fill="white"
                      opacity={Math.min(0.35, (k - 1.2) * 1.5)}
                      fontSize={8}
                      fontFamily="system-ui, sans-serif"
                      fontStyle="italic"
                    >
                      {node.one_liner.length > 60
                        ? node.one_liner.slice(0, 57) + "…"
                        : node.one_liner}
                    </text>
                  )}

                  {/* Invisible hit target — larger than the planet */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={hitR}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNode(node);
                    }}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* ════════ Detail Panel ════════ */}
      <div
        className={`
        absolute z-20 transition-transform duration-300 ease-out
        inset-x-0 bottom-0 top-auto max-h-[55vh]
        sm:inset-x-auto sm:right-4 sm:left-auto sm:top-14 sm:bottom-4 sm:w-96 sm:max-h-none
        bg-black/80 backdrop-blur-xl rounded-t-2xl sm:rounded-xl border border-white/[0.08] shadow-2xl flex flex-col
        ${panelOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-[120%]"}
      `}
      >
        {sel && (
          <>
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-start px-4 pb-3 pt-1 sm:p-5 border-b border-white/[0.06]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono border ${TYPE_COLORS[sel.type]?.border} ${TYPE_COLORS[sel.type]?.bg} ${TYPE_COLORS[sel.type]?.text}`}
                  >
                    {sel.type}
                  </span>
                  <span className="text-xs text-white/35 font-mono">
                    {sel.id}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white truncate">
                  {sel.name}
                </h2>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-white/35 hover:text-white p-2 rounded hover:bg-white/[0.06] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 -mr-1"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:p-5 space-y-3 sm:space-y-5 custom-scrollbar">
              {/* Temperature & dim cap */}
              <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">
                <div>
                  <span className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider block mb-0.5">
                    Temperature
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${TEMP_COLORS[sel.temp_primary]}`}
                    />
                    <span className="text-sm font-semibold">
                      {sel.temp_primary}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider block mb-0.5">
                    Dim Cap
                  </span>
                  <span className="text-sm font-semibold font-mono text-cyan-400">
                    {sel.dim_cap}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                  One Liner
                </h3>
                <p className="text-white/60 text-sm italic border-l-2 border-white/10 pl-3">
                  &ldquo;{sel.one_liner}&rdquo;
                </p>
              </div>

              {sel.description && (
                <div>
                  <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                    Description
                  </h3>
                  <p className="text-white/60 text-sm">{sel.description}</p>
                </div>
              )}

              {sel.constraints.length > 0 && (
                <div>
                  <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                    Constraints
                  </h3>
                  <ul className="space-y-1">
                    {sel.constraints.map((c, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-white/60"
                      >
                        <span className="text-emerald-400 mt-0.5 shrink-0">
                          &#10003;
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sel.reads_tokens.length > 0 && (
                <div>
                  <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                    Reads Tokens
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {sel.reads_tokens.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/20 text-emerald-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sel.writes_tokens.length > 0 && (
                <div>
                  <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                    Writes Tokens
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {sel.writes_tokens.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950/40 border border-violet-800/20 text-violet-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sel.links.length > 0 && (
                <div>
                  <h3 className="text-[10px] sm:text-xs text-white/35 uppercase tracking-wider mb-1">
                    Connections
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {sel.links.map((lid) => {
                      const ln = simRef.current.nodes.find(
                        (n) => n.id === lid,
                      );
                      if (!ln) return null;
                      return (
                        <button
                          key={lid}
                          onClick={() => selectNode(ln)}
                          className="text-xs font-mono px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-white/50 transition-colors min-h-[36px] flex items-center"
                        >
                          &rarr; {lid}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ════════ Legend ════════ */}
      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 z-10 bg-black/50 backdrop-blur border border-white/[0.06] rounded-lg p-1.5 sm:p-2.5">
        <div className="flex flex-wrap gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-white/50">
          {(["Layer", "Protocol", "Token", "Receipt", "Gate"] as NodeType[]).map(
            (t) => (
              <span key={t} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: PLANET_PALETTE[t].main }}
                />
                {t}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
