/**
 * Visual Critic Service
 * SOTA Blind Spot Mitigation - Visual Feedback Loop
 *
 * Uses Claude Vision to analyze rendered 3D models and detect issues
 * that pure geometric validation might miss:
 *
 * 1. Inverted/mirrored text
 * 2. Disconnected parts
 * 3. Visual scale mismatches
 * 4. Unexpected geometry
 * 5. Missing features mentioned in request
 *
 * Flow:
 * 1. Capture screenshot of rendered model (canvas → base64)
 * 2. Send to Claude Vision with original request
 * 3. Return critique with specific issues
 * 4. If issues found, trigger regeneration with feedback
 */

import { getAuthToken } from './apiClient';

// Types for visual critique
export interface VisualCritiqueResult {
  approved: boolean;
  issues: VisualIssue[];
  suggestions: string[];
  confidence: number;
}

export interface VisualIssue {
  type: 'geometry' | 'text' | 'scale' | 'missing_feature' | 'disconnected' | 'orientation';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

// Claude Vision API model
const VISION_MODEL = 'claude-sonnet-4-20250514';

// Visual critique system prompt
const VISUAL_CRITIC_PROMPT = `You are a 3D model quality inspector. Analyze this rendered 3D model and check for issues.

## YOUR TASK
Look at the rendered image and compare it to what the user requested. Check for:

1. **Text Issues**: Is any text mirrored, inverted, or unreadable?
2. **Disconnected Parts**: Are there floating pieces that should be connected?
3. **Scale Problems**: Do proportions look wrong (parts too big/small relative to each other)?
4. **Missing Features**: Are any requested features absent from the render?
5. **Orientation**: Is the model oriented correctly (right-side up, correct face forward)?

## OUTPUT FORMAT
Return JSON:
{
  "approved": true/false,
  "issues": [
    {
      "type": "geometry|text|scale|missing_feature|disconnected|orientation",
      "description": "What's wrong",
      "severity": "low|medium|high",
      "location": "Where in the model (optional)"
    }
  ],
  "suggestions": ["Specific fix suggestions"],
  "confidence": 0.0-1.0
}

If the model looks correct, return {"approved": true, "issues": [], "suggestions": [], "confidence": 0.95}

Be conservative - only flag clear issues, not minor imperfections.`;

/**
 * Capture canvas as base64 PNG
 * Must be called from component with access to canvas
 */
export function captureCanvasScreenshot(canvas: HTMLCanvasElement): string | null {
  try {
    // Get data URL and strip the prefix
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1];
  } catch (error) {
    console.error('Failed to capture canvas screenshot:', error);
    return null;
  }
}

/**
 * Critique a rendered model using Claude Vision
 */
export async function critiqueRender(
  imageBase64: string,
  originalRequest: string,
  abortSignal?: AbortSignal
): Promise<VisualCritiqueResult> {
  try {
    const token = await getAuthToken();

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `${VISUAL_CRITIC_PROMPT}\n\nUser's original request: "${originalRequest}"`,
              },
            ],
          },
        ],
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Visual critique API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        approved: result.approved ?? true,
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        confidence: result.confidence ?? 0.5,
      };
    }

    // Default to approved if parsing fails
    console.warn('Could not parse visual critique response');
    return {
      approved: true,
      issues: [],
      suggestions: [],
      confidence: 0.5,
    };
  } catch (error) {
    console.error('Visual critique failed:', error);

    // Don't block on visual critique failure
    return {
      approved: true,
      issues: [],
      suggestions: ['Visual critique unavailable'],
      confidence: 0,
    };
  }
}

/**
 * Convert visual critique issues to validation error messages
 * These can be fed back to the coder for correction
 */
export function issueToErrorMessage(issue: VisualIssue): string {
  const prefix = `[Visual Critic - ${issue.severity.toUpperCase()}]`;
  const location = issue.location ? ` (at ${issue.location})` : '';

  switch (issue.type) {
    case 'text':
      return `${prefix} Text issue${location}: ${issue.description}. Use mirror() or adjust orientation.`;
    case 'disconnected':
      return `${prefix} Disconnected geometry${location}: ${issue.description}. Ensure parts are joined with union().`;
    case 'scale':
      return `${prefix} Scale mismatch${location}: ${issue.description}. Check dimensions and proportions.`;
    case 'missing_feature':
      return `${prefix} Missing feature${location}: ${issue.description}. Add the missing geometry.`;
    case 'orientation':
      return `${prefix} Orientation issue${location}: ${issue.description}. Adjust rotation.`;
    default:
      return `${prefix} Geometry issue${location}: ${issue.description}`;
  }
}

/**
 * Check if critique requires regeneration
 * Only high-severity issues or multiple medium issues trigger regeneration
 */
export function needsRegeneration(critique: VisualCritiqueResult): boolean {
  if (critique.approved) return false;

  const highSeverity = critique.issues.filter((i) => i.severity === 'high').length;
  const mediumSeverity = critique.issues.filter((i) => i.severity === 'medium').length;

  // Regenerate if: any high severity OR 2+ medium severity issues
  return highSeverity > 0 || mediumSeverity >= 2;
}

/**
 * Generate feedback prompt for coder based on visual critique
 */
export function generateCritiqueFeedback(critique: VisualCritiqueResult): string[] {
  return critique.issues.map(issueToErrorMessage);
}

// Export service object
export const visualCriticService = {
  captureCanvasScreenshot,
  critiqueRender,
  issueToErrorMessage,
  needsRegeneration,
  generateCritiqueFeedback,
};

export default visualCriticService;
