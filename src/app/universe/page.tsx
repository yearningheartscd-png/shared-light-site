"use client";

import dynamic from "next/dynamic";

// Three.js must be client-only — no SSR
const UniverseMap = dynamic(
  () => import("@/components/universe/UniverseMap"),
  { ssr: false, loading: () => (
    <div className="w-full h-full bg-[#010409] flex items-center justify-center">
      <div className="text-white/30 font-mono text-sm">Loading universe…</div>
    </div>
  )},
);

export default function UniversePage() {
  return <UniverseMap />;
}
