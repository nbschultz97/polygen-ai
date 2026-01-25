# Adding New Component Types to GST

This guide explains how to add new component types to the Geometric Structure Tree (GST) system. Component types represent geometric features that the Planner can specify and the Coder can generate.

## Overview

Adding a new component type involves four steps:

1. **Define the type** in TypeScript
2. **Update the Planner prompt** so Gemini knows about it
3. **Update the Coder prompt** so Claude can generate OpenSCAD for it
4. **Add smart fixes** for context-aware suggestions

## Step 1: Define the Type in TypeScript

First, document the new component type in `types.ts`. While the GST schema is flexible (type is a string), documenting expected types helps with consistency.

### Example: Adding a Hinge Component

```typescript
// In types.ts - add to the component types documentation

/**
 * GST Component Types (reference)
 * 
 * Hinge Types:
 * - pip_hinge: Pin-in-place hinge with two leaves
 *   Parameters: leaf_width, leaf_height, pin_diameter, gap
 * - living_hinge: Flexible living hinge section
 *   Parameters: width, length, thickness, cuts
 */
```

## Step 2: Update the Planner Prompt

Edit `services/plannerService.ts` to add the new component type to the Planner's knowledge.

### Location

Find the `PLANNER_SYSTEM_PROMPT` constant:

```typescript
const PLANNER_SYSTEM_PROMPT = `
You are a 3D printing engineer. Design parametric models from descriptions.
...
`;
```

### What to Add

Add a section describing when and how to use the new component type:

```typescript
const PLANNER_SYSTEM_PROMPT = `
...

## HINGE COMPONENTS

### pip_hinge (Pin-in-Place Hinge)
Use for: Box lids, doors, flip covers
Parameters:
- leaf_width: Width of each hinge leaf (mm)
- leaf_height: Height of hinge leaves (mm)  
- pin_diameter: Diameter of hinge pin (mm)
- gap: Clearance between leaves (mm, default 0.3)

Example:
{
  "id": "lid_hinge",
  "name": "lid_hinge",
  "type": "pip_hinge",
  "parameters": [
    { "name": "leaf_width", "value": 20, "unit": "mm" },
    { "name": "leaf_height", "value": 15, "unit": "mm" },
    { "name": "pin_diameter", "value": 3, "unit": "mm" },
    { "name": "gap", "value": 0.3, "unit": "mm" }
  ]
}

### living_hinge (Flexible Hinge)
Use for: Single-piece folding designs, thin flexible sections
Parameters:
- width: Width of hinge section (mm)
- length: Length along fold axis (mm)
- thickness: Material thickness (mm, typically 0.4-0.8)
- cuts: Number of cut lines for flexibility

...
`;
```

### Best Practices for Planner Prompts

1. **Describe the use case** - When should the AI choose this component?
2. **List all parameters** - Include units and typical values
3. **Provide an example** - Show the exact JSON structure
4. **Include defaults** - Specify default values for optional parameters

## Step 3: Update the Coder Prompt

Edit `services/coderService.ts` to teach Claude how to generate OpenSCAD code for the new component.

### Location

Find the `CODER_SYSTEM_PROMPT` constant:

```typescript
const CODER_SYSTEM_PROMPT = `
You write OpenSCAD code for 3D printing. Output ONLY valid code, no markdown.
...
`;
```

### What to Add

Add a module template showing how to implement the component:

```typescript
const CODER_SYSTEM_PROMPT = `
...

## HINGE COMPONENTS

### pip_hinge (Pin-in-Place Hinge)
module pip_hinge(leaf_width=20, leaf_height=15, pin_diameter=3, gap=0.3) {
    knuckle_d = pin_diameter + 2;
    
    // Left leaf with knuckles
    difference() {
        union() {
            cube([leaf_width, leaf_height, 2]);
            // Knuckles at top and bottom
            for (z = [0, leaf_height - knuckle_d]) {
                translate([leaf_width, z + knuckle_d/2, 1])
                    rotate([0, 90, 0])
                        cylinder(h=knuckle_d, d=knuckle_d, $fn=32);
            }
        }
        // Pin hole through knuckles
        translate([leaf_width + knuckle_d/2, -1, 1])
            rotate([-90, 0, 0])
                cylinder(h=leaf_height + 2, d=pin_diameter + 0.2, $fn=32);
    }
    
    // Right leaf with middle knuckle
    translate([leaf_width + knuckle_d + gap, 0, 0]) {
        cube([leaf_width, leaf_height, 2]);
        translate([-knuckle_d - gap/2, leaf_height/2, 1])
            rotate([0, 90, 0])
                cylinder(h=knuckle_d, d=knuckle_d, $fn=32);
    }
}

### living_hinge (Flexible Hinge)
module living_hinge(width=50, length=20, thickness=0.6, cuts=10) {
    cut_spacing = length / (cuts + 1);
    cut_width = 0.8;  // Laser/print kerf
    
