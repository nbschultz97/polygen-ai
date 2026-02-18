/**
 * Validation Feedback Builder
 * Builds structured feedback packages for retry attempts with escalating guidance
 */

import type { GeometricStructureTree } from '../types';
import type { CategorizedError } from './errorCategorizer';
import { categorizeErrors, getErrorSummary } from './errorCategorizer';
import { findRelevantPitfalls, formatPitfallGuidance } from './openscadPitfalls';

export interface ValidationFeedback {
  attempt: number;
  maxAttempts: number;
  categorizedErrors: CategorizedError[];
  failedCode: string;
  gst: GeometricStructureTree;
  promptGuidance: string;
  pitfallsIncluded: string[];
  errorSummary: string;
}

/**
 * Annotate code with error markers at specific lines
 */
function annotateCodeWithErrors(code: string, errors: CategorizedError[]): string {
  const lines = code.split('\n');
  const errorLines = new Map<number, CategorizedError[]>();

  // Group errors by line number
  for (const error of errors) {
    if (error.lineNumber) {
      const existing = errorLines.get(error.lineNumber) || [];
      existing.push(error);
      errorLines.set(error.lineNumber, existing);
    }
  }

  // Annotate lines with errors
  const annotated = lines.map((line, index) => {
    const lineNum = index + 1;
    const lineErrors = errorLines.get(lineNum);

    if (lineErrors) {
      const errorMsg = lineErrors.map((e) => `[${e.category.toUpperCase()}]`).join(' ');
      return `${lineNum.toString().padStart(3)}: ${line}  // <<< ERROR: ${errorMsg}`;
    }
    return `${lineNum.toString().padStart(3)}: ${line}`;
  });

  return annotated.join('\n');
}

/**
 * Get retry instructions based on attempt number
 */
function getRetryInstructions(attempt: number, _maxAttempts: number): string {
  switch (attempt) {
    case 1:
      return `
## FIRST RETRY INSTRUCTIONS
Fix the categorized errors above. Focus specifically on:
1. The exact error messages and line numbers provided
2. Apply the suggested fixes
3. Ensure all variables are defined BEFORE use
4. Use eps = 0.01 for all boolean operation overlaps
`;

    case 2:
      return `
## SECOND RETRY - CAREFUL REVIEW REQUIRED
Previous fix attempt failed. Study the pitfall examples CAREFULLY and apply conservative patterns:

1. VERIFY every variable is defined at the TOP of the file
2. ENSURE every difference() has eps extensions on cutting geometry
3. CHECK that all modules are defined before being called
4. SIMPLIFY complex boolean operations into smaller steps
5. ADD echo() statements to debug if unsure about values

Take a different approach than the previous attempt.
`;

    default:
      return `
## EMERGENCY MODE - MAXIMUM SIMPLIFICATION
Multiple fix attempts have failed. Take extreme measures:

1. REMOVE all complex modules - use only basic primitives
2. INLINE all geometry - no custom modules
3. TEST each boolean operation separately before combining
4. USE explicit translate() for all positioning
5. AVOID recursion entirely
6. SET very conservative epsilon: eps = 0.1;

Generate the SIMPLEST possible code that achieves the design intent.
`;
  }
}

/**
 * Build comprehensive validation feedback for a retry attempt
 */
