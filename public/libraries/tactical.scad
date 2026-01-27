/**
 * Tactical Equipment Library
 * MIL-STD-1913 Picatinny Rail & TW-PL-507F MOLLE Standards
 *
 * This library provides standardized modules for tactical gear mounting.
 * All dimensions are verified against military specifications.
 *
 * Usage: use <libraries/tactical.scad>
 *
 * @version 1.0.0
 * @license MIT
 */

// Quality settings
$fn = $preview ? 32 : 64;
eps = 0.01;

// ============================================================================
// MIL-STD-1913 Picatinny Rail Constants
// ============================================================================
// Source: MIL-STD-1913 - Dimensioning of Accessory Mounting Rail for Small Arms
PICATINNY_SLOT_WIDTH = 5.23;           // mm - T-slot width
PICATINNY_SLOT_SPACING = 10.01;        // mm - center-to-center slot spacing
PICATINNY_RAIL_TOP_WIDTH = 20.6;       // mm - narrower at top (dovetail)
PICATINNY_RAIL_BASE_WIDTH = 21.2;      // mm - wider at base (dovetail)
PICATINNY_RAIL_HEIGHT = 9.6;           // mm - total rail height
PICATINNY_DOVETAIL_DEPTH = 5.31;       // mm - depth of dovetail groove
PICATINNY_SLOT_DEPTH = 4.5;            // mm - depth of T-slots

// ============================================================================
// MOLLE/PALS Constants
// ============================================================================
// Source: TW-PL-507F - MOLLE Webbing Pattern Standards
MOLLE_WEBBING_WIDTH = 25;              // mm - webbing width
MOLLE_ROW_SPACING = 38;                // mm - vertical row spacing (legacy: 25mm common)
MOLLE_COLUMN_SPACING = 38;             // mm - horizontal column spacing
MOLLE_WEBBING_THICKNESS = 3;           // mm - webbing material thickness
MOLLE_ATTACHMENT_GAP = 4;              // mm - clearance for webbing in clips

// ============================================================================
// PICATINNY RAIL MODULES
// ============================================================================

/**
 * Female Picatinny Rail Mount (Receiver)
 * Creates a dovetail groove that accepts a male Picatinny rail.
 * The groove is wider at the bottom than at the top (inverted trapezoid).
 *
 * @param slots Number of Picatinny slots (default 5, min 1)
 * @param height Total height of the mount body (default 15mm)
 * @param with_slots Include T-slots for cross-bolts (default true)
 */
module picatinny_rail(slots = 5, height = 15, with_slots = true) {
    // Calculate length based on slot count
    length = slots * PICATINNY_SLOT_SPACING;
    body_width = PICATINNY_RAIL_BASE_WIDTH + 4; // 2mm walls on each side

    difference() {
        // Main body block
        cube([length, body_width, height], center = true);

        // Dovetail groove - opens on top (Z+)
        // MIL-STD-1913: Opening (top) is WIDER (21.2mm) to accept male rail base
        //               Bottom is NARROWER (20.6mm) to grip male rail top
        translate([0, 0, height/2 - PICATINNY_DOVETAIL_DEPTH/2 + eps])
            linear_extrude(height = PICATINNY_DOVETAIL_DEPTH + eps, scale = PICATINNY_RAIL_BASE_WIDTH / PICATINNY_RAIL_TOP_WIDTH)
                square([length + eps*2, PICATINNY_RAIL_TOP_WIDTH], center = true);

        // T-slots for cross-bolt lockup
        if (with_slots) {
            for (i = [0:slots-1]) {
                x_pos = (i - (slots-1)/2) * PICATINNY_SLOT_SPACING;
                translate([x_pos, 0, height/2 - PICATINNY_SLOT_DEPTH/2 + eps])
                    cube([PICATINNY_SLOT_WIDTH, body_width + eps*2, PICATINNY_SLOT_DEPTH + eps], center = true);
            }
        }
    }
}

/**
 * Male Picatinny Rail (Attachment Point)
 * Creates a dovetail ridge that fits into a female Picatinny mount.
 * The ridge is narrower at the top than at the base.
 *
 * @param slots Number of Picatinny slots (default 5)
 * @param with_slots Include T-slots (default true)
 */
module picatinny_rail_male(slots = 5, with_slots = true) {
    length = slots * PICATINNY_SLOT_SPACING;

