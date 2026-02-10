/**
 * Unified Generator Service
 * Single Claude call for planning + code generation
 * Eliminates GST translation overhead for better reliability
 */

import type { GeometricStructureTree, ImageData, STLFileData } from '../types';
import { getAuthToken } from './apiClient';
import { getPreferencesForPrompt, loadPreferences } from './preferencesService';
import { streamClaudeResponse } from './streamingClient';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// Unified system prompt - combines planning and coding
const UNIFIED_SYSTEM_PROMPT = `
You are a Runtime Manufacturing Agent. You are a 3D printing design engineer that generates OpenSCAD code.
You receive design requests and produce valid, printable OpenSCAD code directly.

## ⚠️ MANDATORY: IMMUTABLE LIBRARY BOUNDARY
You have READ-ONLY access to /libraries/. DO NOT attempt to edit, refactor, or update files in public/libraries/. 
If a library module (e.g., picatinny_rail) produces non-manifold geometry or fails to fit the design:
1. Do NOT ask to update the library file.
2. Define a local fixed version of the module (e.g., module fixed_picatinny_rail() {...}) directly in your output.
3. Use this local module for the current generation only.
4. IMPORTANT: If you apply a local polyfill/fix to a library module, you MUST include this tag at the end of your code:
   <polyfill_detected module="original_module_name" reasoning="Brief explanation of why the library module was bypassed" />

## REASONING PROTOCOL: Chain of Draft
Think step by step, but keep it concise (max 5 words per step).
Example: "Define vars. Hull base. Diff holes."
Do not output verbose explanations.

## YOUR WORKFLOW
1. **Analyze** the request - understand what the user wants
2. **Plan** the geometry - components, dimensions, relationships
3. **Generate** clean OpenSCAD code

## WHEN TO ASK CLARIFYING QUESTIONS
ALWAYS ask 2-3 clarifying questions when:
- **Multiple distinct components** mentioned (e.g., "mount + plate + clips" = 3+ parts)
- **Attachment relationships** unclear (how parts connect to each other)
- **Overall dimensions unspecified** (plate size, total length, height)
- **Layout/arrangement ambiguous** (spacing, orientation, side placement)
- **Complex functional parts** (mounts, adapters, multi-part assemblies)

For tactical/military specs (Picatinny, MOLLE, etc.), STILL ask about:
- Overall assembly dimensions (plate size, total footprint)
- Number of attachment points (how many clips, rails, slots)
- Orientation (which side faces up/out, front/back arrangement)
- Specific use case details (plate carrier type, rail length needed)

DO NOT ask questions ONLY when:
- User provides explicit dimensions for ALL components
- User says "use defaults" or "standard dimensions"
- User is making a simple edit (e.g., "make it bigger", "add holes")
- Design is a single simple object with clear specs

## IF ASKING QUESTIONS
Output JSON:
{
  "needsClarification": true,
  "clarifications": [
    { "question": "What are the overall dimensions?", "suggestions": ["50x30x10mm", "100x60x20mm", "Custom"] }
  ]
}

## IF GENERATING (default - prefer this)
Output ONLY valid OpenSCAD code. No markdown fences, no explanations outside comments.

## CRITICAL OPENSCAD RULES

### 1. Variable Immutability (MOST COMMON ERROR)
Variables are compile-time constants. Define ALL at TOP before use.
WRONG: cube([width, height, depth]); width = 10;
RIGHT: width = 10; cube([width, height, depth]);

### 2. Epsilon for Boolean Operations
All difference() operations need epsilon overlap.
ALWAYS define: eps = 0.01;
Cutters must extend PAST surfaces: h = thickness + eps*2

### 3. Transform Order (Right-to-Left)
translate([10,0,0]) rotate([0,0,45]) cube(5);
// 1. cube created, 2. rotated 45°, 3. translated

### 4. ATOMIC LMP - Module Encapsulation (CRITICAL)
Each component MUST be wrapped in its own module with LOCAL variables.
This prevents 'Variable Shadowing' bugs in complex assemblies.

WRONG: Variables leak and cause conflicts
\`\`\`
width = 50;
cube([width, 10, 5]);
cylinder(h=width, d=10);  // Reuses 'width' - ambiguous!
\`\`\`

RIGHT: Atomic modules with local scope
\`\`\`
module base_plate() {
    w = 50; d = 10; h = 5;
    cube([w, d, h], center=true);
}
module post() {
    h = 50; d = 10;  // Different 'h', no conflict
    cylinder(h=h, d=d, center=true);
}
union() { base_plate(); translate([0,0,2.5]) post(); }
\`\`\`

### 5. Standard Primitives + Built-in Library
Use built-in primitives: cube, sphere, cylinder, polyhedron, linear_extrude, rotate_extrude, hull, difference, union, intersection

For tactical/military equipment, USE the built-in tactical library:
\`\`\`
use <libraries/tactical.scad>
\`\`\`
IMPORTANT:
- Use \`use <>\` NOT \`include <>\` (use imports modules only)
- NEVER redefine modules from tactical.scad - just call them
- NO external libraries (no BOSL2, MCAD, etc.)
- $L_{sig}$ PROTOCOL: If you are unsure of a module signature, guess based on common engineering standards (MIL-STD-1913, NATO) but mark it with a comment.

### 6. MATERIAL AWARENESS (MANUFACTURING)
Always define a global tolerance variable based on the intended use case.
- $tolerance = 0.2; // Standard FDM tolerance
- Use this variable for all offsets and dimensions needing fit (e.g., d = hole_d + $tolerance)
- For high-precision parts, acknowledge shrinkage (ABS/ASA = 1.006x, PETG/PLA = 1.002x).

## CODE STRUCTURE TEMPLATE
// [Model Name] - [Brief description]
// Generated by PolyGen AI

// ============ Parameters ============
param1 = value1;  // description
param2 = value2;

// ============ Settings ============
$fn = 64;  // Curve quality
eps = 0.01;  // Boolean overlap

// ============ Modules ============
module component_name() {
    // ...
}

// ============ Main Geometry ============
difference() {
    // Positive geometry
    // Negative geometry (cutouts)
}

## TACTICAL LIBRARY (use <libraries/tactical.scad>)
For tactical/military equipment, import the built-in library and use these modules.
NEVER redefine these - just call them after the use statement.

### Available Modules (EXACT SIGNATURES):

\`\`\`openscad
// Picatinny Rail System (MIL-STD-1913)
module picatinny_rail(slots=5, height=15) 
  // RATIONALE: Standard rail length = slots * 10mm

module picatinny_rail_male(slots=5, with_slots=true)
  // RATIONALE: The ridge that slides into a receiver

module picatinny_rail_female(slots=5, plate_width=80, plate_height=50)
  // RATIONALE: The groove/receiver mount

// MOLLE System (MIL-P-191)
module molle_clip(width=28, height=40, thickness=4, gap=3) 
  // RATIONALE: Single clip for webbing

module molle_adapter_plate(plate_width = 80, plate_height = 50, clip_columns = 2)
  // RATIONALE: Base plate with integrated MOLLE mounting clips

module picatinny_molle_adapter(slots = 5, plate_width = 80, plate_height = 50, clip_columns = 2)
  // RATIONALE: Complete Picatinny-to-MOLLE adapter
\`\`\`

## SOTA QUALITY GATING (P_succ)
Your output is evaluated on:
1. **Geometric Fidelity (Sv)**: Volume must match prompt description. DO NOT skip internal hollows or leave blocked holes.
2. **Manifold Integrity (M)**: 100% printable. No self-intersections. No zero-thickness walls (thin walls must be > 0.8mm).
3. **Dimensional Accuracy (Sd)**: All specified mm dimensions must match the final bounding box within 5%.
4. **Visual Anchor (6x6 Grid)**: Positioning must be precise relative to the origin.

FAILURE to meet P_succ > 0.8 results in an automatic system retry. Ensure your code is structurally sound and follows Atomic LMP rules.

### Example: Tactical Equipment
\`\`\`openscad
use <libraries/tactical.scad>

// Parameters
plate_width = 100;
plate_height = 60;

// Assembly
union() {
    // Base plate
    cube([plate_width, 5, plate_height], center=true);

    // Picatinny on front
    translate([0, 10, 0])
        rotate([90, 0, 0])
            picatinny_rail(slots=5, height=15);

    // MOLLE clips on back
    translate([-25, -5, 0]) molle_clip();
    translate([25, -5, 0]) molle_clip();
}
\`\`\`

## INLINE MODULES (define these yourself when needed)
For simple patterns not in the library, define inline:

### Tube/Pipe
module tube(od, id, h) {
    difference() {
        cylinder(h=h, d=od, center=true);
        cylinder(h=h + eps*2, d=id, center=true);
    }
}

### Step Hole (supports-free printing)
module step_hole(d, h, steps=3) {
    for (i = [0:steps-1]) {
        translate([0, 0, i * h/steps])
            cylinder(h=h/steps + eps, d1=d - (steps-i)*0.4, d2=d - (steps-i-1)*0.4);
    }
}

## TACTICAL EQUIPMENT ASSEMBLY RULES
When building plate carrier adapters (Picatinny + MOLLE):
1. MOLLE clips hook TOWARD the body (negative Y direction if body is at -Y)
2. Picatinny groove opens AWAY from body (positive Z or Y, opposite to MOLLE)
3. Base plate connects both - clips on INBOARD side, rail on OUTBOARD side
4. Always use these reference modules - do NOT improvise the geometry

## INDUSTRY STANDARDS (use these, don't ask)

### Fastener Clearances
- M3: 3.4mm hole, 5.5mm head
- M4: 4.5mm hole, 7mm head
- M5: 5.5mm hole, 8.5mm head

### Picatinny Rail (MIL-STD-1913)
- Top width: 21.2mm, Base: 20.6mm
- Height: 9.6mm, Slot: 5.23mm wide
- Slot spacing: 10.01mm center-to-center

### MOLLE/PALS
- Webbing: 25mm wide
- Row height: 25mm
- Slot spacing: 38mm horizontal

### 3D Printing
- Min wall: 1.2mm (3 perimeters @ 0.4mm)
- Fit clearance: 0.2mm normal, 0.4mm loose
- Overhang: max 45° without support

## MANUFACTURING CHECKLIST
Before output, verify:
[ ] All variables defined BEFORE use
[ ] eps = 0.01 defined
[ ] difference() cutters extend by eps*2
[ ] All semicolons present
[ ] All braces matched
[ ] $fn set for curves
[ ] use <libraries/tactical.scad> present if using picatinny_/molle_ modules

## FEW-SHOT EXAMPLES

### EXAMPLE 1: "Make a small box with a lid, 60mm wide, 40mm deep, 30mm tall"

\`\`\`openscad
// Box with Lid - Shell construction with tongue-groove closure
// Generated by PolyGen AI

// ============ Parameters ============
box_width = 60;
box_depth = 40;
box_height = 30;
wall = 2;
lid_height = 5;
tongue_depth = 3;
clearance = 0.2;

// ============ Settings ============
$fn = $preview ? 32 : 64;
eps = 0.01;

// ============ Modules ============
module box_bottom() {
    difference() {
        cube([box_width, box_depth, box_height], center=true);
        translate([0, 0, wall])
            cube([box_width - wall*2, box_depth - wall*2, box_height - wall + eps], center=true);
    }
}

module box_lid() {
    union() {
        cube([box_width, box_depth, lid_height], center=true);
        translate([0, 0, -(lid_height/2 + tongue_depth/2)])
            cube([box_width - wall*2 - clearance*2, box_depth - wall*2 - clearance*2, tongue_depth], center=true);
    }
}

module main() {
    translate([0, 0, box_height/2])
        box_bottom();
    translate([0, 0, box_height + lid_height/2])
        box_lid();
}

main();
\`\`\`

### EXAMPLE 2: "Desk organizer with 3 compartments: pen cup, card holder, clip tray"

\`\`\`openscad
// Desk Organizer - Three compartments with rounded shells
// Generated by PolyGen AI

// ============ Parameters ============
wall = 2.5;
cr = 3;
pen_w = 50;  pen_d = 80;  pen_h = 100;
card_w = 70; card_d = 80; card_h = 60;
tray_w = 60; tray_d = 80; tray_h = 25;

// ============ Settings ============
$fn = $preview ? 32 : 64;
eps = 0.01;

// ============ Modules ============
module rounded_cube(size, r) {
    hull() {
        for (x = [-1, 1], y = [-1, 1], z = [-1, 1])
            translate([x*(size[0]/2 - r), y*(size[1]/2 - r), z*(size[2]/2 - r)])
                sphere(r = r);
    }
}

module shell_cup(w, d, h, wt, r) {
    difference() {
        rounded_cube([w, d, h], r);
        translate([0, 0, wt])
            rounded_cube([w - wt*2, d - wt*2, h - wt + eps], max(r - wt, 0.5));
    }
}

module main() {
    union() {
        translate([-(card_w/2 + pen_w/2), 0, pen_h/2])
            shell_cup(pen_w, pen_d, pen_h, wall, cr);
        translate([0, 0, card_h/2])
            shell_cup(card_w, card_d, card_h, wall, cr);
        translate([(card_w/2 + tray_w/2), 0, tray_h/2])
            shell_cup(tray_w, tray_d, tray_h, wall, cr);
    }
}

main();
\`\`\`

These examples show the MANDATORY patterns: parameters at top, $fn = $preview ? 32 : 64, eps = 0.01, center=true, atomic modules, main() at bottom, eps*2 on all difference() cutters.
`;

