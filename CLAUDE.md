# PolyGen AI - Project Context for Claude

> This file provides context for AI assistants working on the PolyGen AI codebase.

## Project Overview

PolyGen AI is a text-to-3D model generator SaaS that converts natural language descriptions into 3D-printable OpenSCAD code using a multi-agent AI pipeline.

**Live Site**: [polygen-ai.vercel.app](https://polygen-ai.vercel.app)

## Tech Stack

| Layer        | Technology                                    |
| ------------ | --------------------------------------------- |
| Frontend     | React 19 + TypeScript + Vite 7 + Tailwind CSS |
| 3D Rendering | Three.js + OpenSCAD WASM                      |
| AI (Planner) | Google Gemini API                             |
| AI (Coder)   | Anthropic Claude API                          |
| Auth         | Supabase (email/password + Google OAuth)      |
| Payments     | Stripe Subscriptions                          |
| Hosting      | Vercel (serverless functions)                 |

## Architecture

```
User Prompt
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Planner   │────▶│    Coder    │────▶│  Validator  │
│  (Gemini)   │     │  (Claude)   │     │   (WASM)    │
│             │     │             │     │             │
│ Generates   │     │ Generates   │     │ Compiles &  │
│ GST JSON    │     │ SCAD code   │     │ validates   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                          ┌────────────────────┘
                          │ Error Feedback (max 3 retries)
                          ▼
                    ┌─────────────┐
                    │   Retry     │
                    │ with fixes  │
                    └─────────────┘
```

### Key Concepts

- **GST (Geometric Structure Tree)**: JSON intermediate representation that captures component hierarchy, parameters, and attachment relationships before code generation
- **Unified Pipeline**: Single Claude call for planning + coding (faster but ~44% success rate)
- **Multi-Agent Pipeline**: Separate Gemini/Claude calls with GST (~75% success rate)
- **Manifold Backend**: OpenSCAD WASM with Manifold kernel for 10x faster boolean operations

## Directory Structure

```
polygen-ai/
├── components/          # React components
│   ├── AuthContext.tsx  # Authentication state
│   ├── LandingPage.tsx  # Marketing homepage
│   ├── MainApp.tsx      # Authenticated app wrapper
│   └── ...
├── services/            # Business logic
│   ├── agentOrchestrator.ts   # Pipeline coordination
│   ├── plannerService.ts      # Gemini GST generation
│   ├── coderService.ts        # Claude code generation
│   ├── unifiedGeneratorService.ts # Single-call pipeline
│   ├── scadValidation.ts      # WASM validation
│   ├── errorCategorizer.ts    # Error taxonomy
│   ├── openscadPitfalls.ts    # Common mistakes DB
│   └── ...
├── api/                 # Vercel Edge Functions
│   ├── claude.ts        # Claude API proxy
│   ├── gemini.ts        # Gemini API proxy
│   └── stripe/          # Payment endpoints
├── tests/               # Vitest test suite
└── public/              # Static files
```

## Key Services

### agentOrchestrator.ts

Coordinates the generation pipeline. Supports both unified (single Claude call) and multi-agent (Gemini + Claude) modes. Handles retry logic with error feedback.

### scadValidation.ts

Validates OpenSCAD code using browser-based WASM. Features:

- Manifold geometry kernel (10x faster)
- Two-phase validation (preview/render)
- Manifold mesh checking
- Pre-validation warnings

### errorCategorizer.ts

Categorizes validation errors into 10 types:

- `syntax`, `undefined_var`, `csg_operation`, `empty_geometry`
- `recursion`, `manifold`, `file_io`
- `disconnected`, `scale_mismatch`, `hallucinated_lib` (research-added)

### unifiedGeneratorService.ts

Single Claude call for planning + coding. Uses prompt caching for 50%+ cost reduction.

## Research-Backed Optimizations

Based on deep technical research, these optimizations are implemented or planned:

### Implemented

1. **GST Intermediate Format** - Solves spatial reasoning gap (44% → 75% success)
2. **Error Categorization** - 10 categories with suggested fixes
3. **Pitfalls Database** - 12 common OpenSCAD mistakes
4. **Prompt Caching** - Claude cache_control for cost reduction
5. **Manifold Backend** - 10x faster boolean operations

### Planned (v3.1.0)

1. Response streaming for long generations
2. Web Worker offloading for WASM
3. Visual feedback loop (render → VLM analysis)
4. Parallel variation generation

## Common Patterns

### Generating Code

```typescript
import { orchestrateGeneration } from './services/agentOrchestrator';

const asset = await orchestrateGeneration(
  {
    userPrompt: 'Create a phone stand',
    enableTeachingMode: true,
  },
  callbacks,
  abortSignal
);
```

### Validating Code

```typescript
import { validateScadCode } from './services/scadValidation';

const result = await validateScadCode(scadCode, {
  useManifoldBackend: true, // 10x faster
  previewMode: false, // Full render for export
});
```

### Error Handling

```typescript
import { categorizeErrors, getErrorSummary } from './services/errorCategorizer';

const errors = categorizeErrors(validation.errors, exitCode, scadCode);
console.log(getErrorSummary(errors)); // "syntax: 1, undefined_var: 2"
```

## Environment Variables

```bash
# AI APIs
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
CODER_MODEL=claude-sonnet-4-20250514

# Supabase Auth
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=...
```

## Testing

```bash
pnpm test        # Run tests
pnpm test:ui     # Interactive UI
pnpm test:ci     # CI mode with coverage
```

## Common Issues

### "SCENE IS EMPTY"

The difference() operation removed all geometry. Fix:

- Ensure cutting shapes don't completely consume the base
- Use epsilon (eps = 0.01) for boolean operations

### "Unknown module"

AI hallucinated a library function. Fix:

- Use only built-in OpenSCAD primitives
- No include/use statements

### Slow Validation

Switch to Manifold backend:

```typescript
validateScadCode(code, { useManifoldBackend: true });
```

## Documentation

- [README.md](README.md) - Project overview
- [ROADMAP.md](ROADMAP.md) - Feature roadmap
- [TECHNICAL_STRATEGY.md](TECHNICAL_STRATEGY.md) - Research findings
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [CHANGELOG.md](CHANGELOG.md) - Version history

## Versioning & Release Rules

**IMPORTANT**: When deploying new features or fixes, always update:

### 1. Version Number (all three locations must match)

- `package.json` → `version` field
- `README.md` → version badge at top (`**v3.x.x**`)
- `components/LandingPage.tsx` → footer version display (`v3.x.x`)

### 2. Changelog

Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format:

- Add new version section at top with date
- Categorize changes: Added, Changed, Fixed, Removed, Technical
- Be specific about what changed and why

### 3. Version Increment Rules

- **Patch** (3.0.x): Bug fixes, small improvements
- **Minor** (3.x.0): New features, non-breaking changes
- **Major** (x.0.0): Breaking changes, major rewrites

### Pre-commit Checklist

Before pushing to main:

- [ ] Version updated in all 3 locations
- [ ] CHANGELOG.md has new entry
- [ ] README.md reflects current features
- [ ] Tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)

## Key Decisions

1. **Unified vs Multi-Agent**: Default to unified (faster), but multi-agent has higher success rate
2. **OpenSCAD over alternatives**: Best WASM support for browser-based validation
3. **Claude for coding**: Research shows "King of Code" with near bug-free syntax
4. **Gemini for planning**: Good at structured output (GST JSON)
5. **Manifold kernel**: "Orders of magnitude" faster than CGAL
