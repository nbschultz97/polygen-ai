# Changelog

All notable changes to PolyGen AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.3] - 2026-02-05

### Fixed

- **3D Viewer Output Path Mismatch**: `ScadRenderer.tsx` used relative path `'output.stl'` in `callMain` args but absolute `'/output.stl'` in `readFile`. Both now use absolute paths, matching the openscad-wasm package's own `renderToStl()` implementation.
- **Silent Error Swallowing in 3D Viewer**: `onPrintErr` handler only captured stderr lines containing "error", silently discarding warnings, deprecation notices, and critical WASM messages. Now logs ALL stderr to console and captures errors, warnings, deprecated, not-found, and failed messages.
- **Case-Sensitive Error Check**: Error condition checked `errorLog.includes('ERROR')` (uppercase only), missing mixed-case errors like "Error: undefined variable". Now uses case-insensitive check.
- **Missing Dependency in compileAndRender**: `uploadedStlData` was used in the callback but missing from the React dependency array.

### Changed

- **Planner Prompt Overhaul**: Reduced tactical/military focus, added general-purpose design quality rules including shell construction guidance, functional feature patterns (hinges, snap-fits, latches), dimensional accuracy requirements, and printability constraints.
- **Coder Prompt Overhaul**: Added shell/enclosure construction patterns (`shell_box`, `lid_with_tongue`, `living_hinge`, `snap_clip`), design quality rules requiring hollow shells instead of solid blocks, and functional feature requirements.
- **GST boundingBox Now Required**: Planner prompt instructs Gemini to always include `boundingBox` field in GST output, enabling meaningful sv/sd/pSucc quality metrics instead of defaulting to 1.0.

### Technical

- Added comprehensive diagnostic logging throughout ScadRenderer (stdout, stderr, callMain args/exitCode, readFile errors)
- Added instance validation in `openscadLoader.ts` with detailed error messages when WASM returns unexpected object shapes
- Wrapped `callMain` in try/catch to surface WASM execution failures instead of silent crashes

---

## [3.6.2] - 2026-02-05

### Fixed

- **sv/sd Always Missing from Session Exports**: `validatorClient.ts` only assigned `sv` and `sd` to the validation result inside conditional blocks gated by `input.gst?.boundingBox`. When the GST had no bounding box (common case), the defaults (1.0) were used for pSucc but never written to the result object. Now assigns unconditionally after computation.
- **"Coder edit failed: Unknown error"**: All error catch blocks in `coderService.ts` now use `String(error)` instead of the unhelpful `'Unknown error'` when the caught value is not an Error instance, providing actual error details in the message.

### Added

- **Diagnostic Logging for Volume/BoundingBox Pipeline**: Added console logging in both Worker (`scadValidation.worker.ts`) and `validatorClient.ts` to trace volume/boundingBox data flow from WASM through to the validation result, helping diagnose why these fields can be missing from session exports.
- **ScadRenderer Diagnostic Logging**: Added console logging at WASM init, STL read, and STL parse stages in `ScadRenderer.tsx` to help debug 3D viewer rendering failures.

### Technical

- Removed redundant `validationResult.sv = sv` and `validationResult.sd = sd` assignments inside conditional blocks (now handled by unconditional assignment before pSucc calculation)
- Improved error messages in `coderService.ts` (4 catch blocks updated from `'Unknown error'` to `String(error)`)

---

## [3.6.1] - 2026-02-05

### Fixed

- **STL Metrics Pipeline**: `parseSTLBinary()` now accepts corrected triangle count instead of reading potentially invalid raw STL header values from WASM output, fixing missing `volume` and `boundingBox` in validation results
- **gstMatch Never Assigned**: `validatorClient.ts` computed `gstMatch` as a local variable but never assigned it to `validationResult.gstMatch`, causing session exports to always show undefined

### Added

- **Enhanced Session Export Diagnostics**: Session exports now include SOTA metrics (`pSucc`, `sv`, `sd`), `gstMatch`/`gstDeviationPercent`, and a `pipeline` block with mode and smart fix count for better post-session debugging
- **429 Rate Limit Detection**: `agentOrchestrator.ts` now detects API rate limit (429) responses and surfaces them as actionable error messages
- **WASM Metric Integrity Tests**: 5 new unit tests verifying STL binary parsing, triangle count correction, volume calculation, and bounding box extraction using a synthetic cube STL builder

### Removed

