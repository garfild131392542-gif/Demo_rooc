---
name: rooc-project-context
description: >-
  Provides full architectural context for the ROOC Guild Management System. 
  Activate this skill when the user asks about the project structure, technology stack, 
  data flows, known bugs, database schema, component responsibilities, or requests any 
  feature addition or refactoring for this project.
---

# ROOC Guild Management System — Project Context

## 1. Project Overview

**App Name:** `rooc_management`  
**Type:** Multi-tenant SaaS Guild Management System for gaming communities  
**Status:** Phase 2 Complete (Phase 3 in progress — conflicts identified)  
**Deployed on:** Vercel  
**Supabase Project ID:** `qiqsbuagnycprmccielx`

### Core Features
- User authentication via Supabase Auth
- Guild creation with **14-day free trial**
- Member management with role-based access (`admin` / `member`)
- Character stats tracking (P.ATK, M.ATK, P.DEF, M.DEF, P.DMG, M.DMG, P.REDUC, M.REDUC, PVP.DMG, PVP.REDUC, CRI, CRI.DMG)
- Party formation with drag-and-drop UI (dnd-kit)
- Admin dashboard for guild owners
- Guild invitations & approval workflow
- AI-powered stat extraction from screenshots (Google Generative AI)
- Auction system (auction rounds)
- Tactics board
- Export team screenshot (html-to-image / html2canvas)
- Dark mode (next-themes)

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript 5** |
| Backend | **Supabase** (PostgreSQL + Auth + RLS) |
| UI | **React 19** + **Tailwind CSS 4** + **Framer Motion 12** |
| Drag & Drop | **@dnd-kit/core** |
| Data Fetching | **@tanstack/react-query** |
| Icons | **lucide-react**, **@heroicons/react** |
| AI | **@google/generative-ai** (stat extraction from images) |
| Email | **Resend** + **Nodemailer** |
| Background Removal | **@imgly/background-removal** |
| Export | **xlsx**, **html-to-image**, **html2canvas** |
| Auth Guard | `middleware.ts` (Next.js Middleware) |
| Lint | ESLint 9 + eslint-config-next |

---

## 3. Directory Structure & Responsibilities

### app/actions/ (Server Actions)
- `auth.ts` — Login, register, session (getSession)
- `onboarding.ts` — Guild creation & URL validation
- `guild.ts` — Guild operations
- `dashboard.ts` — Member party management (drag-drop)
- `profile.ts` — Profile setup & stats update
- `admin.ts` — Admin CRUD for members
- `admin-guilds.ts` — Admin guild management
- `ai.ts` — Image -> stats extraction (Gemini)
- `billing.ts` — Trial / billing logic
- `email.ts` — Welcome & notification emails
- `auction.ts` / `auction-rounds.ts` — Auction system
- `tactics.ts` — Tactics board actions
- `guild-invite.ts` — Invite link actions
- `session-cache.ts` — Session caching helpers
- `profileHelpers.ts` — Shared profile helpers

### app/ (Routes)
- `(dashboard)/` — Dashboard route group
- `admin/` — System admin pages
- `admin-control/` — Admin control panel
- `auction/` — Auction pages
- `billing/` — Billing & trial info
- `g/[guild_url]/` — Public guild invite page
- `guild-admin/` — Guild admin panel
- `members/` — Guild members / leaderboard
- `onboarding/` — Guild creation onboarding
- `profile/` — User profile & stats
- `profile-setup/` — Initial profile setup (post-register)
- `tactics/` — Tactics board
- `api/cron/reset-leave/` — Cron job: reset leave status

### components/ (Shared UI)
- `Dashboard.tsx` — Main dashboard: drag-drop party management
- `Navbar.tsx` / `NavbarClient.tsx` — Top navigation
- `PartyBlock.tsx` — Party slot (drag target)
- `WaitlistBlock.tsx` / `LeaveListBlock.tsx` — Member lists
- `MemberCard.tsx` — Draggable member card
- `ExportModal.tsx` — Export team to image
- `FormInput.tsx` / `FormTextarea.tsx` — Reusable form components
- `ThemeProvider.tsx` — Dark mode provider (next-themes)
- `helpers.tsx` — Shared utility functions

### lib/ (Utilities)
- `supabase/client.ts` — Cookie-based Supabase client (respects RLS)
- `supabase/server.ts` — Admin Supabase client (service_role, bypasses RLS)
- `validations.ts` — Input validation functions

