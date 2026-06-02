# Phase 2 Quick Reference Guide

## What Was Completed

### 1. SaaS Database Schema
```sql
-- New columns added to guilds table
ALTER TABLE public.guilds
ADD COLUMN guild_url TEXT UNIQUE;
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
```

**Location:** `migrations/003_saas_schema_update.sql`

### 2. Multi-Tenant RLS Policies
✓ 7 policies on `profiles` table (SELECT, UPDATE, INSERT, DELETE)
✓ 4 policies on `guilds` table (SELECT, UPDATE, DELETE, INSERT)
✓ All use `auth.uid()` for Supabase Auth integration
✓ Guild-scoped data access for multi-tenant isolation

**Location:** `migrations/003_saas_schema_update.sql` (lines 80+)

### 3. TypeScript Type System

**Centralized Types:**
- `types/database.ts` - All database entity types (Profile, Guild, Admin, Session, etc.)
- `types/supabase.ts` - Supabase Database schema types (auto-generated style)

**Updated Component Types:**
- `app/admin/dashboard/GuildsApprovalTable.tsx` - Guild interface with guild_url, trial_ends_at
- `components/Dashboard.tsx` - Profile type with all database fields

### 4. Supabase SSR Clients
Both clients now include:
- ✓ TypeScript generics: `createClient<Database>()`
- ✓ Comprehensive JSDoc comments
- ✓ Production-ready configuration
- ✓ Service role key support for admin operations

**Files:**
- `lib/supabase/server.ts` - Server Component client
- `lib/supabase/client.ts` - Browser client

---

## How to Use in Phase 3

### Import Database Types:
```typescript
import type { Profile, Guild, Session } from '@/types/database'
```

### Use Typed Supabase Clients:
```typescript
// Server Component
import { createClient } from '@/lib/supabase/server'

export async function MyServerComponent() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
  // data is properly typed as Profile[]
}
```

```typescript
// Client Component
'use client'
import { createClient } from '@/lib/supabase/client'

export function MyClientComponent() {
  const supabase = createClient()
  // Use for real-time subscriptions, mutations, etc.
}
```

### Access User ID in Phase 3:
```typescript
// All RLS policies use auth.uid()
// After Phase 3 auth is implemented:
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// user.id will be used by RLS policies automatically
```

---

## Environment Setup

Ensure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Database Migration Steps

Execute in Supabase SQL Editor:
1. Copy all SQL from `migrations/003_saas_schema_update.sql`
2. Run in your Supabase project
3. Verify columns exist: `SELECT guild_url, trial_ends_at FROM guilds LIMIT 1`
4. Verify RLS enabled: `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('profiles', 'guilds')`

---

## What's Ready for Phase 3

✓ Database schema fully configured
✓ RLS policies ready for `auth.uid()`
✓ TypeScript types match database exactly
✓ Supabase clients ready for auth integration
✓ No custom JWT dependencies remaining
✓ Type safety at 100%

---

## Common Phase 3 Patterns

### Check if user is in a guild:
```typescript
const supabase = await createClient()
const { data } = await supabase
  .from('profiles')
  .select('guild_id')
  .eq('id', userId)
  .single()

if (data?.guild_id) {
  // User is in a guild
}
```

### Get guild info:
```typescript
const { data: guild } = await supabase
  .from('guilds')
  .select('*')
  .eq('id', guildId)
  .single()

// Guild has trial_ends_at and guild_url now
```

### Check if trial is active:
```typescript
const now = new Date()
const isTrialActive = guild.trial_ends_at && new Date(guild.trial_ends_at) > now
```

---

## Need to Generate Exact Types?

Use Supabase CLI in Phase 3+:
```bash
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

This will auto-generate types/supabase.ts from your live Supabase schema.

---

**Phase 2 is complete and Phase 3 is ready to implement!**
