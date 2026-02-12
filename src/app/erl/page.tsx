import Link from "next/link";

/**
 * /erl — Coherence Dashboard
 *
 * Future: Real-time stability visualization via Supabase Realtime + D3.
 * Currently: Placeholder scaffold. No complex logic.
 */
export default function ERLPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Coherence Dashboard</h1>
        <p className="text-sm text-slate-400 mb-6">
          Real-time visualization of system stability signals.
          Coming in a future update.
        </p>
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500">
            This dashboard requires a connected database and real-time subscriptions.
            It will display stability patterns without identity data.
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to Atlas
        </Link>
      </div>
    </div>
  );
}
