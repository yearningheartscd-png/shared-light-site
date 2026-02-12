# CURSOR_TASKS.md — Shared Light Atlas Phase 2 + Phase 3 Handoff

> **Generated**: 2026-02-12
> **Context**: Phase 1 is complete (canon sync, mobile, PWA, deploy prep). This doc defines all Phase 2 and Cursor-owned Phase 3 tasks.
> **Data Source**: `src/data/canon.json` (36 canon objects: 9 tokens, 6 protocols, 3 receipts, 6 gates, 12 layers)

---

## RULES (read these first, follow them always)

1. **Minimal diffs only.** Do not refactor unrelated files.
2. **One phase at a time.** Don't start the next phase until `npm run build` passes.
3. **No new jargon.** Public UI must use REAL language only.
4. **No "system activation" claims.** No guarantees, no metaphysics.
5. **No identity amplification features.** No follower counts, reputation scores, feeds, engagement loops.
6. **Always add acceptance criteria + a test check.**
7. **Stop if unclear.** Ask for the exact file path or screenshot.
8. **Do not rename routes or folders** that already exist.
9. **Do not rewrite large portions of the app.** Additive changes only.

## STOP CONDITIONS (revert immediately if you do any of these)

- Rewrite large portions of the app
- Rename existing folder structure
- Add a "social feed" or engagement feature
- Add reputations, leaderboards, or rankings
- Add metaphysical claims or "system activation" language
- Expose internal jargon/acronyms in public-facing routes
- Add scoring that could become "morality ranking"
- Add multi-user arbitration logic
- Claim to "guarantee coherence"

If you hit a stop condition: **revert, minimal diff only.**

## WHAT CURSOR SHOULD NOT FINALIZE (leave as interfaces/stubs)

- Drift detection engine heuristics (Claude Code owns this)
- Constraint enforcement logic beyond simple gating (Claude Code owns this)
- I3 packet creation/validation logic (Claude Code owns this)
- Any scoring or ranking system

---

## Current Stack

- **Next.js** 16.1.6 (App Router)
- **React** 19, **TypeScript** 5
- **Tailwind CSS** v4 (via PostCSS, `@import "tailwindcss"` in `globals.css`)
- **D3.js** 7.9.0
- **Package manager**: npm
- **Existing pages**: `/` (Home), `/atlas` (D3 visualizer), `/protocols`, `/layers`
- **Data**: `src/data/canon.json` → imported via `src/data/canon.ts` (types, helpers, colors)

---

## PHASE 2: Supabase Backend

### 2A. Supabase Client Setup

