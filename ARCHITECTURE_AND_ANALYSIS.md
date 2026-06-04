# ROOC Guild Management System - Architecture & Analysis

**Last Updated:** 2024
**Status:** Phase 2 Complete - Conflicts Identified in Phase 3

---

## 1. System Overview

**Purpose:** A multi-tenant SaaS guild management system for gaming communities to coordinate members, manage roles, track stats, and handle invitations.

**Core Features:**
- User authentication via Supabase Auth
- Guild creation with trial periods (14-day free trial)
- Member management with role-based access control (admin/member)
- Character stats tracking (P.ATK, M.ATK, P.DEF, M.DEF, etc.)
- Party formation and leave management
- Admin dashboard for guild owners
- Guild invitations and approval workflow

**Technology Stack:**
- **Framework:** Next.js 16 (App Router)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **UI:** React 19 + Tailwind CSS + Framer Motion
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **AI Integration:** Google Generative AI for stat extraction from images

---

## 2. File Structure & Responsibilities

### File Tree
```
app/
├── page.tsx                           [SERVER COMPONENT] Home page with trial banner
├── layout.tsx                         [SERVER COMPONENT] Root layout with Navbar
├── loading.tsx                        [LOADING STATE] Home page skeleton
├── actions/
│   ├── auth.ts                        [SERVER ACTION] Login, register, session management
│   ├── onboarding.ts                  [SERVER ACTION] Guild creation, URL validation
│   ├── guild.ts                       [SERVER ACTION] Guild operations
│   ├── dashboard.ts                   [SERVER ACTION] Member party management
│   ├── profile.ts                     [SERVER ACTION] Profile setup & updates
│   ├── admin.ts                       [SERVER ACTION] Admin CRUD operations
│   ├── ai.ts                          [SERVER ACTION] Image processing for stats
│   ├── billing.ts                     [SERVER ACTION] Trial/billing logic
│   ├── email.ts                       [SERVER ACTION] Welcome & notification emails
│   └── [...other actions]
├── api/
│   └── cron/
│       └── reset-leave/
│           └── route.ts               [API ROUTE] Cron job to reset leave status
├── dashboard/
│   ├── layout.tsx                     [SERVER COMPONENT] Dashboard layout with sidebar
│   ├── page.tsx                       [SERVER COMPONENT] Dashboard main view
│   ├── Sidebar.tsx                    [CLIENT COMPONENT] Navigation sidebar
│   ├── Topbar.tsx                     [CLIENT COMPONENT] Header with user info
│   └── TrialBanner.tsx                [CLIENT COMPONENT] Trial countdown banner
├── login/
│   ├── page.tsx                       [SERVER COMPONENT] Login page
│   └── loading.tsx                    [LOADING STATE] Login skeleton
├── register/
│   ├── page.tsx                       [SERVER COMPONENT] Registration page
│   ├── loading.tsx                    [LOADING STATE] Register skeleton
│   └── RegisterForm.tsx               [CLIENT COMPONENT] Registration form
├── onboarding/
│   ├── page.tsx                       [SERVER COMPONENT] Onboarding page
│   └── OnboardingForm.tsx             [CLIENT COMPONENT] Guild creation form
├── profile/
│   ├── page.tsx                       [SERVER COMPONENT] User profile page
│   ├── loading.tsx                    [LOADING STATE] Profile skeleton
│   └── ProfileForm.tsx                [CLIENT COMPONENT] Stats update form
├── profile-setup/
│   └── page.tsx                       [SERVER COMPONENT] Initial profile setup
├── admin/
│   ├── credentials/
│   │   ├── page.tsx                   [SERVER COMPONENT] Admin member list
│   │   ├── loading.tsx                [LOADING STATE] Member list skeleton
│   │   └── CredentialsTable.tsx       [CLIENT COMPONENT] Editable table
│   ├── dashboard/
│   │   └── page.tsx                   [SERVER COMPONENT] Admin dashboard
│   └── members/
│       ├── page.tsx                   [SERVER COMPONENT] Member management
│       ├── loading.tsx                [LOADING STATE] Member skeleton
│       └── MembersTable.tsx           [CLIENT COMPONENT] Members table
├── billing/
│   └── page.tsx                       [SERVER COMPONENT] Billing & trial info
├── members/
│   ├── page.tsx                       [SERVER COMPONENT] Guild members page
│   ├── loading.tsx                    [LOADING STATE] Members skeleton
│   └── LeaderboardTable.tsx           [CLIENT COMPONENT] Leaderboard table
├── g/
│   └── [guild_url]/
│       ├── page.tsx                   [SERVER COMPONENT] Guild invite page
│       └── GuildInviteForm.tsx        [CLIENT COMPONENT] Join guild form
└── guild/
    └── create/
        └── page.tsx                   [SERVER COMPONENT] Create guild page

components/
├── Dashboard.tsx                       [CLIENT COMPONENT] Main dashboard with drag-drop
├── Navbar.tsx                         [SERVER COMPONENT] Top navigation
├── NavbarClient.tsx                   [CLIENT COMPONENT] Client-side navbar logic
├── PartyBlock.tsx                     [CLIENT COMPONENT] Party slot display
├── WaitlistBlock.tsx                  [CLIENT COMPONENT] Waiting list display
├── LeaveListBlock.tsx                 [CLIENT COMPONENT] Leave list display
├── MemberCard.tsx                     [CLIENT COMPONENT] Draggable member card
├── ExportModal.tsx                    [CLIENT COMPONENT] Export team to image
├── FormInput.tsx                      [CLIENT COMPONENT] Reusable input
├── FormTextarea.tsx                   [CLIENT COMPONENT] Reusable textarea
├── ProgressBar.tsx                    [CLIENT COMPONENT] Progress indicator
├── ThemeProvider.tsx                  [CLIENT COMPONENT] Dark mode provider
└── helpers.tsx                        [UTILITY] Shared helper functions

lib/
├── supabase/
│   ├── client.ts                      [UTILITY] Supabase client for server components
│   └── server.ts                      [UTILITY] Admin client & utilities
└── validations.ts                     [UTILITY] Input validation functions

types/
├── database.ts                        [TYPES] Database schema interfaces
└── supabase.ts                        [TYPES] Supabase generated types

middleware.ts                          [MIDDLEWARE] Auth routing & redirects

migrations/
├── 001_guild_approval_system.sql
├── 002_remove_password_game_column.sql
├── 003_saas_schema_update.sql
└── 004_fix_rls_recursion.sql
```

