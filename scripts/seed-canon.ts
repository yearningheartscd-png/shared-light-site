/**
 * Seed Supabase with canon data from canon.json
 *
 * Usage:
 *   npx tsx scripts/seed-canon.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import canonJson from "../src/data/canon.json";

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log("Seeding canon data...");

  // 1. Insert metadata
  const { error: metaError } = await supabase.from("canon_meta").insert({
    schema_version: canonJson.meta.schema_version,
    generated_at: canonJson.meta.generated_at,
    notes: canonJson.meta.notes,
  });

  if (metaError) {
    console.error("Error inserting meta:", metaError.message);
  } else {
    console.log("  ✓ Canon metadata inserted");
  }

  // 2. Insert objects (upsert to allow re-running)
  const { error: objError, count } = await supabase
    .from("canon_objects")
    .upsert(
      canonJson.objects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        name: obj.name,
        one_liner: obj.one_liner,
        description: obj.description,
        temp_primary: obj.temp_primary,
        dim_cap: obj.dim_cap,
        reads_tokens: obj.reads_tokens,
        writes_tokens: obj.writes_tokens,
        produces_receipts: obj.produces_receipts,
        constraints: obj.constraints,
        links: obj.links,
      })),
      { onConflict: "id" }
    );

  if (objError) {
    console.error("Error inserting objects:", objError.message);
  } else {
    console.log(`  ✓ ${canonJson.objects.length} canon objects upserted`);
  }

  // 3. Derive and insert links
  const links: { source_id: string; target_id: string }[] = [];
  const objectIds = new Set(canonJson.objects.map((o) => o.id));

  for (const obj of canonJson.objects) {
    for (const targetId of obj.links) {
      if (objectIds.has(targetId)) {
        links.push({ source_id: obj.id, target_id: targetId });
      }
    }
  }

  // Clear existing links and re-insert
  await supabase.from("canon_links").delete().neq("id", 0);

  const { error: linkError } = await supabase
    .from("canon_links")
    .insert(links);

  if (linkError) {
    console.error("Error inserting links:", linkError.message);
  } else {
    console.log(`  ✓ ${links.length} canon links inserted`);
  }

  console.log("\nDone. Summary:");
  console.log(`  Objects: ${canonJson.objects.length}`);
  console.log(`  Links: ${links.length}`);
  console.log(`  Types: ${[...new Set(canonJson.objects.map((o) => o.type))].join(", ")}`);
}

seed().catch(console.error);
