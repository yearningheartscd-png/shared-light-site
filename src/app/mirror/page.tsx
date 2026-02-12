import Link from "next/link";

/**
 * /mirror — Baseline Practice (L2)
 *
 * Future: Zero-Point Cards, baseline grounding, entry gate, closure discipline.
 * Currently: Placeholder scaffold. No complex logic.
 */
export default function MirrorPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Baseline Practice</h1>
        <p className="text-sm text-slate-400 mb-6">
          A grounding tool that trains return-to-baseline without identity capture.
          Coming in a future update.
        </p>
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500">
            This feature requires entry verification and session management.
            It will be available after authentication is connected.
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to Atlas
        </Link>
      </div>
    </div>
  );
}