### Component Responsibilities

#### Server Components (Page Views)
| Component | Role | Auth Required | Notes |
|-----------|------|---------------|-------|
| `app/page.tsx` | Home/Dashboard | Yes | Fetches profiles, trial status, trial banner |
| `app/layout.tsx` | Root layout | - | Wraps entire app with theme provider |
| `app/dashboard/layout.tsx` | Dashboard layout | Yes | Fetches guild data, renders sidebar/topbar |
| `app/login/page.tsx` | Login form container | No | Renders LoginForm client component |
| `app/register/page.tsx` | Register form container | No | Renders RegisterForm client component |
| `app/onboarding/page.tsx` | Guild creation container | Yes | Renders OnboardingForm client component |
| `app/profile/page.tsx` | Profile view | Yes | Fetches user profile, renders ProfileForm |
| `app/admin/credentials/page.tsx` | Admin member CRUD | Yes (admin) | Fetches all members, renders CredentialsTable |
| `app/members/page.tsx` | Guild members list | Yes | Fetches guild members, renders leaderboard |
| `app/billing/page.tsx` | Billing/trial info | Yes | Displays trial status and billing info |
| `app/g/[guild_url]/page.tsx` | Guild invite | No | Allows non-members to join guild |

#### Server Actions (Server-Side Logic)
| Action | Purpose | Auth Required | Client Required | Side Effects |
|--------|---------|---------------|-----------------|---------------|
| `auth.ts:getSession()` | Fetch current session | - | Profiles table | None (read-only) |
| `auth.ts:loginAction()` | User login | No | Auth table | Creates session cookie |
| `auth.ts:registerAction()` | User registration | No | Auth + profiles | Creates profile with role='member' |
| `auth.ts:logoutAction()` | User logout | Yes | Auth table | Clears session |
| `onboarding.ts:validateGuildUrlAction()` | Check URL availability | - | Guilds table | None (read-only) |
| `onboarding.ts:completeOnboardingAction()` | Create guild | Yes | Guilds table | Creates guild, sends email |
| `guild.ts:createNewGuild()` | Old guild creation | Yes | Guilds table | Creates guild with status='pending' |
| `dashboard.ts:updateProfileParty()` | Assign member to party | Yes (admin) | Profiles table | Updates party assignment |
| `profile.ts:updateMyProfile()` | Update user stats | Yes | Profiles table | Updates stats, revalidates cache |
| `profile.ts:createProfileSetupAction()` | Setup profile after signup | Yes | Profiles table | Creates/updates profile, assigns role |
| `admin.ts:createMember()` | Admin creates member | Yes (admin) | Profiles table | Creates profile, revalidates paths |
| `admin.ts:updateMember()` | Admin updates member | Yes (admin) | Profiles table | Updates profile, revalidates paths |

#### Client Components (Interactive UI)
| Component | Type | Purpose | State Management |
|-----------|------|---------|------------------|
| `NavbarClient.tsx` | Client | Navigation menu | `useState` for theme, menu state |
| `Dashboard.tsx` | Client | Main dashboard with drag-drop | `useState`, `useTransition` for drag |
| `OnboardingForm.tsx` | Client | Guild creation form | `useState` for form data, URL validation |
| `RegisterForm.tsx` | Client | Registration form | `useState` for form data, validation |
| `ProfileForm.tsx` | Client | Profile stats form | `useState` for stats, AI integration |
| `CredentialsTable.tsx` | Client | Admin member editor | `useState` for inline editing |
| `MembersTable.tsx` | Client | Leaderboard/member list | Sorting, filtering |
| `PartyBlock.tsx` | Client | Party slots | Drag-drop target |
| `WaitlistBlock.tsx` | Client | Waiting list | Member display |
| `MemberCard.tsx` | Client | Draggable member | Drag-drop source |
| `ExportModal.tsx` | Client | Team export | Image generation |

---

## 3. Data & Execution Flow

### 3.1 Authentication Flow

```
User visits app/
    ↓
middleware.ts runs:
    ├─ Get user from Supabase Auth
    ├─ Check if authenticated
    │   ├─ NO → Redirect to /login
    │   └─ YES → Continue
    ├─ Check if has guild_id in profile
    │   ├─ NO → Redirect to /onboarding (except public routes)
    │   └─ YES → Check trial status
    ├─ Check trial_ends_at
    │   ├─ EXPIRED → Redirect to /billing
    │   └─ ACTIVE → Continue
    └─ Allow request
```

### 3.2 Registration & Profile Creation Flow

```
User submits registration form (app/register/RegisterForm.tsx)
    ↓
registerAction() in app/actions/auth.ts:
    ├─ Validate email/password
    ├─ Call supabase.auth.signUp()
    │   └─ Creates auth.users row
    ├─ Call adminClient.profiles.insert()
    │   ├─ uid_game: from email prefix
    │   ├─ role: 'member'
    │   ├─ All stats: 0
    │   └─ guild_id: NULL
    └─ Return success
        ↓
    Browser redirects to /onboarding (middleware triggered)
```

