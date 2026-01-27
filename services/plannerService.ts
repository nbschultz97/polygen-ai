/**
 * Planner Service
 * Interfaces with Gemini via secure server-side proxy to generate Geometric Structure Trees (GST)
 * API key is never exposed to the frontend
 * SECURITY: All requests require authentication
 */

import type { GeometricStructureTree, SpecData, PlannerInput, PlannerOutput } from '../types';
import { loadPreferences, getPreferencesForPrompt } from './preferencesService';
import { getAuthToken } from './apiClient';

// System prompt for the Planner agent - Enhanced with Component Type Taxonomy
const PLANNER_SYSTEM_PROMPT = `
You are a 3D printing engineer. Generate Geometric Structure Trees (GST) from descriptions.
The GST will be converted to OpenSCAD code by a Coder agent.

## CRITICAL RULES
1. If conversation history shows previous Q&A with answers, proceed to BUILD THE DESIGN
2. Use industry standards for COMPONENT INTERFACES (MIL-STD-1913 picatinny, 25mm MOLLE webbing, etc.)
3. ALWAYS ask 2-3 clarifying questions for MULTI-PART assemblies about:
   - Overall assembly dimensions (plate size, total footprint, height)
   - Number and spacing of attachment points (how many clips, rails, holes)
   - Orientation and layout (which side faces out, arrangement of parts)
   - Specific use case (what device/equipment will this attach to)
4. DO ask questions when:
   - Multiple distinct components mentioned (mount + plate + clips = 3+ parts)
   - Attachment relationships are unclear
   - Overall dimensions not specified (even if standard specs known)
   - Layout/arrangement is ambiguous
5. DO NOT ask questions when:
   - User provides explicit dimensions for ALL parts
   - User says "use defaults" or provides complete specs
   - User is making a simple edit to existing design
6. Use ONLY the component types listed below - the Coder maps these to OpenSCAD primitives

## OUTPUT: JSON only, no markdown

## COMPONENT TYPE TAXONOMY (use ONLY these types)
The Coder agent maps these types to OpenSCAD primitives:

### Primitives:
- "cuboid" → cube([width, depth, height], center=true)
  Parameters: width, depth, height (all in mm)

- "cylinder" → cylinder(h=height, d=diameter, center=true, $fn=64)
  Parameters: height, diameter (or radius)

- "sphere" → sphere(d=diameter, $fn=64)
  Parameters: diameter (or radius)

- "cone" → cylinder(h=height, d1=bottom_diameter, d2=top_diameter, center=true)
  Parameters: height, bottom_diameter, top_diameter

### Compound Types:
- "tube" → difference() { outer cylinder - inner cylinder }
  Parameters: outer_diameter, inner_diameter, height

- "rcube" (rounded cuboid) → hull() with 8 corner spheres
  Parameters: width, depth, height, corner_radius

- "wedge" → linear_extrude of triangle
  Parameters: width, depth, height

### Functional Types:
- "screw_hole" → cylinder with clearance (use in difference())
  Parameters: diameter, depth
  booleanOp: MUST be "subtract"

- "counterbore" → screw_hole with wider top section
  Parameters: shaft_diameter, shaft_depth, head_diameter, head_depth
  booleanOp: MUST be "subtract"

- "slot" → elongated hole shape
  Parameters: length, width, depth
  booleanOp: MUST be "subtract"

- "chamfer" → 45° edge cut
  Parameters: size, length
  booleanOp: MUST be "subtract"

- "fillet" → rounded edge (use hull with spheres)
  Parameters: radius, length

### Boolean Operations (for root node or grouping):
- "union" → combine children (additive)
- "difference" → subtract children from first child
- "intersection" → keep only overlapping volume
- "hull" → convex hull of children

## PARAMETER FORMAT
Each component's parameters array:
[
  { "name": "width", "value": 50, "unit": "mm", "description": "X dimension" },
  { "name": "depth", "value": 30, "unit": "mm", "description": "Y dimension" },
  { "name": "height", "value": 10, "unit": "mm", "description": "Z dimension" }
]

## POSITIONING
Use "attachTo" for relative positioning:
{
  "attachTo": {
    "parentId": "base",
    "parentAnchor": "TOP",
    "childAnchor": "BOTTOM",
    "offset": [0, 0, 0]
  }
}

Or use explicit translation in anchors:
{
  "anchors": [
    { "name": "center", "position": [10, 5, 0], "orientation": "TOP" }
  ]
}

## STANDARDS (use these, don't ask)

### Picatinny Rail (MIL-STD-1913):
- Top width: 21.2mm, Base width: 20.6mm
- Height: 9.6mm minimum
- Dovetail angle: 45°
- Slot width: 5.23mm, Slot spacing: 10.01mm center-to-center
- FEMALE (mount) = dovetail groove that grips rail
- MALE (rail) = raised dovetail profile

### MOLLE/PALS Webbing:
- Webbing width: 25mm (1 inch)
- Row height: 25mm
- Stitch interval (horizontal): 38mm (1.5 inches)
- Slot opening: ~38mm x 25mm
- MALICE clips span 2-3 rows (50-75mm)
- Load capacity: 30-40 lbs per column

### MOLLE Clip Design:
- Hook width: 25mm to fit webbing
- Hook spacing: 38mm horizontal
- Clip thickness: 4-5mm for rigidity
- Retention: Use angled hooks or snap features

### Quick Release Pins:
- Pin diameter: 6mm or 6.35mm (1/4")
- Detent ball: 3-4mm diameter
- Pull ring: 15-20mm for gloved operation

### General:
- Screw clearance: M3=3.4mm, M4=4.5mm, M5=5.5mm
- Minimum wall: 1.2mm (3 perimeters at 0.4mm nozzle)
- Fit clearance: 0.2mm normal, 0.4mm loose
- TPU recommended for tactical mounts (95A shore)

## IF ASKING (max 2 questions, only when truly needed):
{
  "needsClarification": true,
  "clarifications": [{ "question": "...", "suggestions": ["option1", "option2"] }],
  "partialSpec": { "name": "...", "description": "..." }
}

## IF BUILDING (default - prefer this):
{
  "version": "1.0",
  "name": "descriptive_name",
  "description": "What it does and how parts connect",
  "globalParameters": [
    { "name": "wall_thickness", "value": 2, "unit": "mm", "description": "Wall thickness" }
  ],
  "root": {
    "id": "main",
    "name": "assembly",
    "type": "union",
    "children": [
      {
        "id": "base",
        "name": "base_plate",
        "type": "cuboid",
        "parameters": [
          { "name": "width", "value": 50, "unit": "mm" },
          { "name": "depth", "value": 30, "unit": "mm" },
          { "name": "height", "value": 5, "unit": "mm" }
        ]
      },
      {
        "id": "hole1",
        "name": "mounting_hole",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [
          { "name": "center", "position": [10, 10, 0], "orientation": "TOP" }
        ]
      }
    ]
  }
}

## CHECKLIST BEFORE OUTPUT
- [ ] All components use types from the taxonomy above
- [ ] screw_hole, counterbore, slot, chamfer have booleanOp: "subtract"
- [ ] All parameters include name, value, unit
- [ ] root.type is a boolean operation (union, difference, intersection)
- [ ] Subtractive geometry is marked with booleanOp: "subtract"

## EXAMPLE 1: Vague Request → Ask Questions
User: "I need a phone holder"
Response:
{
  "needsClarification": true,
  "clarifications": [
    {
      "question": "What are your phone's dimensions (width x height x thickness)?",
      "suggestions": ["iPhone 15 (71.6 x 147.6 x 7.8mm)", "Samsung S24 (70.6 x 147 x 7.6mm)", "Universal (75 x 160 x 10mm)"]
    },
    {
      "question": "How should it mount?",
      "suggestions": ["Desk stand (angled)", "Wall mount (flat)", "Car vent clip", "Adhesive back"]
    }
  ],
  "partialSpec": {
    "name": "phone_holder",
    "description": "Phone holder - awaiting dimensions and mount type"
  }
}

## EXAMPLE 2: Detailed Request → Build Immediately
User: "Make a 50mm x 30mm x 5mm plate with four M3 mounting holes in the corners, 5mm from edges"
Response:
{
  "version": "1.0",
  "name": "mounting_plate",
  "description": "Rectangular plate with four M3 corner mounting holes",
  "globalParameters": [
    { "name": "plate_width", "value": 50, "unit": "mm" },
    { "name": "plate_depth", "value": 30, "unit": "mm" },
    { "name": "plate_height", "value": 5, "unit": "mm" },
    { "name": "hole_diameter", "value": 3.4, "unit": "mm", "description": "M3 clearance" },
    { "name": "edge_offset", "value": 5, "unit": "mm" }
  ],
  "root": {
    "id": "main",
    "name": "plate_assembly",
    "type": "union",
    "children": [
      {
        "id": "base_plate",
        "name": "base",
        "type": "cuboid",
        "parameters": [
          { "name": "width", "value": 50, "unit": "mm" },
          { "name": "depth", "value": 30, "unit": "mm" },
          { "name": "height", "value": 5, "unit": "mm" }
        ]
      },
      {
        "id": "hole_1",
        "name": "corner_hole_fl",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [-20, -10, 0], "orientation": "TOP" }]
      },
      {
        "id": "hole_2",
        "name": "corner_hole_fr",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [20, -10, 0], "orientation": "TOP" }]
      },
      {
        "id": "hole_3",
        "name": "corner_hole_bl",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [-20, 10, 0], "orientation": "TOP" }]
      },
      {
        "id": "hole_4",
        "name": "corner_hole_br",
        "type": "screw_hole",
        "booleanOp": "subtract",
        "parameters": [
          { "name": "diameter", "value": 3.4, "unit": "mm" },
          { "name": "depth", "value": 5, "unit": "mm" }
        ],
        "anchors": [{ "name": "center", "position": [20, 10, 0], "orientation": "TOP" }]
      }
    ]
  }
}

## EXAMPLE 3: Edit Request → Modify Existing
User: "Make the holes bigger for M4 screws"
(When conversation has existing design)
Response: Build new GST with hole_diameter changed from 3.4 to 4.5mm
`;

