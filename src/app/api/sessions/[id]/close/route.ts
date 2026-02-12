import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/sessions/[id]/close — Close a session with receipt
 *
 * Body: { closure_code: 'DONE12' | 'LOCK11' }
 *
 * Creates an R12 receipt record and marks the session as closed.
 * Stub: full implementation requires Supabase auth + DB.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Validate closure code
  if (!body.closure_code || !["DONE12", "LOCK11"].includes(body.closure_code)) {
    return NextResponse.json(
      { error: "closure_code is required and must be DONE12 or LOCK11." },
      { status: 400 }
    );
  }

  // TODO: Implement with Supabase:
  // 1. Verify auth
  // 2. Verify session belongs to user
  // 3. Update session with closure_code + closed_at
  // 4. Create R12 receipt
  // 5. Return receipt

  return NextResponse.json(
    {
      message: "Session close stub — Supabase not yet connected",
      session_id: id,
      closure_code: body.closure_code,
    },
    { status: 200 }
  );
}
