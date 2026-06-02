# Phase 2: Database & SaaS Schema Update - COMPLETED ✓

## Summary
Successfully implemented SaaS-ready database schema with robust RLS policies, centralized TypeScript types, and verified Supabase SSR client configuration.

---

## Tasks Completed

### 1. ✓ **Created SaaS Schema SQL Migration**

**File:** `migrations/003_saas_schema_update.sql`

#### New SaaS-Specific Columns:
- `guilds.guild_url` (TEXT, UNIQUE, NULLABLE)
  - Custom invite links for SaaS functionality
  - Indexed for fast lookups
  - Nullable to support old guilds without custom URLs

- `guilds.trial_ends_at` (TIMESTAMP WITH TIME ZONE, NULLABLE)
  - Supports 14-day free trial SaaS logic
  - Indexed for SaaS subscription management
  - Nullable for grandfathered accounts

#### Robust RLS Policies Implemented:

**PROFILES Table (7 policies):**
1. ✓ **SELECT** - Users can view profiles in their guild or are admins
2. ✓ **UPDATE** - Users can update their own profile
3. ✓ **UPDATE** - Admins can update profiles in their guild
4. ✓ **INSERT** - Users can create their own profile during registration
5. ✓ **INSERT** - Admins can create profiles for their guild
6. ✓ **DELETE** - Users can delete their own profile
7. ✓ **DELETE** - Admins can delete profiles in their guild

**GUILDS Table (4 policies):**
1. ✓ **SELECT** - Guild members can view their own guild or admins can view any
2. ✓ **UPDATE** - Only guild owner/admins can modify guild
3. ✓ **DELETE** - Only guild owner/admins can delete guild
4. ✓ **INSERT** - Users can create their own guild

**Multi-Tenant Security:**
- All policies use `auth.uid()` from Supabase Auth
- Guild-scoped access ensures users only see data for their guild
- Admin system uses separate `admins` table for privilege elevation
- System admins can override all restrictions

#### Trigger Functions:
- ✓ `update_updated_at_column()` - Auto-updates `updated_at` timestamps on INSERT/UPDATE
- ✓ Applied to both `profiles` and `guilds` tables

---

### 2. ✓ **Updated TypeScript Interfaces/Types**

#### New Centralized Types File:
**File:** `types/database.ts`
- ✓ `Profile` - Complete user profile with all database fields
- ✓ `Guild` - Guild with SaaS fields (guild_url, trial_ends_at)
- ✓ `Admin` - Admin privilege representation
- ✓ `Session` - Current user session state
- ✓ `Party` - Party grouping type
- ✓ `LeaderboardProfile` - Leaderboard subset

#### Updated Component Types:
- ✓ `app/admin/dashboard/GuildsApprovalTable.tsx` - Guild interface enhanced with:
  - `guild_url?: string | null`
  - `trial_ends_at?: string | null`
  - `status: 'pending' | 'approved' | 'rejected'` (typed)
  - `updated_at?: string`

- ✓ `components/Dashboard.tsx` - Profile type expanded with:
  - `email?: string | null`
  - `guild_id?: string | null`
  - `created_at?: string`
  - `updated_at?: string`
  - `last_stat_update?: string`
  - All database fields properly typed

---

### 3. ✓ **Verified & Updated Supabase SSR Setup**

#### Status Check:
- ✓ `@supabase/ssr@0.10.3` - Already installed
- ✓ `@supabase/supabase-js@2.105.4` - Already installed
- ✓ No additional package installation needed

#### Updated Server Client:
**File:** `lib/supabase/server.ts`

```typescript
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(...)
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: {...} }
  )
}
```

**Features:**
- ✓ Proper TypeScript support with `<Database>` generic
- ✓ Cookie management through `next/headers`
- ✓ Service role key fallback for admin operations
- ✓ Comprehensive JSDoc comments for Phase 3 implementation
- ✓ RLS-respecting anon key for secure user operations

#### Updated Browser Client:
**File:** `lib/supabase/client.ts`

```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Features:**
- ✓ Proper TypeScript support with `<Database>` generic
- ✓ localStorage-based auth state management
- ✓ RLS policy compliance
- ✓ Client-side usage documentation

#### New Supabase Type Definitions:
**File:** `types/supabase.ts`

```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {...}
      guilds: {...}
      admins: {...}
    }
    Enums: {
      profile_role: 'admin' | 'member'
      guild_status: 'pending' | 'approved' | 'rejected'
      admin_role: 'admin' | 'super_admin'
    }
  }
}
```

**Contents:**
- ✓ Full Table definitions with Row/Insert/Update types
- ✓ Enum definitions for TypeScript safety
- ✓ All three core tables (profiles, guilds, admins)
- ✓ Matches migration schema exactly

---

## Database Schema Summary

### After Phase 2:

#### profiles table:
```
id (UUID) → FK auth.users(id) [ON DELETE CASCADE]
uid_game (TEXT, UNIQUE)
email (TEXT, NULLABLE)
display_name (TEXT)
job_name (TEXT)
role ('admin' | 'member')
guild_id (UUID) → FK guilds(id)
avatar_url (TEXT)
p_atk, m_atk, p_def, m_def, p_dmg, m_dmg, p_reduc, m_reduc (INT)
pvp_dmg, pvp_reduc (INT)
party_id, slot_index (INT, NULLABLE)
is_on_leave (BOOLEAN)
created_at, updated_at (TIMESTAMP)
last_stat_update (TIMESTAMP, NULLABLE)

