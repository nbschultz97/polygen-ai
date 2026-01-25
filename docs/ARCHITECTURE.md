# PolyGen AI Architecture

This document describes the multi-agent pipeline architecture that powers PolyGen AI's text-to-3D model generation.

## Overview

PolyGen AI uses a three-stage pipeline with specialized AI agents:

```
User Prompt
     |
     v
+------------------+
|  Planner Agent   |  (Google Gemini 3 Pro)
|  - NLP parsing   |
|  - GST creation  |
+------------------+
     |
     | Geometric Structure Tree (JSON)
     v
+------------------+
|   Coder Agent    |  (Anthropic Claude Sonnet)
|  - SCAD codegen  |
|  - Error retry   |
+------------------+
     |
     | OpenSCAD Code
     v
+------------------+
|    Validator     |  (Browser WASM)
|  - Compilation   |
|  - Mesh verify   |
+------------------+
     |
     v
3D Model + STL
```

## Why Multi-Agent?

The separation of concerns provides several benefits:

1. **Specialized Reasoning**: Gemini excels at understanding intent and structure; Claude excels at code generation
2. **Intermediate Representation**: The GST enables surgical edits without full regeneration
3. **Error Recovery**: Validation errors can be fed back to the Coder with full context
4. **Transparency**: Users can inspect the GST to understand what the AI "thinks" it's building

## Pipeline Stages

### Stage 1: Planning (Gemini 3 Pro)

**Service**: `services/plannerService.ts`

The Planner Agent interprets natural language and produces a Geometric Structure Tree (GST).

**Inputs**:
- User prompt (natural language description)
- Optional: Reference image (for image-to-3D)
- Optional: Conversation history (for follow-up questions)
- User preferences (printer settings, tolerances)

**Outputs**:
- GST (Geometric Structure Tree) - see [GST-SPECIFICATION.md](./GST-SPECIFICATION.md)
- OR clarification questions if the prompt is ambiguous

**Key Features**:
- Uses Gemini's thinking mode (`thinkingLevel: high`) for complex reasoning
- Includes domain knowledge for tactical gear (MIL-STD-1913 Picatinny, MOLLE/PALS)
- Prioritizes building with industry standards over asking questions

### Stage 2: Coding (Claude Sonnet)

**Service**: `services/coderService.ts`

The Coder Agent converts the GST into executable OpenSCAD code.

**Inputs**:
- GST from Planner
- Optional: Validation errors from previous attempt (for retry)

**Outputs**:
- Pure OpenSCAD code (no external libraries)
- Uses standard primitives: `cube`, `cylinder`, `sphere`, `difference`, `union`, etc.

**Key Features**:
- Outputs clean, human-readable code (no verbose banners)
- Includes tactical gear domain knowledge
- Supports **Symbolic Correction**: edit requests modify only relevant variables/modules

### Stage 3: Validation (Browser WASM)

**Service**: `services/validatorClient.ts`

The Validator compiles OpenSCAD code in the browser using WebAssembly.

**Inputs**:
- OpenSCAD code from Coder
- Optional: GST for size verification

**Outputs**:
- Success/failure status
- Compilation errors (if any)
- Warnings (thin walls, etc.)
- Geometry metrics (vertex count, triangle count)
- Manifold check

**Key Features**:
- Fully serverless - runs entirely in the browser
- No backend required for validation
- Uses `openscad-wasm` library

## Orchestrator

**Service**: `services/agentOrchestrator.ts`

The Orchestrator coordinates the entire pipeline and handles:

- Sequential execution of Planner -> Coder -> Validator
- Automatic retry on validation failure (max 2 attempts)
- Edit mode: bypass Planner for parameter modifications
- Abort signal handling for cancellation
- Callback notifications for UI updates
- Parallel preview image generation (non-blocking)

### Workflow States

```typescript
type WorkflowStep =
  | 'idle'        // No activity
  | 'planning'    // Planner agent working
  | 'coding'      // Coder agent working
  | 'validating'  // WASM compilation
  | 'spec-review' // Clarification needed
  | 'complete';   // Success
```

## Data Flow

### New Generation

```
1. User enters prompt
2. Orchestrator calls Planner
3. IF clarification needed:
   - Return questions to user
   - Wait for answers
   - Restart from step 2
4. Planner returns GST
5. Preview image generation starts (parallel, non-blocking)
6. Orchestrator calls Coder with GST
7. Coder returns OpenSCAD code
8. Orchestrator calls Validator
9. IF validation fails AND attempts < 2:
   - Feed errors back to Coder
   - Goto step 6
10. Generate smart quick fixes from GST analysis
11. Return complete asset to UI
```

### Edit Mode (Symbolic Correction)

```
1. User requests edit (e.g., "make the hole 2mm larger")
2. Orchestrator detects existing GST and code
3. Bypass Planner - go directly to Coder
4. Coder receives:
   - Existing GST (for context)
   - Existing code (to modify)
   - Edit request
5. Coder modifies only relevant parameters
6. Validate modified code
7. Return updated asset
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Google AI API key |
| `GEMINI_MODEL` | `gemini-3-pro-preview` | Gemini model variant |
| `THINKING_LEVEL` | `high` | Reasoning depth: `low`, `medium`, `high` |
| `ANTHROPIC_API_KEY` | (optional) | Claude API key |
| `USE_MULTI_AGENT` | `false` | Enable multi-agent pipeline |
| `CODER_MODEL` | `claude-sonnet-4-20250514` | Claude model for coding |

### Fallback Mode

Without `ANTHROPIC_API_KEY`, the system falls back to single-agent mode where Gemini handles both planning and code generation. This provides degraded but functional operation.

## Error Handling

### Planner Errors
- Invalid JSON: Attempt to extract JSON from response
- Missing fields: Return error with details
- Network errors: Propagate to UI with context

### Coder Errors
- Syntax errors: Caught by Validator, retry with error context
- Missing modules: Retry with reminder about pure OpenSCAD
- Timeout: Abort and notify user

### Validator Errors
- WASM load failure: Report initialization error
- Compilation errors: Feed back to Coder for retry
- Non-manifold geometry: Add to validation warnings

## Security Considerations

- All API keys are stored in `.env.local` (never committed)
- Claude API called via server proxy (`/api/claude`) to hide API key
- User input sanitized before inclusion in prompts
- No server-side storage of user data

## Performance Considerations

- Preview image generation runs in parallel (non-blocking)
- WASM validation is cached per session
- GST enables incremental edits (no full regeneration)
- Abort signals prevent wasted API calls on cancellation

## Future Architecture Plans

See [ROADMAP.md](../ROADMAP.md) for planned features:
- Cloud-based validation for faster compilation
- User accounts with design storage
- Collaborative editing with WebSocket sync
