# PolyGen AI Roadmap

This document outlines planned features and improvements for PolyGen AI, informed by deep technical research on AI-driven CAD generation.

## Current Version: 3.6.1

See [CHANGELOG.md](CHANGELOG.md) for release history.
See [TECHNICAL_STRATEGY.md](TECHNICAL_STRATEGY.md) for research-backed architecture decisions.

---

## Completed

### v3.6.1 - STL Metrics Pipeline & Diagnostics

- [x] Fixed STL metrics pipeline (volume/boundingBox missing due to raw header triangle count)
- [x] Fixed gstMatch never assigned to validation result
- [x] Enhanced session export with SOTA metrics (pSucc, sv, sd) and pipeline diagnostics
- [x] Added 429 rate limit detection in orchestrator
- [x] Added WASM metric integrity tests (5 unit tests)
- [x] Deleted 88KB zombie code from src/services/

### v3.6.0 - Preview/Render Split & STL Remix

- [x] Preview/Render mode split (F5/F6 strategy) for fast iteration + verified export
- [x] STL Remix "Modification Copilot" workflow (upload STL, generate modifications around it)
- [x] Visual Critic auto-trigger after 3D render
- [x] Parametric GST template library for tactical parts
- [x] Visual diff comparison view for validation
- [x] Manifold Guard, Chain of Draft, No Floating Parts rules
- [x] Hull Heuristic in planner/coder prompts
- [x] $preview mode and GST formalization

### v3.5.x - SOTA Quality & Reliability

- [x] P_succ scoring (M * 0.65*Sv + 0.35\*Sd) with Vision ROI gating
- [x] 6x6 Visual Anchor Grid for VLM spatial reasoning
- [x] Atomic LMP rule and $L_{sig}$ protocol for error recovery
- [x] WASM heap data leak fix (STL buffer copy)
- [x] Volume sanity checking for corrupt WASM heap data
- [x] Golden Set verification protocol + polyfill detection
- [x] ScopeRefine architecture (read-only libraries, local polyfills)
- [x] Standalone code export with inlined tactical library
- [x] SOTA Complexity Router (auto-detect complex → multi-agent)
- [x] SOTA Active Critic with Dimensional Accuracy (Sd)
- [x] Memory leak fix (instance.delete() for WASM heap cleanup)

### v3.4.0 - SOTA Architecture

- [x] 3-Tier Library System with tactical.scad (Picatinny/MOLLE modules)
- [x] WASM filesystem library mounting
- [x] Visual Critic with Claude Vision integration
- [x] Diff-based code editing (fixBrokenModule, smartFix)
- [x] Projection guard for 2D operations
- [x] Interrogator for under-specified complex prompts
- [x] Benchmark suite with 10 golden set prompts (Sv/Sd metrics)
- [x] GitHub library scraper service
- [x] Refactoring agent for code cleanup

### v3.0.0 - SaaS Platform

- [x] User authentication with Supabase (email/password + Google OAuth)
- [x] Subscription payments via Stripe (checkout, portal, webhooks)
- [x] 3-tier pricing: Free (5/mo), Pro $19 (100/mo), Enterprise $99 (unlimited)
- [x] Usage tracking and generation limits per tier
- [x] Landing page, pricing page, analytics dashboard
- [x] Referral system with bonus generations

### v2.2.0 - Reliable Code Generation

- [x] Closed-loop validation with 3-attempt retry system
- [x] Error categorization (7 categories with suggested fixes)
- [x] OpenSCAD pitfalls database (12 common mistakes)
- [x] Auto-preprocessing (epsilon injection, $fn defaults)
- [x] Manifold geometry checking
- [x] Teaching mode with educational annotations

### v2.1.0 - Concept Preview

- [x] AI-generated preview image during code generation
- [x] Clarification loop improvements
- [x] Claude API CORS fixes
- [x] Cleaner code output style

### v2.0.0 - Multi-Agent Pipeline

- [x] Planner Agent (Gemini) for GST generation
- [x] Coder Agent (Claude Sonnet) for SCAD code generation
- [x] Browser-based WASM validation
- [x] Geometric Structure Tree (GST) intermediate format
- [x] Smart Quick Fixes with context-aware suggestions
- [x] Symbolic Correction for surgical edits

### v1.x - Foundation

- [x] Natural language to OpenSCAD
- [x] Image-to-3D generation
- [x] In-browser 3D preview
- [x] STL export
- [x] Design templates
- [x] User preferences

---

## v3.1.0 - Performance Optimization (Research-Driven) 🔬

**Priority: Critical** - Based on technical research showing 10x+ performance gains

### Manifold Geometry Kernel

- [x] Switch OpenSCAD WASM from CGAL to Manifold backend ✅ v3.5.0
- [x] "Orders of magnitude" faster boolean operations ✅ v3.5.0
- [x] Reduced memory footprint for complex models ✅ v3.3.0 (instance.delete())

### API Optimization