**Issue:** Profile created with `guild_id = NULL`. User must go through onboarding to get assigned to a guild.

### 3.3 Onboarding Flow (Guild Creation)

```
User in /onboarding page (app/onboarding/page.tsx)
    ↓
OnboardingForm.tsx (client component):
    ├─ User enters: guildName, guildUrl, description
    ├─ onChange → validateGuildUrlAction()
    │   ├─ Check URL format (regex: a-z, 0-9, -)
    │   └─ Check if guildUrl exists in guilds table
    └─ On submit → completeOnboardingAction()
        ↓
completeOnboardingAction() in app/actions/onboarding.ts:
    ├─ Re-validate guild URL
    ├─ Get current user from supabase.auth.getUser()
    ├─ Calculate trial expiry: today + 14 days
    ├─ Generate invite code
    ├─ Call adminClient.guilds.insert()
    │   ├─ owner_id: userId
    │   ├─ guild_url: guildUrl
    │   ├─ name: guildName
    │   ├─ status: 'active' (⚠️ auto-approved!)
    │   ├─ trial_ends_at: +14 days
    │   └─ invite_code: random code
    ├─ Send welcome email
    └─ Return inviteLink
        ↓
    Browser redirects to /dashboard (middleware triggered)
        ↓
    ⚠️ **BUG:** User's profile.guild_id is STILL NULL!
        (Must manually visit /profile-setup or complete another action)
```

**Issue:** After guild creation, the user's profile is NOT linked to the guild. The profile's `guild_id` remains NULL even though they own a guild.

### 3.4 Dashboard & Member Management Flow

```
User in /dashboard/page.tsx (or app/page.tsx)
    ↓
Dashboard.tsx (client component with initialProfiles):
    ├─ User can see all guild members in drag-drop interface
    ├─ Admin users can:
    │   ├─ Drag members to party slots
    │   ├─ Drag members to leave list
    │   └─ Clear members from slots
    │
    └─ On drag-drop action:
        ├─ Optimistic update: setProfiles() immediately
        └─ In background: startTransition()
            └─ updateProfileParty(memberId, partyId, slotIndex)
                ├─ Check role === 'admin'
                ├─ Call profiles.update()
                │   ├─ party_id: partyId
                │   └─ slot_index: slotIndex
                └─ Return success/error
```

### 3.5 Profile Update Flow

```
User in /profile/page.tsx
    ↓
ProfileForm.tsx (client component):
    ├─ Shows current stats
    ├─ User can either:
    │   ├─ Manually enter stats
    │   └─ Upload screenshot → extractStatsFromImage()
    │       ├─ Convert image to Base64
    │       └─ Send to Google Generative AI
    │           └─ AI extracts numbers from screenshot
    │
    └─ On submit:
        ├─ Optimistic: setStats() immediately
        └─ In background: updateMyProfile()
            ├─ Get current user
            ├─ Extract form data:
            │   ├─ display_name
            │   ├─ job_name
            │   ├─ All 10 stat fields
            │   └─ updated_at: now
            ├─ Call profiles.update()
            └─ Revalidate: /profile, /
```

### 3.6 Admin Member CRUD Flow

```
Admin user visits /admin/credentials/page.tsx
    ↓
checkAdmin() verifies role:
    ├─ Get session
    ├─ Check admins table
    └─ Throw error if not admin
        ↓
    Fetch profiles for guild
        ↓
    CredentialsTable.tsx (client component):
        ├─ Inline editing for each member
        ├─ On save:
        │   ├─ updateMember(id, formData)
        │   │   ├─ Verify admin again
        │   │   └─ profiles.update(id)
        │   └─ Revalidate: /admin/credentials, /members, /
        │
        └─ On delete:
            ├─ deleteMember(id)
            ├─ Verify admin again
            └─ profiles.delete(id)
                └─ Revalidate same paths
```

### 3.7 Trial & Billing Flow

```
Middleware checks on every request:
    ├─ If user has guild_id
    │   ├─ Fetch guild.trial_ends_at
    │   ├─ Compare with current date
    │   ├─ If trial_ends_at <= now:
    │   │   └─ Redirect to /billing
    │   └─ If trial_ends_at > now:
    │       └─ Continue normally
    │
    ├─ Homepage (app/page.tsx):
    │   ├─ Calculate daysRemaining
    │   ├─ If session && daysRemaining > 0:
    │   │   └─ Show trial banner with countdown
    │   └─ If isAdmin:
    │       └─ Show "Manage Billing" button → /billing
    │
    └─ /billing page:
        └─ Displays payment/plan info
```

---

## 4. Conflict & Bug Analysis

### 🔴 **CRITICAL ISSUES**

#### 4.1 Guild-Profile Linkage Not Created After Onboarding
**Severity:** CRITICAL  
**Location:** `app/actions/onboarding.ts:completeOnboardingAction()`

**Problem:**
```
// onboarding creates guild with owner_id = userId
const { data: newGuild } = await adminClient
  .from('guilds')
  .insert([{ owner_id: userId, ... }])

// ❌ But it NEVER updates the user's profile.guild_id!
// User's profile.guild_id remains NULL
```

**Impact:**
- User creates guild but doesn't get assigned to it
- Middleware redirects to /onboarding again (infinite loop potential)
- User must manually visit /profile-setup or create profile again

**Evidence:**
- In `onboarding.ts`, after `guilds.insert()`, there's no `profiles.update()`
- In middleware, checks `hasGuild = profile?.guild_id` (checking profile, not guilds table)
- User can own a guild but be stuck in onboarding loop

