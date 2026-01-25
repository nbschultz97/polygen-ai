# API Reference

This document provides detailed API documentation for PolyGen AI's core services.

## Agent Orchestrator

**File**: `services/agentOrchestrator.ts`

The Agent Orchestrator coordinates the multi-agent pipeline, managing the flow from user input through planning, coding, and validation.

### orchestrateGeneration()

Main entry point for generating 3D models from user prompts.

```typescript
async function orchestrateGeneration(
  input: OrchestratorInput,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal
): Promise<GeneratedAsset>
```

#### Parameters

**input: OrchestratorInput**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `userPrompt` | `string` | Yes | Natural language description of desired model |
| `imageData` | `ImageData` | No | Reference image for image-to-3D generation |
| `existingAsset` | `GeneratedAsset` | No | Previous asset for edit mode |
| `conversationHistory` | `string[]` | No | Previous messages for context |
| `isEdit` | `boolean` | No | If true, skip Planner and use symbolic correction |

**callbacks: OrchestratorCallbacks**

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onStepChange` | `(step: WorkflowStep) => void` | Called when pipeline stage changes |
| `onGSTGenerated` | `(gst: GeometricStructureTree) => void` | Called when Planner produces GST |
| `onPreviewImageGenerated` | `(imageUrl: string) => void` | Called when preview image is ready |
| `onCodeGenerated` | `(code: string) => void` | Called when Coder produces SCAD |
| `onValidationComplete` | `(result: ValidationResult) => void` | Called after validation |
| `onSmartFixesGenerated` | `(fixes: SmartQuickFix[]) => void` | Called with context-aware fixes |
| `onError` | `(error: Error, step: WorkflowStep) => void` | Called on pipeline error |

**abortSignal: AbortSignal** (optional)

Pass an AbortController's signal to enable cancellation.

#### Returns

**GeneratedAsset**

```typescript
interface GeneratedAsset {
  scadCode?: string;              // Generated OpenSCAD code
  spec?: SpecData;                // Extracted specification
  gst?: GeometricStructureTree;   // Geometric Structure Tree
  previewImageUrl?: string;       // AI-generated concept preview
  clarifications?: ClarificationQuestion[];  // Questions for user
  validationResult?: ValidationResult;       // Validation outcome
  smartFixes?: SmartQuickFix[];   // Context-aware fix suggestions
}
```

#### Example Usage

```typescript
import { orchestrateGeneration } from './services/agentOrchestrator';

const controller = new AbortController();

const asset = await orchestrateGeneration(
  {
    userPrompt: "Create a phone stand with adjustable angle",
    isEdit: false
  },
  {
    onStepChange: (step) => setWorkflowStep(step),
    onGSTGenerated: (gst) => console.log('GST:', gst),
    onCodeGenerated: (code) => setScadCode(code),
    onValidationComplete: (result) => setValidation(result),
    onSmartFixesGenerated: (fixes) => setQuickFixes(fixes),
    onError: (error, step) => showError(`${step}: ${error.message}`)
  },
  controller.signal
);

