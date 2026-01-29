/**
 * OpenSCAD Pitfalls Database
 * Common mistakes and solutions for AI-generated OpenSCAD code
 */

import { ErrorCategory } from './errorCategorizer';

export interface OpenSCADPitfall {
  id: string;
  category: ErrorCategory;
  title: string;
  description: string;
  badExample: string;
  goodExample: string;
  keywords: string[];
}

export const OPENSCAD_PITFALLS: OpenSCADPitfall[] = [
  // ============================================
  // CSG / Boolean Operation Pitfalls
  // ============================================
  {
    id: 'difference-penetration',
    category: 'empty_geometry',
    title: 'Difference Operations Must Fully Penetrate',
    description: 'When using difference(), the cutting geometry must extend PAST the base object on both sides. If it only touches the surface, the result may be empty or have z-fighting artifacts.',
    badExample: `// WRONG - hole doesn't extend past surfaces
difference() {
  cube([20, 20, 10]);
  translate([10, 10, 0])
    cylinder(h=10, d=5);  // Ends exactly at surface
}`,
    goodExample: `// CORRECT - extend by epsilon on both sides
eps = 0.01;
difference() {
  cube([20, 20, 10]);
  translate([10, 10, -eps])
    cylinder(h=10 + eps*2, d=5);  // Extends past both surfaces
}`,
    keywords: ['difference', 'empty', 'scene', 'geometry', 'hole', 'cut', 'subtract']
  },
  {
    id: 'epsilon-overlap',
    category: 'manifold',
    title: 'Use Epsilon for Boolean Operations',
    description: 'Coincident faces (faces touching exactly) cause undefined behavior. Always use a small epsilon offset to ensure clean boolean operations.',
    badExample: `// WRONG - faces exactly coincide
union() {
  cube([10, 10, 10]);
  translate([10, 0, 0]) cube([10, 10, 10]);  // Touching at edge
}`,
    goodExample: `// CORRECT - slight overlap
eps = 0.01;
union() {
  cube([10, 10, 10]);
  translate([10 - eps, 0, 0]) cube([10, 10, 10]);  // Overlaps slightly
}`,
    keywords: ['manifold', 'coincident', 'touching', 'edge', 'face', 'overlap']
  },
  {
    id: 'manifold-guard',
    category: 'manifold',
    title: 'Manifold Guard: Prevent Non-Manifold Geometry',
    description: 'Non-manifold geometry (edges shared by >2 faces, zero-thickness walls, T-junctions) makes models unprintable. The Manifold Guard enforces three rules: (1) epsilon on ALL difference() cuts, (2) hull() for connectivity instead of edge alignment, (3) no coincident faces between union() children.',
    badExample: `// WRONG - multiple manifold violations
difference() {
  cube([20, 20, 10]);
  translate([5, 5, 0])
    cylinder(h=10, d=8);  // No epsilon: coincident top/bottom faces
}
// Parts touching at exact edge (T-junction)
union() {
  cube([20, 10, 5]);
  translate([20, 0, 0]) cube([10, 10, 5]);  // Shares exact edge
}`,
    goodExample: `// CORRECT - Manifold Guard applied
epsilon = 0.01;
difference() {
  cube([20, 20, 10]);
  translate([5, 5, -epsilon])
    cylinder(h=10 + epsilon*2, d=8);  // Oversized by epsilon
}
// hull() connectivity instead of edge alignment
hull() {
  translate([0, 0, 0]) cube([20, 10, 5]);
  translate([18, 0, 0]) cube([12, 10, 5]);  // Overlap via hull
}`,
    keywords: ['manifold', 'non-manifold', '2-manifold', 'watertight', 'self-intersect', 'degenerate', 'T-junction', 'coincident', 'unprintable']
  },
  {
    id: 'manifold-hull-connectivity',
    category: 'manifold',
    title: 'Use hull() for Part Connectivity (Not Edge Alignment)',
    description: 'When connecting two parts, use hull() with keyframe primitives instead of relying on exact coordinate math. hull() guarantees a watertight solid between any two convex shapes, eliminating manifold errors at joints.',
    badExample: `// WRONG - elbow via exact coordinate alignment (fragile, manifold-prone)
module elbow() {
  cylinder(h=20, d=10);
  translate([0, 0, 20])
    rotate([0, 90, 0])
      cylinder(h=20, d=10);  // T-junction at joint
}`,
    goodExample: `// CORRECT - hull() elbow (guaranteed manifold)
module elbow(d=10, len=20) {
  hull() {
    cylinder(h=1, d=d);
    translate([0, 0, len])
      sphere(d=d);  // Keyframe at bend point
  }
  hull() {
    translate([0, 0, len])
      sphere(d=d);  // Same keyframe
    translate([len, 0, len])
      cylinder(h=1, d=d);
  }
}`,
    keywords: ['hull', 'elbow', 'joint', 'connection', 'connectivity', 'bend', 'manifold', 'T-junction']
  },

  // ============================================
  // Variable Scope Pitfalls
  // ============================================
  {
    id: 'undefined-variable',
    category: 'undefined_var',
    title: 'Variables Must Be Defined Before Use',
    description: 'OpenSCAD processes variables at compile-time. All variables must be defined BEFORE they are used. The "last assignment wins" globally.',
    badExample: `// WRONG - using variable before definition
cube([width, height, depth]);
width = 10;
height = 20;
depth = 5;`,
    goodExample: `// CORRECT - define variables first
width = 10;
height = 20;
depth = 5;
cube([width, height, depth]);`,
    keywords: ['undefined', 'variable', 'not defined', 'unknown variable']
  },
  {
    id: 'variable-immutability',
    category: 'syntax',
    title: 'Variables Are Immutable (Last Assignment Wins)',
    description: 'OpenSCAD variables cannot be modified after assignment. Each "assignment" is actually a new declaration, and the LAST one wins globally.',
    badExample: `// WRONG - trying to increment
x = 5;
x = x + 1;  // This causes undef, not 6`,
    goodExample: `// CORRECT - use let() for local scope
x = 5;
y = let(temp = x + 1) temp;  // y is 6, x is still 5

// Or use a function for calculations
function increment(val) = val + 1;
x = 5;
y = increment(x);  // y is 6`,
    keywords: ['reassign', 'increment', 'modify', 'change', 'update']
  },

  // ============================================
  // Module Pitfalls
  // ============================================
  {
    id: 'undefined-module',
    category: 'undefined_var',
    title: 'Modules Must Be Defined Before Use',
    description: 'Custom modules must be defined before they are called. Place module definitions at the top of your file.',
    badExample: `// WRONG - calling module before definition
my_part();

module my_part() {
  cube(10);
}`,
    goodExample: `// CORRECT - define module first
module my_part() {
  cube(10);
}

my_part();`,
    keywords: ['unknown module', 'module', 'undefined', 'not found']
  },
  {
    id: 'module-scope',
    category: 'undefined_var',
    title: 'Module Parameters Are Local Only',
    description: 'Parameters passed to a module only exist inside that module. They cannot be accessed from outside or from other modules.',
    badExample: `// WRONG - trying to access module parameter outside
module base(size) {
  cube(size);
}
base(10);
echo(size);  // ERROR: size is undefined here`,
    goodExample: `// CORRECT - use global variable
size = 10;
module base(s) {
  cube(s);
}
base(size);
echo(size);  // Works: size is global`,
    keywords: ['scope', 'parameter', 'module', 'undefined']
  },

  // ============================================
  // Transform Pitfalls
  // ============================================
  {
    id: 'transform-order',
    category: 'csg_operation',
    title: 'Transform Order Matters (Right-to-Left)',
    description: 'Transformations apply RIGHT TO LEFT (innermost operation first). translate() then rotate() produces different results than rotate() then translate().',
    badExample: `// Might not produce expected result
// This rotates THEN translates (object orbits around origin)
rotate([0, 0, 45]) translate([20, 0, 0]) cube(5);`,
    goodExample: `// Usually you want to translate THEN rotate
// This moves the cube, then rotates around its new position
translate([20, 0, 0]) rotate([0, 0, 45]) cube(5, center=true);

// Or be explicit with nested transforms
translate([20, 0, 0])
  rotate([0, 0, 45])
    cube(5, center=true);`,
    keywords: ['transform', 'rotate', 'translate', 'order', 'position', 'orientation']
  },

  // ============================================
  // Syntax Pitfalls
  // ============================================
  {
    id: 'syntax-semicolon',
    category: 'syntax',
    title: 'Missing Semicolons',
    description: 'Every statement in OpenSCAD must end with a semicolon. This includes variable assignments, module calls, and standalone primitives.',
    badExample: `// WRONG - missing semicolons
width = 10
height = 20
cube([width, height, 5])`,
    goodExample: `// CORRECT - semicolons after each statement
width = 10;
height = 20;
cube([width, height, 5]);`,
    keywords: ['parser', 'syntax', 'semicolon', 'expected']
  },
  {
    id: 'syntax-braces',
    category: 'syntax',
    title: 'Unmatched Braces',
    description: 'Every opening brace { must have a matching closing brace }. Module definitions, boolean operations, and for loops all require braces.',
    badExample: `// WRONG - missing closing brace
module box() {
  difference() {
    cube(10);
    cylinder(h=10, d=5);
  // Missing two closing braces!`,
    goodExample: `// CORRECT - all braces matched
module box() {
  difference() {
    cube(10);
    cylinder(h=10, d=5);
  }
}`,
    keywords: ['brace', 'bracket', 'expected', 'syntax', '{', '}']
  },

  // ============================================
  // Recursion Pitfalls
  // ============================================
  {
    id: 'infinite-recursion',
    category: 'recursion',
    title: 'Infinite Recursion in Modules',
    description: 'Recursive modules must have a termination condition that stops the recursion. Without it, OpenSCAD will crash with stack overflow.',
    badExample: `// WRONG - infinite recursion
module recursive_part(depth) {
  cube(depth);
  translate([depth, 0, 0])
    recursive_part(depth * 0.8);  // No termination!
}
recursive_part(10);`,
    goodExample: `// CORRECT - with termination condition
module recursive_part(depth) {
  if (depth > 1) {  // Terminate when depth <= 1
    cube(depth);
    translate([depth, 0, 0])
      recursive_part(depth * 0.8);
  }
}
recursive_part(10);`,
    keywords: ['recursion', 'stack', 'overflow', 'infinite', 'call depth']
  },

  // ============================================
  // Rotate Extrude Pitfalls
  // ============================================
  {
    id: 'rotate-extrude-axis',
    category: 'csg_operation',
    title: 'Rotate Extrude Requires Offset from Y-Axis',
    description: 'When using rotate_extrude(), the 2D shape must be translated AWAY from the Y-axis (along X). Shapes crossing the Y-axis create invalid geometry.',
    badExample: `// WRONG - shape crosses Y-axis
rotate_extrude()
  circle(r=10);  // Circle is centered at origin`,
    goodExample: `// CORRECT - translate away from Y-axis
rotate_extrude()
  translate([20, 0])  // Move circle away from Y-axis
    circle(r=5);`,
    keywords: ['rotate_extrude', 'axis', 'invalid', 'geometry']
  },

  // ============================================
  // Print/Manufacturing Pitfalls
  // ============================================
  {
    id: 'thin-walls',
    category: 'manifold',
    title: 'Walls Too Thin for 3D Printing',
    description: 'For FDM 3D printing, walls must be at least 1.2mm thick (3 perimeters with 0.4mm nozzle). Thinner walls may not print or will be fragile.',
    badExample: `// WRONG - wall is too thin
wall = 0.5;  // Only 0.5mm - will fail to print
difference() {
  cube([20, 20, 10]);
  translate([wall, wall, wall])
    cube([20-wall*2, 20-wall*2, 10]);
}`,
    goodExample: `// CORRECT - minimum 1.2mm walls
wall = 2;  // 2mm wall - strong and printable
difference() {
  cube([20, 20, 10]);
  translate([wall, wall, wall])
    cube([20-wall*2, 20-wall*2, 10-wall]);
}`,
    keywords: ['thin', 'wall', 'print', 'thickness', 'manifold']
  }
];

