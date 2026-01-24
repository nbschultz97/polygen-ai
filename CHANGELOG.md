# Changelog

All notable changes to PolyGen AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
