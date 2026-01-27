# PolyGen AI Technical Strategy

> Research-backed architecture decisions for optimizing the text-to-3D CAD generation pipeline.

This document captures technical research findings and their implementation in PolyGen AI.

---

## Executive Summary

PolyGen AI uses a multi-agent architecture to convert natural language into 3D-printable OpenSCAD code. Based on deep technical research, we've identified key optimizations that can improve:

- **Success Rate**: From ~44% (direct text-to-code) to 75%+ (with GST intermediate format)
- **Performance**: 10x faster validation with Manifold geometry kernel
- **Cost**: 50%+ reduction in API costs with prompt caching
- **Reliability**: Enhanced error recovery with categorized feedback loops

---

## 1. The Spatial Reasoning Gap

### Problem

Traditional direct text-to-code generation fails in 3D modeling due to the "spatial reasoning gap." LLMs are proficient at generating syntactically correct code but lack inherent understanding of:

- Three-dimensional coordinate systems
- Topological relationships between components
- Physical constraints (no floating parts, proper attachment)

Without a structural intermediary, models frequently hallucinate:

- "Floating parts" disconnected from the main body
- Incorrect relative positioning
- Scale mismatches between components

### Solution: Geometric Structure Tree (GST)

The GST is a hierarchical JSON representation that explicitly separates **assembly intent** from **programmatic implementation**.

```json
{
  "version": "1.0",
  "name": "box_with_lid",
  "globalParameters": [
    { "name": "width", "value": 50, "unit": "mm" },
    { "name": "height", "value": 30, "unit": "mm" }
  ],
  "root": {
    "id": "base",
    "type": "cuboid",
    "children": [
      {
        "id": "lid",
        "type": "cuboid",
        "attachTo": {
          "parentId": "base",
          "parentAnchor": "top_center",
          "childAnchor": "bottom_center"
        }
      }
    ]
  }
}
```

### Comparative Reliability

| Approach            | Success Rate | Spatial Logic           | Structural Integrity    |
| ------------------- | ------------ | ----------------------- | ----------------------- |
| Direct Text-to-Code | ~44%         | Prone to hallucinations | Frequent floating parts |
| GST-to-Code         | ~75%+        | Explicitly defined      | Guaranteed connectivity |
| Symbolic Correction | ~100%        | Preserved from original | Surgical updates only   |

### Implementation in PolyGen

- **Planner Agent** (`plannerService.ts`): Generates GST from natural language using Gemini
- **Coder Agent** (`coderService.ts`): Converts GST to OpenSCAD using Claude
- **Unified Pipeline** (`unifiedGeneratorService.ts`): Single Claude call (faster, but lower success rate)

**Recommendation**: Enable multi-agent pipeline as default for higher success rates.

---

## 2. Programmatic CAD Engine Selection

### The OpenSCAD Trade-off

| Factor           | OpenSCAD             | CadQuery/Build123d                 |
| ---------------- | -------------------- | ---------------------------------- |
| Browser Support  | WASM available       | Requires server                    |
| AI Training Data | Less common          | Python-native (more training data) |
| Features         | CSG-only, no fillets | Full NURBS, fillets, assemblies    |
| Speed            | Fast with Manifold   | Slower, more capable               |

### Strategic Recommendation: Dual-Engine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────┐
│ Browser Engine  │     │   Server Engine     │
│ (OpenSCAD WASM) │     │ (CadQuery/Build123d)│
├─────────────────┤     ├─────────────────────┤
│ - Fast preview  │     │ - Complex geometry  │
│ - Interactive   │     │ - Fillets, NURBS    │
│ - Free tier     │     │ - Pro/Enterprise    │
│ - Manifold kern │     │ - o3/Claude models  │
└─────────────────┘     └─────────────────────┘
```

**Phase 1 (Current)**: OpenSCAD WASM for all users
**Phase 2 (v4.0)**: Add CadQuery server engine for Pro/Enterprise

---

## 3. Performance Optimization

### 3.1 Manifold Geometry Kernel

The default OpenSCAD WASM uses the CGAL kernel for boolean operations. Research shows the **Manifold kernel** provides "orders of magnitude" speed improvement.

```typescript
// Current (CGAL - slow)
instance.callMain(['/input.scad', '-o', 'output.stl']);

