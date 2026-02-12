import Link from "next/link";
import { canonData, getNodesByType } from "@/data/canon";

export default function Home() {
  const layers = getNodesByType("Layer");
  const protocols = getNodesByType("Protocol");
  const tokens = getNodesByType("Token");
  const receipts = getNodesByType("Receipt");
  const gates = getNodesByType("Gate");

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">
            Shared Light Atlas
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl">
            Constraint-driven infrastructure for coherent human coordination.
            No hierarchy. No persuasion. No identity-based influence.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 font-mono">
            Schema v{canonData.meta.schema_version} &middot; {canonData.objects.length} objects mapped
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-12">
          <Link href="/layers" className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-cyan-500/30 transition-colors active:scale-[0.98]">
            <p className="text-2xl sm:text-3xl font-bold text-cyan-400">{layers.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">Layers</p>
          </Link>
          <Link href="/protocols" className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-violet-500/30 transition-colors active:scale-[0.98]">
            <p className="text-2xl sm:text-3xl font-bold text-violet-400">{protocols.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">Protocols</p>
          </Link>
          <Link href="/atlas" className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/30 transition-colors active:scale-[0.98]">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">{tokens.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">Tokens</p>
          </Link>
          <Link href="/atlas" className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-amber-500/30 transition-colors active:scale-[0.98]">
            <p className="text-2xl sm:text-3xl font-bold text-amber-400">{receipts.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">Receipts</p>
          </Link>
          <Link href="/atlas" className="col-span-2 sm:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-rose-500/30 transition-colors active:scale-[0.98]">
            <p className="text-2xl sm:text-3xl font-bold text-rose-400">{gates.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">Gates</p>
          </Link>
        </div>

        {/* Core Principle */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-6 mb-8 sm:mb-12">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">Core Design Principle</h2>
          <blockquote className="text-base sm:text-xl text-slate-300 italic border-l-2 border-cyan-500 pl-3 sm:pl-4">
            &ldquo;We don&apos;t require belief. We test conditions and outcomes. If it doesn&apos;t work without a shared story, we don&apos;t ship it.&rdquo;
          </blockquote>
        </div>

        {/* What This Is / Is Not */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 sm:mb-4">What Shared Light IS</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>Coordination infrastructure (like an OS for collaboration)</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>Constraint-based coordination layer</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>Infrastructure for reducing coordination failure</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>Child-safe and elder-safe by design</li>
            </ul>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-3 sm:mb-4">What Shared Light IS NOT</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2"><span className="text-rose-500 mt-0.5 shrink-0">&#10007;</span>Not a religion, philosophy, or ideology</li>
              <li className="flex items-start gap-2"><span className="text-rose-500 mt-0.5 shrink-0">&#10007;</span>Not therapy or self-help</li>
              <li className="flex items-start gap-2"><span className="text-rose-500 mt-0.5 shrink-0">&#10007;</span>Not an engagement platform or persuasion engine</li>
              <li className="flex items-start gap-2"><span className="text-rose-500 mt-0.5 shrink-0">&#10007;</span>Not dependent on any founder, leader, or doctrine</li>
            </ul>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4">Explore</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Link href="/atlas" className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-cyan-500/30 transition-all group active:scale-[0.98]">
              <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition-colors">Atlas Visualizer</h3>
              <p className="text-xs text-slate-500">Interactive force-directed graph of the full constraint system with semantic zoom.</p>
            </Link>
            <Link href="/protocols" className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-violet-500/30 transition-all group active:scale-[0.98]">
              <h3 className="text-white font-semibold mb-1 group-hover:text-violet-400 transition-colors">Protocols</h3>
              <p className="text-xs text-slate-500">TE-1, CAP, FSP-1, TLB, Janus Keyhole, Symbol Hygiene — all spine protocols.</p>
            </Link>
            <Link href="/layers" className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-cyan-500/30 transition-all group active:scale-[0.98]">
              <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition-colors">Layers</h3>
              <p className="text-xs text-slate-500">L0 KayOS through L11 Archive/Myth. The 12-layer architecture stack.</p>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
