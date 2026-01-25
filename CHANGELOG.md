# Changelog

All notable changes to PolyGen AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-01-24

### Added
- **Complete SaaS Monetization Layer**
  - User authentication with Supabase (email/password + Google OAuth)
  - Subscription payments via Stripe (checkout, portal, webhooks)
  - 3-tier pricing: Free (5/mo), Pro $19 (100/mo), Enterprise $99 (unlimited)
  - Usage tracking and generation limits per tier

- **New Pages & Components**
  - `LandingPage.tsx` - Marketing homepage with hero, features, testimonials
  - `PricingPage.tsx` - Interactive pricing table with plan comparison
  - `AnalyticsDashboard.tsx` - User stats, usage tracking, subscription management
  - `AuthModal.tsx` - Login/signup modal with Google OAuth
  - `UsageLimitModal.tsx` - Upgrade prompt when limits reached
  - `OnboardingTour.tsx` - 6-step guided tour for new users
  - `FAQ.tsx` - SEO-optimized FAQ accordion (8 questions)
  - `PrivacyPolicy.tsx` - Legal page
  - `TermsOfService.tsx` - Legal page

- **Growth Features**
  - `ReferralSystem.tsx` - Refer-a-friend program with bonus generations
  - `EmailCapture.tsx` - Waitlist/newsletter signup
  - `ShareModel.tsx` - Social sharing for generated models

- **Backend (Vercel Edge Functions)**
  - `api/stripe/create-checkout.ts` - Stripe checkout session creation
  - `api/stripe/create-portal.ts` - Customer portal for subscription management
  - `api/stripe/webhook.ts` - Subscription lifecycle event handling
  - `api/health.ts` - Health check endpoint for monitoring

- **Services**
  - `authService.ts` - Supabase auth integration with tier management
  - `stripeService.ts` - Stripe API integration
  - `analytics.ts` - Google Analytics 4 event tracking

- **Database (Supabase)**
  - `user_profiles` table with tier, usage limits, Stripe customer ID
  - `generation_history` table for tracking all generations
  - `referrals` table for tracking referral conversions
  - `email_subscribers` table for newsletter signups
  - Row Level Security (RLS) policies for data protection

- **SEO & Marketing**
  - Open Graph and Twitter Card meta tags
  - JSON-LD structured data (SoftwareApplication, FAQPage, Organization)
  - XML sitemap and robots.txt
  - PWA manifest
  - Product Hunt launch playbook with templates
  - Email marketing sequences (welcome, onboarding, upgrade)
  - Keyword research and content strategy

- **Documentation**
  - `DEPLOYMENT.md` - Complete deployment guide for Supabase, Stripe, Vercel
  - `BUILD_SUMMARY.md` - Summary of all SaaS components built
  - Pre-launch checklist

### Changed
- `App.tsx` now uses `AppRouter` for client-side routing
- `index.tsx` initializes analytics and wraps app in `AuthProvider`
- `index.html` updated with SEO meta tags and structured data
- Header shows user auth state and dashboard link

### Technical
- Added dependencies: `@supabase/supabase-js`, `@stripe/stripe-js`
- React Context for global auth state management
- Vercel Edge Functions for serverless API
- Google Analytics 4 integration with custom events

---

## [2.2.0] - 2026-01-24

### Added
- **Closed-Loop Validation Feedback**: 3-attempt retry system with escalating guidance
  - `errorCategorizer.ts`: Parses errors into 7 categories (syntax, undefined_var, csg_operation, empty_geometry, recursion, manifold, file_io)
  - `openscadPitfalls.ts`: Database of 12 common OpenSCAD mistakes with bad/good examples
  - `validationFeedbackBuilder.ts`: Builds retry prompts that escalate from basic to emergency simplification
- **Teaching Mode**: Educational annotations for generated code
  - `codeExplainer.ts`: Adds inline comments explaining OpenSCAD constructs
  - Concept detection and learning tips
  - Toggle in user preferences (on by default)
- **Manifold Geometry Checking**: STL mesh quality analysis
  - Detects boundary edges (open mesh)
  - Detects non-manifold edges (multiple faces sharing edge)
  - Identifies degenerate triangles (zero area)
- **Auto-Preprocessing**: Automatic code fixes before validation
  - Auto-injects `eps = 0.01` for boolean operations
  - Auto-injects `$fn = 64` for smooth curves
- **Component Type Taxonomy**: Standardized GST types mapped to OpenSCAD
  - Primitives: cuboid, cylinder, sphere, cone
  - Compound: tube, rcube (rounded cuboid), wedge
  - Functional: screw_hole, counterbore, slot, chamfer, fillet
- **Enhanced Tactical Standards**: Detailed specs for tactical gear
  - Complete Picatinny rail dimensions (MIL-STD-1913)
  - MOLLE/PALS webbing specs and clip design guidelines
  - Quick release pin specifications

### Fixed
- **Edit Mode Component Preservation**: Edits now preserve relationships between components
  - System checks how changes affect other parts
  - Warns about clearance and dependency issues
  - "Round the plate" no longer destroys attached clips

### Changed
- **Increased Retry Attempts**: 3 attempts (up from 2) with smarter feedback
- **Enhanced Planner Prompt**: Full component taxonomy with parameter formats
- **Enhanced Coder Prompt**: OpenSCAD rules, GST mapping, error prevention checklist
- **CDN Fallbacks**: Added multiple OpenSCAD WASM CDN sources for better reliability

