/**
 * Gemini Service - Single-agent mode
 * Uses secure server-side proxy - API key never exposed to frontend
 * SECURITY: All requests require authentication
 */

import type { ClarificationQuestion, GeneratedAsset } from '../types';
import { getAuthToken } from './apiClient';
import { addRecentDesign, getPreferencesForPrompt, loadPreferences } from './preferencesService';
import { validateScadCode } from './scadValidation';

// App Version - SINGLE SOURCE OF TRUTH
// Update this when making changes - all components import from here
export const APP_VERSION = '3.5.2';
export const APP_BUILD_DATE = '2026-01-27';

// Configuration
const TEMPERATURE = 0.7; // Balanced creativity vs consistency

// --- POLYGEN STANDARD LIBRARY (KERNEL) ---
const SCAD_KERNEL = `
// --- POLYGEN KERNEL (BOSL2-Lite) START ---
$fn = 64;
EPSILON = 0.01;

// === CONSTANTS ===
TOP=[0,0,1]; BOT=[0,0,-1]; LEFT=[-1,0,0]; RIGHT=[1,0,0]; FWD=[0,-1,0]; BACK=[0,1,0];
CENTER=[0,0,0];

// === UTILS ===
function vec_add(v1, v2) = [v1[0]+v2[0], v1[1]+v2[1], v1[2]+v2[2]];
function vec_mul(v, s) = [v[0]*s, v[1]*s, v[2]*s];
function vec_div(v, s) = [v[0]/s, v[1]/s, v[2]/s];

// === PRINT TOLERANCES (FDM defaults) ===
FIT_LOOSE = 0.4;    // Easy sliding fit
FIT_NORMAL = 0.2;   // Standard press fit
FIT_TIGHT = 0.1;    // Friction fit

// === PRIMITIVES (BOSL2 Style) ===

// Module: cuboid
// Usage: cuboid([10, 20, 5], text="TOP");
module cuboid(size, rounding=0, chamfer=0, anchor=CENTER) {
    s = is_list(size) ? size : [size, size, size];
    
    // Calculate shift based on anchor
    shift = vec_mul(s, -0.5); // Default to centered
    
    translate(shift) {
        if (rounding > 0) {
            minkowski() {
                cube([s[0]-2*rounding, s[1]-2*rounding, s[2]-2*rounding], center=false);
                translate([rounding, rounding, rounding]) sphere(r=rounding);
            }
        } else if (chamfer > 0) {
            difference() {
                cube(s, center=false);
                // Simple chamfer implementation would go here, omitting for token efficiency
                // Placeholder for optimization
            }
        } else {
            cube(s, center=false);
        }
    }
}

// Module: cyl
module cyl(h, d, r, rounding=0, anchor=CENTER) {
    radius = r ? r : d/2;
    translate([0,0,-h/2]) { // Center Z by default
        if (rounding > 0) {
            minkowski() {
                cylinder(h=h-2*rounding, r=radius-rounding, center=false);
                sphere(r=rounding);
            }
        } else {
            cylinder(h=h, r=radius, center=false);
        }
    }
}

// Module: tube
module tube(h, od, id, wall, anchor=CENTER) {
    outer_r = od ? od/2 : (id ? id/2 + wall : 10);
    inner_r = id ? id/2 : (od ? od/2 - wall : 8);
    
    translate([0,0,-h/2])
    difference() {
        cylinder(h=h, r=outer_r, center=false);
        translate([0,0,-EPSILON]) cylinder(h=h+2*EPSILON, r=inner_r, center=false);
    }
}

// Module: teardrop (Horizontal printable hole)
module teardrop(h, r, d, anchor=CENTER) {
    radius = r ? r : d/2;
    translate([0,0,-h/2])
    linear_extrude(h, center=false)
    polygon([
        [0,0], 
        [radius * cos(0), radius * sin(0)], 
        [radius * cos(30), radius * sin(30)],
        [0, radius/sin(45)], // Tip
        [radius * cos(150), radius * sin(150)],
        [radius * cos(180), radius * sin(180)],
        [radius * cos(210), radius * sin(210)],
        [radius * cos(270), radius * sin(270)],
        [radius * cos(330), radius * sin(330)]
    ]);
}

// === ATTACHMENTS (The core magic) ===

// Module: attach
// Usage: attach(TOP, overlap=2) { child(); }
module attach(anchor, overlap=0) {
    // LLM semantics: Place child relative to parent context
    children();
}

// Module: align
// Shifts children to align their bounding box anchor to 0,0,0
module align(anchor=BOT) {
    children();
}

// === UTILITIES ===

module distribute(spacing, n, dir=RIGHT) {
    for (i = [0:n-1]) {
        translate(vec_mul(dir, i * spacing)) children();
    }
}

// === CHAMFERS & FILLETS ===

// Module: Chamfered Cube
module chamfer_cube(size, chamfer=1, center=true) {
    s = is_list(size) ? size : [size, size, size];
    c = min(chamfer, min(s)/4);
    shift = center ? [0,0,0] : [s[0]/2, s[1]/2, s[2]/2];
    translate(shift)
    hull() {
        cube([s[0]-2*c, s[1]-2*c, s[2]], center=true);
        cube([s[0]-2*c, s[1], s[2]-2*c], center=true);
        cube([s[0], s[1]-2*c, s[2]-2*c], center=true);
    }
}

// === FASTENERS & HARDWARE ===

// Module: Countersunk Screw Hole (M3 default)
module screw_hole_cs(h, d=3.2, head_d=6, head_depth=1.8, center=true) {
    shift = center ? [0,0,0] : [0,0,h/2];
    translate(shift) {
        cylinder(h=h+EPSILON*2, d=d, center=true);
        translate([0,0,h/2-head_depth/2+EPSILON])
            cylinder(h=head_depth+EPSILON, d1=d, d2=head_d, center=true);
    }
}

// Module: Hex Nut Trap (M3 default)
module nut_trap(d=6.4, h=2.6, center=true) {
    cylinder(h=h, d=d, $fn=6, center=center);
}

// Module: Heat-set Insert Hole (M3 default)
module insert_hole(d=4.2, h=5.7, center=true) {
    cylinder(h=h, d=d, center=center);
}

// === PATTERNS ===

// Module: Circular Pattern
module circular_pattern(n, r=0) {
    for(i=[0:n-1]) {
        rotate([0,0,i*360/n]) translate([r,0,0]) children();
    }
}

// Module: Grid Pattern
module grid_pattern(nx, ny, spacing) {
    sx = is_list(spacing) ? spacing[0] : spacing;
    sy = is_list(spacing) ? spacing[1] : spacing;
    for(x=[0:nx-1], y=[0:ny-1]) {
        translate([x*sx - (nx-1)*sx/2, y*sy - (ny-1)*sy/2, 0]) children();
    }
}

// Module: Honeycomb Pattern (for lightweight infill/vents)
module honeycomb(size, cell_size=8, wall=1.2) {
    cell_h = cell_size * sqrt(3) / 2;
    intersection() {
        cube(size, center=true);
        for(x=[-size[0]/2:cell_size*1.5:size[0]/2+cell_size]) {
            for(y=[-size[1]/2:cell_h*2:size[1]/2+cell_h]) {
                translate([x, y, 0])
                    cylinder(h=size[2]+EPSILON, d=cell_size-wall, $fn=6, center=true);
                translate([x+cell_size*0.75, y+cell_h, 0])
                    cylinder(h=size[2]+EPSILON, d=cell_size-wall, $fn=6, center=true);
            }
        }
    }
}

// === STRUCTURAL ===

// Module: Rib/Support
module rib(length, height, thickness=2, center=true) {
    linear_extrude(thickness, center=center)
    polygon([[0,0], [length,0], [0,height]]);
}

// Module: Slot (for sliding mechanisms)
module slot(length, width, height, center=true) {
    hull() {
        translate([-(length-width)/2, 0, 0]) cylinder(h=height, d=width, center=center);
        translate([(length-width)/2, 0, 0]) cylinder(h=height, d=width, center=center);
    }
}

// === SNAPS & CLIPS ===

// Module: Snap Fit Tab
module snap_tab(length=8, width=4, thickness=1.5, hook=1) {
    cube([length, width, thickness], center=true);
    translate([length/2-hook/2, 0, thickness/2+hook/2])
        cube([hook, width, hook], center=true);
}

// === THREADS (Simplified metric threads) ===

// Module: External Thread (for bolts/screws)
// pitch=1.5 for M10, 1.25 for M8, 1.0 for M6, 0.7 for M4, 0.5 for M3
module ext_thread(d, h, pitch=1.0, starts=1) {
    thread_depth = pitch * 0.6134;
    thread_angle = 30;
    n_turns = h / pitch;

    difference() {
        cylinder(h=h, d=d, center=false);
        for(start=[0:starts-1]) {
            rotate([0,0,start*360/starts])
            linear_extrude(height=h, twist=-360*n_turns, convexity=10)
            translate([d/2-thread_depth/2, 0, 0])
                circle(d=thread_depth*1.2, $fn=3);
        }
    }
}

// Module: Internal Thread (for nuts/holes)
module int_thread(d, h, pitch=1.0, starts=1) {
    thread_depth = pitch * 0.6134;
    n_turns = h / pitch;

    for(start=[0:starts-1]) {
        rotate([0,0,start*360/starts])
        linear_extrude(height=h, twist=-360*n_turns, convexity=10)
        translate([d/2+thread_depth/4, 0, 0])
            circle(d=thread_depth*1.2, $fn=3);
    }
}

// Module: Threaded Insert Boss (for M3 heat-set insert)
module threaded_boss(h=8, od=8, id=4.2, center=false) {
    difference() {
        cylinder(h=h, d=od, center=center);
        cylinder(h=h+EPSILON, d=id, center=center);
    }
}

// === GEARS ===

// Module: Spur Gear (simplified involute approximation)
module spur_gear(teeth=20, module_=1, thickness=5, bore=0, pressure_angle=20) {
    pitch_d = teeth * module_;
    addendum = module_;
    dedendum = module_ * 1.25;
    outer_d = pitch_d + 2*addendum;
    root_d = pitch_d - 2*dedendum;
    tooth_angle = 360/teeth;

    difference() {
        union() {
            // Base cylinder
            cylinder(h=thickness, d=root_d, center=true);
            // Teeth
            for(i=[0:teeth-1]) {
                rotate([0,0,i*tooth_angle])
                linear_extrude(thickness, center=true)
                polygon([
                    [root_d/2*cos(-tooth_angle/4), root_d/2*sin(-tooth_angle/4)],
                    [outer_d/2*cos(-tooth_angle/6), outer_d/2*sin(-tooth_angle/6)],
                    [outer_d/2*cos(tooth_angle/6), outer_d/2*sin(tooth_angle/6)],
                    [root_d/2*cos(tooth_angle/4), root_d/2*sin(tooth_angle/4)]
                ]);
            }
        }
        if(bore > 0) {
            cylinder(h=thickness+EPSILON*2, d=bore, center=true);
        }
    }
}

// Module: Rack Gear (linear gear)
module rack_gear(length=50, module_=1, thickness=5, height=10) {
    tooth_pitch = PI * module_;
    n_teeth = floor(length / tooth_pitch);
    addendum = module_;

    difference() {
        cube([length, height, thickness], center=true);
        for(i=[0:n_teeth-1]) {
            translate([i*tooth_pitch - length/2 + tooth_pitch/2, height/2, 0])
            linear_extrude(thickness+EPSILON, center=true)
            polygon([
                [-tooth_pitch/4, 0],
                [0, -addendum*2],
                [tooth_pitch/4, 0]
            ]);
        }
    }
}

// === BEARINGS ===

// Module: Bearing Pocket (recess for standard bearings)
// Common sizes: 608 (22x8), 625 (16x5), 683 (7x3)
module bearing_pocket(od=22, h=7, lip=1, center=true) {
    shift = center ? [0,0,0] : [0,0,h/2];
    translate(shift) {
        // Main pocket
        cylinder(h=h, d=od+FIT_NORMAL, center=true);
        // Lip recess (prevents bearing from falling through)
        if(lip > 0) {
            translate([0,0,-h/2+lip/2-EPSILON])
                cylinder(h=lip, d=od-2, center=true);
        }
    }
}

// Module: Bearing Seat (raised ring to hold bearing)
module bearing_seat(od=22, id=8, h=7, wall=2, center=true) {
    shift = center ? [0,0,0] : [0,0,h/2];
    translate(shift)
    difference() {
        cylinder(h=h, d=od+wall*2, center=true);
        cylinder(h=h+EPSILON*2, d=id-FIT_TIGHT, center=true);
        translate([0,0,wall/2])
            cylinder(h=h-wall+EPSILON, d=od+FIT_NORMAL, center=true);
    }
}

// Module: Shaft with shoulder (for bearing support)
module shaft_shoulder(d_shaft=8, d_shoulder=12, l_shaft=20, l_shoulder=3, center=false) {
    shift = center ? [0,0,-(l_shaft+l_shoulder)/2] : [0,0,0];
    translate(shift) {
        cylinder(h=l_shaft, d=d_shaft-FIT_NORMAL, center=false);
        translate([0,0,l_shaft-EPSILON])
            cylinder(h=l_shoulder, d=d_shoulder, center=false);
    }
}

// === HINGES ===

// Module: Print-in-place Hinge (barrel hinge)
module pip_hinge(length=20, barrel_d=6, pin_d=2.5, segments=3, gap=0.3) {
    seg_len = length / segments;

    // Male side (pin)
    for(i=[0:2:segments-1]) {
        translate([0, i*seg_len, 0])
        difference() {
            cylinder(h=seg_len-gap, d=barrel_d, center=false);
            cylinder(h=seg_len-gap+EPSILON, d=pin_d+gap*2, center=false);
        }
    }
    cylinder(h=length, d=pin_d, center=false);

    // Female side (socket)
    translate([barrel_d+gap, 0, 0])
    for(i=[1:2:segments]) {
        translate([0, i*seg_len, 0])
        difference() {
            cylinder(h=seg_len-gap, d=barrel_d, center=false);
            translate([-barrel_d/2-gap, 0, -EPSILON])
                cylinder(h=seg_len-gap+EPSILON*2, d=pin_d+gap*2, center=false);
        }
    }
}

// Module: Living Hinge (flexible hinge for single-material printing)
module living_hinge(width=30, length=10, thickness=0.6, cuts=8) {
    cut_spacing = width / (cuts+1);
    cut_width = cut_spacing * 0.6;

    difference() {
        cube([width, length, thickness], center=true);
        for(i=[1:cuts]) {
            // Offset cuts for flexibility
            translate([i*cut_spacing - width/2, (i%2==0 ? length/4 : -length/4), 0])
                cube([cut_width, length/2+EPSILON, thickness+EPSILON*2], center=true);
        }
    }
}

// Module: Knuckle Hinge Leaf (one side of a removable hinge)
module hinge_leaf(width=20, length=30, thickness=3, knuckles=3, pin_d=3, male=true) {
    knuckle_len = width / knuckles;
    knuckle_d = thickness * 2;

    // Base plate
    cube([width, length - knuckle_d/2, thickness], center=false);

    // Knuckles
    translate([0, length - knuckle_d/2, thickness/2])
    rotate([0, 90, 0])
    for(i=[0:knuckles-1]) {
        if((male && i%2==0) || (!male && i%2==1)) {
            translate([0, 0, i*knuckle_len])
            difference() {
                cylinder(h=knuckle_len-0.2, d=knuckle_d, center=false);
                cylinder(h=knuckle_len, d=pin_d+FIT_LOOSE, center=false);
            }
        }
    }
}

// --- POLYGEN KERNEL END ---
`;

