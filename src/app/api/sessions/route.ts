import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sessions — List user's sessions (auth required)
 * POST /api/sessions — Create a new session (auth required)
 *
 * Stub: full implementation requires Supabase auth + DB.
 * Currently returns placeholder to confirm route exists.
 */

export async function GET() {
  // TODO: Implement with Supabase auth check + query
  return NextResponse.json({ sessions: [], message: "Auth required — Supabase not yet connected" });
}

export async function POST(request: NextRequest) {
  // TODO: Implement with Supabase auth check + insert
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    {
      message: "Session creation stub — Supabase not yet connected",
      received: body,
    },
    { status: 201 }
  );
}