### Technical
- New services: `errorCategorizer.ts`, `openscadPitfalls.ts`, `validationFeedbackBuilder.ts`, `codeExplainer.ts`
- Integration tests in `tests/integration/pipeline.test.ts`
- Teaching mode preference in `preferencesService.ts`

## [2.1.0] - 2026-01-24

### Added
- **Concept Preview**: AI-generated preview image shows in right panel while code is being generated
  - Uses Gemini Imagen to create visual concept from GST structure
  - Displays during planning/coding phase for immediate visual feedback

### Fixed
- **Clarification Loop**: Planner no longer asks repetitive questions; uses industry standards by default
- **Clarifications UI**: Panel now clears when user responds instead of persisting
- **Claude API CORS**: Added proper proxy configuration with required Anthropic headers

### Changed
- **Planner Prompt**: Rewrote to prioritize building over asking; max 1 round of questions
- **Coder Prompt**: Cleaner output style - removed formulaic "=== SECTION ===" banners
- **Code Quality**: Generated OpenSCAD now reads like human-written code
- **Domain Knowledge**: Added MOLLE/PALS and Picatinny (MIL-STD-1913) specs to both agents

### Technical
- Added Vite proxy for Claude API (`/api/claude` → `api.anthropic.com`)
- Fixed TypeScript errors in plannerService (ThinkingLevel type)

## [2.0.0] - 2026-01-24

### Added
- **Multi-Agent Pipeline**: New architecture with specialized AI agents
  - **Planner Agent (Gemini 3 Pro)**: Generates Geometric Structure Tree (GST) from natural language
  - **Coder Agent (Claude Sonnet)**: Converts GST to BOSL2-based OpenSCAD code
  - **Validator**: Browser-based WASM validation with auto-retry on failure
- **Geometric Structure Tree (GST)**: Intermediate JSON representation capturing semantic model structure
- **Smart Quick Fixes**: Context-aware refinement suggestions based on GST component types
  - Fixes grouped by category: tolerance, dimension, structure, print, geometry
  - Dynamic suggestions based on detected components (gears, threads, holes, etc.)
- **Symbolic Correction**: Edit requests modify only relevant parameters instead of full regeneration
- **Feature Flag**: `USE_MULTI_AGENT` environment variable to toggle between pipelines
- **New Services**:
  - `plannerService.ts` - Gemini GST generation
  - `coderService.ts` - Claude SCAD code generation
  - `agentOrchestrator.ts` - Pipeline coordination
  - `quickFixAnalyzer.ts` - Smart fix generation
- **New Components**:
  - `SmartQuickFixes.tsx` - Category-grouped refinement buttons

### Changed
- Upgraded to React 19
- Upgraded to Vite 6
- Header shows active mode: "Multi-Agent" (purple) or "Gemini 3 Pro" (green)
- Workflow states now include: planning, coding, validating (in addition to processing)

### Architecture
- Fully serverless - all validation runs in browser via OpenSCAD WASM
- No backend required - API calls made directly from frontend
- Graceful degradation: falls back to single-agent mode without Claude API key

## [1.4.0] - 2026-01-24

### Added
- **Design Templates**: 9 quick-start templates (phone stand, box with lid, cable organizer, L-bracket, control knob, divided tray, wall hook, custom spacer, tool holder)
- **STL Export**: Download STL files directly from the 3D preview
- **Image Input**: Upload photos to recreate objects as 3D models (multimodal generation)
- **Expanded SCAD Kernel**:
  - Threads: `ext_thread`, `int_thread`, `threaded_boss`
  - Gears: `spur_gear`, `rack_gear`
  - Bearings: `bearing_pocket`, `bearing_seat`, `shaft_shoulder`
  - Hinges: `pip_hinge`, `living_hinge`, `hinge_leaf`

## [1.3.0] - 2026-01-24

### Changed
- Upgraded to Gemini 3 Pro (`gemini-3-pro-preview`)
- Changed from `thinkingBudget` to `thinkingLevel` parameter (low/medium/high)

## [1.2.0] - 2026-01-23

### Added
- User preferences panel (printer settings, tolerances, material presets)
- Recent designs history
- Web search grounding (optional, via Google Search API)
- Clarification questions with clickable suggested answers

### Changed
- Improved system prompt for better print-ready designs

## [1.1.0] - 2026-01-22

### Added
- Quick fix buttons (tolerances, scaling, wall thickness)
- Code syntax highlighting
- Copy code to clipboard
- Download `.scad` file
- Open in OpenSCAD desktop app

### Fixed
- Z-fighting in boolean operations (EPSILON handling)
- Manifold geometry issues

## [1.0.0] - 2026-01-21

### Added
- Initial release
- Natural language to OpenSCAD code generation
- In-browser 3D preview with Three.js
- OpenSCAD WASM compilation
- Built-in SCAD kernel with utility modules:
  - Fasteners: `countersunk_hole`, `hex_nut_trap`, `screw_boss`
  - Fillets: `fillet_2d`, `chamfer_2d`
  - Patterns: `polar_pattern`, `grid_pattern`, `honeycomb`
  - Structural: `rib`, `slot`, `snap_tab`
- Fit constants: `FIT_TIGHT`, `FIT_NORMAL`, `FIT_LOOSE`
