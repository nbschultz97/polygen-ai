
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { validateScadCode } from "./scadValidation";
import { SpecData, GeneratedAsset, ClarificationQuestion } from "../types";
import { loadPreferences, getPreferencesForPrompt, addRecentDesign } from "./preferencesService";

// App Version - update this when making changes
export const APP_VERSION = "1.2.0";
export const APP_BUILD_DATE = "2026-01-24";

// Configuration - can be overridden via environment variables
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const THINKING_BUDGET = parseInt(process.env.THINKING_BUDGET || '24576', 10); // Increased for complex 3D designs
const TEMPERATURE = 0.7; // Balanced creativity vs consistency

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set. Please set GEMINI_API_KEY in your .env.local file.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- POLYGEN STANDARD LIBRARY (KERNEL) ---
const SCAD_KERNEL = `
// --- POLYGEN KERNEL START ---
$fn = 64;
EPSILON = 0.01; // Used to prevent Z-fighting/coincident surfaces

// === PRINT TOLERANCES (FDM defaults) ===
FIT_LOOSE = 0.4;    // Easy sliding fit
FIT_NORMAL = 0.2;   // Standard press fit
FIT_TIGHT = 0.1;    // Friction fit

// === BASIC SHAPES ===

// Module: Rounded Cube (Hull of spheres)
module rcube(size, r=1, center=true) {
    s = is_list(size) ? size : [size, size, size];
    safe_r = min(r, min(s[0], min(s[1], s[2])) / 2.01);
    shift = center ? [0,0,0] : [s[0]/2, s[1]/2, s[2]/2];
    translate(shift)
    hull() {
        for(x=[-1,1], y=[-1,1], z=[-1,1]) {
            translate([x*(s[0]/2-safe_r), y*(s[1]/2-safe_r), z*(s[2]/2-safe_r)]) sphere(r=safe_r);
        }
    }
}

// Module: Rounded Cylinder (Hull of tori)
module rcyl(h, r, r_corner=1, center=true) {
    safe_r_corner = min(r_corner, min(h/2, r) - 0.1);
    shift = center ? [0,0,0] : [0, 0, h/2];
    translate(shift)
    hull() {
        translate([0, 0, (h/2) - safe_r_corner])
            rotate_extrude() translate([r - safe_r_corner, 0, 0]) circle(r = safe_r_corner);
        translate([0, 0, -(h/2) + safe_r_corner])
            rotate_extrude() translate([r - safe_r_corner, 0, 0]) circle(r = safe_r_corner);
    }
}

// Module: Rounded Plate (Linear extrude of rounded square)
module rounded_plate(size, r, center=true) {
    s = is_list(size) ? size : [size[0], size[1], 2]; // default 2mm height
    safe_r = min(r, min(s[0], s[1]) / 2.01);
    linear_extrude(s[2], center=center)
    offset(r=safe_r) square([s[0]-2*safe_r, s[1]-2*safe_r], center=true);
}

// Module: Tube (Hollow Cylinder)
module tube(h, or, ir, center=true) {
    difference() {
        cylinder(h=h, r=or, center=center);
        cylinder(h=h+EPSILON*2, r=ir, center=center);
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

export const processArchitectRequest = async (
    userPrompt: string,
    conversationHistory: string[] = [],
    currentAsset: GeneratedAsset | null = null,
    abortSignal?: AbortSignal
): Promise<GeneratedAsset> => {
  const ai = getClient();
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
  let promptContent = "";
  if (isEditMode) {
      promptContent = `
${prefsContext}

CURRENT_SPEC:
${JSON.stringify(currentAsset?.spec || {}, null, 2)}

CURRENT_SCAD_BODY:
${currentAsset?.scadCode ? currentAsset.scadCode.replace(SCAD_KERNEL, '').trim() : ""}

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

  const messages = [
      ...chatHistory,
      { role: 'user', parts: [{ text: promptContent }] }
  ];

  while (attempt <= maxRetries) {
    // Check if aborted before making request
    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    try {
        // Build config - note: can't use responseMimeType with tools
        const config: any = {
            systemInstruction: POLYGEN_AUTHOR_SYSTEM_PROMPT,
            thinkingConfig: { thinkingBudget: THINKING_BUDGET },
            temperature: TEMPERATURE,
        };

        // Gemini doesn't allow tools + JSON mode together
        // When web search is disabled, enforce JSON response mode
        // When enabled, rely on system prompt for JSON formatting
        if (prefs.enableWebSearch) {
            config.tools = [{ googleSearch: {} }];
            // Can't use responseMimeType with tools - system prompt handles JSON
        } else {
            config.responseMimeType = 'application/json';
        }

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: messages as any,
            config,
        });

        // Check if aborted after response
        if (abortSignal?.aborted) {
          throw new DOMException('Request was aborted', 'AbortError');
        }

        const text = response.text || "";
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
                    messages.push({ role: 'user', parts: [{ text: `COMPILATION ERROR: ${validation.error}. Please fix the code logic.` }] });
                    attempt++;
                    continue;
                }
                result.scadCode = fullCode;
            }
        }

        // Add search sources
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: string[] = [];
        if (chunks) {
            chunks.forEach((chunk: any) => { if (chunk.web?.uri) sources.push(chunk.web.uri); });
        }
        result.sources = sources;

        return result;

    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.") && (window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
        }
        console.error("PolyGen Author Error", e);
        if (attempt === maxRetries) throw e;
        attempt++;
    }
  }
  throw new Error("Failed to process request.");
};

function parsePolyGenResponse(text: string, currentAsset: GeneratedAsset | null): GeneratedAsset {
    const asset: GeneratedAsset = {
        explanation: "",
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
                suggestions: []
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
        console.error("Failed to parse PolyGen JSON response", e);
        console.log("Raw Response:", text);
        // Fallback: try to return text as explanation or error
        asset.explanation = "Error parsing AI response. Please try again.";
    }

    return asset;
}
