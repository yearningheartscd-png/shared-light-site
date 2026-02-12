import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/receipts/[id] — Get a single receipt by ID (auth required)
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Implement with Supabase auth check + query
  return NextResponse.json({
    receipt: null,
    id,
    message: "Auth required — Supabase not yet connected",
  });
}
