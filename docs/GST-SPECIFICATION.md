# Geometric Structure Tree (GST) Specification

**Version**: 1.0
**Status**: Stable

The Geometric Structure Tree (GST) is an intermediate JSON representation that captures the semantic structure of a 3D model. It bridges natural language descriptions and executable OpenSCAD code.

## Purpose

The GST serves several critical functions:

1. **Semantic Preservation**: Captures user intent, not just geometry
2. **Surgical Edits**: Enables modification of specific parameters without regeneration
3. **Validation**: Allows comparison between intended and actual model dimensions
4. **Smart Fixes**: Powers context-aware refinement suggestions
5. **Transparency**: Users can inspect what the AI "understood"

## Schema

### Root Object

```typescript
interface GeometricStructureTree {
  version: '1.0';                       // Schema version
  name: string;                         // Descriptive identifier
  description?: string;                 // What it does, how parts connect
  globalParameters: GSTParameter[];     // Top-level parametric values
  root: GSTComponent;                   // Component tree root
  boundingBox?: GSTBoundingBox;         // Expected overall dimensions
  printOrientation?: 'flat' | 'upright' | 'angled';
  bosl2Features?: string[];             // (Reserved) BOSL2 modules used
}
```

### GSTParameter

Global parameters that can be referenced throughout the tree.

```typescript
interface GSTParameter {
  name: string;           // Parameter identifier (e.g., "wall_thickness")
  value: number;          // Numeric value
  unit: 'mm' | 'deg' | 'count';  // Unit of measurement
  description?: string;   // Human-readable explanation
  min?: number;           // Minimum allowed value
  max?: number;           // Maximum allowed value
}
```

**Example**:
```json
{
  "name": "mount_width",
  "value": 60,
  "unit": "mm",
  "description": "Width of the mounting plate"
}
```

### GSTComponent

Represents a geometric element in the model hierarchy.

```typescript
interface GSTComponent {
  id: string;                    // Unique identifier within tree
  name: string;                  // Human-readable name
  type: string;                  // Component type (see Component Types)
  parameters?: GSTParameter[];   // Component-specific parameters
  anchors?: GSTAnchor[];         // Named attachment points
  children?: GSTComponent[];     // Child components
  attachTo?: GSTAttachment;      // How this attaches to parent
  booleanOp?: 'add' | 'subtract' | 'intersect';  // Boolean operation
  material?: string;             // Material hint (for visualization)
  color?: string;                // Color hint (for visualization)
}
```

### GSTAnchor

Named attachment points for connecting components.

```typescript
interface GSTAnchor {
  name: string;                              // Anchor identifier
  position: [number, number, number];        // XYZ offset from component origin
  orientation: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK' | 'CENTER';
  spin?: number;                             // Rotation around anchor normal (degrees)
}
```

### GSTAttachment

Defines how a component connects to its parent.

```typescript
interface GSTAttachment {
  parentId: string;                         // ID of parent component
  parentAnchor: string;                     // Anchor name on parent
  childAnchor: string;                      // Anchor name on this component
  offset?: [number, number, number];        // Additional offset after alignment
}
```

### GSTBoundingBox

Expected overall dimensions for validation.

```typescript
interface GSTBoundingBox {
  min: [number, number, number];  // Minimum corner [x, y, z]
  max: [number, number, number];  // Maximum corner [x, y, z]
}
```

## Component Types

### Primitives

| Type | Description | Required Parameters |
|------|-------------|---------------------|
| `cuboid` | Rectangular box | `width`, `depth`, `height` |
| `cylinder` | Circular cylinder | `diameter` or `radius`, `height` |
| `sphere` | Sphere | `diameter` or `radius` |
| `cone` | Cone or truncated cone | `bottom_diameter`, `top_diameter`, `height` |
| `prism` | Extruded polygon | `sides`, `radius`, `height` |

### Boolean Operations

| Type | Description | Usage |
|------|-------------|-------|
| `union` | Combine children | Container for additive parts |
| `difference` | Subtract children from first | Holes, cutouts |
| `intersection` | Keep overlapping volume | Complex shapes |
| `hull` | Convex hull of children | Rounded edges, transitions |

### Mechanical Features

| Type | Description | Required Parameters |
|------|-------------|---------------------|
| `screw_hole` | Clearance hole for screw | `screw_size`, `depth` |
| `countersunk_hole` | Countersunk screw hole | `screw_size`, `depth`, `head_diameter` |
| `threaded_hole` | Internal threads | `thread_size`, `pitch`, `depth` |
| `bearing_pocket` | Bearing seat | `bearing_od`, `bearing_width` |
| `snap_tab` | Flexible snap feature | `width`, `length`, `deflection` |

### Tactical/Mounting