const POLYGEN_AUTHOR_SYSTEM_PROMPT = `
You are PolyGen OpenSCAD Author - an expert 3D CAD engineer specializing in parametric design for 3D printing.

PRIMARY GOAL
Generate high-quality, printable OpenSCAD code that compiles perfectly and produces professional results.

ABSOLUTE OUTPUT RULE
Return JSON ONLY. No markdown, no code fences, no labels, no commentary before/after JSON.
If you output anything other than a single JSON object, that is failure.

SESSION MODES
A) New Design: If the request is underspecified, ask clarification questions and do NOT generate SCAD.
B) Edit Design: If CURRENT_SPEC and/or CURRENT_SCAD_BODY is provided, you MUST edit the existing design and must NOT restart.

KERNEL CONTRACT (CRITICAL)
The application prepends a kernel with these modules - DO NOT REDEFINE THEM:

Constants: EPSILON (0.01), $fn (64), FIT_LOOSE (0.4mm), FIT_NORMAL (0.2mm), FIT_TIGHT (0.1mm)

Basic Shapes:
- rcube(size, r=1, center=true) - rounded cube
- rcyl(h, r, r_corner=1, center=true) - rounded cylinder
- rounded_plate(size, r, center=true) - rounded flat plate
- tube(h, or, ir, center=true) - hollow cylinder
- chamfer_cube(size, chamfer=1, center=true) - chamfered box

Fasteners:
- screw_hole_cs(h, d=3.2, head_d=6, head_depth=1.8) - countersunk hole
- nut_trap(d=6.4, h=2.6) - hex nut pocket
- insert_hole(d=4.2, h=5.7) - heat-set insert hole

Patterns:
- circular_pattern(n, r=0) { children } - radial array
- grid_pattern(nx, ny, spacing) { children } - rectangular array
- honeycomb(size, cell_size=8, wall=1.2) - ventilation/weight reduction

Structural:
- rib(length, height, thickness=2) - triangular support
- slot(length, width, height) - elongated hole
- snap_tab(length=8, width=4, thickness=1.5, hook=1) - snap-fit feature

Threads:
- ext_thread(d, h, pitch=1.0, starts=1) - external thread for bolts
- int_thread(d, h, pitch=1.0, starts=1) - internal thread for nuts
- threaded_boss(h=8, od=8, id=4.2) - boss for heat-set insert

Gears:
- spur_gear(teeth=20, module_=1, thickness=5, bore=0) - basic spur gear
- rack_gear(length=50, module_=1, thickness=5, height=10) - linear rack

Bearings:
- bearing_pocket(od=22, h=7, lip=1) - recess for ball bearing (608=22x7, 625=16x5)
- bearing_seat(od=22, id=8, h=7, wall=2) - raised seat with pocket
- shaft_shoulder(d_shaft=8, d_shoulder=12, l_shaft=20, l_shoulder=3) - shaft with shoulder

Hinges:
- pip_hinge(length=20, barrel_d=6, pin_d=2.5, segments=3, gap=0.3) - print-in-place hinge
- living_hinge(width=30, length=10, thickness=0.6, cuts=8) - flexible living hinge
- hinge_leaf(width=20, length=30, thickness=3, knuckles=3, pin_d=3, male=true) - removable hinge

OPENSCAD BEST PRACTICES (MANDATORY)
1. Always define: module main() { ... } and call: main();
2. Use variables for ALL dimensions at the top - make it parametric
3. Add FIT_NORMAL to any hole meant for a shaft/pin (e.g., d=shaft_d + FIT_NORMAL)
4. Extend boolean cutters by EPSILON*2 on each side to prevent z-fighting
5. Minimum wall thickness: 1.2mm (single wall) or 2.4mm (structural)
6. Minimum hole diameter: 2mm for FDM printing
7. Add 1-2mm fillets/chamfers on edges that touch the print bed
8. Use hull() for organic transitions between shapes
9. Group related geometry into sub-modules for clarity
10. Include generous tolerances for moving parts (0.3-0.5mm gaps)

DESIGN QUALITY CHECKLIST
□ All dimensions are parametric variables
□ Tolerances applied to mating surfaces
□ No thin walls < 1.2mm
□ No tiny features < 0.4mm
□ Boolean operations have EPSILON extensions
□ Print orientation considered (minimize supports)
□ Overhangs < 45° or supported

SPEC PANEL REQUIREMENT
Always include a detailed "spec" object with:
- product_class (string)
- dimensions (object with all key measurements)
- material_assumptions (string)
- print_orientation (string)
- tolerances_applied (object)
- features (array of key features)

OUTPUT JSON SHAPE (EXACT)
{
  "status": "ok" | "needs_clarification",
  "clarifications": [
    {
      "question": "What size should the hole be?",
      "suggestions": ["3mm (M3 screw)", "4mm (M4 screw)", "5mm (general purpose)", "Custom size"]
    }
  ],
  "spec": { ... },
  "scad_body": "..."
}

Rules:
- If status="needs_clarification": scad_body must be "" and clarifications must be non-empty.
- Each clarification MUST have 2-4 suggested answers that are the most likely choices.
- Make suggestions specific and practical (include dimensions, common standards, etc.)
- If status="ok": clarifications must be [] and scad_body must be a complete SCAD BODY containing main() and main();.
- spec must NEVER be empty.

THINK STEP BY STEP
1. Understand the functional requirements
2. Plan the geometry composition (what shapes combine to make this?)
3. Identify mating surfaces and apply tolerances
4. Consider print orientation and minimize supports
5. Write clean, parametric code

NOW EXECUTE
Process the user input with the above rules.
`;