    difference() {
        cube([width, length, thickness]);
        
        // Alternating cuts from each side
        for (i = [0:cuts-1]) {
            y = cut_spacing * (i + 1);
            if (i % 2 == 0) {
                translate([-1, y - cut_width/2, -0.1])
                    cube([width * 0.7, cut_width, thickness + 0.2]);
            } else {
                translate([width * 0.3, y - cut_width/2, -0.1])
                    cube([width * 0.7 + 1, cut_width, thickness + 0.2]);
            }
        }
    }
}

...
`;
```

### Best Practices for Coder Prompts

1. **Use parametric design** - All dimensions as variables
2. **Include `$fn` for curves** - Ensure smooth circles
3. **Add clearances** - Include tolerances for moving parts
4. **Keep it printable** - Consider layer height and nozzle size
5. **Comment key sections** - Brief explanations for complex geometry

## Step 4: Add Smart Fixes

Edit `services/quickFixAnalyzer.ts` to generate relevant quick fixes when the component is detected.

### Location

Find the `analyzeComponents` function:

```typescript
function analyzeComponents(gst: GeometricStructureTree): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];
  const componentTypes = new Set<string>();
  ...
}
```

### What to Add

Add detection logic and relevant fixes:

```typescript
function analyzeComponents(gst: GeometricStructureTree): SmartQuickFix[] {
  const fixes: SmartQuickFix[] = [];
  const componentTypes = new Set<string>();

  // Collect all component types
  function scanComponent(comp: GSTComponent) {
    componentTypes.add(comp.type);
    comp.children?.forEach(scanComponent);
  }
  scanComponent(gst.root);

  // ... existing component checks ...

  // Hinge-specific fixes
  if (componentTypes.has('pip_hinge')) {
    fixes.push({
      id: 'tighter-hinge-pin',
      label: 'Tighter pin fit',
      description: 'Reduce pin hole clearance for snug fit',
      prompt: 'Reduce the hinge pin hole clearance to 0.1mm for a tighter fit',
      category: 'tolerance',
      relevance: 0.8
    });
    fixes.push({
      id: 'looser-hinge-gap',
      label: 'More hinge clearance',
      description: 'Increase gap between hinge leaves',
      prompt: 'Increase the gap between hinge leaves to 0.5mm for easier movement',
      category: 'tolerance',
      relevance: 0.75
    });
  }

  if (componentTypes.has('living_hinge')) {
    fixes.push({
      id: 'more-hinge-cuts',
      label: 'More flexible',
      description: 'Add more cuts for easier bending',
      prompt: 'Increase the number of living hinge cuts by 50% for more flexibility',
      category: 'structure',
      relevance: 0.7
    });
    fixes.push({
      id: 'thinner-hinge',
      label: 'Thinner hinge',
      description: 'Reduce thickness for easier bending',
      prompt: 'Reduce living hinge thickness to 0.4mm for more flexibility',
      category: 'dimension',
      relevance: 0.65
    });
  }

  return fixes;
}
```

### Quick Fix Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `tolerance` | Fit and clearance adjustments | Hole size, gap width |
| `dimension` | Size changes | Scale, thickness |
| `structure` | Structural modifications | Ribs, reinforcement |
| `print` | Print-specific tweaks | Orientation, supports |
| `geometry` | Geometry repairs | Manifold fixes |

## Testing Your New Component

### 1. Test the Planner

Try a prompt that should use your new component:

```
"Create a box with a hinged lid"
```

Check the GST in the console:
- Does it include your component type?
- Are the parameters reasonable?

### 2. Test the Coder

Verify the generated OpenSCAD:
- Does it compile without errors?
- Does the geometry look correct in the preview?
- Are the parameters used correctly?

### 3. Test Smart Fixes

After generation, check the quick fix buttons:
- Are your component-specific fixes showing?
- Do the fixes make sense for the context?

## Complete Checklist

- [ ] Document the component type in `types.ts`
- [ ] Add component to Planner system prompt with:
  - [ ] Description and use case
  - [ ] Parameter list with units
  - [ ] JSON example
- [ ] Add module to Coder system prompt with:
  - [ ] Parametric OpenSCAD implementation
  - [ ] Comments explaining geometry
  - [ ] Proper tolerances and clearances
- [ ] Add smart fixes in `quickFixAnalyzer.ts` with:
  - [ ] Component type detection
  - [ ] Relevant fix suggestions
  - [ ] Appropriate categories and relevance scores
- [ ] Test end-to-end with sample prompts

## Example: Full Implementation

For a complete example, see how `picatinny_male`/`picatinny_female` are implemented:

1. **types.ts**: Documented under tactical/mounting types
2. **plannerService.ts**: MIL-STD-1913 specifications in system prompt
3. **coderService.ts**: Detailed module with dovetail geometry
4. **quickFixAnalyzer.ts**: Tolerance adjustments for rail fit

## Questions?

Open an issue on GitHub or consult the [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview.