    difference() {
        // Dovetail profile - narrower at top, wider at base
        linear_extrude(height = length, center = true)
            polygon([
                [-PICATINNY_RAIL_TOP_WIDTH/2, PICATINNY_RAIL_HEIGHT],      // top left
                [PICATINNY_RAIL_TOP_WIDTH/2, PICATINNY_RAIL_HEIGHT],       // top right
                [PICATINNY_RAIL_BASE_WIDTH/2, 0],                           // bottom right
                [-PICATINNY_RAIL_BASE_WIDTH/2, 0]                           // bottom left
            ]);

        // T-slots
        if (with_slots) {
            for (i = [0:slots-1]) {
                z_pos = (i - (slots-1)/2) * PICATINNY_SLOT_SPACING;
                translate([0, PICATINNY_RAIL_HEIGHT - PICATINNY_SLOT_DEPTH/2 + eps, z_pos])
                    cube([PICATINNY_RAIL_TOP_WIDTH + eps*2, PICATINNY_SLOT_DEPTH + eps, PICATINNY_SLOT_WIDTH], center = true);
            }
        }
    }
}

/**
 * Picatinny Groove (Subtraction Primitive)
 * Use this in difference() to create a female Picatinny channel in any shape.
 * Oriented along X-axis, groove opens in +Z direction.
 *
 * @param length Length of the groove (default 50mm)
 */
module picatinny_groove(length = 50) {
    // Dovetail profile for subtraction
    // MIL-STD-1913: Opening (z=0) is WIDER (21.2mm), bottom is NARROWER (20.6mm)
    linear_extrude(height = length, center = true)
        rotate([0, 0, 90])
            polygon([
                [-PICATINNY_DOVETAIL_DEPTH, -PICATINNY_RAIL_TOP_WIDTH/2],   // bottom left (narrower)
                [-PICATINNY_DOVETAIL_DEPTH, PICATINNY_RAIL_TOP_WIDTH/2],    // bottom right (narrower)
                [0, PICATINNY_RAIL_BASE_WIDTH/2],                            // top right (wider opening)
                [0, -PICATINNY_RAIL_BASE_WIDTH/2]                            // top left (wider opening)
            ]);
}

// ============================================================================
// MOLLE/PALS MODULES
// ============================================================================

/**
 * MOLLE Clip (Hook Style)
 * Creates a clip that hooks behind 25mm MOLLE webbing.
 * Shape is an inverted "J" that slides behind and grips webbing.
 *
 * @param width Clip width (default 28mm, slightly wider than 25mm webbing)
 * @param height Clip height spanning multiple rows (default 40mm)
 * @param rows Number of MOLLE rows to span (default 1)
 */
module molle_clip(width = 28, height = 40, rows = 1) {
    wall = 3;                              // Wall thickness
    hook_depth = 12;                       // How far the hook extends back
    hook_height = min(20, height * 0.4);   // Height of hook section
    slot_width = MOLLE_WEBBING_WIDTH - 2;  // Slightly narrower than webbing

    difference() {
        union() {
            // Vertical spine (attaches to plate/base)
            cube([width, wall, height], center = true);

            // Top hook - extends backward (toward plate carrier)
            translate([0, -hook_depth/2 - wall/2, height/2 - hook_height/2])
                cube([width, hook_depth, hook_height], center = true);

            // Optional: bottom hook for multi-row attachment
            if (rows > 1) {
                translate([0, -hook_depth/2 - wall/2, -height/2 + hook_height/2])
                    cube([width, hook_depth, hook_height], center = true);
            }
        }

        // Slot for webbing to pass through (top hook)
        translate([0, -hook_depth/2, height/2 - hook_height + MOLLE_ATTACHMENT_GAP])
            cube([slot_width, hook_depth + wall + eps*2, MOLLE_ATTACHMENT_GAP + eps], center = true);

        // Slot for webbing (bottom hook, if multi-row)
        if (rows > 1) {
            translate([0, -hook_depth/2, -height/2 + hook_height - MOLLE_ATTACHMENT_GAP])
                cube([slot_width, hook_depth + wall + eps*2, MOLLE_ATTACHMENT_GAP + eps], center = true);
        }
    }
}

/**
 * MOLLE Adapter Plate
 * Base plate with integrated MOLLE clips for mounting accessories to plate carriers.
 *
 * @param plate_width Width of the adapter plate (default 80mm)
 * @param plate_height Height of the adapter plate (default 60mm)
 * @param plate_thickness Thickness of the plate (default 5mm)
 * @param clip_columns Number of MOLLE clip columns (default 2)
 */
module molle_adapter_plate(plate_width = 80, plate_height = 60, plate_thickness = 5, clip_columns = 2) {
    clip_spacing = plate_width / (clip_columns + 1);

