// Canon data loader — abstraction over local JSON vs Supabase
// In development or when Supabase is not configured: loads from canon.json
// In production with Supabase: fetches from the database

import { canonData as localCanon } from "@/data/canon";
import type { CanonObject } from "@/data/canon";

export interface CanonData {
  meta: {
    schema_version: string;
    generated_at: string;
    notes: string[];
  };
  objects: CanonObject[];
}

/**
 * Load canon data. Always returns data — falls back to local JSON
 * if Supabase is not configured or the fetch fails.
 */
export async function loadCanonData(): Promise<CanonData> {
  // Try Supabase first if configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key);

      const [objectsResult, metaResult] = await Promise.all([
        supabase.from("canon_objects").select("*"),
        supabase.from("canon_meta").select("*").order("imported_at", { ascending: false }).limit(1),
      ]);

      if (objectsResult.data && objectsResult.data.length > 0) {
        const meta = metaResult.data?.[0] ?? localCanon.meta;
        return {
          meta: {
            schema_version: meta.schema_version ?? localCanon.meta.schema_version,
            generated_at: meta.generated_at ?? localCanon.meta.generated_at,
            notes: meta.notes ?? localCanon.meta.notes,
          },
          objects: objectsResult.data as CanonObject[],
        };
      }
    } catch {
      // Supabase fetch failed — fall back to local
    }
  }

  // Fallback: local JSON
  return {
    meta: localCanon.meta,
    objects: localCanon.objects,
  };
}

/**
 * Synchronous accessor — always returns local JSON.
 * Use this for static pages and components that can't await.
 */
export function getLocalCanon(): CanonData {
  return {
    meta: localCanon.meta,
    objects: localCanon.objects,
  };
}
