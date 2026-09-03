---
name: vercel-quota-and-performance-guard
description: >-
  Provides strict guidelines and auditing checklists for Vercel Fluid Compute,
  Serverless Functions, Next.js caching tiers, and Supabase query efficiency.
  Activate this skill whenever modifying next.config.ts, caching headers, API routes,
  server components, middleware, or when investigating CPU and bandwidth consumption.
---

# Vercel Quota & Performance Guard Skill

This skill enforces strict procedural runbooks to keep the application within the **Vercel Hobby Plan (4 CPU-hours/month)** and **Supabase Free Tier (5 GB egress/month)**.

---

## 1. Understanding Vercel Fluid Active CPU

* **What it measures**: The actual CPU execution time of JavaScript in Serverless & Edge Functions.
* **What does NOT count**: Waiting for I/O (e.g. waiting for Supabase to return a database query).
* **What DOES count**:
  - Compiling and executing React Server Components (RSC) on every request.
  - JSON serialization/deserialization.
  - Serving assets through Node.js/Edge functions instead of the Edge CDN.
  - Handling prefetch requests for dynamic routes.

---

## 2. Next.js Caching Architecture on Vercel

To maintain zero unnecessary CPU usage:

### A. Static Assets & Public Files
* All files in `/public`, `/icons/...`, and image assets MUST be served directly by Vercel Edge CDN without invoking Serverless Functions.
* Required header configuration in `next.config.ts`:
  ```ts
  {
    source: '/icons/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
  },
  {
    source: '/:all*(png|jpg|jpeg|gif|webp|svg|ico)',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }]
  }
  ```
* **STRICT PROHIBITION**: NEVER set `max-age=0, must-revalidate` globally on paths matching static assets.

### B. Mobile Versioning & Stale Chunks
* Never disable HTTP caching to solve stale bundle errors.
* Use client-side error boundaries such as `AutoVersionRefresh.tsx` that detect `ChunkLoadError` or dynamically imported module failures and perform a controlled reload.

### C. Server Components & Layouts
* Root layouts (`app/layout.tsx`) execute on every request if dynamic. Keep queries in `layout.tsx` minimal and cached.
* Do not add `export const runtime = 'edge'` to root layouts unless running exclusively on Cloudflare Pages. On Vercel, it disables static generation for all child pages.

---

## 3. Pre-Change Checklist Before Applying Architecture/Server Changes

Before proposing or modifying any configuration or server-side data layer, answer these 5 questions:

1. **Does this change affect CDN caching?**
   - If yes, verify that static assets remain `immutable` or long-lived.
2. **Will this cause Serverless Functions to wake up more frequently?**
   - Check if client routers will trigger extra function invocations on hover/scroll.
3. **Is this query already available in session?**
   - Check if `session.profile` has the required user data before issuing another `supabase.from('profiles').select(...)`.
4. **Is there any client-side polling?**
   - Do not use polling loops when Supabase Realtime WebSocket connections can push updates event-driven.
5. **Have I explained the trade-offs to the user?**
   - Always state expected resource and performance impacts clearly before execution.
