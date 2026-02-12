import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/patterns — List user's patterns (auth required)
 * POST /api/patterns — Create a new pattern (auth required)
 *
 * A pattern is a reusable structure extracted from receipts.
 * No identity narratives. No scoring. Structures only.
 */

export async function GET() {
  // TODO: Implement with Supabase auth check + query
  return NextResponse.json({
    patterns: [],
    message: "Auth required — Supabase not yet connected",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "name is required." },
      { status: 400 }
    );
  }

  const validTypes = ["structural", "procedural", "constraint"];
  if (body.pattern_type && !validTypes.includes(body.pattern_type)) {
    return NextResponse.json(
      { error: "pattern_type must be structural, procedural, or constraint." },
      { status: 400 }
    );
  }

  // TODO: Implement with Supabase auth check + insert
  return NextResponse.json(
    {
      message: "Pattern creation stub — Supabase not yet connected",
      received: {
        name: body.name,
        description: body.description || "",
        pattern_type: body.pattern_type || "structural",
        tags: body.tags || [],
      },
    },
    { status: 201 }
  );
}