**Install:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Create `src/lib/supabase.ts`** (browser client):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Create `src/lib/supabase-server.ts`** (server client):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Environment variables** (add to `.env.local` and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See `.env.example` for template.

---

### 2B. Database Schema

**Create `supabase/migrations/001_initial_schema.sql`:**

```sql
-- Canon Objects (source of truth from canon.json)
CREATE TABLE canon_objects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Layer', 'Protocol', 'Token', 'Receipt', 'Gate', 'Artifact')),
  name TEXT NOT NULL,
  one_liner TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  temp_primary TEXT NOT NULL CHECK (temp_primary IN ('COOL', 'WARM', 'HOT', 'NEUTRAL')),
  dim_cap TEXT NOT NULL CHECK (dim_cap IN ('T0', 'T1', 'T2', 'T3', 'T4')),
  reads_tokens TEXT[] DEFAULT '{}',
  writes_tokens TEXT[] DEFAULT '{}',
  produces_receipts TEXT[] DEFAULT '{}',
  constraints TEXT[] DEFAULT '{}',
  links TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canon Links (derived from objects.links for graph queries)
CREATE TABLE canon_links (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES canon_objects(id),
  target_id TEXT NOT NULL REFERENCES canon_objects(id),
  UNIQUE(source_id, target_id)
);

-- Canon Metadata
CREATE TABLE canon_meta (
  id SERIAL PRIMARY KEY,
  schema_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  notes TEXT[] DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  access_role TEXT NOT NULL DEFAULT 'public' CHECK (access_role IN ('public', 'contributor', 'admin')),
  access_level INTEGER NOT NULL DEFAULT 0 CHECK (access_level >= 0 AND access_level <= 11),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  session_type TEXT NOT NULL DEFAULT 'browse',
  temp_peak TEXT DEFAULT 'COOL',
  dim_cap_used TEXT DEFAULT 'T1',
  drift_counts JSONB DEFAULT '{"A":0,"B":0,"C":0,"D":0,"E":0}',
  closure_code TEXT CHECK (closure_code IN ('DONE12', 'LOCK11', NULL)),
  receipt_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Drift Events
CREATE TABLE drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  user_id UUID REFERENCES user_profiles(id),
  bucket TEXT NOT NULL CHECK (bucket IN ('A', 'B', 'C', 'D', 'E')),
  severity INTEGER NOT NULL DEFAULT 1,
  auto_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I3 Packets
CREATE TABLE i3_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  sender_id UUID REFERENCES user_profiles(id),
  packet_type TEXT NOT NULL,
  temperature TEXT NOT NULL CHECK (temperature IN ('COOL', 'WARM', 'HOT')),
  content JSONB DEFAULT '{}',
  closure_status TEXT NOT NULL DEFAULT 'open' CHECK (closure_status IN ('open', 'closed', 'locked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE canon_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE canon_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE canon_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE i3_packets ENABLE ROW LEVEL SECURITY;

-- Public read for canon data
CREATE POLICY "Canon objects are publicly readable" ON canon_objects FOR SELECT USING (true);
CREATE POLICY "Canon links are publicly readable" ON canon_links FOR SELECT USING (true);
CREATE POLICY "Canon meta is publicly readable" ON canon_meta FOR SELECT USING (true);

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions: users can read/create their own
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can close own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);

-- Drift events: users can read/create for their sessions
CREATE POLICY "Users can view own drift events" ON drift_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create drift events" ON drift_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- I3 packets: users can read/create for their sessions
CREATE POLICY "Users can view own packets" ON i3_packets FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can create packets" ON i3_packets FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, access_role, access_level)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', 'public', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 2C. Auth

**Create `src/components/auth/AuthProvider.tsx`:**
- React context wrapping Supabase auth state
- Provides: `user`, `session`, `loading`, `signIn()`, `signOut()`
- Uses `onAuthStateChange` listener
- Wrap the app in this provider from `layout.tsx`

**Create `src/components/auth/LoginForm.tsx`:**
- Email input with magic link sign-in
- Optional Google OAuth button
- Styled to match existing dark theme (slate-900 cards, cyan accents)
- Min 44px tap targets for mobile
- Success/error states

**Create `src/middleware.ts`:**
```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Protect /contributor/* and /admin/* routes
  const { pathname } = request.nextUrl
  
  if (pathname.startsWith('/contributor') || pathname.startsWith('/admin')) {
    // Check auth, redirect to /login if not authenticated
    // Check access_role for /admin routes
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/contributor/:path*', '/admin/:path*']
}
```

**Create `src/app/login/page.tsx`:**
- Full-page login with LoginForm component
- Redirect to home after auth

**Role-based access:**
- `public`: Can view all public pages, REAL language only
- `contributor`: Can view TRUE language, create sessions
- `admin`: Full access, data management

---

### 2D. API Routes

**Create `src/app/api/canon/route.ts`:**
```typescript
// GET: Return all canon objects from Supabase
// Fallback: Return from canon.json in development
// Response: { meta, objects, links }
```

**Create `src/app/api/sessions/route.ts`:**
```typescript
// GET: List user's sessions (auth required)
// POST: Create new session (auth required)
// Body: { session_type, temp_initial?, dim_cap? }
```

**Create `src/app/api/sessions/[id]/close/route.ts`:**
```typescript
// POST: Close a session with receipt
// Body: { closure_code: 'DONE12' | 'LOCK11' }
// Creates R12 receipt record
```

**Create `src/app/api/drift/route.ts`:**
```typescript
// POST: Record drift event (auth required)
// Body: { session_id, bucket: 'A'|'B'|'C'|'D'|'E', severity }
// Auto-response logic based on count density
```

**Create `src/app/api/i3/route.ts`:**
```typescript
// GET: List packets for a session
// POST: Create I3 packet
// Body: { session_id, packet_type, temperature, content }
// Enforce: every packet must reach closed status
```

---

### 2E. Canon Data Migration

**Create `src/lib/canon-loader.ts`:**
```typescript
// Abstraction layer for loading canon data
// Development: import from canon.json
// Production: fetch from Supabase
// Export: loadCanonData() → Promise<CanonData>
```

**Create `scripts/seed-canon.ts`:**
```typescript
// Script to seed Supabase from canon.json
// 1. Read src/data/canon.json
// 2. Insert meta record
// 3. Insert all objects
// 4. Derive and insert all links
// Run: npx tsx scripts/seed-canon.ts
```

---

## PHASE 3 (Cursor Tasks Only)

### 3A. TRUE/REAL Membrane

**Create `src/lib/membrane.ts`:**

Translation map — TRUE internal terms to REAL public-facing terms:

| TRUE Term | REAL Term |
|-----------|-----------|
| TE-1 | Entry verification |
| CAP | Shared space rules |
| FSP-1 | Stability safeguards |
| TLB | Pacing controls |
| Janus Keyhole | Meaning boundary |
| Symbol Hygiene | Consistency checking |
| KayOS | Foundation layer |
| GEM Engine | Core rules |
| Mirror | Baseline practice |
| Drift Bucket | Stability signal |
| Temperature | Activity level |
| COOL/WARM/HOT | Low/Medium/High |
| DIM Cap | Access tier |
| DONE12 | Session complete |
| LOCK11 | Session paused |
| R12 | Session record |
| PROMOTE0-5 | Progress gate 0-5 |
| I3 Packet | Interaction unit |

**Create `src/components/LanguageProvider.tsx`:**
- React context: `language: 'TRUE' | 'REAL'`
- Default: 'REAL' for unauthenticated, 'TRUE' for contributors/admins
- Wrap app in this provider

**Create `src/components/MembraneText.tsx`:**
```tsx
// Usage: <MembraneText true="TE-1" real="Entry verification" />
// Reads from LanguageProvider context
// Renders the appropriate text based on auth/role
```

**Update public pages** to use `<MembraneText>` for all internal terms (Home, Layers, Protocols).

---

### 3C. Child Safety

**Create `src/lib/child-safety.ts`:**

Rules:
- Children (under 13): COOL temperature only, dim_cap = T1 max, no HOT content
- Teens (13-17): COOL/WARM only, dim_cap = T2 max
- Adults (18+): Full access per role
- No persistent identity stored for children
- No data collection beyond behavioral signals
- No engagement metrics for any age group

```typescript
export interface AgeGate {
  maxTemp: TempLevel;
  maxDimCap: DimCap;
  requiresConsent: boolean;
  allowedLayers: string[]; // L0, L1, L2 only for children
}

export function getAgeGate(age: number): AgeGate { ... }
export function isChildSafe(action: string, age: number): boolean { ... }
```

**Create `src/components/auth/ConsentGate.tsx`:**
- Parent/guardian consent UI for users under 18 accessing L2+
- Stores consent record (not identity)
- Must pass before accessing Mirror (L2) or any WARM/HOT content
- Styled consistently with existing dark theme

---

## Non-Negotiable Constraints

These apply to ALL code in the project:

1. **Public pages = REAL language only** — no protocol names, no internal terms visible to unauthenticated users
2. **No identity amplification** — no follower counts, no profiles, no reputation scores, no leaderboards
3. **No engagement optimization** — no view counts, no trending, no feed algorithms, no likes
4. **Closure discipline** — every session must end with DONE12 or LOCK11
5. **Return-to-baseline** as primary metric, not engagement
6. **Auto-downshift on instability** — FSP ladder (L0-L5)
7. **Child-safe and elder-safe by design** — see child safety rules above
8. **Non-extractive value model** — no ads, no data selling, no attention harvesting
9. **Argument immunity** — "We don't require belief. We test conditions and outcomes."

---

## File Structure After Phase 2 + 3 (Cursor)

```
src/
├── app/
│   ├── api/
│   │   ├── canon/route.ts          ← 2D
│   │   ├── drift/route.ts          ← 2D
│   │   ├── i3/route.ts             ← 2D
│   │   └── sessions/
│   │       ├── route.ts            ← 2D
│   │       └── [id]/close/route.ts ← 2D
│   ├── login/page.tsx              ← 2C
│   ├── atlas/page.tsx              (exists)
│   ├── layers/page.tsx             (exists)
│   ├── protocols/page.tsx          (exists)
│   └── page.tsx                    (exists)
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx        ← 2C
│   │   ├── ConsentGate.tsx         ← 3C
│   │   └── LoginForm.tsx           ← 2C
│   ├── LanguageProvider.tsx        ← 3A
│   ├── MembraneText.tsx            ← 3A
│   ├── AtlasVisualizer.tsx         (exists)
│   └── Sidebar.tsx                 (exists)
├── data/
│   ├── canon.json                  (exists — source of truth)
│   └── canon.ts                    (exists — types + helpers)
├── lib/
│   ├── canon-loader.ts             ← 2E
│   ├── child-safety.ts             ← 3C
│   ├── membrane.ts                 ← 3A
│   ├── supabase.ts                 ← 2A
│   └── supabase-server.ts          ← 2A
├── middleware.ts                    ← 2C
scripts/
└── seed-canon.ts                   ← 2E
supabase/
└── migrations/
    └── 001_initial_schema.sql      ← 2B
```

---

## How To Verify

After completing each task:

1. `npm run build` — must pass with zero errors
2. All existing routes must still render (`/`, `/atlas`, `/protocols`, `/layers`)
3. New routes must render (`/login`, API routes return proper JSON)
4. TypeScript strict mode — no `any` types, proper interfaces
5. Mobile: test responsive behavior at 375px width
6. Auth: test magic link flow end-to-end
7. Data: `canon.json` object count = 36 (9 tokens + 6 protocols + 3 receipts + 6 gates + 12 layers)