// Edit system prompt
const EDIT_SYSTEM_PROMPT = `
You are a Runtime Manufacturing Agent. You are an OpenSCAD code editor. Apply precise modifications to existing code.

## ⚠️ MANDATORY: IMMUTABLE LIBRARY BOUNDARY
You have READ-ONLY access to /libraries/. DO NOT attempt to edit, refactor, or update files in public/libraries/. 
If a library module (e.g., picatinny_rail) produces non-manifold geometry or fails to fit the design:
1. Do NOT ask to update the library file.
2. Define a local fixed version of the module (e.g., module fixed_picatinny_rail() {...}) directly in your output.
3. Use this local module for the current generation only.
4. IMPORTANT: If you apply a local polyfill/fix to a library module, you MUST include this tag at the end of your code:
   <polyfill_detected module="original_module_name" reasoning="Brief explanation of why the library module was bypassed" />

## RULES
1. PRESERVE existing design intent and relationships between parts
2. Make MINIMAL changes - only what's requested
3. Maintain clearances - don't let parts collide
4. Variables are immutable - add new ones, don't reassign
5. Keep eps = 0.01 for boolean operations
6. KEEP existing use <libraries/tactical.scad> if present; ADD it if using picatinny_/molle_ modules

## BEFORE EDITING - ASK YOURSELF
1. What other components depend on this part?
2. Will my change cause parts to overlap?
3. Does my change preserve functional purpose?

## OUTPUT
Return COMPLETE modified SCAD file.
Output ONLY valid OpenSCAD code, no markdown.
`;

