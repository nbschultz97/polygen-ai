# PolyGen AI Roadmap

This document outlines planned features and improvements for PolyGen AI.

## Current Version: 1.4.0

---

## v1.5.0 - Quality of Life

- [ ] Model history with thumbnails
- [ ] Undo/redo for code edits
- [ ] Keyboard shortcuts (Ctrl+Enter to generate, etc.)
- [ ] Dark/light theme toggle
- [ ] Mobile-responsive layout improvements

---

## v1.6.0 - Advanced Editing

- [ ] Direct SCAD code editing with live preview
- [ ] Parameter sliders for real-time dimension adjustments
- [ ] Multi-part assembly support (generate multiple STLs)
- [ ] Import existing SCAD files for modification

---

## v2.0.0 - Architecture Overhaul

Major refactor to improve code quality and reliability:

### Planner-Coder-Validator Pattern
- **Planner Agent**: Interprets user intent, produces structured specification
- **Coder Agent**: Generates OpenSCAD from spec, handles edits at code level
- **Validator Agent**: Checks manifold geometry, printability, compiles and tests

### Geometric Structure Tree (GST)
- Intermediate JSON representation between spec and code
- Enables precise edits without regenerating entire model
- Tree structure: primitives, operations, transforms, parameters

### Code-Level Corrections
- Edit requests modify existing code, not regenerate from scratch
- Track which code sections correspond to which features
- Surgical fixes for "make the hole bigger" type requests

### Manifold Validation
- Pre-flight geometry checks before compilation
- Detect non-manifold edges, self-intersections
- Warn about unprintable features (thin walls, overhangs)

---

## v2.1.0 - Cloud Features

- [ ] User accounts and saved designs
- [ ] Public design gallery
- [ ] Share links for designs
- [ ] Cloud rendering for faster compilation

---

## v2.2.0 - Print Integration

- [ ] Direct slicer integration (PrusaSlicer, Cura)
- [ ] Print time and filament estimates
- [ ] Printer profile presets
- [ ] G-code preview

---

## Future Ideas (Unscheduled)

- Voice input for hands-free design
- AR preview (view model in real space)
- Collaborative editing
- Design version control
- AI-suggested improvements ("this wall is too thin")
- Import from images with depth estimation
- STEP/IGES export for CNC machining

---

## Contributing

Have ideas? Open an issue on GitHub or submit a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
