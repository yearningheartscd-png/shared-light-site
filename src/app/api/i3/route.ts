import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/i3 — List packets for a session
 * POST /api/i3 — Create an I3 packet (auth required)
 *
 * Body: { session_id, packet_type, temperature: 'COOL'|'WARM'|'HOT', content }
 *
 * Stub: I3 packet validation logic is owned by Claude Code.
 * This route only handles persistence + basic validation.
 */

export async function GET() {
  // TODO: Implement with Supabase query (filtered by session)
  return NextResponse.json({ packets: [], message: "Auth required — Supabase not yet connected" });
}

export async function POST(request: NextRequest) {
  // TODO: Implement with Supabase auth check + insert
  const body = await request.json().catch(() => ({}));

  // Basic validation
  const validTemps = ["COOL", "WARM", "HOT"];
  if (!body.temperature || !validTemps.includes(body.temperature)) {
    return NextResponse.json(
      { error: "Invalid temperature. Must be COOL, WARM, or HOT." },
      { status: 400 }
    );
  }

  if (!body.packet_type) {
    return NextResponse.json(
      { error: "packet_type is required." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      message: "I3 packet stub — Supabase not yet connected",
      received: body,
    },
    { status: 201 }
  );
}
