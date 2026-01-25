# PolyGen AI Roadmap

This document outlines planned features and improvements for PolyGen AI.

## Current Version: 2.1.0

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Completed

### v2.1.0 - Concept Preview
- [x] AI-generated preview image during code generation
- [x] Clarification loop improvements
- [x] Claude API CORS fixes
- [x] Cleaner code output style

### v2.0.0 - Multi-Agent Pipeline
- [x] Planner Agent (Gemini 3 Pro) for GST generation
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

## v2.2.0 - Quality of Life (In Progress)

- [ ] Model history with thumbnails
- [ ] Undo/redo for code edits
- [ ] Keyboard shortcuts (Ctrl+Enter to generate, etc.)
- [ ] Dark/light theme toggle
- [ ] Mobile-responsive layout improvements
- [ ] GST visualization panel

---

## v2.3.0 - Advanced Editing

- [ ] Direct SCAD code editing with live preview
- [ ] Parameter sliders for real-time dimension adjustments
- [ ] Multi-part assembly support (generate multiple STLs)
- [ ] Import existing SCAD files for modification
- [ ] Visual diff for code changes

---

## v3.0.0 - Cloud Features

- [ ] User accounts and authentication
- [ ] Cloud-saved designs with versioning
- [ ] Public design gallery
- [ ] Share links for designs
- [ ] Cloud rendering for faster compilation
- [ ] Collaborative editing

---

## v3.1.0 - Print Integration

- [ ] Direct slicer integration (PrusaSlicer, Cura)
- [ ] Print time and filament estimates
- [ ] Printer profile presets
- [ ] G-code preview
- [ ] Build plate layout optimizer

---

## Future Ideas (Unscheduled)

### AI Improvements
- Enhanced domain knowledge (electronics enclosures, mechanical parts)
- Multi-model comparison (generate 3 variations)
- AI-suggested improvements ("this wall is too thin")
- Learn from user corrections

### New Input Methods
- Voice input for hands-free design
- Sketch-to-3D (draw 2D profiles)
- AR preview (view model in real space)
- Import from images with depth estimation

### Export & Integration
- STEP/IGES export for CNC machining
- Direct Fusion 360/OnShape integration
- Thingiverse/Printables publishing

### Collaboration
- Real-time collaborative editing
- Design version control with branching
- Comments and annotations
- Team workspaces

---

## Technical Debt

- [ ] Add comprehensive test suite
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (WCAG compliance)
- [ ] Documentation for all components
- [ ] Error boundary improvements

---

## Contributing

Have ideas? Open an issue on GitHub or submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

For architecture details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