RLS: ✓ 7 policies
Indexes: ✓ guild_id, uid_game
```

#### guilds table:
```
id (UUID, PK)
owner_id (UUID) → FK auth.users(id)
name (TEXT)
server_name (TEXT)
status ('pending' | 'approved' | 'rejected')
guild_url (TEXT, UNIQUE, NULLABLE) ← NEW
trial_ends_at (TIMESTAMP WITH TIME ZONE, NULLABLE) ← NEW
created_at, updated_at (TIMESTAMP)

RLS: ✓ 4 policies
Indexes: ✓ guild_url, trial_ends_at, owner_id
```

#### admins table:
```
id (UUID) → FK auth.users(id) [ON DELETE CASCADE]
email (TEXT, UNIQUE, NULLABLE)
display_name (TEXT, NULLABLE)
role ('admin' | 'super_admin')
created_at, updated_at (TIMESTAMP)

No RLS (admin table itself is protected by structure)
Indexes: ✓ id
```

---

## Environment Variables Required

For Phase 2 & 3 to work, ensure your `.env.local` contains:

```bash
# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Required for admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional but recommended
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Type Safety Improvements

### Before Phase 2:
❌ Scattered type definitions in components
❌ No centralized database schema types
❌ Missing SaaS-specific fields
❌ Untyped Supabase clients

### After Phase 2:
✓ Centralized `types/database.ts` with all DB types
✓ Typed `types/supabase.ts` for Database schema
✓ TypeScript generics on all Supabase clients
✓ All component types export from centralized location
✓ SaaS fields properly typed (guild_url, trial_ends_at)

---

## Files Modified/Created

### New Files:
- ✓ `migrations/003_saas_schema_update.sql` - SaaS schema & RLS policies
- ✓ `types/database.ts` - Centralized database type definitions
- ✓ `types/supabase.ts` - Supabase Database type definitions

### Updated Files:
- ✓ `lib/supabase/server.ts` - Enhanced with TypeScript & docs
- ✓ `lib/supabase/client.ts` - Enhanced with TypeScript & docs
- ✓ `app/admin/dashboard/GuildsApprovalTable.tsx` - Updated Guild type
- ✓ `components/Dashboard.tsx` - Updated Profile type

---

## Next Steps (Phase 3: Standard Auth Implementation)

### Phase 3 will implement:
1. **Login Page** - Email/password authentication using `signInWithPassword()`
2. **Register Page** - User signup using `signUp()`
3. **Middleware** - Session-based routing with Supabase Auth middleware
4. **OAuth Providers** - Google, GitHub authentication setup
5. **Password Reset** - Passwordless email reset flow
6. **Session Management** - Updated `getSession()` to use Supabase sessions
7. **Profile Creation** - Automatic profile creation on signup

### Files to create in Phase 3:
- `app/auth/callback/route.ts` - OAuth callback handler
- `app/auth/confirm/route.ts` - Email confirmation handler
- Updated `app/login/page.tsx` - Supabase login form
- Updated `app/register/page.tsx` - Supabase register form
- `app/auth/reset-password/page.tsx` - Password reset flow

---

## Current Application State

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ SaaS-Ready | All columns, indexes, RLS policies in place |
| TypeScript Types | ✅ Complete | Centralized, exported, type-safe |
| Supabase Clients | ✅ Verified | SSR clients properly configured |
| SSR Package | ✅ Installed | @supabase/ssr@0.10.3 ready |
| RLS Policies | ✅ Implemented | Multi-tenant, auth.uid() based |
| **Login/Register** | ⏳ Phase 3 | Standard Supabase Auth to be implemented |
| **Middleware** | ⏳ Phase 3 | Session protection to be added |
| **OAuth** | ⏳ Phase 3 | Providers to be configured |

---

## Verification Checklist

- [x] SaaS migration file created with guild_url and trial_ends_at
- [x] RLS policies implemented for multi-tenant security
- [x] RLS policies use auth.uid() for Supabase Auth compatibility
- [x] Guild type updated with new SaaS fields
- [x] Profile type updated with all database fields
- [x] Centralized types/database.ts created
- [x] Supabase Database type definitions created
- [x] Server client updated with TypeScript support
- [x] Browser client updated with TypeScript support
- [x] Clients properly configured for Phase 3
- [x] No compile errors in type system
- [x] All type imports work correctly

---

## Migration Execution Commands

To apply Phase 2 to your Supabase database, execute:

```sql
-- From migrations/003_saas_schema_update.sql
-- Step 1: Add SaaS columns
ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS guild_url TEXT UNIQUE;

ALTER TABLE public.guilds
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guilds_guild_url ON public.guilds(guild_url);
CREATE INDEX IF NOT EXISTS idx_guilds_trial_ends_at ON public.guilds(trial_ends_at);

-- Step 3: Enable RLS and apply policies
-- (See migration file for complete RLS policy definitions)
```

---

## Notes for Phase 3

### Database will be fully prepared with:
- ✓ Guild-scoped multi-tenant isolation via RLS
- ✓ Trial period tracking for SaaS business logic
- ✓ Custom invite links for guild growth
- ✓ Automatic timestamp management

### Phase 3 will leverage:
- ✓ `auth.uid()` from Supabase Auth
- ✓ RLS policies for automatic data filtering
- ✓ Typed Supabase clients for full type safety
- ✓ Session management via Supabase Auth

All groundwork is now in place for seamless Supabase Auth integration in Phase 3!
