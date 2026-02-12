"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { canonData, CanonObject, CanonLink, TYPE_COLORS, TEMP_COLORS, NodeType, TempLevel } from "@/data/canon";

const TYPE_ICON: Record<NodeType, string> = {
  Layer: "M12 2L2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5",
  Protocol: "M4 4h16v16H4z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3",
  Token: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777z",
  Receipt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8",
  Gate: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  Artifact: "M12 2L2 7l10 5 10-5-10-5Z",
};

function SvgIcon({ type, size = 14 }: { type: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={TYPE_ICON[type as NodeType] || TYPE_ICON.Layer} />
    </svg>
  );
}

export default function AtlasVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const sizeRef = useRef({ width: 800, height: 600 });

  const [selectedNode, setSelectedNode] = useState<CanonObject | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const simRef = useRef<{ nodes: CanonObject[]; links: CanonLink[] }>({ nodes: [], links: [] });
  const [, forceRender] = useState(0);

  useEffect(() => {
    const initialNodes: CanonObject[] = JSON.parse(JSON.stringify(canonData.objects));
    const initialLinks: CanonLink[] = initialNodes.flatMap((source) =>
      source.links
        .filter((targetId) => initialNodes.some((n) => n.id === targetId))
        .map((targetId) => ({ source: source.id, target: targetId }))
    );

    simRef.current.nodes = initialNodes;
    simRef.current.links = initialLinks;

    // Use container size instead of window size
    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;
    sizeRef.current = { width, height };

    const simulation = d3
      .forceSimulation(simRef.current.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(simRef.current.links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]).id((d: any) => d.id).distance(220))
      .force("charge", d3.forceManyBody().strength(-1200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(110).iterations(3))
      .on("tick", () => {
        forceRender((t) => t + 1);
      });

    const svg = d3.select(svgRef.current!);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));

    // ResizeObserver for container-based sizing
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          sizeRef.current = { width: w, height: h };
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      simulation.stop();
      resizeObserver?.disconnect();
    };
  }, []);

  const handleZoomIn = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3); };
  const handleZoomOut = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.3); };
  const handleFit = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.translate(0, 0).scale(0.8)); };

  const centerOnNode = useCallback(
    (node: CanonObject) => {
      if (!node || !svgRef.current || !zoomRef.current) return;
      const { width, height } = sizeRef.current;
      const k = Math.max(1.5, transform.k);
      const x = width / 2 - (node.x || 0) * k;
      const y = height / 2 - (node.y || 0) * k;
      d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(k));
    },
    [transform.k]
  );

  const handleNodeClick = useCallback(
    (node: CanonObject) => {
      setSelectedNode(node);
      setIsSidebarOpen(true);
      centerOnNode(node);
    },
    [centerOnNode]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase();
    const found = simRef.current.nodes.find((n) => n.id.toLowerCase().includes(query) || n.name.toLowerCase().includes(query));
    if (found) handleNodeClick(found);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#020617] text-slate-200 overflow-hidden">
      {/* Top Controls */}
      <header className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div>
            <span className="text-sm font-bold text-white">Atlas Visualizer</span>
            <span className="text-[10px] text-slate-500 font-mono ml-2">v{canonData.meta.schema_version}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2 sm:gap-3 items-center w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full sm:w-56 text-slate-200"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-slate-400">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </form>

          <div className="flex bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg overflow-hidden shrink-0">
            <button onClick={handleZoomIn} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" title="Zoom In">+</button>
            <div className="w-px bg-slate-700" />
            <button onClick={handleZoomOut} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" title="Zoom Out">&minus;</button>
            <div className="w-px bg-slate-700" />
            <button onClick={handleFit} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center text-xs" title="Fit">Fit</button>
          </div>
        </div>
      </header>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => { if ((e.target as Element).tagName === "svg" || (e.target as Element).tagName === "rect") setIsSidebarOpen(false); }}
      >
        <defs>
          <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="1" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
          <marker id="arrowhead" viewBox="-0 -5 10 10" refX="28" refY="0" orient="auto" markerWidth="6" markerHeight="6">
            <path d="M 0,-5 L 10,0 L 0,5" fill="#475569" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#bg-glow)" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          <g>
            {simRef.current.links.map((link, i) => {
              const s = link.source as CanonObject;
              const t = link.target as CanonObject;
              return (
                <line key={i} x1={s.x || 0} y1={s.y || 0} x2={t.x || 0} y2={t.y || 0} stroke="#334155" strokeWidth={1.5} strokeOpacity={transform.k < 0.6 ? 0.3 : 0.8} markerEnd="url(#arrowhead)" />
              );
            })}
          </g>
          <g>
            {simRef.current.nodes.map((node) => (
              <NodeElement key={node.id} node={node} zoom={transform.k} isSelected={selectedNode?.id === node.id} onClick={handleNodeClick} />
            ))}
          </g>
        </g>
      </svg>

      {/* Detail Panel — full width on mobile, sidebar on desktop */}
      <div className={`
        absolute z-20 transition-transform duration-300
        inset-x-0 bottom-0 top-auto h-[70vh] sm:h-auto
        sm:right-4 sm:left-auto sm:top-16 sm:bottom-4 sm:w-96
        bg-slate-900/95 backdrop-blur-xl rounded-t-xl sm:rounded-xl border border-slate-700 shadow-2xl flex flex-col
        ${isSidebarOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-[120%]"}
      `}>
        {selectedNode && (
          <>
            <div className="flex justify-between items-start p-4 sm:p-5 border-b border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${TYPE_COLORS[selectedNode.type]?.border} ${TYPE_COLORS[selectedNode.type]?.bg} ${TYPE_COLORS[selectedNode.type]?.text}`}>
                    {selectedNode.type}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{selectedNode.id}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedNode.name}</h2>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-2 rounded hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 custom-scrollbar">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div><span className="text-xs text-slate-500 uppercase tracking-wider block mb-0.5">Temperature</span><div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${TEMP_COLORS[selectedNode.temp_primary]}`} /><span className="text-sm font-semibold">{selectedNode.temp_primary}</span></div></div>
                <div className="text-right"><span className="text-xs text-slate-500 uppercase tracking-wider block mb-0.5">Dim Cap</span><span className="text-sm font-semibold font-mono text-cyan-400">{selectedNode.dim_cap}</span></div>
              </div>
              <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">One Liner</h3><p className="text-slate-300 text-sm italic border-l-2 border-slate-700 pl-3">&ldquo;{selectedNode.one_liner}&rdquo;</p></div>
              {selectedNode.description && <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</h3><p className="text-slate-300 text-sm">{selectedNode.description}</p></div>}
              {selectedNode.constraints.length > 0 && (
                <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Constraints</h3>
                  <ul className="space-y-1">{selectedNode.constraints.map((c, i) => (<li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>{c}</li>))}</ul>
                </div>
              )}
              {selectedNode.reads_tokens.length > 0 && (
                <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reads Tokens</h3><div className="flex flex-wrap gap-1">{selectedNode.reads_tokens.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/30 text-emerald-300">{t}</span>)}</div></div>
              )}
              {selectedNode.writes_tokens.length > 0 && (
                <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Writes Tokens</h3><div className="flex flex-wrap gap-1">{selectedNode.writes_tokens.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950 border border-violet-800/30 text-violet-300">{t}</span>)}</div></div>
              )}
              {selectedNode.links.length > 0 && (
                <div><h3 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Forward Links</h3>
                  <div className="flex flex-wrap gap-1.5">{selectedNode.links.map(linkId => { const ln = simRef.current.nodes.find(n => n.id === linkId); if (!ln) return null; return <button key={linkId} onClick={() => handleNodeClick(ln)} className="text-xs font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors min-h-[36px] flex items-center">&rarr; {linkId}</button>; })}</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-2 sm:p-3">
        <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Layer</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Protocol</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Token</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Receipt</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Gate</span>
        </div>
      </div>
    </div>
  );
}

function NodeElement({ node, zoom, isSelected, onClick }: { node: CanonObject; zoom: number; isSelected: boolean; onClick: (n: CanonObject) => void }) {
  const isMacro = zoom < 0.7;
  const isMid = zoom >= 0.7 && zoom < 1.4;
  const isMicro = zoom >= 1.4;

  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.Layer;
  const tempClass = TEMP_COLORS[node.temp_primary] || "bg-slate-400";
  const FO_W = 220, FO_H = 140;

  if (node.x === undefined || node.y === undefined) return null;

  return (
    <foreignObject x={node.x - FO_W / 2} y={node.y - FO_H / 2} width={FO_W} height={FO_H} style={{ overflow: "visible" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 8 }}>
        <div
          onClick={(e) => { e.stopPropagation(); onClick(node); }}
          className={`pointer-events-auto cursor-pointer relative flex flex-col items-center justify-center border-2 backdrop-blur-md transition-all duration-300 shadow-lg hover:brightness-125
            ${colors.border} ${colors.bg} ${colors.text}
            ${isSelected ? "ring-4 ring-white shadow-2xl z-10 scale-105" : ""}
            ${isMacro ? "w-6 h-6 rounded-full border-[3px]" : ""}
            ${isMid ? "w-24 h-8 rounded-full px-2" : ""}
            ${isMicro ? "w-52 rounded-xl p-3" : ""}
          `}
        >
          {(isMid || isMicro) && node.temp_primary !== "NEUTRAL" && (
            <div className={`absolute ${isMid ? "-right-1 -top-1 w-2.5 h-2.5" : "-right-1.5 -top-1.5 w-3.5 h-3.5"} rounded-full border border-slate-900 ${tempClass}`} />
          )}
          {isMacro && <div className={`w-full h-full rounded-full ${node.temp_primary !== "NEUTRAL" ? tempClass : ""}`} />}
          {isMid && (
            <div className="flex items-center justify-center gap-1.5 w-full">
              <SvgIcon type={node.type} size={12} />
              <span className="text-[10px] font-bold tracking-wider font-mono truncate">{node.id}</span>
            </div>
          )}
          {isMicro && (
            <div className="w-full flex flex-col">
              <div className="flex items-start justify-between mb-1.5 border-b border-current/20 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <SvgIcon type={node.type} size={14} />
                  <span className="text-[10px] font-mono opacity-80 uppercase tracking-widest">{node.type}</span>
                </div>
                <span className="text-[9px] font-mono px-1 rounded bg-black/20">{node.id}</span>
              </div>
              <div className="text-xs font-bold mb-1.5 leading-tight">{node.name}</div>
              <div className="text-[9px] leading-snug opacity-80 italic line-clamp-3">{node.one_liner}</div>
            </div>
          )}
        </div>
      </div>
    </foreignObject>
  );
}
