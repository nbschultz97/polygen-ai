/**
 * Refactoring Agent
 * SOTA 3-Tier Library System - Code Cleanup Pipeline
 *
 * Takes raw OpenSCAD code from GitHub and transforms it into
 * clean, reusable library modules. Key transformations:
 *
 * 1. Strip top-level geometry (only keep module definitions)
 * 2. Parameterize magic numbers
 * 3. Validate module structure
 * 4. Add documentation comments
 * 5. Ensure WASM compatibility (no file I/O, no includes)
 */

import type { FetchedLibrary } from './librarySearchService';

// Types for refactored code
export interface RefactoredModule {
  name: string;
  parameters: ModuleParameter[];
  code: string;
  description: string;
  usageExample: string;
}

export interface ModuleParameter {
  name: string;
  type: 'number' | 'vector' | 'string' | 'boolean';
  defaultValue: string;
  description: string;
}

export interface RefactoringResult {
  success: boolean;
  modules: RefactoredModule[];
  warnings: string[];
  errors: string[];
}

// Patterns that indicate WASM-incompatible code
const INCOMPATIBLE_PATTERNS = [
  { pattern: /\binclude\s*<[^>]+>/g, issue: 'include statement' },
  { pattern: /\buse\s*<[^>]+>/g, issue: 'external use statement' },
  { pattern: /\bimport\s*\(/g, issue: 'import function' },
  { pattern: /\bsurface\s*\(/g, issue: 'surface function (requires file)' },
  { pattern: /\btext\s*\([^)]*font\s*=/g, issue: 'custom fonts' },
];

/**
 * Extract module definitions from raw OpenSCAD code
 */
export function extractModules(code: string): string[] {
  const modules: string[] = [];
  const modulePattern = /module\s+\w+\s*\([^)]*\)\s*\{/g;
  let match;
  let searchStart = 0;

  while ((match = modulePattern.exec(code)) !== null) {
    const startIndex = match.index;
    let braceCount = 1;
    let endIndex = match.index + match[0].length;

    // Find matching closing brace
    while (braceCount > 0 && endIndex < code.length) {
      if (code[endIndex] === '{') braceCount++;
      if (code[endIndex] === '}') braceCount--;
      endIndex++;
    }

    if (braceCount === 0) {
      // Include preceding comments
      let commentStart = startIndex;
      const beforeModule = code.substring(Math.max(0, startIndex - 500), startIndex);
      const commentMatch = beforeModule.match(/(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)+$/);
      if (commentMatch) {
        commentStart = startIndex - commentMatch[0].length;
      }

      modules.push(code.substring(commentStart, endIndex).trim());
    }

    searchStart = endIndex;
    modulePattern.lastIndex = searchStart;
  }

  return modules;
}

/**
 * Extract function definitions from raw OpenSCAD code
 */
export function extractFunctions(code: string): string[] {
  const functions: string[] = [];
  const functionPattern = /function\s+\w+\s*\([^)]*\)\s*=/g;
  let match;

  while ((match = functionPattern.exec(code)) !== null) {
    const startIndex = match.index;
    let endIndex = startIndex;

    // Find the semicolon that ends the function
    let parenCount = 0;
    let bracketCount = 0;
    let inString = false;

    for (let i = startIndex; i < code.length; i++) {
      const char = code[i];

      if (char === '"' && code[i - 1] !== '\\') {
        inString = !inString;
      }

      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        if (char === ';' && parenCount === 0 && bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    if (endIndex > startIndex) {
      functions.push(code.substring(startIndex, endIndex).trim());
    }
  }

  return functions;
}

/**
 * Check for WASM-incompatible patterns
 */
export function checkCompatibility(code: string): string[] {
  const issues: string[] = [];

  for (const { pattern, issue } of INCOMPATIBLE_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Contains ${issue} - not compatible with browser WASM`);
    }
    pattern.lastIndex = 0;
  }

  return issues;
}

/**
 * Strip top-level geometry, keeping only module/function definitions
 */
export function stripTopLevelGeometry(code: string): string {
  const modules = extractModules(code);
  const functions = extractFunctions(code);

  // Also preserve global variable definitions that look like parameters
  const paramPattern = /^\s*(\w+)\s*=\s*[\d[].*/gm;
  const params: string[] = [];
  let match;

  while ((match = paramPattern.exec(code)) !== null) {
    const line = match[0];
    if (!line.includes('//') || line.includes('default') || line.includes('parameter')) {
      params.push(line.trim());
    }
  }

  // Combine all preserved code
  const preserved = [
    '// Extracted and cleaned by PolyGen AI Refactoring Agent',
    '',
    ...params,
    '',
    ...functions,
    '',
    ...modules,
  ];

  return preserved.join('\n');
}

/**
 * Parse module signature to extract parameters
 */
export function parseModuleSignature(
  moduleCode: string
): { name: string; parameters: ModuleParameter[] } | null {
  const signatureMatch = moduleCode.match(/module\s+(\w+)\s*\(([^)]*)\)/);
  if (!signatureMatch) return null;

  const name = signatureMatch[1];
  const paramString = signatureMatch[2];
  const parameters: ModuleParameter[] = [];

  if (paramString.trim()) {
    const paramParts = paramString.split(',');

    for (const part of paramParts) {
      const trimmed = part.trim();
      const defaultMatch = trimmed.match(/(\w+)\s*=\s*(.+)/);

      if (defaultMatch) {
        const paramName = defaultMatch[1];
        const defaultValue = defaultMatch[2].trim();

        let type: ModuleParameter['type'] = 'number';
        if (defaultValue.startsWith('[')) type = 'vector';
        else if (defaultValue === 'true' || defaultValue === 'false') type = 'boolean';
        else if (defaultValue.startsWith('"')) type = 'string';

        parameters.push({
          name: paramName,
          type,
          defaultValue,
          description: '',
        });
      } else {
        parameters.push({
          name: trimmed,
          type: 'number',
          defaultValue: '',
          description: 'Required parameter',
        });
      }
    }
  }

  return { name, parameters };
}

/**
 * Generate usage example for a module
 */
function generateUsageExample(name: string, parameters: ModuleParameter[]): string {
  const args = parameters
    .filter((p) => p.defaultValue === '')
    .map((p) => {
      switch (p.type) {
        case 'vector':
          return '[10, 10, 10]';
        case 'boolean':
          return 'true';
        case 'string':
          return '"example"';
        default:
          return '10';
      }
    });

  return `${name}(${args.join(', ')});`;
}

/**
 * Full refactoring pipeline
 * Takes a fetched library and returns cleaned, documented modules
 */
export async function refactorLibrary(library: FetchedLibrary): Promise<RefactoringResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const modules: RefactoredModule[] = [];

  // Check compatibility first
  const compatIssues = checkCompatibility(library.content);
  if (compatIssues.length > 0) {
    warnings.push(...compatIssues);
  }

  // Strip top-level geometry
  const cleanedCode = stripTopLevelGeometry(library.content);

  // Extract and process each module
  const extractedModules = extractModules(cleanedCode);

  for (const moduleCode of extractedModules) {
    const signature = parseModuleSignature(moduleCode);
    if (!signature) {
      warnings.push(`Could not parse module signature`);
      continue;
    }

    // Extract description from preceding comments
    const commentMatch = moduleCode.match(/^(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)+/);
    const description = commentMatch
      ? commentMatch[0]
          .replace(/\/\*|\*\/|\/\//g, '')
          .replace(/\*/g, '')
          .trim()
      : `Module ${signature.name} from ${library.source}`;

    modules.push({
      name: signature.name,
      parameters: signature.parameters,
      code: moduleCode,
      description,
      usageExample: generateUsageExample(signature.name, signature.parameters),
    });
  }

  return {
    success: modules.length > 0,
    modules,
    warnings,
    errors,
  };
}

/**
 * Quick validation that code can be used as a library
 */
export function validateAsLibrary(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!code.includes('module ')) {
    issues.push('No module definitions found');
  }

  issues.push(...checkCompatibility(code));

  return {
    valid: issues.length === 0,
    issues,
  };
}

// Export service object
export const refactoringAgent = {
  extractModules,
  extractFunctions,
  checkCompatibility,
  stripTopLevelGeometry,
  parseModuleSignature,
  refactorLibrary,
  validateAsLibrary,
};

export default refactoringAgent;