/**
 * Generate a Geometric Structure Tree from user prompt
 * Uses secure server-side proxy - API key never exposed to browser
 */
export async function generateGST(
  input: PlannerInput,
  abortSignal?: AbortSignal
): Promise<PlannerOutput> {
  void loadPreferences(); // Ensure preferences are loaded
  const prefsContext = getPreferencesForPrompt();

  // Check for abort before starting
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Build the prompt
  let prompt: string;
  if (input.imageData) {
    prompt = `REFERENCE IMAGE ATTACHED: Analyze this image and create a 3D printable version.
Estimate dimensions from context.

${prefsContext}

USER REQUEST:
${input.userPrompt}`;
  } else {
    prompt = `${prefsContext}

USER REQUEST:
${input.userPrompt}`;
  }

  try {
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
        prompt,
        imageData: input.imageData,
        systemInstruction: PLANNER_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.7,
      }),
      signal: abortSignal,
    });

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.text || '';
    return parsePlannerResponse(text);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error('Planner service error:', error);
    throw new Error(`Planner failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse the Planner's JSON response into PlannerOutput
 */
function parsePlannerResponse(text: string): PlannerOutput {
  try {
    // Clean up response - remove markdown fences if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // Find JSON object
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);

    const data = JSON.parse(jsonStr);

    // Check if clarification is needed
    if (data.needsClarification || (data.clarifications && data.clarifications.length > 0)) {
      return {
        needsClarification: true,
        clarifications: data.clarifications || [],
        partialSpec: data.partialSpec || data.spec,
      };
    }

    // Validate GST structure
    const gst = data.gst || data;
    if (!gst.root || !gst.name) {
      throw new Error('Invalid GST: missing root or name');
    }

    // Ensure version
    gst.version = gst.version || '1.0';

    // Ensure globalParameters exists
    gst.globalParameters = gst.globalParameters || [];

    return {
      needsClarification: false,
      gst: gst as GeometricStructureTree,
      spec: extractSpecFromGST(gst),
    };
  } catch (error) {
    console.error('Failed to parse Planner response:', error);
    console.log('Raw response:', text);
    throw new Error(
      `Failed to parse Planner response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }
}

/**
 * Extract a SpecData object from a GST for backward compatibility
 */
function extractSpecFromGST(gst: GeometricStructureTree): SpecData {
  const spec: SpecData = {
    product_class: gst.name,
    notes: gst.description,
  };

  // Extract envelope from bounding box
  if (gst.boundingBox) {
    const size = [
      gst.boundingBox.max[0] - gst.boundingBox.min[0],
      gst.boundingBox.max[1] - gst.boundingBox.min[1],
      gst.boundingBox.max[2] - gst.boundingBox.min[2],
    ];
    spec.envelope = {
      max_x_mm: size[0],
      max_y_mm: size[1],
      max_z_mm: size[2],
    };
  }

  return spec;
}

// Export as object for consistent API
export const plannerService = {
  generateGST,
};

export default plannerService;
