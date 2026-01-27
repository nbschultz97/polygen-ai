# PolyGen AI: State-of-the-Art (SOTA) Architectural Rundown

This document provides a comprehensive end-to-end overview of the PolyGen AI repository for analysis in NotebookLM.

---

## 🚀 1. The High-Level Flow (Human-to-CAD)

PolyGen AI transforms natural language prompts into high-fidelity, 3D-printable OpenSCAD code through a **Neuro-Symbolic Pipeline**.

1. **Interrogation**: The system first checks for vague prompts (e.g., "make a box") and forces clarification questions before spending tokens on generation.
2. **Planning (The GST)**: Instead of writing code immediately, the **Planner Agent** (Gemini 1.5 Pro) generates a **Geometric Structure Tree (JSON)**. This defines the "mechanical strategy" (dimensions, component hierarchy, boolean operations).
3. **Coding (The Instruction)**: The **Coder Agent** (Claude 3.5 Sonnet) implements the GST. It uses specialized libraries like `tactical.scad` for high-precision mechanical parts.
4. **Validation (The Gatekeeper)**: The code is compiled in a **WASM-based OpenSCAD environment** inside the browser.
5. **Critique & Repair**: If the model fails quantitative checks (Volumetric or Dimensional), it is automatically sent back for a **Scope-Based Refinement** at low temperature.

---

## 🧠 2. The Multi-Agent Orchestrator (`services/agentOrchestrator.ts`)

The orchestrator manages the lifecycle of a single design request.

- **Unified Generator**: Can consolidate planning and coding into a single call for simple objects to reduce latency.
- **Strategic Prompting**: Uses "Optimistic Planning" — where the interrogator and planner run in parallel to minimize "thinking pauses" for the user.
- **History Management**: Maintains a symbolic memory of previous revisions, allowing the user to say "round the corners" without the AI losing track of the original hole alignments.

---

## 🛠️ 3. The 3D Validation Engine (`services/scadValidation.ts`)

This is the most technically complex part of the system, running the **OpenSCAD Manifold kernel** via WASM.

- **Memory Safety**: Implements explicit "Heap Copying" to prevent the common WASM "View vs. Copy" pointer corruption bug.
- **Quantitative Metrics**:
  - **Volumetric Similarity ($S_v$)**: Uses the signed tetrahedron algorithm to verify if the mesh bulk matches the GST's mathematical intent.
  - **Dimensional Accuracy ($S_d$)**: Compares the rendered bounding box against the target dimensions.
  - **Manifold Gate ($M$)**: A binary check (using `instance.isManifold`) to ensure the model is 3D-printable (no "leaks").
- **Success Probability ($P_{succ}$)**:
  $$P_{succ} = M \cdot (0.65 \cdot S_v + 0.35 \cdot S_d)$$

---

## 👁️ 4. The Visual Critic (`services/visualCriticService.ts`)

When "Math" isn't enough, we use "Vision."

- **Discretized Grid**: Overlays a 6x6 transparent grid (A1-F6) on the 3D render.
- **Visual Anchor Prompting**: Translates fuzzy visual concepts (e.g., "is the handle on top?") into discrete grid locations. This prevents the VLM from becoming spatially disoriented.
- **ROI Gating**: The system only triggers expensive Vision checks when $P_{succ}$ is in the "Suspicious" range (0.8 - 0.95).

---

## 📂 5. Key Libraries & Utilities

- **`tactical.scad`**: A verified library containing MIL-STD-1913 Picatinny and TW-PL-507F MOLLE modules.
- **Tactical Guard**: A post-processing safety layer in the Coder that auto-injects library imports if it detects calls to standardized modules.
- **Atomic LMP**: A refactoring strategy that forces the AI to wrap every component in an isolated `module {}` scope to prevent OpenSCAD variable shadowing.

---

## 📊 6. Export & Analytics

- **Diagnostic Session Export**: Saves a detailed JSON of the entire turn-based history, including every generated GST, validation score, and console log. This is the primary tool for remote debugging and "Golden Set" benchmarking.
- **StlExport**: Decoupled from the renderer to allow background exporting of high-resolution meshes.

---

## 🎯 Target State: Tier 6 (Autonomous Evolution)

The system is currently pivoting toward **Autonomous Self-Correction**, where PolyGen will run 2-3 internal generation loops and only present the "Print Ready" ($P_{succ} > 0.95$) result to the end-user.