export interface ImageData {
  base64: string;
  mimeType: string;
}

export const processArchitectRequest = async (
  userPrompt: string,
  conversationHistory: string[] = [],
  currentAsset: GeneratedAsset | null = null,
  abortSignal?: AbortSignal,
  imageData?: ImageData
): Promise<GeneratedAsset> => {
  const maxRetries = 2;
  let attempt = 0;

  // Detect edit mode
  const isEditMode = currentAsset !== null && !!(currentAsset.spec || currentAsset.scadCode);

  // Load user preferences
  const prefs = loadPreferences();
  const prefsContext = getPreferencesForPrompt();

  // Save to recent designs if it's a new design
  if (!isEditMode && userPrompt.length > 10) {
    addRecentDesign(userPrompt);
  }

  // Construct the prompt content with user preferences
  let promptContent = '';
  if (isEditMode) {
    promptContent = `
${prefsContext}

CURRENT_SPEC:
${JSON.stringify(currentAsset?.spec || {}, null, 2)}

CURRENT_SCAD_BODY:
${currentAsset?.scadCode ? currentAsset.scadCode.replace(SCAD_KERNEL, '').trim() : ''}

USER_REQUEST:
${userPrompt}
      `;
  } else {
    promptContent = `
${prefsContext}

USER_REQUEST:
${userPrompt}
      `;
  }

  // Combine history
  const chatHistory = conversationHistory.map((msg, i) => {
    return { role: i % 2 === 0 ? 'user' : 'model', parts: [{ text: msg }] };
  });

  // Build the user message parts (text + optional image)
  const userParts: any[] = [];

  // Add image first if provided (Gemini prefers image before text for context)
  if (imageData) {
    userParts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    });
    // Add context for the image
    userParts.push({
      text:
        'REFERENCE IMAGE ATTACHED: Analyze this image and recreate it as a 3D printable object. Estimate dimensions from the image context.\n\n' +
        promptContent,
    });
  } else {
    userParts.push({ text: promptContent });
  }

  const messages = [...chatHistory, { role: 'user', parts: userParts }];

  while (attempt <= maxRetries) {
    // Check if aborted before making request
    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    try {
      // Build the prompt from messages
      const lastUserMessage = messages[messages.length - 1];
      const promptText = lastUserMessage.parts.find((p: any) => p.text)?.text || '';
      const promptImage = lastUserMessage.parts.find((p: any) => p.inlineData);

      // Get auth token for authenticated request
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      // Call secure server-side proxy with authentication
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptText,
          imageData: promptImage?.inlineData
            ? {
                base64: promptImage.inlineData.data,
                mimeType: promptImage.inlineData.mimeType,
              }
            : undefined,
          systemInstruction: POLYGEN_AUTHOR_SYSTEM_PROMPT,
          responseMimeType: prefs.enableWebSearch ? undefined : 'application/json',
          temperature: TEMPERATURE,
        }),
        signal: abortSignal,
      });

      // Check if aborted after response
      if (abortSignal?.aborted) {
        throw new DOMException('Request was aborted', 'AbortError');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';
      const result = parsePolyGenResponse(text, currentAsset);

      // If we got code, validate it
      if (result.scadCode) {
        // Re-inject kernel for validation and rendering
        // The prompt asks for "scad_body" only, so we prepend the kernel.
        const fullCode = `${SCAD_KERNEL}\n${result.scadCode}`;

        // Only validate if it's not empty
        if (result.scadCode.trim().length > 0) {
          const validation = await validateScadCode(fullCode);

          if (!validation.success) {
            if (attempt === maxRetries) throw new Error(validation.error);

            messages.push({ role: 'model', parts: [{ text: text }] });
            messages.push({
              role: 'user',
              parts: [
                { text: `COMPILATION ERROR: ${validation.error}. Please fix the code logic.` },
              ],
            });
            attempt++;
            continue;
          }
          result.scadCode = fullCode;
        }
      }

      // Add search sources (from raw Gemini response if available)
      const chunks = data.raw?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: string[] = [];
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) sources.push(chunk.web.uri);
        });
      }
      result.sources = sources;

      return result;
    } catch (e: any) {
      if (
        e.message?.includes('Requested entity was not found.') &&
        (window as any).aistudio?.openSelectKey
      ) {
        await (window as any).aistudio.openSelectKey();
      }
      console.error('PolyGen Author Error', e);
      if (attempt === maxRetries) throw e;
      attempt++;
    }
  }
  throw new Error('Failed to process request.');
};