    union() {
        // Base plate
        cube([plate_width, plate_thickness, plate_height], center = true);

        // MOLLE clips on back side
        for (i = [1:clip_columns]) {
            x_pos = (i - (clip_columns + 1)/2) * clip_spacing;
            translate([x_pos, -plate_thickness/2, 0])
                rotate([90, 0, 0])
                    molle_clip(width = 28, height = plate_height * 0.8);
        }
    }
}

/**
 * MOLLE Webbing Pattern (for visualization/testing)
 * Creates a simulated MOLLE webbing pattern for fit checking.
 *
 * @param rows Number of webbing rows (default 3)
 * @param columns Number of attachment columns (default 3)
 */
module molle_webbing_pattern(rows = 3, columns = 3) {
    width = columns * MOLLE_COLUMN_SPACING + MOLLE_WEBBING_WIDTH;
    height = rows * MOLLE_ROW_SPACING;

    color("tan", 0.8)
    for (r = [0:rows-1]) {
        for (c = [0:columns-1]) {
            translate([c * MOLLE_COLUMN_SPACING, 0, r * MOLLE_ROW_SPACING])
                cube([MOLLE_WEBBING_WIDTH, MOLLE_WEBBING_THICKNESS, MOLLE_ROW_SPACING * 0.6], center = true);
        }
    }
}

// ============================================================================
// COMBINED TACTICAL MODULES
// ============================================================================

/**
 * Picatinny to MOLLE Adapter
 * Complete adapter with female Picatinny rail on one side and MOLLE clips on the other.
 * Perfect for mounting accessories to plate carriers.
 *
 * @param slots Number of Picatinny slots (default 5)
 * @param plate_width Width of base plate (default 80mm)
 * @param plate_height Height of base plate (default 50mm)
 * @param clip_columns Number of MOLLE clip columns (default 2)
 */
module picatinny_molle_adapter(slots = 5, plate_width = 80, plate_height = 50, clip_columns = 2) {
    plate_thickness = 5;
    rail_length = slots * PICATINNY_SLOT_SPACING;
    clip_spacing = plate_width / (clip_columns + 1);

    union() {
        // Base plate
        cube([plate_width, plate_thickness, plate_height], center = true);

        // Female Picatinny rail on front (Y+)
        translate([0, plate_thickness/2 + 7.5, 0])
            rotate([90, 0, 0])
                picatinny_rail(slots = slots, height = 15);

        // MOLLE clips on back (Y-)
        for (i = [1:clip_columns]) {
            x_pos = (i - (clip_columns + 1)/2) * clip_spacing;
            translate([x_pos, -plate_thickness/2 - 1.5, 0])
                rotate([90, 0, 0])
                    molle_clip(width = 28, height = plate_height * 0.8);
        }
    }
}

// ============================================================================
// UTILITY MODULES
// ============================================================================

/**
 * Rounded Cube (rcube)
 * Creates a cube with rounded edges for better print quality and ergonomics.
 *
 * @param size [width, depth, height] dimensions
 * @param r Corner radius (default 2mm)
 */
module rcube(size, r = 2) {
    hull() {
        for (x = [-1, 1], y = [-1, 1], z = [-1, 1]) {
            translate([
                x * (size[0]/2 - r),
                y * (size[1]/2 - r),
                z * (size[2]/2 - r)
            ])
                sphere(r = r);
        }
    }
}

/**
 * Counterbore Hole
 * Creates a counterbored hole for recessed screw heads.
 *
 * @param shaft_d Shaft diameter (screw body)
 * @param shaft_depth Depth of shaft hole
 * @param head_d Head diameter
 * @param head_depth Depth of counterbore for head
 */
module counterbore(shaft_d, shaft_depth, head_d, head_depth) {
    union() {
        cylinder(h = shaft_depth + eps, d = shaft_d, center = false);
        translate([0, 0, shaft_depth - head_depth])
            cylinder(h = head_depth + eps, d = head_d, center = false);
    }
}

/**
 * Tube/Pipe
 * Hollow cylinder for weight reduction or cable routing.
 *
 * @param od Outer diameter
 * @param id Inner diameter
 * @param h Height
 */
module tube(od, id, h) {
    difference() {
        cylinder(h = h, d = od, center = true);
        cylinder(h = h + eps*2, d = id, center = true);
    }
}

// ============================================================================
// TEST/PREVIEW
// ============================================================================

// Uncomment to preview modules:
// picatinny_rail(slots = 5, height = 15);
// translate([0, 40, 0]) molle_clip(width = 28, height = 40);
// translate([0, 80, 0]) picatinny_molle_adapter();
