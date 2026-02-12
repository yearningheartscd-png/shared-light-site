import { getNodesByType, TEMP_COLORS, TYPE_COLORS } from "@/data/canon";

export default function ProtocolsPage() {
  const protocols = getNodesByType("Protocol");

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Spine Protocols</h1>
          <p className="text-sm sm:text-base text-slate-400">Core constraint protocols that govern the system. TRUE-language — internal only.</p>
        </div>

        <div className="space-y-4">
          {protocols.map((p) => (
            <div key={p.id} className={`bg-slate-900/30 border ${TYPE_COLORS.Protocol.border}/30 rounded-xl p-4 sm:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-violet-400 bg-violet-950/50 px-2 py-0.5 rounded">{p.id}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${TEMP_COLORS[p.temp_primary]}`} />
                      <span className="text-xs text-slate-500">{p.temp_primary}</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">{p.dim_cap}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{p.name}</h2>
                </div>
              </div>

              <p className="text-sm text-slate-300 italic border-l-2 border-violet-500/30 pl-3 mb-4">
                &ldquo;{p.one_liner}&rdquo;
              </p>

              <p className="text-sm text-slate-400 mb-4">{p.description}</p>

              {p.constraints.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Constraints</h3>
                  <ul className="space-y-1">
                    {p.constraints.map((c, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                {p.reads_tokens.length > 0 && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider">Reads</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.reads_tokens.map(t => (
                        <span key={t} className="font-mono px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/30 text-emerald-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.writes_tokens.length > 0 && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider">Writes</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.writes_tokens.map(t => (
                        <span key={t} className="font-mono px-1.5 py-0.5 rounded bg-violet-950/50 border border-violet-800/30 text-violet-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.links.length > 0 && (
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider">Links</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.links.map(l => (
                        <span key={l} className="font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