### types/ (Type Definitions)
- `database.ts` — Core domain types: Profile, Guild, Session, Admin, Party
- `supabase.ts` — Auto-generated Supabase types (npm run update-types)

---

## 4. Database Schema (Key Tables)

### profiles table
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, FK -> auth.users(id) |
| uid_game | string | Unique game username |
| display_name | string | |
| job_name | string | Character class/job |
| role | 'admin' or 'member' | Guild-level role |
| guild_id | UUID? | NULL until onboarding complete |
| party_id | number? | Party assignment |
| slot_index | number? | Position in party |
| is_on_leave | boolean? | |
| p_atk, m_atk, p_def, m_def, p_dmg, m_dmg, p_reduc, m_reduc, pvp_dmg, pvp_reduc | number | Combat stats |
| cri, cri_dmg | number? | Critical stats |
| avatar_url, character_showcase_url | string? | |

### guilds table
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name, server_name | string | |
| owner_id | UUID | FK -> auth.users(id) |
| guild_url | string? | Unique invite URL slug |
| trial_ends_at | timestamp? | Trial expiry (14 days from creation) |
| status | 'pending' or 'approved' or 'rejected' | |
| invite_code | string? | Random invite code |
| discord_*_channel_id | string? | Discord bot integration fields |

### admins table
System-wide admin privileges (separate from guild-level role in profiles).
| Column | Type |
|---|---|
| id | UUID |
| role | 'admin' or 'super_admin' |

---

## 5. Auth & Routing Flow

Every request runs through middleware.ts:
1. Get user from Supabase Auth
2. If NOT authenticated -> redirect /login
3. If authenticated, check profile.guild_id
   - NULL -> redirect /onboarding (except /profile-setup and public routes)
4. If has guild_id, check guilds.trial_ends_at
   - EXPIRED -> redirect /billing
5. Otherwise -> allow request

Public routes (no auth): /login, /register, /g/[guild_url], /privacy-policy

---

## 6. Known Bugs & Critical Issues

Always be aware of these when working on any feature.

### CRITICAL

BUG-01: Guild-Profile NOT linked after onboarding
File: app/actions/onboarding.ts -> completeOnboardingAction()
After creating the guild, profile.guild_id is never updated. User stuck in loop.
Fix: After guilds.insert(), call profiles.update({ guild_id: newGuild.id, role: 'admin' }).

BUG-02: Multiple profile creation paths conflict
registerAction() creates profile with role='member', then createProfileSetupAction()
may try to insert/update again causing role and guild_id overwrites.

### HIGH

BUG-03: Redundant session/DB queries per page load
getSession() called multiple times per request across middleware, layouts, server components.

BUG-04: Middleware runs 2-3 DB queries on every request (profiles + guilds tables).

BUG-05: Inconsistent Supabase client usage
dashboard.ts uses createClient() for writes that may require admin privileges, violating RLS.

BUG-06: Inconsistent TypeScript types
Mix of 'as any' casts and inline types. Use types/database.ts as single source of truth.

### MODERATE

BUG-07: calculateDaysRemaining() duplicated in page.tsx and TrialBanner.tsx.

BUG-08: Mixed redirect patterns (redirect() server vs router.push() client vs middleware).

---

## 7. Development Commands

```
npm run dev            # Start dev server
npm run build          # Build for production
npm run lint           # Run ESLint
npm run update-types   # Regenerate Supabase TypeScript types
```

---

## 8. Key Conventions

1. Server Components fetch data and pass as props to Client Components.
2. Admin operations MUST use createAdminClient() from lib/supabase/server.ts.
3. User-level operations use createClient() from lib/supabase/client.ts.
4. Type source of truth: types/database.ts — do NOT define Profile/Guild/Session inline.
5. After any write, call revalidatePath() for affected routes.
6. RLS is enabled — use admin client to bypass only when absolutely necessary.
7. Trial enforcement is handled exclusively in middleware.ts.
8. Email notifications sent via app/actions/email.ts using Resend.

---

## 9. References

- Full architecture & bug analysis: ARCHITECTURE_AND_ANALYSIS.md
- Auction window: AuctionWindow-explanation.md
- RLS fix: RLS_RECURSION_FIX.md
- Database migrations: migrations/
- Supabase types: types/supabase.ts
- Domain types: types/database.ts
