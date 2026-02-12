import Link from "next/link";

/**
 * /receipts/[id] — Single receipt detail view
 *
 * Shows: what changed, what closed, what remains open.
 * No identity data. No scoring. Structures only.
 */

// Placeholder detail (will be replaced by Supabase query)
const placeholderReceipt = {
  id: "demo-001",
  title: "Atlas Exploration Session",
  closure_code: "DONE12",
  temp_peak: "COOL",
  dim_cap_used: "T1",
  drift_summary: { A: 0, B: 0, C: 0, D: 0, E: 0 },
  changes: ["Navigated 12 nodes", "Explored 3 protocols", "Viewed 5 layers"],
  closed_items: ["Session completed normally", "All constraints satisfied"],
  next_items: ["Review remaining gate configurations"],
  notes: "",
  created_at: "2026-02-12T10:00:00Z",
};

const tempColors: Record<string, string> = {
  COOL: "bg-blue-500",
  WARM: "bg-orange-500",
  HOT: "bg-red-500",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // TODO: Fetch from Supabase by id
  const receipt = placeholderReceipt;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back link */}
        <Link href="/receipts" className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-4 inline-block">
          &larr; All records
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              receipt.closure_code === "DONE12"
                ? "text-emerald-400 bg-emerald-950/50 border-emerald-500/30"
                : "text-amber-400 bg-amber-950/50 border-amber-500/30"
            }`}>
              {receipt.closure_code}
            </span>
            <span className="text-xs text-slate-500 font-mono">{id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{receipt.title}</h1>
          <p className="text-sm text-slate-500">
            {new Date(receipt.created_at).toLocaleString()}
          </p>
        </div>

        {/* Status bar */}
        <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-0.5">Peak activity</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${tempColors[receipt.temp_peak] || "bg-slate-400"}`} />
              <span className="text-sm font-semibold text-white">{receipt.temp_peak}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-0.5">Access tier</span>
            <span className="text-sm font-semibold font-mono text-cyan-400">{receipt.dim_cap_used}</span>
          </div>
        </div>

        {/* Drift summary */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6">
          <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Stability signals</h2>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(receipt.drift_summary).map(([bucket, count]) => (
              <div key={bucket} className="text-center">
                <div className={`text-lg font-bold ${count > 0 ? "text-amber-400" : "text-slate-600"}`}>
                  {count}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{bucket}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Changes */}
        {receipt.changes.length > 0 && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-2">What changed</h2>
            <ul className="space-y-1">
              {receipt.changes.map((c, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-cyan-500 mt-0.5 shrink-0">&bull;</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Closed items */}
        {receipt.closed_items.length > 0 && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-2">What closed</h2>
            <ul className="space-y-1">
              {receipt.closed_items.map((c, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next items */}
        {receipt.next_items.length > 0 && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-4">
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-2">What remains open</h2>
            <ul className="space-y-1">
              {receipt.next_items.map((c, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">&rarr;</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
