import { NextResponse } from "next/server";
import { loadCanonData } from "@/lib/canon-loader";

/**
 * GET /api/canon
 * Returns all canon objects. Falls back to local JSON if Supabase is unavailable.
 */
export async function GET() {
  try {
    const data = await loadCanonData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load canon data" },
      { status: 500 }
    );
  }
}