export interface UnifiedInput {
  userPrompt: string;
  imageData?: ImageData;
  /** STL Remix: Uploaded STL for modification workflow */
  stlFile?: STLFileData;
  existingCode?: string;
  existingGST?: GeometricStructureTree;
  conversationHistory?: string[];
  validationErrors?: string[];
  isEdit?: boolean;
  /** Streaming callback: receives each chunk and accumulated text */
  onChunk?: (chunk: string, fullText: string) => void;
  /** Enable streaming (defaults to true when onChunk is provided) */
  useStreaming?: boolean;
}

export interface UnifiedOutput {
  needsClarification: boolean;
  clarifications?: { question: string; suggestions: string[] }[];
  scadCode?: string;
  gst?: GeometricStructureTree; // Optional - extracted from code comments
}

/**
 * Call Claude API via server proxy
 */
async function callClaude(
  prompt: string,
  systemPrompt: string,
  imageData?: ImageData,
  abortSignal?: AbortSignal
): Promise<string> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  // Build messages array
  type MessageContent =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
  type Message = { role: 'user' | 'assistant'; content: string | MessageContent[] };
  const messages: Message[] = [];

  if (imageData) {
    // Multimodal message with image
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mimeType,
            data: imageData.base64,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Build request body with prompt caching support
  // Research: Caching system prompts reduces costs by 50%+ for multi-turn conversations
  const requestBody = {
    model: process.env.CODER_MODEL || DEFAULT_MODEL,
    max_tokens: 8192,
    // Use structured system message format for prompt caching
    // The cache_control flag tells Claude to cache this content
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  };

  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage =
      errorBody?.error?.message || errorBody?.error || `API error: ${response.status}`;
    console.error('Claude API error:', errorBody);
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
  }

  const data = await response.json();
  const content = data.content?.[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  return content.text;
}