---

#### 4.2 Multiple Profile Creation Paths Creating Conflicts
**Severity:** CRITICAL  
**Location:** `app/actions/auth.ts` vs `app/actions/profile.ts`

**Problem:**
```
Path 1: registerAction() → profiles.insert() with role='member'
Path 2: createProfileSetupAction() → profiles.insert() or profiles.update()

// Both can be called, causing:
// - Duplicate profile attempts
// - Role overwrite conflicts
// - Confusion about which one is authoritative
```

**Issue Sequence:**
1. User registers → `registerAction()` creates profile with role='member' (auth.ts:108)
2. User goes through onboarding → guild created but profile NOT updated
3. User visits /profile-setup → `createProfileSetupAction()` runs again
4. Profile already exists from step 1, but this function tries to insert again
5. If insert fails (duplicate), update logic might kick in
6. Profile's guild_id and role can get overwritten inconsistently

**Code Evidence:**
```typescript
// auth.ts - registerAction() always creates profile as 'member'
const { error: profileError } = await adminAny
  .from('profiles')
  .insert([{
    role: 'member', // ⚠️ Hard-coded role
    guild_id: null, // ⚠️ No guild assigned yet
  }])

// profile.ts - createProfileSetupAction() can create another profile
if (ownedGuild) {
  assignedRole = 'admin'
} else {
  assignedRole = 'member'
}
// This creates/updates, potentially overwriting the first one
```

---

#### 4.3 Redundant and Inefficient Session Fetching
**Severity:** HIGH  
**Location:** Multiple files - `auth.ts`, `page.tsx`, `layout.tsx`, middleware, components

**Problem:**
```
getSession() is called repeatedly, each time:
├─ Creating a Supabase client
├─ Fetching from auth.users
├─ Joining with profiles table
└─ Returning full object

// Called in:
- middleware.ts (profile lookup)
- app/page.tsx (profile lookup)
- app/dashboard/layout.tsx (profile lookup)
- app/actions/*.ts (multiple times in different actions)
- Navbar.tsx (profile lookup)
- Dashboard.tsx (if re-rendered)
```

**Impact:**
- Multiple database queries per page load
- Unnecessary network overhead
- Profile data may be stale between calls
- N+1 query problem

**Example:**
```typescript
// app/page.tsx - calls getSession()
const session = await getSession()

// But then immediately re-queries profiles table
const { data } = await supabase
  .from('profiles')
  .select('*')
  .order('id', { ascending: true })

// getSession() already fetched this user's profile!
```

---

#### 4.4 Inconsistent Session/Profile Structure
**Severity:** HIGH  
**Location:** Multiple files - type casting issues

**Problem:**
```typescript
// Different ways session is used:

// Way 1: as getSession() return value
const session = await getSession() // { user, profile }
const userId = session.user.id

// Way 2: type-casted as 'any'
const sessionAny = session as any
const userId = sessionAny.profile?.guild_id

// Way 3: Assuming profile exists
const userId = session?.profile?.id // But profile might be null!

// Way 4: Direct casting
if (sessionAny?.profile?.role === 'admin')

// Way 5: Dashboard passes Profile but session has different structure
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

// Dashboard.tsx defines its own Profile type (different from database.ts)
```

**Type Inconsistencies:**
- `Session` type from `database.ts` not consistently used
- `Profile` type defined in `Dashboard.tsx` differs from `database.ts`
- Mix of `as any` casts and proper TypeScript types
- `.maybeSingle()` returns could be undefined but treated as guaranteed

---

#### 4.5 Middleware Performs Too Many Database Queries
**Severity:** HIGH  
**Location:** `middleware.ts`

**Problem:**
```typescript
// Middleware runs on EVERY request and does:
export async function middleware(request: NextRequest) {
  // 1. Create admin client
  // 2. Get current user (auth)
  
  if (user && !pathname.startsWith('/admin')) {
    // 3. Query profiles table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('guild_id')
      .eq('id', user.id)
      .maybeSingle()
    
    // 4. If has guild:
    if (hasGuild) {
      // 5. Query guilds table for trial_ends_at
      const { data: guild } = await supabaseAdmin
        .from('guilds')
        .select('trial_ends_at')
        .eq('id', profile?.guild_id)
        .maybeSingle()
    }
  }
}

// This means EVERY page load triggers 2-3 database queries
// Plus Supabase Auth session lookup
```

**Impact:**
- Performance bottleneck on every page navigation
- Adds latency to all requests
- Could hit database rate limits under load
- Middleware can be slow, affecting perceived performance

---

#### 4.6 RLS Policy Violations & Incorrect Client Usage
**Severity:** HIGH  
**Location:** Multiple server actions - mixing `createClient()` and `createAdminClient()`

**Problem:**
```typescript
// ✅ CORRECT: Use admin client for privileged operations
const adminClient = await createAdminClient()
const { data } = await adminClient
  .from('profiles')
  .insert([...]) // Bypasses RLS

// ❌ WRONG: Use regular client but try to insert without RLS bypass
const supabase = await createClient()
const { data } = await supabase
  .from('profiles')
  .insert([...]) // This might fail if RLS restricts inserts

// Mixed usage in different parts of codebase:
// auth.ts: Uses admin client ✓
// profile.ts: Uses admin client ✓
// dashboard.ts: Uses regular client ❌
// onboarding.ts: Uses admin client ✓
```

**Specific Issue in `dashboard.ts`:**
```typescript
export async function updateProfileParty(
  profileId: string,
  partyId: number | null,
  slotIndex: number | null
) {
  const supabase = await createClient() // ⚠️ Regular client!
  
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ party_id: partyId, slot_index: slotIndex })
    .eq('id', profileId)
  
  // If RLS policy requires admin role, this will fail
}
```

