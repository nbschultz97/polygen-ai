# BOSL2 Quick Reference for PolyGen Coder

## Essential Includes

```openscad
include <BOSL2/std.scad>       // Always required
include <BOSL2/gears.scad>     // For gears
include <BOSL2/threading.scad> // For threads
include <BOSL2/screws.scad>    // For screw holes
include <BOSL2/hinges.scad>    // For hinges
include <BOSL2/beziers.scad>   // For curves
```

## Primitives with Anchors

### Cuboid (Box)
```openscad
// Basic
cuboid([20, 30, 10]);

// With rounding
cuboid([20, 30, 10], rounding=2);

// Selective edge rounding
cuboid([20, 30, 10], rounding=2, edges=[TOP+FRONT, TOP+BACK]);

// With chamfer
cuboid([20, 30, 10], chamfer=1, edges=TOP);

// Anchored to bottom
cuboid([20, 30, 10], anchor=BOTTOM);
```

### Cylinder
```openscad
// Basic
cyl(h=20, d=10);

// With rounding
cyl(h=20, d=10, rounding=2);

// Rounding on specific ends
cyl(h=20, d=10, rounding1=2, rounding2=0);

// Cone
cyl(h=20, d1=20, d2=10);

// Anchored
cyl(h=20, d=10, anchor=BOTTOM);
```

### Tube (Hollow Cylinder)
```openscad
// By outer/inner diameter
tube(h=20, od=30, id=20);

// By outer diameter and wall
tube(h=20, od=30, wall=2);

// By inner diameter and wall
tube(h=20, id=20, wall=2);
```

### Sphere
```openscad
sphere(d=20);
sphere(r=10);
```

### Prism
```openscad
// Triangular prism
prismoid(size1=[20,20], size2=[10,10], h=15);
```

## Anchor System

### Standard Anchors
```
TOP, BOTTOM     - Z axis
LEFT, RIGHT     - X axis
FRONT, BACK     - Y axis
CENTER          - Origin (default)
```

### Combined Anchors
```openscad
TOP+LEFT        // Top-left edge
BOTTOM+FRONT    // Bottom-front edge
TOP+LEFT+FRONT  // Top-left-front corner
```

### attach() - Child Relative to Parent
```openscad
// Attach child's BOTTOM to parent's TOP
cuboid([20, 20, 10], anchor=BOTTOM)
    attach(TOP, BOTTOM) cyl(h=15, d=5);

// With overlap (negative = gap)
attach(TOP, BOTTOM, overlap=2)
    child();
```

### position() - At Anchor Point
```openscad
cuboid([20, 20, 10])
    position(TOP+LEFT) sphere(d=5);
```

### move() - Relative Movement
```openscad
move([10, 0, 5]) cuboid([5,5,5]);
```

## Boolean Operations

### diff() - Subtraction with Tags
```openscad
diff("remove", "keep")
cuboid([50, 50, 10]) {
    // These get subtracted
    tag("remove") {
        attach(TOP) cyl(d=5, h=15);
        position(TOP+LEFT) cyl(d=3, h=15);
    }
    // These are kept (added)
    tag("keep")
        attach(BOTTOM) cuboid([10, 10, 5]);
}
```

### intersect() - Intersection
```openscad
intersect("mask")
cuboid([20, 20, 20]) {
    tag("mask") sphere(d=25);
}
```

### union() - Explicit Union
```openscad
union() {
    cuboid([20, 20, 10]);
    position(TOP) sphere(d=15);
}
```

## Transformations

### Distribute Copies

```openscad
// X-axis copies
xcopies(n=5, spacing=10) sphere(d=5);

// Y-axis copies
ycopies(n=3, spacing=15) cuboid([5, 5, 10]);

// Z-axis copies
zcopies(n=4, spacing=8) cyl(d=3, h=2);
```