- **Zombie Code Cleanup**: Deleted 88KB of dead code from `src/services/` (coderService.ts, gstTemplates.ts, plannerService.ts) that was duplicated/superseded by `services/`

### Technical

- Added `overrideTriangleCount` parameter to `parseSTLBinary()` in `scadValidation.ts`
- Both call sites (manifold check and metrics extraction) now pass the corrected count
- Added `pSucc`, `sv`, `sd` fields and `pipeline` diagnostics block to `SessionExportData` interface
- Wired new fields in both `MainApp.tsx` and `App.tsx` export builders

---

## [3.6.0] - 2026-02-05

### Added

- **Preview/Render Mode Split (F5/F6 Strategy)**: Fast preview mode with lower `$fn` for rapid iteration; full Manifold render for verification and export. Separate "Preview" and "Verify to Download" buttons in ScadRenderer. Download is gated behind full render verification
- **STL Remix Workflow ("Modification Copilot")**: Upload existing STL files and generate parametric modifications around them using `import("/user_upload.stl")`. Instead of the impossible task of converting mesh to parametric code, wraps the uploaded STL and generates additions/modifications around it
- **Visual Critic Auto-Trigger**: Automatically captures canvas screenshot after 3D render and sends to Claude Vision for quality analysis (orientation, scale, disconnected parts)
- **Parametric GST Template Library**: Pre-built GST templates for tactical parts (Picatinny mounts, MOLLE adapters) to improve generation accuracy for complex assemblies
- **Visual Diff Comparison View**: Side-by-side comparison view for validation results
- **Manifold Guard**: Coder prompt rule preventing non-manifold geometry patterns in generated code
- **Chain of Draft Prompting**: Improved prompting strategy for more reliable code generation
- **No Floating Parts Rule**: Generation constraint ensuring all components are physically connected
- **Hull Heuristic**: Planning and coding prompts now leverage hull-based geometry strategies for complex shapes

### Changed

- **Tactical Dimensional Standards**: Enhanced coder prompt with precise MIL-STD dimensional standards for Picatinny/MOLLE parts
- **$preview Mode Integration**: OpenSCAD `$preview` variable support for conditional detail levels in generated code
- **GST Formalization**: Stricter GST schema validation for more reliable planner output
- **CI Build System**: Switched from pnpm to npm for CI compatibility

### Technical

- Added `STLFileData` interface to types.ts with `data`, `filename`, and `size` fields
- Added `uploadedStlData` to `GeneratedAsset` and full validation pipeline (worker + main thread)
- Added STL mounting in WASM filesystem (`FS.writeFile('/user_upload.stl', ...)`) with cleanup in finally blocks
- Added render mode state management (`'preview' | 'full'`) in ScadRenderer with mode-specific compilation
- Added STL upload UI in MainApp with 50MB limit, `.stl` extension validation, and attachment preview
- Preview mode: `$fn=32` (16 on mobile), no Manifold backend for speed
- Full render mode: Manifold backend enabled, generates verified STL for download
- STL Remix prompt context injected into unified generator with `import()` usage instructions

---

## [3.5.6] - 2026-01-27

### Fixed

- **Critical: WASM Heap Corruption in Volume Calculation**: Volume values were being parsed from corrupt WASM heap memory, resulting in physically impossible values (e.g., `9.08e+95 mm³` instead of ~50,000 mm³). Added sanity checking to reject volumes outside the valid range (1 mm³ to 1 m³). This complements the existing bounding box sanity check that was already filtering corrupt coordinate data

### Technical

- Added volume sanity check to `scadValidation.worker.ts` (Web Worker path)
- Added volume sanity check to `scadValidation.ts` (main thread fallback path)
- Valid volume range: 1 mm³ (MIN_VOLUME) to 1e9 mm³ (MAX_VOLUME = 1 cubic meter)
- Corrupt volumes are now logged and discarded rather than reported in validation results

---

## [3.5.5] - 2026-01-27

### Added

- **Golden Set Verification Protocol**: Added stress-test scripts for verifying Picatinny geometry and polyfill detection system
- **Polyfill Detection Unit Tests**: 9 new tests verifying the `<polyfill_detected>` tag parsing and telemetry payload structure

### Fixed

- **Telemetry Integration Gap**: `detectAndLogPolyfills()` was defined but not called in `generateCode()` and `editCode()` functions. Now properly wired into both code paths to ensure polyfill events are logged to Supabase

### Technical