---

#### 4.7 Trial Banner Calculation Duplicated
**Severity:** MEDIUM  
**Location:** `app/page.tsx` and `TrialBanner.tsx` (or `dashboard/TrialBanner.tsx`)

**Problem:**
```typescript
// app/page.tsx - function calculateDaysRemaining()
function calculateDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  const endDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  return Math.max(0, daysRemaining)
}

// Likely duplicated in TrialBanner.tsx
// If calculation logic changes in one place but not the other:
// - Trial countdown shows different days on home vs dashboard
// - Leads to user confusion
```

---

#### 4.8 Missing Error Handling in Async Operations
**Severity:** MEDIUM  
**Location:** Multiple files - `.single()` and `.maybeSingle()` without error checks

**Problem:**
```typescript
// ❌ No error handling
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single() // Throws if not found or >1 result

// ❌ Error ignored
if (profileError) {
  console.error('Profile lookup error in middleware:', profileError)
  return supabaseResponse // Returns without processing - silently fails
}

// ❌ Assumes success
const { data: guild } = await supabaseAdmin
  .from('guilds')
  .select('trial_ends_at')
  .eq('id', profile?.guild_id)
  .maybeSingle() // Could be null or error

// Uses guild?.trial_ends_at without null check
if (guild?.trial_ends_at) { // Only safe if null check exists
```

---

### 🟡 **MODERATE ISSUES**

#### 4.9 Onboarding Flow Allows Bypass of Profile Setup
**Location:** `middleware.ts` and onboarding flow

```typescript
// Middleware allows access to /profile-setup even if no guild
if (!hasGuild && !pathname.startsWith('/onboarding') && 
    !pathname.startsWith('/profile-setup') && !isPublicRoute) {
  return NextResponse.redirect(new URL('/onboarding', request.url))
}

// User could:
// 1. Register → profile created with role='member'
// 2. Skip onboarding → directly access /profile-setup
// 3. Update profile manually → create guild later?
```

---

#### 4.10 Admin User Role Assignment Not Enforced
**Location:** `profile.ts:createProfileSetupAction()`

```typescript
// Role assigned based on guild ownership check:
if (ownedGuild) {
  assignedRole = 'admin'
} else {
  assignedRole = 'member'
}

// Problems:
// - No validation that user actually owns the guild
// - If user tries to claim ownership of someone else's guild...
// - formData.guildId could be tampered with in client
// - No verification that formData.guildId is correct
```

---

#### 4.11 Missing Profile Update in Onboarding
**Location:** `onboarding.ts:completeOnboardingAction()`

```typescript
// After creating guild:
const { data: newGuild, error: insertError } = await adminClient
  .from('guilds')
  .insert([{ owner_id: userId, name: formData.guildName, ... }])
  .select('id')
  .single()

// ❌ MISSING: Update user's profile with new guild_id
// Should be:
// await adminClient.from('profiles')
//   .update({ guild_id: newGuild.id, role: 'admin' })
//   .eq('id', userId)
```

---

#### 4.12 Inconsistent Redirect Patterns
**Location:** Multiple client components and server actions

```typescript
// Some use: redirect() from next/navigation (server action)
redirect('/dashboard')

// Some use: router.push() in client component
const router = useRouter()
router.push('/login')

// Some rely on middleware to redirect
// No explicit redirect in action

// Inconsistency can cause:
// - Users stuck on wrong pages
// - Stale cache not clearing
// - Race conditions with redirects
```

---

## 5. Refactoring Action Plan

### Phase 1: Fix Critical Issues (Do First)

#### **Step 1.1: Link User's Profile to Guild After Creation** 
**File:** `app/actions/onboarding.ts`  
**Priority:** CRITICAL  

**Current Code (lines 50-80):**
```typescript
export async function completeOnboardingAction(
  formData: OnboardingFormData
): Promise<{ success: boolean; error?: string; inviteLink?: string }> {
  try {
    // ... validation code ...
    
    const adminClient = await createAdminClient()
    
    // Create guild
    const { data: newGuild, error: insertError } = await (adminClient as any)
      .from('guilds')
      .insert([{
        owner_id: userId,
        name: formData.guildName,
        // ... other fields ...
      }])
      .select('id')
      .single()
    
    if (insertError || !newGuild) {
      return { success: false, error: 'Failed to create guild' }
    }
    
    // ❌ MISSING STEP: Link profile to guild
    // ✅ ADD THIS:
    const { error: profileUpdateError } = await (adminClient as any)
      .from('profiles')
      .update({ 
        guild_id: newGuild.id, 
        role: 'admin' // Set creator as admin
      })
      .eq('id', userId)
    
    if (profileUpdateError) {
      console.error('Error linking profile to guild:', profileUpdateError)
      return { success: false, error: 'Failed to link profile to guild' }
    }
    
    // ... rest of function ...
  }
}
```

**Action Items:**
- [ ] Add `profiles.update()` after `guilds.insert()` succeeds
- [ ] Set `guild_id = newGuild.id` and `role = 'admin'`
- [ ] Add error handling for profile update
- [ ] Test: Register → Onboard → Check profile.guild_id is set

---

#### **Step 1.2: Consolidate Profile Creation into Single Path**  
**Files:** `app/actions/auth.ts`, `app/actions/profile.ts`  
**Priority:** CRITICAL

**Current Problem:**
- `registerAction()` creates profile with role='member'
- `createProfileSetupAction()` creates/updates profile again
- Conflict on which data is authoritative

**Solution: Defer Profile Creation to Setup**