- [x] Response streaming for 30-60s generation times ✅ v3.5.0
- [x] Prompt caching (50%+ cost reduction on Claude calls) ✅ v3.5.0
- [x] Web Worker offloading for WASM execution ✅ v3.5.0

### Validation Pipeline

- [x] Two-phase validation: preview() for iteration, render() for export ✅ v3.6.0
- [ ] Parallel variation generation (3 candidates, pick best)
- [x] Visual feedback loop (render PNG → feed back to VLM) ✅ v3.4.0

### Enhanced Error Recovery

- [x] Add "Disconnected Geometry" error category ✅ v3.5.0
- [x] Add "Scale Mismatch" detection (volume vs GST intent) ✅ v3.5.0
- [x] Add "Hallucinated Library" detection (unknown functions) ✅ v3.5.0

---

## v3.2.0 - Multi-Agent Intelligence

**Priority: High** - Research shows GST intermediate format improves success rate from 44% to 75%+

### Pipeline Optimization

- [x] Enable multi-agent (GST) pipeline as default ✅ v3.1.1
- [ ] A/B testing infrastructure for pipeline comparison
- [ ] Success rate tracking per pipeline type

### Visual Reasoning

- [x] VLM component assignment (90.6% user preference in research) ✅ v3.4.0 Visual Critic
- [ ] Image-to-GST direct conversion
- [ ] Sketch-to-Prototype support (hand-drawn → CAD)

### Symbolic Patching

- [x] Diff-based code updates (preserve token context) ✅ v3.4.0
- [ ] Variable-level edits without full regeneration
- [ ] GST-aware parameter propagation

---

## v3.3.0 - Quality of Life

- [ ] Model history with thumbnails
- [ ] Undo/redo for code edits
- [ ] Keyboard shortcuts (Ctrl+Enter to generate, etc.)
- [ ] Dark/light theme toggle
- [ ] Mobile-responsive layout improvements
- [ ] GST visualization panel

---

## v3.7.0 - Advanced Editing

- [ ] Direct SCAD code editing with live preview
- [ ] Parameter sliders for real-time dimension adjustments
- [x] Multi-part assembly support (tactical assemblies) ✅ v3.4.0
- [x] STL file import for modification (STL Remix workflow) ✅ v3.6.0
- [x] Visual diff for code changes ✅ v3.6.0

---

## v4.0.0 - Dual-Engine Architecture 🚀

**Research Recommendation:** Use OpenSCAD for browser speed, CadQuery for complex server-side tasks

### Browser Engine (OpenSCAD WASM + Manifold)

- [ ] Optimized for low-latency interactive loops
- [ ] Lean library loading via FS API
- [ ] Client-side validation and preview

### Server Engine (CadQuery/Build123d)

- [ ] Complex reasoning with o3/Claude models
- [ ] Advanced features: fillets, NURBS, assemblies
- [ ] Cloud rendering for Pro/Enterprise tiers

### Model Context Protocol (MCP)

- [ ] Standardized AI-to-CAD communication
- [ ] OAuth-based secure data access
- [ ] External component library integration

---

## v4.1.0 - Print Integration

- [ ] Direct slicer integration (PrusaSlicer, Cura, OrcaSlicer)
- [ ] Print time and filament estimates
- [ ] Printer profile presets
- [ ] G-code preview
- [ ] Build plate layout optimizer
- [ ] Cloud printing service integration

---

## Future Ideas (Research-Informed)

### AI Improvements

- Enhanced domain knowledge (electronics enclosures, mechanical parts)
- Multi-model comparison (generate 3 variations) ✅ _Research validated_
- AI-suggested improvements ("this wall is too thin")
- RLHF from user corrections ✅ _Research validated_
- Property-based testing for CAD output

### New Input Methods

- Voice input for hands-free design
- Sketch-to-3D (draw 2D profiles) ✅ _Sketch2Prototype research_
- AR preview (view model in real space)
- Depth estimation from reference images ✅ _Research validated_

### Export & Integration

- STEP/IGES export for CNC machining
- Direct Fusion 360/OnShape integration
- Thingiverse/Printables publishing

### Collaboration

- Real-time collaborative editing (CRDTs) ✅ _Research validated_
- Design version control with branching
- Comments and annotations
- Team workspaces

---

## Technical Debt

- [ ] Add comprehensive test suite (property-based testing)
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (WCAG compliance)
- [ ] Documentation for all components
- [ ] Error boundary improvements
- [ ] Migrate tests for unified pipeline

---

## Research References

This roadmap is informed by technical research on:

- Multi-agent architectures for CAD code generation (Honda Research Institute)
- Geometric Structure Tree (GST) intermediate representations
- Manifold geometry kernel performance benchmarks
- OpenSCAD WASM optimization strategies
- VLM component assignment studies (90.6% preference rate)
- Sketch2Prototype framework for multimodal input

See [TECHNICAL_STRATEGY.md](TECHNICAL_STRATEGY.md) for detailed analysis.

---

## Contributing

Have ideas? Open an issue on GitHub or submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

For architecture details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