- Added `tests/golden-set/picatinny-riser-20mm.scad` for Picatinny geometry verification
- Added `tests/golden-set/polyfill-trigger-test.scad` demonstrating the ScopeRefine pattern
- Added `tests/unit/polyfillDetection.test.ts` with 9 tests for polyfill regex and payload validation
- Wired `detectAndLogPolyfills(code)` call into both `generateCode()` and `editCode()` return paths

---

## [3.5.4] - 2026-01-27

### Fixed

- **MIL-STD-1913 Picatinny Dovetail Geometry**: The female Picatinny receiver groove was inverted. The groove opening (top) should be 21.2mm wide to accept the male rail's base, narrowing to 20.6mm at the bottom to grip the rail. Previous implementation had this backwards (narrower at opening), making it non-compliant with MIL-STD-1913

### Added

- **ScopeRefine Architecture**: Coder agent now treats `/libraries/` as READ-ONLY immutable infrastructure. If a library module produces errors, the agent creates a LOCAL polyfill in the user's script rather than suggesting library modifications
- **Polyfill Telemetry**: When the Coder applies a local fix to work around a library issue, it outputs a `<polyfill_detected>` tag that's logged for human review. This enables batched library fixes in controlled deployments

### Technical

- Fixed `linear_extrude` scale ratio in `picatinny_rail` module: `scale = PICATINNY_RAIL_BASE_WIDTH / PICATINNY_RAIL_TOP_WIDTH` (was inverted)
- Fixed polygon coordinates in `picatinny_groove` module to have wider opening
- Added ScopeRefine rules to both `CODER_SYSTEM_PROMPT` and `EDIT_SYSTEM_PROMPT`
- Added `detectAndLogPolyfills()` function with telemetry integration

---

## [3.5.3] - 2026-01-27

### Fixed

- **Standalone Code Export**: Generated code that uses `use <libraries/tactical.scad>` now works in desktop OpenSCAD. The library is automatically inlined into the generated code, making it fully self-contained. Previously, users would get "can't open library" errors when opening exported code in desktop OpenSCAD

### Technical

- Added `TACTICAL_LIBRARY_INLINE` constant containing all tactical module definitions
- Added `inlineTacticalLibrary()` function to replace `use <libraries/tactical.scad>` with actual module code
- Called in both `generateCode()` and `editCode()` post-processing

---

## [3.5.2] - 2026-01-27

### Fixed

