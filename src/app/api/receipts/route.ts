import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/receipts — List user's receipts (auth required)
 * POST /api/receipts — Create a new receipt (auth required)
 *
 * A receipt is an objective summary of a session:
 *   what changed, what closed, what's next.
 * No identity narratives. No scoring. Structures only.
 */

export async function GET() {
  // TODO: Implement with Supabase auth check + query
  return NextResponse.json({
    receipts: [],
    message: "Auth required — Supabase not yet connected",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Validate required fields
  if (!body.closure_code || !["DONE12", "LOCK11"].includes(body.closure_code)) {
    return NextResponse.json(
      { error: "closure_code is required and must be DONE12 or LOCK11." },
      { status: 400 }
    );
  }

  // TODO: Implement with Supabase auth check + insert
  return NextResponse.json(
    {
      message: "Receipt creation stub — Supabase not yet connected",
      received: {
        closure_code: body.closure_code,
        title: body.title || "Session Receipt",
        temp_peak: body.temp_peak || "COOL",
        dim_cap_used: body.dim_cap_used || "T1",
        changes: body.changes || [],
        closed_items: body.closed_items || [],
        next_items: body.next_items || [],
      },
    },
    { status: 201 }
  );
}