export function buildValidationFeedback(
  rawErrors: string[],
  exitCode: number,
  failedCode: string,
  gst: GeometricStructureTree,
  attemptNumber: number,
  maxAttempts: number = 3
): ValidationFeedback {
  // Categorize the errors
  const categorizedErrors = categorizeErrors(rawErrors, exitCode, failedCode);

  // Find relevant pitfalls
  const relevantPitfalls = findRelevantPitfalls(categorizedErrors);

  // Determine detail level based on attempt
  const detailed = attemptNumber >= 2;

  // Build the prompt guidance
  let promptGuidance = '';

  // Section 1: Error Summary
  promptGuidance += `## VALIDATION FAILED (Attempt ${attemptNumber}/${maxAttempts})\n\n`;

  // Section 2: Categorized Errors
  promptGuidance += `### ERRORS DETECTED\n\n`;
  for (const error of categorizedErrors) {
    promptGuidance += `**[${error.category.toUpperCase()}]** ${error.rawMessage}\n`;
    if (error.lineNumber) {
      promptGuidance += `  Line: ${error.lineNumber}\n`;
    }
    if (error.suggestedFix) {
      promptGuidance += `  Fix: ${error.suggestedFix}\n`;
    }
    promptGuidance += '\n';
  }

  // Section 3: Failed Code (with annotations on attempt 2+)
  if (attemptNumber >= 2) {
    promptGuidance += `### FAILED CODE (with error locations)\n\`\`\`openscad\n`;
    promptGuidance += annotateCodeWithErrors(failedCode, categorizedErrors);
    promptGuidance += `\n\`\`\`\n\n`;
  }

  // Section 4: Manifold Guard — targeted manifold feedback
  const hasManifoldErrors = categorizedErrors.some((e) => e.category === 'manifold');
  if (hasManifoldErrors) {
    promptGuidance += `### MANIFOLD GUARD — CRITICAL FIX PROTOCOL\n\n`;
    promptGuidance += `Non-manifold geometry was detected. This makes the model unprintable. Apply ALL of these fixes:\n\n`;
    promptGuidance += `1. **Epsilon on ALL difference() cuts**: Define \`epsilon = 0.01;\` at the top. Every cutter in difference() must be oversized by epsilon on every axis:\n`;
    promptGuidance += `   \`translate([x, y, -epsilon]) cylinder(h = h + epsilon*2, d = d);\`\n\n`;
    promptGuidance += `2. **hull() for connectivity**: Do NOT connect parts by exact edge alignment. Use \`hull() { shape_A(); shape_B(); }\` to guarantee watertight joints.\n\n`;
    promptGuidance += `3. **No coincident faces**: union() children must overlap by at least epsilon. Never place two faces at the exact same coordinate.\n\n`;
    promptGuidance += `4. **No zero-thickness walls**: Minimum wall thickness = 1.2mm for printability.\n\n`;
  }

  // Section 5: Relevant Pitfalls
  if (relevantPitfalls.length > 0) {
    promptGuidance += formatPitfallGuidance(relevantPitfalls, detailed);
  }

  // Section 6: Retry Instructions
  promptGuidance += getRetryInstructions(attemptNumber, maxAttempts);

  // Section 7: OpenSCAD Quick Rules (always include)
  promptGuidance += `
### CRITICAL OPENSCAD RULES
- Variables are IMMUTABLE: define before use, last assignment wins globally
- Boolean ops need epsilon: difference() cutters must extend past surfaces
- Transform order is RIGHT-TO-LEFT: innermost operation applies first
- All statements end with semicolons
- Modules defined before called
- rotate_extrude shapes must be offset from Y-axis
`;

  return {
    attempt: attemptNumber,
    maxAttempts,
    categorizedErrors,
    failedCode,
    gst,
    promptGuidance,
    pitfallsIncluded: relevantPitfalls.map((p) => p.id),
    errorSummary: getErrorSummary(categorizedErrors),
  };
}

/**
 * Build a complete retry prompt for the Coder agent
 */
export function buildRetryPrompt(feedback: ValidationFeedback): string {
  let prompt = feedback.promptGuidance;

  // Add the original GST for reference
  prompt += `\n### ORIGINAL DESIGN SPECIFICATION (GST)\n`;
  prompt += `\`\`\`json\n${JSON.stringify(feedback.gst, null, 2)}\n\`\`\`\n\n`;

  // Final instruction
  prompt += `\nGenerate CORRECTED OpenSCAD code that fixes all the errors above. Output ONLY valid SCAD code, no markdown.\n`;

  return prompt;
}

export const validationFeedbackBuilder = {
  buildValidationFeedback,
  buildRetryPrompt,
  annotateCodeWithErrors,
};

export default validationFeedbackBuilder;
