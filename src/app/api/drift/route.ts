import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/drift — Record a drift event (auth required)
 *
 * Body: { session_id, bucket: 'A'|'B'|'C'|'D'|'E', severity: 1-5 }
 *
 * Stub: drift detection heuristics are owned by Claude Code.
 * This route only handles persistence.
 */

export async function POST(request: NextRequest) {
  // TODO: Implement with Supabase auth check + insert
  const body = await request.json().catch(() => ({}));

  // Validate bucket
  const validBuckets = ["A", "B", "C", "D", "E"];
  if (!body.bucket || !validBuckets.includes(body.bucket)) {
    return NextResponse.json(
      { error: "Invalid bucket. Must be A, B, C, D, or E." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      message: "Drift event stub — Supabase not yet connected",
      received: body,
    },
    { status: 201 }
  );
}
