/**
 * Golden Set Test: Picatinny Riser (20mm lift)
 * Validates MIL-STD-1913 compliance after v3.5.4 geometry fix
 *
 * EXPECTED BEHAVIOR:
 * - Top opening (female receiver) should be 21.2mm wide
 * - Bottom of dovetail groove should be 20.6mm wide
 * - Total lift height: 20mm
 * - Uses ONLY library modules (no raw polygons)
 */

use <libraries/tactical.scad>

// Quality settings
$fn = $preview ? 32 : 64;
eps = 0.01;

// Riser parameters
riser_height = 20;        // 20mm lift as specified
riser_slots = 5;          // Standard 5-slot length
base_extra_width = 6;     // Extra width for structural stability

// Calculate dimensions from library constants
// (These are just for documentation - actual values come from library)
rail_length = riser_slots * PICATINNY_SLOT_SPACING;  // 50.05mm
body_width = PICATINNY_RAIL_BASE_WIDTH + 4;          // 25.2mm

/**
 * Picatinny Riser Module
 * Creates a riser block with male rail on bottom and female receiver on top
 */
module picatinny_riser(lift_height = 20, slots = 5) {
    local_length = slots * PICATINNY_SLOT_SPACING;
    local_body_width = PICATINNY_RAIL_BASE_WIDTH + base_extra_width;

    union() {
        // Solid riser block
        translate([0, 0, lift_height/2])
            cube([local_length, local_body_width, lift_height], center = true);

        // Male Picatinny rail on bottom (attaches to existing rail)
        rotate([0, 90, 0])
            rotate([0, 0, 90])
                picatinny_rail_male(slots = slots, with_slots = true);

        // Female Picatinny receiver on top
        // MIL-STD-1913: Opening (top) should be 21.2mm, bottom 20.6mm
        translate([0, 0, lift_height])
            picatinny_rail(slots = slots, height = 15, with_slots = true);
    }
}

// Main assembly
picatinny_riser(lift_height = riser_height, slots = riser_slots);

// === DIMENSIONAL VERIFICATION ===
// To verify MIL-STD-1913 compliance:
// 1. Export to STL
// 2. Measure top channel width at Z = riser_height + 15 (should be 21.2mm)
// 3. Measure groove bottom width at Z = riser_height + 15 - 5.31 (should be 20.6mm)