/**
 * Find pitfalls relevant to the given categorized errors
 */
export function findRelevantPitfalls(
  errors: Array<{ category: ErrorCategory; rawMessage: string }>
): OpenSCADPitfall[] {
  const relevant = new Map<string, OpenSCADPitfall>();

  for (const error of errors) {
    const errorText = error.rawMessage.toLowerCase();

    // Match by category
    for (const pitfall of OPENSCAD_PITFALLS) {
      if (pitfall.category === error.category) {
        relevant.set(pitfall.id, pitfall);
      }
    }

    // Match by keywords
    for (const pitfall of OPENSCAD_PITFALLS) {
      for (const keyword of pitfall.keywords) {
        if (errorText.includes(keyword.toLowerCase())) {
          relevant.set(pitfall.id, pitfall);
        }
      }
    }
  }

  // Return at most 5 most relevant pitfalls
  return Array.from(relevant.values()).slice(0, 5);
}

/**
 * Get pitfalls by category
 */
export function getPitfallsByCategory(category: ErrorCategory): OpenSCADPitfall[] {
  return OPENSCAD_PITFALLS.filter(p => p.category === category);
}

/**
 * Get pitfall by ID
 */
export function getPitfallById(id: string): OpenSCADPitfall | undefined {
  return OPENSCAD_PITFALLS.find(p => p.id === id);
}

/**
 * Format pitfalls as guidance text for AI prompts
 */
export function formatPitfallGuidance(pitfalls: OpenSCADPitfall[], detailed: boolean = false): string {
  if (pitfalls.length === 0) {
    return '';
  }

  let guidance = '### OPENSCAD PITFALLS TO AVOID\n\n';

  for (const pitfall of pitfalls) {
    guidance += `**${pitfall.title}**\n`;
    guidance += `${pitfall.description}\n\n`;

    if (detailed) {
      guidance += `BAD:\n\`\`\`openscad\n${pitfall.badExample}\n\`\`\`\n\n`;
      guidance += `GOOD:\n\`\`\`openscad\n${pitfall.goodExample}\n\`\`\`\n\n`;
    }

    guidance += '---\n\n';
  }

  return guidance;
}

export const openscadPitfalls = {
  OPENSCAD_PITFALLS,
  findRelevantPitfalls,
  getPitfallsByCategory,
  getPitfallById,
  formatPitfallGuidance
};

export default openscadPitfalls;