function parsePolyGenResponse(text: string, currentAsset: GeneratedAsset | null): GeneratedAsset {
  const asset: GeneratedAsset = {
    explanation: '',
  };

  try {
    // Robust JSON Extraction
    // 1. Remove markdown fences if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '');

    // 2. Find the first '{' and last '}'
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(cleanText);

    if (data.spec) asset.spec = data.spec;
    else if (currentAsset?.spec) asset.spec = currentAsset.spec; // Preserve existing spec if missing

    // Handle new clarifications format (questions with suggestions)
    if (data.clarifications && Array.isArray(data.clarifications)) {
      asset.clarifications = data.clarifications;
      // Also populate legacy questions array for backwards compatibility
      asset.questions = data.clarifications.map((c: ClarificationQuestion) => c.question);
    } else if (data.questions) {
      // Legacy format - convert to clarifications with empty suggestions
      asset.questions = data.questions;
      asset.clarifications = data.questions.map((q: string) => ({
        question: q,
        suggestions: [],
      }));
    }

    if (data.scad_body) asset.scadCode = data.scad_body;

    // Generate a summary from the spec for the UI if possible
    if (asset.spec && !asset.specSummary) {
      const summary = [];
      if (asset.spec.product_class) summary.push(`Type: ${asset.spec.product_class}`);
      if (asset.spec.mount_target) summary.push(`Target: ${asset.spec.mount_target}`);
      if (asset.spec.attach_point) summary.push(`Mount: ${asset.spec.attach_point}`);
      asset.specSummary = summary;
    }
  } catch (e) {
    console.error('Failed to parse PolyGen JSON response', e);
    console.log('Raw Response:', text);
    // Fallback: try to return text as explanation or error
    asset.explanation = 'Error parsing AI response. Please try again.';
  }

  return asset;
}
