# PolyGen AI v3.9.0 — Improvements Summary

Branch: `improvements` | Date: 2026-02-13

## Changes Shipped

### 🎯 Priority 1: Anonymous Demo Mode

- **`services/demoService.ts`** — localStorage-based demo tracking (max 2 generations, `canDemoGenerate()` / `recordDemoGeneration()` API)
- **`components/DemoApp.tsx`** — Simplified 3-panel app (chat/code/3D preview) for anonymous users. Template prompts, no auth needed, limit modal with signup CTA.
- **`api/demo-generate.ts`** — Vercel edge function proxying to Gemini/Claude without auth. Stricter rate limits (5 req/min per IP vs 20 for authenticated), 500 char prompt limit.
- **`components/AppRouter.tsx`** — Added `/demo` route with lazy-loaded DemoApp
- **`components/LandingPage.tsx`** — "Try It Free — No Signup" button launches demo mode directly

### 🎨 Priority 2: Landing Page Polish

- **Hero copy rewritten**: "Describe it. Print it. AI does the CAD." — clearer value prop
- **Fixed misleading CTA**: Removed "No account required. Try it now." → now says "2 free generations without an account. Sign up for 5/month free tier."
- **Fixed duplicate buttons**: Header had two identical "Get Started" buttons → now "Sign In" + "Try Demo"
- **Bottom CTA**: Split into "Try Demo Free" + "Create Account" with accurate copy
- **Mobile menu**: Same fixes applied

### 🛠️ Priority 3: Developer Experience

- **`.env.example`** rewritten with:
  - Quick Start header explaining minimum config (just 2 API keys)
  - Clear comments on which services are optional
  - Notes about demo mode working without Supabase/Stripe
- **`README.md`** — Added 4-step Quick Start section for local dev
- Note on graceful degradation when API keys are missing

### ⚡ Priority 4: Generation Reliability

- **3 new few-shot examples** added to coder system prompt (`services/coderService.ts`):
  1. **Desk shelf/riser** — Hollow shell with cable routing (furniture pattern)
  2. **Raspberry Pi enclosure** — Shell with ventilation slots and port cutouts (electronics enclosure pattern)
  3. **L-bracket with mounting holes** — Fillet reinforcement and proper hole placement (mechanical part pattern)
- These examples teach the coder common patterns for the most-requested object categories

### 📋 Housekeeping

- Version bumped to **3.9.0** in: `package.json`, `README.md`, `services/geminiService.ts`
- `CHANGELOG.md` updated with full v3.9.0 entry
- All 302 tests pass ✅
- TypeScript compiles cleanly ✅
- Branch pushed to `origin/improvements`

## Files Changed (11)

| File                         | Change                               |
| ---------------------------- | ------------------------------------ |
| `.env.example`               | Rewritten with better docs           |
| `CHANGELOG.md`               | v3.9.0 entry                         |
| `README.md`                  | Version bump + Quick Start           |
| `api/demo-generate.ts`       | **NEW** — anonymous demo endpoint    |
| `components/AppRouter.tsx`   | Demo route + DemoApp lazy load       |
| `components/DemoApp.tsx`     | **NEW** — simplified demo app        |
| `components/LandingPage.tsx` | CTA fixes, hero rewrite, demo button |
| `package.json`               | Version 3.9.0                        |
| `services/coderService.ts`   | 3 new few-shot examples              |
| `services/demoService.ts`    | **NEW** — localStorage demo tracking |
| `services/geminiService.ts`  | Version 3.9.0                        |