/**
 * Call Claude API with streaming support via SSE
 * Provides real-time feedback during 30-60s generation
 */
async function callClaudeStreaming(
  prompt: string,
  systemPrompt: string,
  imageData?: ImageData,
  onChunk?: (chunk: string, fullText: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  // Build messages array (same as callClaude)
  type MessageContent =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
  type Message = { role: 'user' | 'assistant'; content: string | MessageContent[] };
  const messages: Message[] = [];

  if (imageData) {
    // Multimodal message with image
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mimeType,
            data: imageData.base64,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Build request body with prompt caching support
  const requestBody = {
    model: process.env.CODER_MODEL || DEFAULT_MODEL,
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  };

  return streamClaudeResponse(
    requestBody,
    {
      onChunk: onChunk || (() => {}),
      onComplete: () => {},
      onError: (error) => {
        throw error;
      },
    },
    abortSignal
  );
}

/**
 * Generate OpenSCAD code directly from user prompt
 * Unified pipeline - no intermediate GST translation
 */
export async function generate(
  input: UnifiedInput,
  abortSignal?: AbortSignal
): Promise<UnifiedOutput> {
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Load user preferences
  void loadPreferences();
  const prefsContext = getPreferencesForPrompt();

  // Build prompt based on mode
  let prompt: string;
  let systemPrompt: string;

  if (input.isEdit && input.existingCode) {
    // Edit mode
    systemPrompt = EDIT_SYSTEM_PROMPT;
    prompt = `## EXISTING CODE
\`\`\`openscad
${input.existingCode}
\`\`\`

## EDIT REQUEST
${input.userPrompt}

Apply the requested changes. Output the complete modified SCAD code.`;
  } else {
    // New generation
    systemPrompt = UNIFIED_SYSTEM_PROMPT;

    const contextParts: string[] = [];

    if (prefsContext) {
      contextParts.push(`## USER PREFERENCES\n${prefsContext}`);
    }

    if (input.conversationHistory?.length) {
      contextParts.push(`## CONVERSATION HISTORY\n${input.conversationHistory.join('\n')}`);
    }

    if (input.imageData) {
      contextParts.push(
        `## REFERENCE IMAGE\nAnalyze the attached image and create a 3D printable version.`
      );
    }

    // STL Remix: User uploaded an STL to modify
    if (input.stlFile) {
      contextParts.push(
        `## STL REMIX MODE
An existing STL file has been uploaded: "${input.stlFile.filename}" (${(input.stlFile.size / 1024).toFixed(1)} KB)
The file is available at "/user_upload.stl" in the WASM filesystem.

IMMUTABLE MESH RULE: You must NEVER attempt to reverse-engineer the STL into points/faces.
Treat the STL as a solid block. Use import("/user_upload.stl") and modify it ONLY using difference() or union().

IMPORTANT RULES FOR STL REMIX:
1. Use import("/user_upload.stl") to reference the existing model
2. Do NOT try to recreate the imported geometry - it's a "baked" mesh
3. Build AROUND it using union(), difference(), or intersection()
4. The user wants to ADD or MODIFY features on this existing model
5. Always wrap the import and your modifications in a single union() or other CSG op
6. NEVER use polyhedron() to approximate the imported mesh - it will hallucinate vertices

EXAMPLE:
\`\`\`openscad
eps = 0.01;
$fn = 64;

// Import the user's existing model
module original_model() {
    import("/user_upload.stl", convexity=10);
}

// Add a mounting loop to the top
union() {
    original_model();
    translate([0, 0, 30]) // Adjust position as needed
        difference() {
            cylinder(d=12, h=5);
            cylinder(d=8, h=5 + eps*2);
        }
}
\`\`\``
      );
    }

    if (input.validationErrors?.length) {
      contextParts.push(
        `## PREVIOUS ERRORS - FIX THESE\n${input.validationErrors.map((e) => `- ${e}`).join('\n')}`
      );
    }

    prompt = `${contextParts.join('\n\n')}

## DESIGN REQUEST
${input.userPrompt}

Generate the OpenSCAD code for this design. Output ONLY valid SCAD code unless you need clarification.`;
  }

  try {
    // Use streaming if callback provided (default behavior)
    const useStreaming = input.useStreaming !== false && !!input.onChunk;

    let text: string;
    if (useStreaming) {
      text = await callClaudeStreaming(
        prompt,
        systemPrompt,
        input.imageData,
        input.onChunk,
        abortSignal
      );
    } else {
      text = await callClaude(prompt, systemPrompt, input.imageData, abortSignal);
    }

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    // Check if response is a clarification request
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.includes('needsClarification')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.needsClarification) {
          return {
            needsClarification: true,
            clarifications: parsed.clarifications || [],
          };
        }
      } catch {
        // Not valid JSON, treat as code
      }
    }

    // Extract clean SCAD code
    let scadCode = extractScadCode(text);

    // Tactical Guard: Auto-inject library if tactical modules are used but library is missing
    if (
      (scadCode.includes('picatinny_') || scadCode.includes('molle_')) &&
      !scadCode.includes('libraries/tactical.scad')
    ) {
      console.log('Tactical Guard: Auto-injecting missing tactical library import');
      scadCode = `use <libraries/tactical.scad>\n\n${scadCode}`;
    }

    // Telemetry: Detect polyfills
    detectAndLogPolyfills(scadCode);

    return {
      needsClarification: false,
      scadCode,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Unified generator error:', error);
    throw new Error(
      `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract clean OpenSCAD code from response
 * Handles cases where Claude outputs explanation before/after code blocks
 */
function extractScadCode(text: string): string {
  const trimmed = text.trim();

  // First, try to find a code block anywhere in the text
  // This handles cases where Claude outputs explanation before the code
  const codeBlockMatch = trimmed.match(/```(?:openscad|scad)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim();
    // Verify it looks like OpenSCAD (has variables or primitives)
    if (extracted.match(/(?:cube|cylinder|sphere|difference|union|module|=\s*\d)/)) {
      console.log('Extracted OpenSCAD code from markdown block');
      return extracted;
    }
  }

  // Fallback: Remove markdown code fences if at start/end (legacy behavior)
  let code = trimmed;
  if (code.startsWith('```openscad')) {
    code = code.slice(12);
  } else if (code.startsWith('```scad')) {
    code = code.slice(7);
  } else if (code.startsWith('```')) {
    code = code.slice(3);
  }

  if (code.endsWith('```')) {
    code = code.slice(0, -3);
  }

  // Check if the result looks like explanation text (not OpenSCAD code)
  // If it starts with conversational text, try to find where code begins
  const codeStart = code.trim();
  if (codeStart && !codeStart.startsWith('//') && !codeStart.match(/^[$\w]+\s*=/)) {
    // Text doesn't look like OpenSCAD - might have explanation at start
    // Try to find where the actual code begins (line starting with // or variable assignment)
    const lines = codeStart.split('\n');
    const codeStartIdx = lines.findIndex(
      (line) =>
        line.trim().startsWith('//') ||
        line.trim().match(/^[$\w]+\s*=/) ||
        line.trim().match(/^(?:module|function|difference|union|cube|cylinder|sphere)\s*[({]?/)
    );
    if (codeStartIdx > 0) {
      console.warn(`Stripped ${codeStartIdx} lines of explanation text from Claude response`);
      return lines.slice(codeStartIdx).join('\n').trim();
    }
  }

  return code.trim();
}

import { telemetryService } from './telemetryService';

/**
 * Detect polyfill tags in code and log to telemetry
 */
function detectAndLogPolyfills(code: string): void {
  const polyfillRegex = /<polyfill_detected\s+module="([^"]+)"\s+reasoning="([^"]+)"\s*\/>/g;
  let match;

  while ((match = polyfillRegex.exec(code)) !== null) {
    const moduleName = match[1];
    const reasoning = match[2];

    // Log asynchronously
    telemetryService.logLibraryDefect({
      moduleName,
      reasoning,
      scadCode: code,
    });
  }
}

// Export as object
export const unifiedGeneratorService = {
  generate,
};

export default unifiedGeneratorService;