// Optimized (Manifold - fast)
instance.callMain(['/input.scad', '-o', 'output.stl', '--backend=Manifold']);
```

**Impact**: 10x+ faster validation for complex models

### 3.2 Two-Phase Validation

```typescript
// Phase 1: Fast preview for iteration
instance.callMain(['/input.scad', '--preview', '-o', 'preview.png']);

// Phase 2: Full render only for export
instance.callMain(['/input.scad', '-o', 'output.stl']);
```

**Impact**: Faster feedback loop during iterative design

### 3.3 Web Worker Offloading

Move WASM execution to background threads to prevent UI blocking:

```typescript
// In openscadLoader.ts
const worker = new Worker('openscad-worker.js');
worker.postMessage({ code: scadCode });
worker.onmessage = (e) => handleResult(e.data);
```

---

## 4. API Cost Optimization

### 4.1 Response Streaming

Generation can take 30-60 seconds, exceeding serverless timeout limits. Streaming is mandatory.

```typescript
// api/claude.ts
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  stream: true,
  // ...
});
```

**Benefits**:

- Prevents HTTP timeouts
- Real-time feedback to user
- Better perceived performance

### 4.2 Prompt Caching

System prompts (~150 lines) are sent with every request. Caching reduces input token costs by 50%+.

```typescript
body: JSON.stringify({
  system: [{
    type: "text",
    text: UNIFIED_SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" }
  }],
  messages: [...]
})
```

### 4.3 Symbolic Patching

Instead of regenerating full scripts, request "diffs" or specific variable updates:

```typescript
// Instead of: "Regenerate the entire model with a larger base"
// Use: "Update the 'base_width' parameter from 50 to 75"
```

**Benefits**:

- Preserves cached context
- Reduces token usage
- Faster response times

---

## 5. Error Categorization Taxonomy

### Current Categories (errorCategorizer.ts)

| Category         | Severity | Example                              |
| ---------------- | -------- | ------------------------------------ |
| `syntax`         | Critical | Missing semicolons, unmatched braces |
| `undefined_var`  | Critical | Unknown variable or module           |
| `csg_operation`  | Warning  | Boolean operation failures           |
| `empty_geometry` | Critical | SCENE IS EMPTY                       |
| `recursion`      | Critical | Stack overflow                       |
| `manifold`       | Warning  | Non-watertight mesh                  |
| `file_io`        | Critical | Include/use statement failures       |

### Research-Recommended Additions

| Category           | Severity | Detection Method                              |
| ------------------ | -------- | --------------------------------------------- |
| `disconnected`     | High     | Multiple separate solids not attached         |
| `scale_mismatch`   | High     | Volume deviates >100% from GST intent         |
| `hallucinated_lib` | Medium   | Unknown function calls (e.g., `super_gear()`) |

### Validation Strategies

1. **Manifold Check**: Primary printability oracle
   - "Object isn't a valid 2-manifold" = generation failed

2. **Quantitative Metrics**:
   - Volumetric Similarity (S_v) vs GST intent
   - Bounding Box dimensions check

3. **REFUTE Testing**: Critic agent attempts to falsify solution
   - "Does this actually create a 90-degree elbow?"

---

## 6. Visual Reasoning (VLM Integration)

### Research Finding

VLM component assignment achieves **90.6% user preference** vs 59.4% for rule-based systems.

### Implementation

```typescript
// On validation failure, feed rendered image back to Claude
if (!validation.success && attempts > 0) {
  const screenshot = await capturePreviewScreenshot();
  const visualFeedback = await analyzeWithVision(screenshot, {
    prompt: 'Identify geometric issues in this 3D model',
  });
  input.validationErrors.push(visualFeedback);
}
```

### Sketch2Prototype Integration

Allow hand-drawn sketches as input:

1. User draws 2D profile sketch
2. VLM interprets sketch → GST
3. GST → OpenSCAD code
4. Render 3 prototype variations

---

## 7. Multi-Agent Architecture

### Current Pipeline (PolyGen)

```
User Prompt
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Planner   │────▶│    Coder    │────▶│  Validator  │
│  (Gemini)   │     │  (Claude)   │     │   (WASM)    │
│             │     │             │     │             │
│ Generates   │     │ Generates   │     │ Compiles    │
│ GST JSON    │     │ SCAD code   │     │ & checks    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                          ┌────────────────────┘
                          │ Error Feedback
                          ▼
                    ┌─────────────┐
                    │   Retry     │
                    │ (max 3x)    │
                    └─────────────┘
