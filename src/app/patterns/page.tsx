/**
 * /patterns — Pattern Store v1
 *
 * A pattern = reusable structure extracted from receipts.
 * No identity narratives. No scoring. Structures only.
 */

// Placeholder data for UI scaffolding
const placeholderPatterns = [
  {
    id: "pat-001",
    name: "Stability Check Pattern",
    description: "Standard entry verification sequence before session escalation.",
    pattern_type: "procedural",
    tags: ["entry", "verification", "stability"],
    created_at: "2026-02-12T10:00:00Z",
  },
  {
    id: "pat-002",
    name: "Session Closure Template",
    description: "Structured closure workflow: verify constraints, summarize changes, generate receipt.",
    pattern_type: "structural",
    tags: ["closure", "receipt", "template"],
    created_at: "2026-02-12T11:00:00Z",
  },
  {
    id: "pat-003",
    name: "Activity Downshift Rule",
    description: "When stability signals increase, reduce activity level and access tier automatically.",
    pattern_type: "constraint",
    tags: ["stability", "downshift", "automatic"],
    created_at: "2026-02-12T12:00:00Z",
  },
];

const typeColors: Record<string, string> = {
  structural: "text-cyan-400 bg-cyan-950/50 border-cyan-500/30",
  procedural: "text-violet-400 bg-violet-950/50 border-violet-500/30",
  constraint: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
};

export default function PatternsPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Pattern Store</h1>
            <p className="text-sm text-slate-400">Reusable structures extracted from session records</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6 text-sm text-slate-400">
          <p>Patterns are structures, not narratives. They describe reusable workflows, constraints, and templates — never identity stories or ideology.</p>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-white min-h-[36px]">All</button>
          <button className="text-xs px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-colors min-h-[36px]">Structural</button>
          <button className="text-xs px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-colors min-h-[36px]">Procedural</button>
          <button className="text-xs px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white transition-colors min-h-[36px]">Constraint</button>
        </div>

        {/* Pattern list */}
        <div className="space-y-3">
          {placeholderPatterns.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold text-sm sm:text-base">{p.name}</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${typeColors[p.pattern_type] || ""}`}>
                  {p.pattern_type}
                </span>
              </div>

              <p className="text-sm text-slate-400 mb-3">{p.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-600">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state hint */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Connect Supabase to create and store patterns.</p>
        </div>
      </div>
    </div>
  );
}
