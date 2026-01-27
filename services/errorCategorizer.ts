/**
 * Error Categorizer
 * Parses and categorizes OpenSCAD validation errors for intelligent retry feedback
 *
 * Research-informed taxonomy includes categories for:
 * - Spatial reasoning failures (disconnected geometry)
 * - Scale mismatches (volume vs GST intent)
 * - Hallucinated library calls (unknown functions)
 */

export type ErrorCategory =
  | 'syntax' // Parse errors, missing semicolons, braces
  | 'undefined_var' // Undefined variables or modules
  | 'csg_operation' // Boolean operation failures
  | 'empty_geometry' // SCENE IS EMPTY
  | 'recursion' // Infinite recursion / stack overflow
  | 'manifold' // Non-manifold geometry
  | 'file_io' // File read/write errors
  | 'disconnected' // [Research] Multiple separate solids not attached
  | 'scale_mismatch' // [Research] Volume deviates >100% from GST intent
  | 'hallucinated_lib' // [Research] Unknown function calls (e.g., BOSL2)
  | 'unknown';

export interface CategorizedError {
  category: ErrorCategory;
  severity: 'critical' | 'warning' | 'info';
  rawMessage: string;
  lineNumber?: number;
  context?: string;
  suggestedFix?: string;
  pitfallReference?: string;
}