| Type | Description | Required Parameters |
|------|-------------|---------------------|
| `picatinny_male` | MIL-STD-1913 raised rail | `length` |
| `picatinny_female` | MIL-STD-1913 groove | `length` |
| `molle_clip` | MOLLE/PALS attachment | `clip_width`, `hook_depth` |
| `keymod_slot` | KeyMod mounting slot | `length` |
| `mlok_slot` | M-LOK mounting slot | `length` |

### Structural

| Type | Description | Required Parameters |
|------|-------------|---------------------|
| `rib` | Reinforcing rib | `height`, `thickness`, `length` |
| `fillet` | Rounded internal corner | `radius` |
| `chamfer` | Angled edge | `size` |
| `shell` | Hollow with wall thickness | `wall_thickness` |

## Complete Example

```json
{
  "version": "1.0",
  "name": "tactical_phone_mount",
  "description": "Phone mount with Picatinny rail attachment for tactical vest",
  "globalParameters": [
    {
      "name": "phone_width",
      "value": 75,
      "unit": "mm",
      "description": "Width of phone with case"
    },
    {
      "name": "phone_thickness",
      "value": 12,
      "unit": "mm",
      "description": "Thickness of phone with case"
    },
    {
      "name": "wall_thickness",
      "value": 3,
      "unit": "mm",
      "description": "Wall thickness for structural parts"
    }
  ],
  "root": {
    "id": "main",
    "name": "phone_mount_assembly",
    "type": "union",
    "children": [
      {
        "id": "base_plate",
        "name": "mounting_plate",
        "type": "cuboid",
        "parameters": [
          { "name": "width", "value": 85, "unit": "mm" },
          { "name": "depth", "value": 60, "unit": "mm" },
          { "name": "height", "value": 4, "unit": "mm" }
        ],
        "anchors": [
          {
            "name": "rail_attach",
            "position": [0, -25, 2],
            "orientation": "BOTTOM"
          },
          {
            "name": "phone_cradle",
            "position": [0, 10, 4],
            "orientation": "TOP"
          }
        ]
      },
      {
        "id": "rail_interface",
        "name": "picatinny_groove",
        "type": "picatinny_female",
        "parameters": [
          { "name": "length", "value": 50, "unit": "mm" }
        ],
        "attachTo": {
          "parentId": "base_plate",
          "parentAnchor": "rail_attach",
          "childAnchor": "top"
        },
        "booleanOp": "subtract"
      },
      {
        "id": "phone_holder",
        "name": "phone_cradle",
        "type": "difference",
        "attachTo": {
          "parentId": "base_plate",
          "parentAnchor": "phone_cradle",
          "childAnchor": "bottom"
        },
        "children": [
          {
            "id": "cradle_outer",
            "name": "outer_shell",
            "type": "cuboid",
            "parameters": [
              { "name": "width", "value": 81, "unit": "mm" },
              { "name": "depth", "value": 40, "unit": "mm" },
              { "name": "height", "value": 15, "unit": "mm" }
            ]
          },
          {
            "id": "cradle_cutout",
            "name": "phone_cavity",
            "type": "cuboid",
            "parameters": [
              { "name": "width", "value": 75, "unit": "mm" },
              { "name": "depth", "value": 35, "unit": "mm" },
              { "name": "height", "value": 12, "unit": "mm" }
            ],
            "booleanOp": "subtract"
          }
        ]
      }
    ]
  },
  "boundingBox": {
    "min": [-42.5, -30, 0],
    "max": [42.5, 50, 19]
  },
  "printOrientation": "flat"
}
```

## Validation Rules

### Required Fields
- `version` must be `"1.0"`
- `name` must be non-empty string
- `root` must be a valid GSTComponent
- `globalParameters` must be an array (can be empty)

### Component Validation
- Every `id` must be unique within the tree
- `attachTo.parentId` must reference an existing component
- `attachTo.parentAnchor` must exist on the referenced parent
- `booleanOp` is only valid on child components

### Parameter Validation
- `unit` must be one of: `mm`, `deg`, `count`
- If `min` and `max` are specified, `value` must be within range
- Parameter `name` should use snake_case

## Best Practices

### Naming Conventions
- Component IDs: `snake_case`, descriptive (e.g., `left_mounting_hole`)
- Parameter names: `snake_case` with unit suffix optional (e.g., `wall_thickness`)
- Anchor names: Descriptive of location (e.g., `top_center`, `left_edge`)

### Tree Structure
- Keep depth reasonable (typically 3-5 levels)
- Group related components under `union` containers
- Use `difference` at the point where subtraction occurs

### Parameters
- Define frequently-used values as global parameters
- Use component-level parameters for one-off values
- Include descriptions for non-obvious parameters

### Dimensions
- Always use millimeters for linear dimensions
- Always use degrees for angular dimensions
- Provide `boundingBox` for validation

## Extending GST

See [ADDING-COMPONENT-TYPES.md](./ADDING-COMPONENT-TYPES.md) for instructions on adding new component types to support additional features.