// To cancel:
controller.abort();
```

---

### isMultiAgentAvailable()

Check if the multi-agent pipeline is configured and available.

```typescript
function isMultiAgentAvailable(): boolean
```

#### Returns

`true` if both Gemini API key and multi-agent mode are configured.

---

### getAgentStatus()

Get the availability status of all pipeline agents.

```typescript
function getAgentStatus(): {
  planner: { available: boolean; model: string };
  coder: { available: boolean; model: string };
  validator: { available: boolean };
}
```

#### Returns

```typescript
{
  planner: {
    available: true,
    model: "gemini-3-pro-preview"
  },
  coder: {
    available: true,
    model: "claude-sonnet-4-20250514"
  },
  validator: {
    available: true  // Always true (browser WASM)
  }
}
```

---

## Planner Service

**File**: `services/plannerService.ts`

The Planner Service interfaces with Google Gemini to generate Geometric Structure Trees from natural language.

### plannerService.generateGST()

Generate a GST from a user prompt.

```typescript
async function generateGST(
  input: PlannerInput,
  abortSignal?: AbortSignal
): Promise<PlannerOutput>
```

#### Parameters

**input: PlannerInput**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `userPrompt` | `string` | Yes | Natural language description |
| `imageData` | `ImageData` | No | Reference image (base64 + mimeType) |
| `conversationHistory` | `string[]` | No | Previous conversation context |

#### Returns

**PlannerOutput**

```typescript
interface PlannerOutput {
  needsClarification: boolean;
  clarifications?: ClarificationQuestion[];
  gst?: GeometricStructureTree;
  spec?: SpecData;
  partialSpec?: SpecData;
}
```

If `needsClarification` is true, the response contains questions for the user. Otherwise, it contains the complete GST.

---

## Coder Service

**File**: `services/coderService.ts`

The Coder Service interfaces with Anthropic Claude to generate OpenSCAD code from GSTs.

### coderService.generateCode()

Generate OpenSCAD code from a GST.

```typescript
async function generateCode(
  input: CoderInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput>
```

#### Parameters

**input: CoderInput**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `gst` | `GeometricStructureTree` | Yes | The GST to convert to code |
| `validationErrors` | `string[]` | No | Errors from previous attempt (for retry) |

#### Returns

**CoderOutput**

```typescript
interface CoderOutput {
  scadCode: string;
  explanation?: string;
}
```

---

### coderService.editCode()

Apply symbolic correction to existing code.

```typescript
async function editCode(
  input: CoderEditInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput>
```

#### Parameters

**input: CoderEditInput**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `existingGST` | `GeometricStructureTree` | Yes | Current GST for context |
| `existingCode` | `string` | Yes | Current OpenSCAD code to modify |
| `editRequest` | `string` | Yes | Natural language edit instruction |

#### Returns

Same as `generateCode()`.

---

### coderService.isCoderAvailable()

Check if the Claude API proxy is available.

```typescript
function isCoderAvailable(): boolean
```

---

## Validator Client

**File**: `services/validatorClient.ts`

The Validator Client handles browser-based OpenSCAD compilation using WebAssembly.

### validatorClient.validate()

Validate OpenSCAD code by compiling it.

```typescript
async function validate(input: {
  scadCode: string;
  gst?: GeometricStructureTree;
}): Promise<ValidationResult>
```

#### Parameters

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `scadCode` | `string` | Yes | OpenSCAD code to validate |
| `gst` | `GeometricStructureTree` | No | GST for size comparison |

#### Returns

**ValidationResult**

```typescript
interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  boundingBox?: GSTBoundingBox;
  vertexCount?: number;
  triangleCount?: number;
  isManifold: boolean;
  gstMatch?: boolean;
  gstDeviationPercent?: number;
}
```

---

## Quick Fix Analyzer

**File**: `services/quickFixAnalyzer.ts`

Analyzes GST and validation results to generate context-aware refinement suggestions.

### analyzeForQuickFixes()

Generate smart quick fixes based on the current state.

```typescript
function analyzeForQuickFixes(
  gst: GeometricStructureTree,
  validation: ValidationResult,
  scadCode: string
): SmartQuickFix[]
```

#### Returns

Array of `SmartQuickFix` objects, sorted by relevance:

```typescript
interface SmartQuickFix {
  id: string;            // Unique identifier
  label: string;         // Button label
  description: string;   // Tooltip text
  prompt: string;        // Edit instruction for Coder
  category: 'tolerance' | 'dimension' | 'structure' | 'print' | 'geometry';
  relevance: number;     // 0-1, higher = more relevant
}
```

---

### getDefaultQuickFixes()

Get default fixes when GST is not available.

```typescript
function getDefaultQuickFixes(): SmartQuickFix[]
```

---

## Type Definitions

All types are defined in `types.ts`. Key interfaces:

### GeometricStructureTree

See [GST-SPECIFICATION.md](./GST-SPECIFICATION.md) for complete documentation.

### ImageData

```typescript
interface ImageData {
  base64: string;    // Base64-encoded image data
  mimeType: string;  // e.g., "image/png", "image/jpeg"
}
```

### WorkflowStep

```typescript
type WorkflowStep =
  | 'idle'
  | 'planning'
  | 'gst-review'
  | 'coding'
  | 'validating'
  | 'processing'
  | 'spec-review'
  | 'complete';
```

### ClarificationQuestion

```typescript
interface ClarificationQuestion {
  question: string;      // The question to ask
  suggestions: string[]; // 2-4 clickable suggested answers
}
```

---

## Error Handling

All async functions may throw:

- **DOMException** with name `'AbortError'` - Request was cancelled
- **Error** with descriptive message - API or parsing failure

Example error handling:

```typescript
try {
  const asset = await orchestrateGeneration(input, callbacks, signal);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('Request cancelled by user');
  } else {
    console.error('Pipeline error:', error.message);
  }
}
```

---

## Environment Variables

Services read configuration from environment variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | plannerService | Google AI API key |
| `GEMINI_MODEL` | plannerService | Model variant (default: `gemini-3-pro-preview`) |
| `THINKING_LEVEL` | plannerService | Reasoning depth: `low`, `medium`, `high` |
| `ANTHROPIC_API_KEY` | coderService | Anthropic API key (via proxy) |
| `CODER_MODEL` | coderService | Claude model (default: `claude-sonnet-4-20250514`) |
| `USE_MULTI_AGENT` | agentOrchestrator | Enable multi-agent mode |
