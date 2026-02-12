import Link from "next/link";

/**
 * /receipts — Session receipt list
 *
 * A receipt = objective summary of a session:
 *   what changed, what closed, what's next.
 *
 * No identity scoring. No engagement metrics. Structures only.
 */

// Placeholder data for UI scaffolding (will be replaced by Supabase query)
const placeholderReceipts = [
  {
    id: "demo-001",
    title: "Atlas Exploration Session",
    closure_code: "DONE12",
    temp_peak: "COOL",
    dim_cap_used: "T1",
    changes: ["Navigated 12 nodes", "Explored 3 protocols"],
    closed_items: ["Session completed normally"],
    next_items: [],
    created_at: "2026-02-12T10:00:00Z",
  },
  {
    id: "demo-002",
    title: "Protocol Review Session",
    closure_code: "DONE12",
    temp_peak: "WARM",
    dim_cap_used: "T2",
    changes: ["Reviewed FSP-1 constraints", "Checked TLB packetization"],
    closed_items: ["All checklist items verified"],
    next_items: ["Follow up on drift bucket thresholds"],
    created_at: "2026-02-12T14:30:00Z",
  },
];

const closureColors: Record<string, string> = {
  DONE12: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30",
  LOCK11: "text-amber-400 bg-amber-950/50 border-amber-500/30",
};

const tempColors: Record<string, string> = {
  COOL: "bg-blue-500",
  WARM: "bg-orange-500",
  HOT: "bg-red-500",
};

export default function ReceiptsPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Session Records</h1>
            <p className="text-sm text-slate-400">Objective summaries of completed sessions</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6 text-sm text-slate-400">
          <p>Records show what changed, what closed, and what remains open. No identity data is stored.</p>
        </div>

        {/* Receipt list */}
        <div className="space-y-3">
          {placeholderReceipts.map((r) => (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className="block bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition-colors active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold text-sm sm:text-base">{r.title}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border shrink-0 ${closureColors[r.closure_code] || ""}`}>
                  {r.closure_code}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${tempColors[r.temp_peak] || "bg-slate-400"}`} />
                  <span>{r.temp_peak}</span>
                </div>
                <span className="font-mono text-cyan-400">{r.dim_cap_used}</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>

              {r.changes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.changes.map((c, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Empty state hint */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Connect Supabase to see real session records.</p>
        </div>
      </div>
    </div>
  );
}