### Grid Pattern
```openscad
grid_copies(spacing=10, n=[3, 3])
    cyl(d=5, h=2);

// Different X/Y spacing
grid_copies(spacing=[15, 10], n=[3, 4])
    child();
```

### Circular Array
```openscad
// Around Z axis
zrot_copies(n=6, r=20)
    cuboid([5, 5, 10]);

// With start angle
zrot_copies(n=6, r=20, sa=30)
    child();
```

### Mirror
```openscad
// Mirror and keep original
xflip_copy() bracket();
yflip_copy() bracket();
zflip_copy() bracket();

// Just mirror (no original)
xflip() bracket();
```

### Rotate
```openscad
xrot(45) child();  // Rotate around X
yrot(45) child();  // Rotate around Y
zrot(45) child();  // Rotate around Z
rot([45, 0, 30]) child();  // Combined
```

## Gears

```openscad
include <BOSL2/gears.scad>

// Spur gear
spur_gear(
    pitch = 3,        // Circular pitch (mm)
    teeth = 20,       // Number of teeth
    thickness = 5,    // Gear thickness
    bore = 5,         // Center hole diameter
    pressure_angle = 20
);

// Rack (linear gear)
rack(
    pitch = 3,
    teeth = 10,
    thickness = 5,
    height = 10
);

// Bevel gear
bevel_gear(
    pitch = 3,
    teeth = 20,
    thickness = 5,
    bore = 5
);
```

## Threading

```openscad
include <BOSL2/threading.scad>

// Threaded rod (external thread)
threaded_rod(
    d = 10,           // Major diameter
    l = 30,           // Length
    pitch = 1.5       // Thread pitch
);

// Threaded nut (internal thread)
threaded_nut(
    nutwidth = 17,    // Nut width (across flats)
    id = 10,          // Internal diameter
    h = 8,            // Height
    pitch = 1.5
);
```

## Screws & Fasteners

```openscad
include <BOSL2/screws.scad>

// Screw hole (countersunk)
screw_hole("M3", length=10, head="flat");

// Screw hole (socket head)
screw_hole("M4", length=15, head="socket");

// Nut trap
nut_trap_inline(5, "M3");

// Heat-set insert hole
insert_hole("M3");
```

## Rounding & Filleting

### Edge Rounding on Cuboid
```openscad
// All edges
cuboid([20, 30, 10], rounding=2);

// Specific edges
cuboid([20, 30, 10], rounding=2, edges=[
    TOP+FRONT,
    TOP+BACK,
    BOTTOM+FRONT,
    BOTTOM+BACK
]);

// Except certain edges
cuboid([20, 30, 10], rounding=2, except=[LEFT, RIGHT]);
```

### Chamfer
```openscad
cuboid([20, 30, 10], chamfer=1, edges=BOTTOM);
```

## Path Operations

### Linear Sweep
```openscad
path = [[0,0], [10,0], [10,10], [0,10]];
linear_sweep(path, height=20);
```

### Rotate Sweep
```openscad
path = [[10,0], [15,0], [15,20], [10,20]];
rotate_sweep(path);
```

### Offset
```openscad
// Expand/contract 2D shape
offset(r=2) square([10, 10]);
```

## Text

```openscad
// 3D text
text3d("Hello", size=10, h=2, font="Arial:style=Bold");

// Attach text to surface
cuboid([50, 30, 5])
    attach(TOP) text3d("Label", size=8, h=1);
```

## Useful Constants

```openscad
$slop = 0.1;    // Global tolerance for fits
$fn = 64;       // Circle smoothness
EPSILON = 0.01; // Small value for boolean ops
```

## Best Practices

1. **Always use anchors** - Avoid raw translate()
2. **Use diff() with tags** - Cleaner than difference()
3. **Name your anchors** - Makes code self-documenting
4. **Parametric first** - Variables at top, never hardcoded
5. **$fn = 64** - Good balance of smooth curves and render time
6. **Use $slop** - Consistent tolerances throughout