// Regex patterns for OpenSCAD error messages
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: ErrorCategory;
  severity: 'critical' | 'warning' | 'info';
  suggestedFix: string;
  pitfallRef?: string;
}> = [
  // Syntax errors
  {
    pattern: /parser error.*?(?:in )?line (\d+)/i,
    category: 'syntax',
    severity: 'critical',
    suggestedFix: 'Check for missing semicolons, braces, or parentheses at the indicated line.',
    pitfallRef: 'syntax-semicolon',
  },
  {
    pattern: /syntax error/i,
    category: 'syntax',
    severity: 'critical',
    suggestedFix: 'Review code for syntax issues: missing semicolons, unmatched braces, or typos.',
    pitfallRef: 'syntax-semicolon',
  },
  {
    pattern: /expected.*?got/i,
    category: 'syntax',
    severity: 'critical',
    suggestedFix: 'Token mismatch - check operator usage and statement structure.',
  },

  // Undefined variables/modules
  {
    pattern: /unknown variable ['"]?(\w+)['"]?/i,
    category: 'undefined_var',
    severity: 'critical',
    suggestedFix: 'Define the variable before use. Remember: OpenSCAD variables are immutable.',
    pitfallRef: 'undefined-variable',
  },
  {
    pattern: /unknown module ['"]?(\w+)['"]?/i,
    category: 'undefined_var',
    severity: 'critical',
    suggestedFix: 'Define the module before calling it, or use a standard OpenSCAD primitive.',
    pitfallRef: 'undefined-module',
  },
  {
    pattern: /unknown function ['"]?(\w+)['"]?/i,
    category: 'undefined_var',
    severity: 'critical',
    suggestedFix: 'Define the function before use, or use a built-in OpenSCAD function.',
  },
  {
    pattern: /undefined/i,
    category: 'undefined_var',
    severity: 'warning',
    suggestedFix: 'A value is undefined. Check variable initialization order.',
    pitfallRef: 'undefined-variable',
  },

  // Empty geometry / CSG issues
  {
    pattern: /scene is empty/i,
    category: 'empty_geometry',
    severity: 'critical',
    suggestedFix:
      "The difference() operation removed all geometry. Ensure cutting shapes don't completely consume the base.",
    pitfallRef: 'difference-penetration',
  },
  {
    pattern: /empty.*?geometry/i,
    category: 'empty_geometry',
    severity: 'critical',
    suggestedFix:
      'No visible geometry produced. Check boolean operations and ensure positive geometry exists.',
    pitfallRef: 'difference-penetration',
  },
  {
    pattern: /0 geometry|no geometry|zero.*?triangles?/i,
    category: 'empty_geometry',
    severity: 'critical',
    suggestedFix: 'Model has no triangles. Verify that difference() leaves visible geometry.',
    pitfallRef: 'difference-penetration',
  },

  // CSG/Boolean operation issues
  {
    pattern: /non-?manifold/i,
    category: 'manifold',
    severity: 'warning',
    suggestedFix:
      'Geometry is not watertight. Ensure boolean operations have slight overlap (use epsilon offset).',
    pitfallRef: 'epsilon-overlap',
  },
  {
    pattern: /degenerate/i,
    category: 'csg_operation',
    severity: 'warning',
    suggestedFix:
      'Degenerate geometry detected. Check for zero-thickness walls or coincident faces.',
  },

  // Recursion errors
  {
    pattern: /recursion|stack overflow|call depth/i,
    category: 'recursion',
    severity: 'critical',
    suggestedFix: 'Infinite recursion detected. Add a termination condition to recursive modules.',
    pitfallRef: 'infinite-recursion',
  },

  // File I/O errors
  {
    pattern: /failed to read|cannot open|file not found/i,
    category: 'file_io',
    severity: 'critical',
    suggestedFix: 'File operation failed. Avoid include/use statements - use inline code only.',
  },

  // ============================================
  // Research-informed error categories
  // ============================================

  // Disconnected geometry (spatial reasoning failure)
  {
    pattern: /multiple.*?solid|separate.*?object|disconnected|unconnected|floating/i,
    category: 'disconnected',
    severity: 'critical',
    suggestedFix:
      'Multiple disconnected solids detected. Ensure all parts are attached via union() or proper translate() positioning.',
    pitfallRef: 'transform-order',
  },
  {
    pattern: /not.*?attached|orphan.*?geometry/i,
    category: 'disconnected',
    severity: 'critical',
    suggestedFix:
      'Geometry is not attached to the main body. Check attachTo references and ensure proper positioning.',
  },

  // Scale mismatch (volume deviation from intent)
  {
    pattern: /scale.*?mismatch|volume.*?deviation|size.*?incorrect|dimension.*?wrong/i,
    category: 'scale_mismatch',
    severity: 'critical',
    suggestedFix:
      'Model dimensions deviate significantly from expected. Verify parameter values and unit consistency.',
  },
  {
    pattern: /bounding.*?box.*?exceed|too.*?large|too.*?small/i,
    category: 'scale_mismatch',
    severity: 'warning',
    suggestedFix:
      'Model size is outside expected bounds. Check for unit conversion issues (mm vs inches).',
  },

  // Hallucinated library calls (common AI mistake)
  {
    pattern: /unknown.*?(BOSL2|MCAD|NopSCADlib|scad-utils)/i,
    category: 'hallucinated_lib',
    severity: 'critical',
    suggestedFix:
      'Library function called but library not available. Use only built-in OpenSCAD primitives. NO include/use statements.',
    pitfallRef: 'undefined-module',
  },
  {
    pattern: /unknown.*?(attach|tag|diff|intersect_for|part|subpart)/i,
    category: 'hallucinated_lib',
    severity: 'critical',
    suggestedFix:
      'BOSL2 function used but library not loaded. Replace with standard OpenSCAD: translate() + child geometry instead of attach().',
  },
  {
    pattern: /unknown.*?(thread|gear|bearing|hinge|knurl)/i,
    category: 'hallucinated_lib',
    severity: 'critical',
    suggestedFix:
      'Advanced function used but not defined. Create a custom module or use primitive approximations.',
  },
];

/**
 * Parse line number from error message
 */
function parseLineNumber(message: string): number | undefined {
  const patterns = [/line (\d+)/i, /at line (\d+)/i, /:(\d+):/, /\[(\d+)\]/];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return undefined;
}

/**
 * Extract context from code around a line number
 */
function extractCodeContext(code: string, lineNumber: number, contextLines: number = 2): string {
  const lines = code.split('\n');
  const start = Math.max(0, lineNumber - contextLines - 1);
  const end = Math.min(lines.length, lineNumber + contextLines);

  return lines
    .slice(start, end)
    .map((line, i) => {
      const actualLineNum = start + i + 1;
      const marker = actualLineNum === lineNumber ? ' >>> ' : '     ';
      return `${marker}${actualLineNum}: ${line}`;
    })
    .join('\n');
}

/**
 * Extract variable or module name from error message
 */
function extractIdentifier(message: string): string | undefined {
  const patterns = [
    /unknown (?:variable|module|function) ['"]?(\w+)['"]?/i,
    /undefined.*?['"](\w+)['"]/i,
    /['"](\w+)['"].*?not defined/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Sanitize error message to prevent prompt injection
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/\[INST\]/gi, '[INSTRUCTION]')
    .replace(/<\|.*?\|>/g, '')
    .replace(/###?\s*(SYSTEM|USER|ASSISTANT)/gi, '[$1]')
    .trim();
}

/**
 * Categorize a single error message
 */
function categorizeError(rawMessage: string, code?: string): CategorizedError {
  const sanitized = sanitizeErrorMessage(rawMessage);

  // Default to unknown
  const result: CategorizedError = {
    category: 'unknown',
    severity: 'critical',
    rawMessage: sanitized,
  };

  // Try to match against known patterns
  for (const { pattern, category, severity, suggestedFix, pitfallRef } of ERROR_PATTERNS) {
    if (pattern.test(sanitized)) {
      result.category = category;
      result.severity = severity;
      result.suggestedFix = suggestedFix;
      result.pitfallReference = pitfallRef;
      break;
    }
  }

  // Extract line number
  result.lineNumber = parseLineNumber(sanitized);

  // Extract identifier (variable/module name)
  const identifier = extractIdentifier(sanitized);
  if (identifier) {
    result.context = identifier;
    if (result.category === 'undefined_var') {
      result.suggestedFix = `Define '${identifier}' before use. Check spelling and ensure it's declared at the top of the file.`;
    }
  }

  // Add code context if line number and code available
  if (result.lineNumber && code) {
    result.context = extractCodeContext(code, result.lineNumber);
  }

  return result;
}

/**
 * Main function: Categorize all errors from validation output
 */
export function categorizeErrors(
  rawErrors: string[],
  exitCode: number,
  scadCode?: string
): CategorizedError[] {
  const categorized: CategorizedError[] = [];

  // Process each error message
  for (const error of rawErrors) {
    if (!error.trim()) continue;

    // Split multi-line errors
    const lines = error.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      const categorizedError = categorizeError(line, scadCode);
      categorized.push(categorizedError);
    }
  }

  // If exit code is non-zero but no errors parsed, add generic error
  if (exitCode !== 0 && categorized.length === 0) {
    categorized.push({
      category: 'unknown',
      severity: 'critical',
      rawMessage: `OpenSCAD exited with code ${exitCode}. Check for syntax errors or invalid operations.`,
      suggestedFix:
        'Review the generated code for syntax issues, missing semicolons, or invalid module calls.',
    });
  }

  return categorized;
}

/**
 * Get error summary for logging
 */
export function getErrorSummary(errors: CategorizedError[]): string {
  const byCat: Record<string, number> = {};
  for (const e of errors) {
    byCat[e.category] = (byCat[e.category] || 0) + 1;
  }

  return Object.entries(byCat)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');
}

export const errorCategorizer = {
  categorizeErrors,
  getErrorSummary,
};

export default errorCategorizer;
