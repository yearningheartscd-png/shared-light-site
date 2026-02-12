import Link from "next/link";

/**
 * /arenas — Interaction Spaces (L6)
 *
 * Future: Role activation, card system, constrained interactions.
 * Currently: Placeholder scaffold. No complex logic.
 */
export default function ArenasPage() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Interaction Spaces</h1>
        <p className="text-sm text-slate-400 mb-6">
          Constrained containers where participants interact under stability safeguards.
          Coming in a future update.
        </p>
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500">
            This feature requires authentication, access level verification,
            and pacing controls. It will be gated by contributor access.
          </p>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to Atlas
        </Link>
      </div>
    </div>
  );
}
