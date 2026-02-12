"use client";

import dynamic from "next/dynamic";

const AtlasVisualizer = dynamic(() => import("@/components/AtlasVisualizer"), { ssr: false });

export default function AtlasPage() {
  return <AtlasVisualizer />;
}