```

### Research-Validated Components

| Component               | PolyGen Implementation    | Research Validation                            |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| GST Intermediate Format | `plannerService.ts`       | "State-of-the-art hierarchical representation" |
| Claude as Coder         | `coderService.ts`         | "King of Code" - near bug-free syntax          |
| Error Categorization    | `errorCategorizer.ts`     | Matches recommended taxonomy                   |
| Symbolic Correction     | `coderService.editCode()` | "100% fidelity" for edits                      |
| 3-Attempt Retry         | `agentOrchestrator.ts`    | Aligns with "Error Correction Loop" pattern    |

### Parallel Generation (Future)

Generate 3 variations simultaneously to increase success probability:

```typescript
const variations = await Promise.all([
  generateWithTemperature(0.7),
  generateWithTemperature(0.9),
  generateWithMultiAgent(),
]);
const best = selectBestVariation(variations);
```

---

## 8. Model Context Protocol (MCP)

### Purpose

Standardized AI-to-CAD communication via JSON-RPC 2.0.

### Use Cases

1. **Component Libraries**: Fetch standard parts (M3 screws, bearings)
2. **Material Properties**: Query material databases
3. **Slicer Integration**: Send to PrusaSlicer/Cura directly

### Implementation

```typescript
// MCP server for OpenSCAD
const mcp = new MCPServer({
  tools: [
    { name: 'compile_scad', handler: compileOpenSCAD },
    { name: 'validate_stl', handler: validateSTL },
    { name: 'get_component', handler: fetchStandardPart },
  ],
});
```

---

## 9. Growth & Market Strategy

### Avoid "Tinkerville" Trap

Technical excellence must be paired with market awareness. Key strategies:

1. **Brand Building**: Often more protective than patents
2. **Market Speed**: Ship fast, iterate based on feedback
3. **Progress Metrics**: Track product-market fit, not just features

### IP Considerations

Patents are "perishable assets" - prioritize:

1. First-mover advantage in the AI+CAD space
2. Strong brand recognition (PolyGen)
3. Community building among makers/3D printing enthusiasts

---

## 10. Implementation Priority

### Phase 1: Performance (v3.1.0)

- [ ] Manifold backend flag
- [ ] Response streaming
- [ ] Prompt caching
- [ ] Web Worker offloading

### Phase 2: Intelligence (v3.2.0)

- [ ] Enable multi-agent as default
- [ ] Enhanced error categories
- [ ] Visual feedback loop
- [ ] Success rate tracking

### Phase 3: Dual-Engine (v4.0.0)

- [ ] CadQuery server engine
- [ ] MCP integration
- [ ] Cloud rendering for Pro tier

---

## References

- Honda Research Institute: Multi-Agent CAD Generation
- Manifold Geometry Kernel Benchmarks
- OpenSCAD WASM Optimization Guides
- VLM Component Assignment Studies (90.6% preference)
- Sketch2Prototype Framework
- Model Context Protocol (MCP) Specification

---

_Last Updated: January 2026_
_Version: 1.0_