- **ScadRenderer Library Mounting**: ScadRenderer was creating its own OpenSCAD instance without mounting the tactical library to `/libraries/`. Code using `use <libraries/tactical.scad>` would compile in validation (which mounts libraries) but produce empty geometry in the 3D preview (which didn't). Now uses `createOpenSCADInstance()` which properly mounts all built-in libraries

### Technical

- Replaced manual `loadOpenSCAD()` + instance creation in ScadRenderer with `createOpenSCADInstance()` helper
- This ensures `/libraries/tactical.scad` is mounted before rendering code that depends on it

---

## [3.5.1] - 2026-01-27

### Fixed

- **Hallucinated Tactical Modules**: Claude was inventing non-existent modules like `picatinny_dovetail_female` instead of using the correct `picatinny_rail`. Added full module signature list to EDIT_SYSTEM_PROMPT with explicit warning against hallucinating modules
- **Unknown Module Detection**: Validation now detects "Ignoring unknown module" warnings for tactical modules and returns `success: false` with $L_{sig}$ recovery prompt. Previously returned `success: true` with warning, allowing bad code to pass
- **Edit Flow Module Awareness**: EDIT_SYSTEM_PROMPT now lists all 9 available tactical.scad modules with their exact signatures, preventing edits from breaking working code

### Technical

- Added `isTacticalModule()` and `generateTacticalRecoveryPrompt()` imports to scadValidation.ts
- Added unknown module pattern detection in validation success path
- EDIT_SYSTEM_PROMPT now includes complete tactical module reference block

---

## [3.5.0] - 2026-01-27

### Added

- **P_succ Scoring**: Success probability metric `P_succ = M * (0.65*Sv + 0.35*Sd)` combining manifold status (M), volumetric similarity (Sv), and dimensional similarity (Sd). Provides quantitative confidence for validation results
- **Vision ROI Gating**: Smart triggering for expensive VLM calls. Only invokes Visual Critic when P_succ is in the uncertain zone (0.8-0.95). Below 0.8 = clear geometric fail, above 0.95 = clear pass
- **6x6 Visual Anchor Grid**: Toggle-able reference grid in ScadRenderer with color-coded corner markers (red/green/blue/yellow). Helps VLM spatial reasoning for orientation analysis
- **Atomic LMP Rule**: New rule #4 in Coder prompts requiring each GST component be wrapped in its own module with local variables. Prevents variable shadowing bugs in large assemblies
- **$L_{sig}$ Protocol**: Unknown module recovery system. Detects tactical library modules in "Unknown module" errors and provides exact function signatures for Claude to retry with correct syntax

### Fixed

- **WASM Heap Data Leak**: STL data from `FS.readFile()` was a VIEW into WASM heap, not a copy. Using `stlData.buffer` parsed the entire heap, producing garbage bounding box values (8.48e-33 to 1.86e+34). Fixed with explicit `new Uint8Array(rawStl)` copy
- **Tactical Library Auto-Injection**: Prompt contradiction between generation and edit prompts ("NO libraries" rule conflicted with tactical library instructions). Fixed with Tactical Guard that auto-injects `use <libraries/tactical.scad>` when picatinny*/molle* modules are detected
- **Bounding Box Sanity Checks**: Enhanced validation to reject subnormal/denormalized values (< 1e-6), coordinates > 10m, and unrealistic dimensions. Returns null for corrupt data instead of garbage values

### Technical

- Added `pSucc`, `sv`, `sd` fields to ValidationResult type in types.ts
- Created `calculatePsucc()` and `shouldTriggerVision()` functions in validatorClient.ts
- Added 6x6 anchor grid with Three.js Group in ScadRenderer.tsx (Grid3X3 toggle button)
- Added `TACTICAL_MODULE_SIGNATURES` map and `generateTacticalRecoveryPrompt()` in errorCategorizer.ts
- Updated Coder prompts with Atomic LMP pattern (module encapsulation with local\_ prefixed variables)
- All 118 tests passing

---

## [3.4.0] - 2026-01-27

### Added

- **3-Tier Library System**: Built-in tactical library (`tactical.scad`) automatically mounted in WASM filesystem at `/libraries/`. Use with `use <libraries/tactical.scad>`. Includes MIL-STD-1913 Picatinny rail and TW-PL-507F MOLLE clip modules with proper specifications
- **Visual Critic Service**: Claude Vision integration for post-render visual analysis. Detects inverted text, disconnected parts, scale mismatches, and other visual issues that geometric validation misses
- **Diff-Based Editing**: New `fixBrokenModule()` and `smartFix()` functions in coderService.ts. On validation error, requests only the broken module and patches it back, reducing token usage and preserving working code
- **Projection Guard**: Detects 2D projection operations (laser cutting, DXF export) and returns user-friendly error explaining these aren't supported in browser WASM
- **Interrogator System**: Detects under-specified complex prompts (gears, threads, hinges, mechanisms, snap-fits, bearings) with <20 words and returns targeted clarification questions before generation
- **Benchmark Suite**: Golden set with 10 hard prompts (snap-fit lid, rack and pinion, living hinge, threaded cap, ball bearing holder, cam mechanism, dovetail joint, spring clip, planetary gear, picatinny phone mount). Measures Sv (volumetric similarity) and Sd (dimensional accuracy)
- **GitHub Library Scraper**: `librarySearchService.ts` discovers external OpenSCAD libraries from GitHub based on prompt keywords
- **Refactoring Agent**: `refactoringAgent.ts` strips top-level geometry, parameterizes magic numbers, and validates scraped library modules for compatibility

### Technical

- Created `public/libraries/tactical.scad` with 9 modules: `picatinny_rail()`, `picatinny_rail_male()`, `picatinny_groove()`, `molle_clip()`, `molle_adapter_plate()`, `picatinny_molle_adapter()`, `rcube()`, `counterbore()`, `tube()`
- Updated `openscadLoader.ts` with library caching, WASM filesystem mounting, and `checkForProjection()` guard
- Added `visualCriticService.ts` with canvas screenshot capture and Claude Vision API integration
- Updated `validatorClient.ts` with `validateWithVisualCritic()` function
- Added `interrogatePrompt()` and `generateInterrogatorQuestions()` to agentOrchestrator.ts
- Created `tests/benchmark/goldenSet.json` and `benchmarkRunner.ts` with Sv/Sd calculation algorithms
- Updated system prompts in unifiedGeneratorService.ts and coderService.ts with library signatures (not full code)

---

## [3.3.1] - 2026-01-27

### Fixed

- **Code Extraction Robustness**: Improved `extractScadCode()` to find code blocks anywhere in Claude's response using regex matching. Previously only handled code at start/end of response, causing syntax errors when Claude output explanations first
- **Triangle Count Validation**: Added 1M triangle cap and file-size cross-validation. Previously, malformed STL headers could report 892M triangles despite small actual file size
- **Warning on Corrected Triangle Count**: Now surfaces a warning to users when triangle count is corrected, indicating potential STL parsing issues

### Technical

- Enhanced regex in `extractScadCode()`: now uses `/```(?:openscad|scad)?\s*\n([\s\S]*?)```/` to find code blocks anywhere in text
- Added fallback heuristic to detect code start by looking for OpenSCAD patterns (comments, variable assignments, module declarations)
- Added `triangleCountCorrected` flag in scadValidation.ts to track when sanity check modifies the value
- All 118 tests passing

---

## [3.3.0] - 2026-01-27

### Added

- **SOTA Complexity Router**: Auto-detects complex requests (assembly, mount, adapter, picatinny, molle, etc.) and forces Multi-Agent (GST) pipeline for higher fidelity (75% vs 44% success rate)
- **SOTA Active Critic**: Implements Dimensional Accuracy (Sd) formula to compare generated geometry against target dimensions. Triggers retry with specific feedback on >20% mismatch
- **SOTA Teaching Mode (Micro-Lib)**: System prompt now includes educational comments explaining WHY to use each helper pattern (rcube for impact resistance, tube for weight reduction, step_hole for supports-free printing)
- **Step Hole Pattern**: New `step_hole` module for printing vertical holes without supports using graduated diameter

### Fixed

- **Critical Memory Leak**: OpenSCAD WASM instances now explicitly call `instance.delete()` to free C++ objects from WASM heap. Previously, memory accumulated ~10-50MB per render, causing heap exhaustion after 5-10 renders on mobile devices
- **Claude Explanation Text in SCAD Output**: Claude sometimes outputs explanation text before the code block ("Looking at this design..."). Enhanced `extractScadCode` function now searches for code blocks anywhere in the response and strips non-OpenSCAD text
- **STL Triangle Count Garbage Values**: Triangle counts like 892M were being displayed. Improved parsing to calculate actual triangles from file size and cap at 1M max

### Technical

- Added complexity keyword regex: `assembly|parts|mechanism|gear|hinge|housing|enclosure|case|bracket|mount|adapter|joint|contact|fit|connect|multi|picatinny|molle|rail`
- Enhanced `extractScadCode()` in both coderService.ts and unifiedGeneratorService.ts to handle explanation text before code blocks
- Improved STL triangle count parsing in scadValidation.ts with file-size validation and 1M cap
- Added `calculateDimensionalAccuracy()` function with Sd formula: `Sd = 1 - |Dg - Dt| / Dg`
- Updated `cleanupInstance()` in openscadLoader.ts to call `instance.delete()` for WASM heap cleanup
- Enhanced UNIFIED_SYSTEM_PROMPT with Micro-Lib section and educational example comments

---

## [3.2.2] - 2026-01-27

### Fixed

- **Edit Mode Ignoring Fundamental Dissatisfaction**: When users said "not right at all" or similar phrases, the system kept making minor edits instead of regenerating. Now detects these phrases and triggers full redesign
- **MOLLE Clips Wrong Geometry**: Generated MOLLE clips were just rectangular blocks with cuts, not actual hook-style clips. Added proper MOLLE clip module pattern to Coder prompt
- **Female Picatinny Groove Orientation**: Dovetail groove was oriented incorrectly. Added proper female Picatinny groove module with correct dimensions (21.2mm base, 20.6mm top)
- **STL Triangle Count Garbage Data**: 757M triangle count was being reported due to malformed STL parsing. Added sanity check to validate triangle count against actual file size

### Added

- **needsFullRegeneration Detection**: New function detects phrases like "not right", "start over", "completely wrong", "try again" to bypass edit mode and trigger full regeneration
- **Tactical Gear Module Patterns**: Added `picatinny_groove()` and `molle_clip()` module patterns to Coder system prompt with proper MIL-STD-1913 and MOLLE dimensions

### Technical

- Added `needsFullRegeneration()` function to agentOrchestrator.ts with 15 pattern matchers
- Both unified and multi-agent pipelines now check for dissatisfaction before entering edit mode
- Added STL triangle count sanity check: validates against file size, caps at 10M, estimates from actual size if mismatch
- Added 7 new tests for `needsFullRegeneration()` detection

---

## [3.2.1] - 2026-01-26

### Fixed

- **Conversation History Bug**: Planner was ignoring conversation history - user answers to clarification questions were not being included in the prompt, causing the planner to generate incomplete designs
- **Wrong Output for Complex Assemblies**: When users asked for multi-part assemblies (e.g., "Picatinny mount + plate + MOLLE clips"), the planner was only generating simple plates with holes instead of the full assembly

### Added

- **Complex Assembly Example**: Added comprehensive example to planner prompt showing how to structure multi-part tactical assemblies with Picatinny mounts, center plates, and MOLLE clips
- **Conversation History in Planner Prompt**: Planner now explicitly includes conversation history with a reminder to use the user's previous answers

### Technical

- Modified `plannerService.ts` to build prompt with `## CONVERSATION HISTORY` section
- Added "IMPORTANT: The user has ALREADY provided answers above" instruction to prevent repeated questions

---

## [3.2.0] - 2026-01-26

### Added

- **SOTA Benchmark Metrics**: Validation now calculates bounding box (Dimensional Accuracy Sd) and mesh volume (Volumetric Similarity Sv) for quality assessment
- **Truncation Detection**: Streaming client now detects `max_tokens` truncation and throws an error to prevent incomplete code execution
- **Complexity Guard**: Pre-render analysis detects high `$fn` values and threading patterns, applies safe settings on mobile to prevent browser crashes

### Technical

- Added `calculateBoundingBox()` and `calculateVolume()` functions to scadValidation.ts
- Added `boundingBox` and `volume` fields to ValidationResult interface
- Streaming client checks for `stop_reason === 'max_tokens'` in message events
- ScadRenderer analyzes code complexity before render

---

## [3.1.2] - 2026-01-26

### Fixed

- **Clarification Questions Persisting**: Fixed race condition where clarification questions stayed visible after user answered them
- **3D Preview Not Rendering**: Fixed timing issue where view switched to 3D before code was ready, causing empty renders
- **Edit Mode Error Detection**: Edit mode now detects vague error reports ("doesn't work", "broken") and reviews code for common issues
- **Validation Error Passing**: Edit mode now receives previous validation errors to help fix specific issues

### Changed

- **Enhanced Planner Questions**: Planner now asks 3-4 specific questions for multi-part assemblies with examples (e.g., "How many Picatinny slots? 3-slot, 5-slot?")
- **Moved View Switch**: Auto-switch to 3D view now happens after asset is set, preventing empty previews

### Technical

- Added `validationErrors` field to `CoderEditInput` type
- Orchestrator passes validation errors to edit mode coder
- Fixed async state race condition in MainApp.tsx clarification clearing

---

## [3.1.1] - 2026-01-26

### Changed

- **Multi-Agent Pipeline Default**: Now uses Gemini (Planner) → GST → Claude (Coder) by default for 75% success rate vs 44% unified
- **Improved Clarification Questions**: AI now asks follow-up questions for multi-part assemblies even with tactical/military terms (Picatinny, MOLLE)
- **Auto-Render on Generation**: 3D preview automatically renders when code is first generated
- **Auto-Switch to 3D View**: Switches to preview tab after successful generation

### Fixed

- **Complex Designs**: Requests like "Picatinny mount + plate + MOLLE clips" now ask clarifying questions instead of generating rectangles
- **Re-render After Edits**: Users can now regenerate 3D preview after editing code

### Technical

- Updated agentOrchestrator.test.ts mocks for multi-agent pipeline

---

## [3.1.0] - 2026-01-26

### Added

- **Version Display**: Footer now shows current app version
- **Versioning Rules**: CLAUDE.md includes pre-commit checklist for version updates

### Fixed

- **Mobile Accessibility**: Touch targets increased to 44px minimum (Apple HIG)
  - ChatInput send/image/clear buttons
  - AuthModal close button
  - SettingsPanel close button
- **Responsive Grids**:
  - DesignTemplates: 2 columns on mobile, 3 on desktop
  - SettingsPanel: Single column on mobile
- **Text Legibility**: Increased 9px text to 11px minimum
- **Mobile Keyboards**: Added `inputMode` attributes for proper keyboard on iOS/Android
- **Aria Labels**: Added accessibility labels to icon buttons
- **Worker Type**: Fixed `DedicatedWorkerGlobalScope` type for WASM worker

### Technical

- TypeScript fixes for scadValidation.worker.ts
- Linter compliance for empty catch blocks

---

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