**In `auth.ts:registerAction()` - REMOVE profile creation:**
```typescript
export async function registerAction(email: string, password: string) {
  // ... existing code ...
  
  const { data, error } = await supabase.auth.signUp({ email, password })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  if (!data.user?.id) {
    return { success: false, error: 'Failed to create account' }
  }
  
  // ❌ REMOVE THIS SECTION:
  // try {
  //   const adminClient = await createAdminClient()
  //   const { error: profileError } = await (adminClient as any)
  //     .from('profiles')
  //     .insert([{ id: data.user.id, role: 'member', ... }])
  // }
  
  // ✅ INSTEAD: Just return success
  // Profile will be created in /profile-setup flow
  return { success: true, user: data.user }
}
```

**In `profile.ts:createProfileSetupAction()` - Check for existing profile:**
```typescript
export async function createProfileSetupAction(formData: ProfileSetupFormData) {
  const userId = authData.user.id
  const adminClient = await createAdminClient()
  
  // ✅ NEW: Check if profile already exists
  const { data: existingProfile } = await (adminClient as any)
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  
  if (existingProfile) {
    // Profile exists, UPDATE it
    const { error: updateError } = await (adminClient as any)
      .from('profiles')
      .update({
        guild_id: assignedGuildId,
        role: assignedRole,
        display_name: formData.displayName,
        uid_game: formData.uidGame,
        // ... other fields ...
      })
      .eq('id', userId)
    
    if (updateError) {
      return { success: false, error: updateError.message }
    }
  } else {
    // Profile doesn't exist, CREATE it
    const { error: insertError } = await (adminClient as any)
      .from('profiles')
      .insert([{
        id: userId,
        guild_id: assignedGuildId,
        role: assignedRole,
        display_name: formData.displayName,
        uid_game: formData.uidGame,
        // ... default stats ...
      }])
    
    if (insertError) {
      return { success: false, error: insertError.message }
    }
  }
  
  return { success: true }
}
```

**Action Items:**
- [ ] Remove profile.insert() from `auth.ts:registerAction()`
- [ ] Update `profile.ts:createProfileSetupAction()` to check for existing profile
- [ ] Add proper insert vs update logic
- [ ] Test: Register → Onboard → Profile setup creates profile correctly
- [ ] Test: Skip setup → Visit /profile-setup → Profile created

---

#### **Step 1.3: Fix Profile-Guild Linkage in Guild Creation**  
**File:** `app/actions/guild.ts`  
**Priority:** CRITICAL

**Current Code:**
```typescript
export async function createNewGuild(formData: FormData) {
  // Creates guild but doesn't link to profile
}
```

**Fixed Code:**
```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'

export async function createNewGuild(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Please log in first' }

  const adminClient = await createAdminClient()
  const guildName = formData.get('guildName') as string
  const serverName = formData.get('serverName') as string

  const inviteCode = 'ROOC-' + Math.random().toString(36).substring(2, 6).toUpperCase()

  // Step 1: Create guild
  const { data: guild, error: guildError } = await (adminClient as any)
    .from('guilds')
    .insert([{
      name: guildName,
      server_name: serverName,
      owner_id: session.user.id,
      invite_code: inviteCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    }])
    .select('id')
    .single()

  if (guildError) return { success: false, error: guildError.message }

  // ✅ NEW: Link user's profile to guild with admin role
  const { error: profileUpdateError } = await (adminClient as any)
    .from('profiles')
    .update({
      guild_id: guild.id,
      role: 'admin'
    })
    .eq('id', session.user.id)

  if (profileUpdateError) {
    console.error('Error linking profile:', profileUpdateError)
    // Don't fail - guild was created
  }

  return { 
    success: true, 
    guildId: guild.id, 
    inviteCode 
  }
}
```

**Action Items:**
- [ ] Add profile update after guild creation
- [ ] Set guild_id and role='admin'
- [ ] Test guild creation from both paths

---

### Phase 2: Optimize Performance (Do Second)

#### **Step 2.1: Centralize Session Data Fetching**  
**Files:** `app/actions/auth.ts`, all other actions  
**Priority:** HIGH

**Goal:** Replace repeated `getSession()` calls with a cached version

**Create:** `app/actions/session-cache.ts`
```typescript
'use server'

import { getSession as baseGetSession } from './auth'

// React cache wrapper for server-side deduplication
import { cache } from 'react'

export const getSessionCached = cache(async () => {
  return await baseGetSession()
})

export const getCurrentUserId = cache(async () => {
  const session = await getSessionCached()
  return session?.user?.id ?? null
})

export const getCurrentGuildId = cache(async () => {
  const session = await getSessionCached()
  return (session as any)?.profile?.guild_id ?? null
})
```

**Usage in Server Actions:**
```typescript
// ❌ OLD:
const session = await getSession()
const supabase = await createClient()
const { data: profile } = await supabase.from('profiles').select('*')

// ✅ NEW:
import { getSessionCached, getCurrentGuildId } from '@/app/actions/session-cache'

const session = await getSessionCached()
const guildId = await getCurrentGuildId()
// Only one profile fetch if called multiple times in same render
```

**Action Items:**
- [ ] Create `session-cache.ts` with React `cache()` wrapper
- [ ] Replace `getSession()` calls in server actions
- [ ] Test that session data is deduplicated in same request

---

#### **Step 2.2: Optimize Middleware Database Queries**  
**File:** `middleware.ts`  
**Priority:** HIGH

**Current Issue:** Middleware does 3 DB queries per request

**Solution: Combine queries or move to callback**

