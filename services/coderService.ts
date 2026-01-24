/**
 * Coder Service
 * Interfaces with Claude 3.7 Sonnet to generate OpenSCAD code from GST
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  GeometricStructureTree,
  CoderInput,
  CoderEditInput,
  CoderOutput
} from '../types';

// System prompt for the Coder agent
const CODER_SYSTEM_PROMPT = `
You are the PolyGen Coder - an expert OpenSCAD developer specializing in BOSL2 library usage.

## OUTPUT FORMAT
Return ONLY valid OpenSCAD code. No markdown fences, no commentary.

## MANDATORY STRUCTURE
\`\`\`openscad
// PolyGen Generated Model
// Name: {name}

include <BOSL2/std.scad>

// === PARAMETERS ===
{all parameters as variables}

$slop = 0.1;
$fn = 64;

// === MODULES ===
{each component as a module}

// === MAIN ===
module main() {
    {assembly}
}

main();
\`\`\`

## RULES
1. ALL numbers must be variables at top
2. Use BOSL2 shapes (cuboid, cyl, tube) not OpenSCAD primitives
3. Use attach() for positioning, NOT translate()
4. Use diff("remove") for boolean operations
5. One module per GST component

## NOW EXECUTE
Convert the GST to BOSL2 OpenSCAD code.
`;

// BOSL2 reference (abbreviated for token efficiency)
const BOSL2_QUICK_REF = `
BOSL2 Quick Reference:
- cuboid([x,y,z], rounding=r, anchor=BOTTOM)
- cyl(h=h, d=d, rounding=r)
- tube(h=h, od=od, id=id)
- sphere(d=d)
- attach(PARENT_ANCHOR, CHILD_ANCHOR) child();
- diff("remove") parent() { tag("remove") cutter(); }
- xcopies(n, spacing), ycopies(), zcopies()
- zrot_copies(n=6, r=radius) child();

Anchors: TOP, BOTTOM, LEFT, RIGHT, FRONT, BACK, CENTER
`;

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not set. Add it to .env.local to enable multi-agent pipeline.");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Check if Claude API is available
 */
export function isCoderAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Generate OpenSCAD code from a GST
 */
export async function generateCode(
  input: CoderInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput> {
  const client = getClient();

  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Build prompt
  let prompt = `## GEOMETRIC STRUCTURE TREE (GST)
\`\`\`json
${JSON.stringify(input.gst, null, 2)}
\`\`\`

${BOSL2_QUICK_REF}
`;

  // Add validation errors if this is a retry
  if (input.validationErrors && input.validationErrors.length > 0) {
    prompt += `\n## PREVIOUS VALIDATION ERRORS - FIX THESE
${input.validationErrors.map(e => `- ${e}`).join('\n')}
`;
  }

  prompt += `\nGenerate the OpenSCAD code. Output ONLY valid SCAD code, no markdown.`;

  try {
    const response = await client.messages.create({
      model: process.env.CODER_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: CODER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    // Extract text content
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Coder agent');
    }

    return {
      scadCode: extractScadCode(content.text)
    };

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Coder service error:", error);
    throw new Error(`Coder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Edit existing OpenSCAD code (Symbolic Correction)
 */
export async function editCode(
  input: CoderEditInput,
  abortSignal?: AbortSignal
): Promise<CoderOutput> {
  const client = getClient();

  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  const prompt = `## EXISTING GST
\`\`\`json
${JSON.stringify(input.existingGST, null, 2)}
\`\`\`

## EXISTING CODE
\`\`\`openscad
${input.existingCode}
\`\`\`

## EDIT REQUEST
${input.editRequest}

## INSTRUCTIONS
Apply SYMBOLIC CORRECTION:
1. Modify ONLY the relevant variables or module parameters
2. DO NOT rewrite the file structure
3. Preserve comments and formatting
4. If adding a feature, add a new module

Output the complete modified SCAD code.`;

  try {
    const response = await client.messages.create({
      model: process.env.CODER_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: CODER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Coder agent');
    }

    return {
      scadCode: extractScadCode(content.text)
    };

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Coder edit error:", error);
    throw new Error(`Coder edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract clean OpenSCAD code from response
 */
function extractScadCode(text: string): string {
  let code = text.trim();

  // Remove markdown code fences
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

  return code.trim();
}

// Export as object for consistent API
export const coderService = {
  generateCode,
  editCode,
  isCoderAvailable
};

export default coderService;
