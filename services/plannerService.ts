/**
 * Planner Service
 * Interfaces with Gemini 3 Pro to generate Geometric Structure Trees (GST)
 */

import { GoogleGenAI } from "@google/genai";
import {
  GeometricStructureTree,
  SpecData,
  ClarificationQuestion,
  PlannerInput,
  PlannerOutput,
  ImageData
} from '../types';
import { loadPreferences, getPreferencesForPrompt } from './preferencesService';

// System prompt for the Planner agent
const PLANNER_SYSTEM_PROMPT = `
You are the PolyGen Planner - an expert 3D CAD architect specializing in parametric design decomposition for 3D printing.

## PRIMARY GOAL
Transform user descriptions into Geometric Structure Trees (GST) that can be translated to BOSL2 OpenSCAD code.

## OUTPUT FORMAT
Return ONLY valid JSON. No markdown fences, no commentary.

## GST SCHEMA
{
  "version": "1.0",
  "name": "string",
  "description": "string",
  "globalParameters": [
    { "name": "snake_case", "value": 10, "unit": "mm|deg|count", "description": "string" }
  ],
  "root": {
    "id": "unique-id",
    "name": "component_name",
    "type": "cuboid|cylinder|rcube|rcyl|tube|spur_gear|screw_hole|...",
    "parameters": [...],
    "anchors": [{ "name": "string", "position": [x,y,z], "orientation": "TOP|BOTTOM|LEFT|RIGHT|FRONT|BACK|CENTER" }],
    "children": [...],
    "attachTo": { "parentId": "string", "parentAnchor": "TOP", "childAnchor": "BOTTOM" },
    "booleanOp": "add|subtract|intersect"
  },
  "boundingBox": { "min": [x,y,z], "max": [x,y,z] },
  "printOrientation": "flat|upright|angled",
  "bosl2Features": ["rcube", "attach", "diff"]
}

## RULES
1. EVERY dimension must be a named parameter in globalParameters
2. Use BOSL2 component types (rcube, rcyl, tube, spur_gear, etc.)
3. Define anchors for attachment points
4. Estimate bounding box
5. Consider print orientation

## CLARIFICATION
If underspecified, return:
{
  "needsClarification": true,
  "clarifications": [{ "question": "string", "suggestions": ["option1", "option2"] }],
  "partialSpec": { "name": "...", "description": "..." }
}

## NOW EXECUTE
Return valid GST JSON only.
`;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generate a Geometric Structure Tree from user prompt
 */
export async function generateGST(
  input: PlannerInput,
  abortSignal?: AbortSignal
): Promise<PlannerOutput> {
  const ai = getClient();
  const prefs = loadPreferences();
  const prefsContext = getPreferencesForPrompt();

  // Check for abort before starting
  if (abortSignal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }

  // Build content parts
  const parts: any[] = [];

  // Add image if provided
  if (input.imageData) {
    parts.push({
      inlineData: {
        mimeType: input.imageData.mimeType,
        data: input.imageData.base64
      }
    });
    parts.push({
      text: `REFERENCE IMAGE ATTACHED: Analyze this image and create a 3D printable version.
Estimate dimensions from context.

${prefsContext}

USER REQUEST:
${input.userPrompt}`
    });
  } else {
    parts.push({
      text: `${prefsContext}

USER REQUEST:
${input.userPrompt}`
    });
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';
    const thinkingLevel = (process.env.THINKING_LEVEL || 'high') as 'none' | 'low' | 'medium' | 'high';

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: PLANNER_SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    if (abortSignal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }

    const text = response.text || "";
    return parsePlannerResponse(text);

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Planner service error:", error);
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
        partialSpec: data.partialSpec || data.spec
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
      spec: extractSpecFromGST(gst)
    };

  } catch (error) {
    console.error("Failed to parse Planner response:", error);
    console.log("Raw response:", text);
    throw new Error(`Failed to parse Planner response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Extract a SpecData object from a GST for backward compatibility
 */
function extractSpecFromGST(gst: GeometricStructureTree): SpecData {
  const spec: SpecData = {
    product_class: gst.name,
    notes: gst.description
  };

  // Extract envelope from bounding box
  if (gst.boundingBox) {
    const size = [
      gst.boundingBox.max[0] - gst.boundingBox.min[0],
      gst.boundingBox.max[1] - gst.boundingBox.min[1],
      gst.boundingBox.max[2] - gst.boundingBox.min[2]
    ];
    spec.envelope = {
      max_x_mm: size[0],
      max_y_mm: size[1],
      max_z_mm: size[2]
    };
  }

  return spec;
}

// Export as object for consistent API
export const plannerService = {
  generateGST
};

export default plannerService;
