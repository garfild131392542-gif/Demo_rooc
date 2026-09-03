# Antigravity Workspace Rules & Safety Constraints

You are the Antigravity assistant for the **ROOC Guild Management System** (`rooc_management`).
You MUST strictly obey these rules on every turn. They take precedence over convenience, speed, and quick fixes.

---

## 1. Resource, Cost & Quota Protection (CRITICAL)

The project runs on **Vercel Hobby (Free Tier)** and **Supabase (Free Tier)**.
You must treat these quotas as hard budgetary constraints:
* **Vercel Active CPU Limit**: Maximum 4 CPU-hours per month across all Serverless Functions.
* **Supabase Egress Limit**: Maximum 5 GB per month.

### Strict Prohibitions:
1. **NEVER apply blanket zero-cache headers**:
   - DO NOT set `Cache-Control: public, max-age=0, must-revalidate` (or `no-cache`, `no-store`) on broad route patterns like `/((?!...).*)`.
   - All static assets (icons, images in `/public`, `/icons/...`, fonts, logos) MUST be configured with long-lived or immutable CDN caching (`public, max-age=31536000, immutable`).
2. **NEVER disable Next.js static generation via global Edge Runtime**:
   - DO NOT place `export const runtime = 'edge'` inside `app/layout.tsx` or root layouts.
   - Only use `runtime = 'edge'` in specialized streaming routes (e.g. `api/poring-chat/route.ts`).
3. **NEVER introduce background polling loops**:
   - DO NOT use `refetchInterval` with short intervals (< 5 minutes) in React Query. Rely on Supabase Realtime (WebSocket) or user-initiated refresh instead.
   - DO NOT use uncontrolled `setInterval` on client components that trigger server requests or re-renders.
4. **NO redundant server-side queries**:
   - Before writing a query in Server Components or `Navbar.tsx`, check if the session already carries that data (e.g., `session.profile`).
   - Use `Promise.all` for parallel reads instead of sequential `await` cascades.

---

## 2. Transparency & Impact Disclosure

1. **Explain Trade-offs Before Applying Config Changes**:
   - Whenever proposing changes to `next.config.ts`, `middleware.ts`, `vercel.json`, root layouts, or database schemas, explain the performance, quota, and side-effect implications to the user BEFORE executing.
2. **No Silent "Fixes" with Unchecked Side Effects**:
   - Never solve one symptom (e.g. mobile browser caching old assets) by introducing an architecture-level penalty (e.g. shutting down CDN caching site-wide).
   - Use surgical solutions (e.g. `AutoVersionRefresh` chunk error listener) instead of global sledgehammers.

---

## 3. Code Quality & Verification Standards

1. **Always Verify Builds**:
   - Run `npm run build` to ensure TypeScript checks and page generation succeed before declaring work complete.
2. **Inspect Code Diffs**:
   - Review `git diff` before committing or staging files to ensure no accidental changes or leftover debugging code exist.
3. **Preserve Architectural Context**:
   - Refer to `.agents/skills/rooc-project-context/SKILL.md` for database schema, party systems (GL, EO, General), and guild roles.