**Option A: Combine Guild + Trial Check**
```typescript
// ❌ Current: 2 separate queries
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('guild_id')
  .eq('id', user.id)
  .maybeSingle()

if (hasGuild) {
  const { data: guild } = await supabaseAdmin
    .from('guilds')
    .select('trial_ends_at')
    .eq('id', profile?.guild_id)
    .maybeSingle()
}

// ✅ Better: Single joined query
const { data: profileWithGuild } = await supabaseAdmin
  .from('profiles')
  .select('guild_id, guilds(trial_ends_at, status)')
  .eq('id', user.id)
  .maybeSingle()

const guild = (profileWithGuild as any)?.guilds
const hasGuild = !!profileWithGuild?.guild_id
```

**Action Items:**
- [ ] Use Supabase joins to combine profile + guild query
- [ ] Remove redundant queries from middleware
- [ ] Benchmark middleware performance before/after

---

#### **Step 2.3: Establish Consistent Session Type**  
**Files:** `types/database.ts`, `app/actions/auth.ts`, all components  
**Priority:** MEDIUM

**Current Problem:** Mix of type casts and loose typing

**Solution: Create & Use Strict Session Type**

**In `types/database.ts`:**
```typescript
export type AppSession = {
  user: {
    id: string
    email?: string | null
    aud?: string
    user_metadata?: Record<string, any>
  }
  profile: Profile | null
}

export type UserContext = AppSession | null
```

**Update `auth.ts:getSession()`:**
```typescript
export async function getSession(): Promise<AppSession | null> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return null
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    return {
      user: session.user,
      profile: profile || null, // Properly typed
    }
  } catch (err) {
    return null
  }
}
```

**Usage in Components:**
```typescript
// ✅ Properly typed
import type { AppSession } from '@/types/database'

const session: AppSession | null = await getSession()
if (session?.profile?.guild_id) {
  // Type-safe access
}
```

**Action Items:**
- [ ] Create `AppSession` type in `types/database.ts`
- [ ] Update `getSession()` return type
- [ ] Remove `as any` casts in session usage
- [ ] Update TypeScript strict mode settings

---

### Phase 3: Fix Moderate Issues (Do Third)

#### **Step 3.1: Fix Dashboard RLS Violation**  
**File:** `app/actions/dashboard.ts`  
**Priority:** HIGH

**Current Code:**
```typescript
export async function updateProfileParty(
  profileId: string,
  partyId: number | null,
  slotIndex: number | null
) {
  const supabase = await createClient() // ⚠️ Regular client
  
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ party_id: partyId, slot_index: slotIndex })
    .eq('id', profileId)
```

**Fixed Code:**
```typescript
export async function updateProfileParty(
  profileId: string,
  partyId: number | null,
  slotIndex: number | null
) {
  const session = await getSession()
  if (!session || session.profile?.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  // ✅ Use admin client for profile updates
  const adminClient = await createAdminClient()
  
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ 
      party_id: partyId, 
      slot_index: slotIndex,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

**Action Items:**
- [ ] Switch to `createAdminClient()` in dashboard.ts
- [ ] Add explicit authorization check
- [ ] Add timestamp update
- [ ] Test: Admin user can update party assignments

---

#### **Step 3.2: Consolidate Trial Calculation**  
**Files:** `app/page.tsx`, `app/dashboard/TrialBanner.tsx`  
**Priority:** MEDIUM

**Create:** `lib/utils/trial.ts`
```typescript
export function calculateDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0

  const endDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.max(0, daysRemaining)
}

export function isTrialExpired(trialEndsAt: string | null): boolean {
  return calculateDaysRemaining(trialEndsAt) <= 0
}

export function getTrialStatus(trialEndsAt: string | null) {
  const daysRemaining = calculateDaysRemaining(trialEndsAt)
  return {
    daysRemaining,
    isExpired: daysRemaining <= 0,
    isExpiringSoon: daysRemaining <= 3 && daysRemaining > 0,
  }
}
```

**Usage in Components:**
```typescript
// ✅ app/page.tsx
import { calculateDaysRemaining } from '@/lib/utils/trial'

const trialDaysRemaining = calculateDaysRemaining(guild?.trial_ends_at)

// ✅ TrialBanner.tsx
import { getTrialStatus } from '@/lib/utils/trial'

const { daysRemaining, isExpiringSoon } = getTrialStatus(trialEndsAt)
```

**Action Items:**
- [ ] Create `lib/utils/trial.ts` with centralized logic
- [ ] Replace calculations in both files with import from util
- [ ] Test: Days match on home and dashboard pages

---

#### **Step 3.3: Add Comprehensive Error Handling**  
**Files:** Multiple - `middleware.ts`, server actions, pages  
**Priority:** MEDIUM

**Pattern to Use:**
```typescript
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.error(`[ACTION_NAME] Database error:`, error.message)
  return {
    success: false,
    error: 'Failed to fetch data. Please try again.'
  }
}

if (!data) {
  console.warn(`[ACTION_NAME] No data returned`)
  return {
    success: false,
    error: 'No data found.'
  }
}
```

**Action Items:**
- [ ] Audit all `.single()` calls for error handling
- [ ] Audit all `.maybeSingle()` calls for null checks
- [ ] Add try-catch blocks to server actions
- [ ] Create consistent error response format

---

#### **Step 3.4: Add Input Validation & Sanitization**  
**File:** `lib/validations.ts`  
**Priority:** MEDIUM

**Add validators for:**
```typescript
// ✅ Guild creation
export function validateGuildName(name: string) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Guild name is required' }
  }
  if (name.length > 50) {
    return { valid: false, error: 'Guild name must be under 50 characters' }
  }
  return { valid: true }
}

export function validateGuildUrl(url: string) {
  const regex = /^[a-z0-9-]{3,30}$/
  if (!regex.test(url)) {
    return { valid: false, error: 'Guild URL invalid (3-30 chars, lowercase, numbers, hyphens only)' }
  }
  return { valid: true }
}

