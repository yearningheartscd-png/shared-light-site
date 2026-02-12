import { getNodesByType, TEMP_COLORS } from "@/data/canon";

export default function LayersPage() {
  const layers = getNodesByType("Layer");

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Architecture Layers</h1>
          <p className="text-sm sm:text-base text-slate-400">L0 through L11 — the full stack from KayOS substrate to Archive/Myth quarantine.</p>
        </div>

        <div className="space-y-4">
          {layers.map((layer) => (
            <div key={layer.id} className="bg-slate-900/30 border border-cyan-500/20 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-lg font-mono font-bold text-cyan-400">{layer.id}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${TEMP_COLORS[layer.temp_primary]}`} />
                      <span className="text-xs text-slate-500">{layer.temp_primary}</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">{layer.dim_cap}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{layer.name}</h2>
                </div>
              </div>

              <p className="text-sm text-slate-300 italic border-l-2 border-cyan-500/30 pl-3 mb-3">
                &ldquo;{layer.one_liner}&rdquo;
              </p>

              <p className="text-sm text-slate-400 mb-4">{layer.description}</p>

              {layer.constraints.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Constraints</h3>
                  <ul className="space-y-1">
                    {layer.constraints.map((c, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {layer.links.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Connected To</h3>
                  <div className="flex flex-wrap gap-1">
                    {layer.links.map(l => (
                      <span key={l} className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