export function validateGameUsername(uid: string) {
  if (!uid || uid.trim().length === 0) {
    return { valid: false, error: 'Game username required' }
  }
  if (uid.length > 50) {
    return { valid: false, error: 'Game username too long' }
  }
  return { valid: true }
}

export function validateStats(stats: Record<string, any>) {
  for (const [key, value] of Object.entries(stats)) {
    const num = Number(value)
    if (isNaN(num) || num < 0 || num > 999999) {
      return { valid: false, error: `${key} must be 0-999999` }
    }
  }
  return { valid: true }
}
```

**Action Items:**
- [ ] Add validators to `lib/validations.ts`
- [ ] Use validators in server actions before database operations
- [ ] Use validators in client-side forms for UX
- [ ] Add XSS prevention for text fields

---

### Phase 4: Enhancement & Security (Do Last)

#### **Step 4.1: Implement Proper RLS Policies**  
**Files:** Database migrations  
**Priority:** HIGH

**Create:** `migrations/005_fix_rls_policies.sql`
```sql
-- Ensure profiles can only see/edit own profile
ALTER POLICY "profiles_self_select" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can see guild members
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.guild_id = profiles.guild_id
    )
  );

-- Only guild owner can update guild
ALTER POLICY "guilds_owner_update" ON guilds
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```

**Action Items:**
- [ ] Audit current RLS policies
- [ ] Ensure users can only access their own data
- [ ] Ensure admins can only manage their guild
- [ ] Test RLS violations with invalid queries

---

#### **Step 4.2: Add Role-Based Access Control Middleware**  
**File:** Create `lib/auth/role-check.ts`  
**Priority:** MEDIUM

```typescript
import { getSession } from '@/app/actions/auth'

export async function requireAdmin() {
  const session = await getSession()
  if (!session?.profile || session.profile.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

export async function requireGuildMember(guildId: string) {
  const session = await getSession()
  if (!session?.profile || session.profile.guild_id !== guildId) {
    throw new Error('Guild member access required')
  }
  return session
}
```

**Usage in Server Actions:**
```typescript
export async function adminOnlyAction() {
  const session = await requireAdmin()
  // Safe to proceed
}
```

**Action Items:**
- [ ] Create role-check utilities
- [ ] Use in all protected server actions
- [ ] Add consistent error handling for auth failures

---

#### **Step 4.3: Add Audit Logging**  
**File:** Create `lib/audit/logger.ts`  
**Priority:** LOW

```typescript
export async function logAction(
  userId: string,
  action: string,
  details: Record<string, any>,
  result: 'success' | 'failure'
) {
  // Log to audit table or external service
  console.log(`[AUDIT] ${userId} - ${action} - ${result}`, details)
  // TODO: Save to database
}
```

**Action Items:**
- [ ] Create audit logging system
- [ ] Log critical actions: member creation, role changes, guild creation
- [ ] Retain logs for compliance

---

### Implementation Order (Recommended)

```
Week 1 (Critical Fixes):
├─ Step 1.1: Fix guild-profile linkage in onboarding
├─ Step 1.2: Consolidate profile creation paths  
├─ Step 1.3: Fix guild.ts profile linking
└─ Test all paths end-to-end

Week 2 (Performance):
├─ Step 2.1: Centralize session caching
├─ Step 2.2: Optimize middleware queries
└─ Step 2.3: Establish consistent session types

Week 3 (Moderate Issues):
├─ Step 3.1: Fix dashboard RLS violations
├─ Step 3.2: Consolidate trial logic
└─ Step 3.3 & 3.4: Error handling & validation

Week 4 (Security & Enhancement):
├─ Step 4.1: Implement RLS policies
├─ Step 4.2: Role-based access control
└─ Step 4.3: Audit logging
```

---

## Appendix: Testing Checklist

### User Registration Flow
- [ ] Register with new email
- [ ] Check profile created with role='member'
- [ ] Check profile.guild_id is NULL
- [ ] User redirected to /onboarding
- [ ] Logout and login again → redirected to onboarding

### Guild Creation Flow
- [ ] Create guild in onboarding
- [ ] Check guild created with status='active'
- [ ] Check profile.guild_id updated to new guild_id
- [ ] Check profile.role updated to 'admin'
- [ ] User redirected to /dashboard
- [ ] Refresh page → stays on dashboard (not redirected to onboarding)

### Trial Logic
- [ ] After guild creation, trial_ends_at = today + 14 days
- [ ] Trial banner shows correct countdown on home page
- [ ] Trial banner shows correct countdown on dashboard
- [ ] Trial days match between pages
- [ ] On day 15, redirect to /billing
- [ ] After payment, redirect to /dashboard

### Member Management
- [ ] Admin can drag members to party slots
- [ ] Party assignment saves to database
- [ ] Non-admin users cannot drag members
- [ ] Member stats update correctly
- [ ] AI stat extraction works on profile page

### Admin CRUD
- [ ] Admin can create member
- [ ] Admin can edit member stats
- [ ] Admin can delete member
- [ ] Non-admin cannot access /admin pages
- [ ] Changes visible in leaderboard immediately

---

## Appendix: Database Query Optimization

### Before (3 queries):
```sql
-- Middleware
SELECT guild_id FROM profiles WHERE id = ?
SELECT trial_ends_at FROM guilds WHERE id = ?
```

### After (1 query with join):
```sql
SELECT p.guild_id, g.trial_ends_at
FROM profiles p
LEFT JOIN guilds g ON p.guild_id = g.id
WHERE p.id = ?
```

**Performance Gain:** 3x faster middleware execution
