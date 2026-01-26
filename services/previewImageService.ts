/**
 * Preview Image Service
 * Generates concept images from GST using Gemini's image generation
 * Uses secure server-side proxy - API key never exposed to frontend
 */

import { GeometricStructureTree } from '../types';

/**
 * Convert GST to an image generation prompt
 */
function gstToImagePrompt(gst: GeometricStructureTree): string {
  const parts: string[] = [];

  // Base description
  parts.push(`3D printed object: ${gst.name}`);
  if (gst.description) {
    parts.push(gst.description);
  }

  // Extract key parameters for context
  if (gst.globalParameters && gst.globalParameters.length > 0) {
    const dims = gst.globalParameters
      .filter(p => p.unit === 'mm')
      .slice(0, 3)
      .map(p => `${p.name}: ${p.value}mm`)
      .join(', ');
    if (dims) {
      parts.push(`Approximate dimensions: ${dims}`);
    }
  }

  // Extract component types for visual context
  const componentTypes = extractComponentTypes(gst.root);
  if (componentTypes.length > 0) {
    parts.push(`Features: ${componentTypes.join(', ')}`);
  }

  // Style guidance for 3D print visualization
  parts.push('Style: Clean CAD render, white/gray plastic material, soft studio lighting, product photography style, showing the object from a 3/4 angle');

  return parts.join('. ');
}

/**
 * Recursively extract component types from GST
 */
function extractComponentTypes(component: any, types: string[] = []): string[] {
  if (component.type && !['union', 'difference', 'intersection'].includes(component.type)) {
    const readable = component.type
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
    if (!types.includes(readable)) {
      types.push(readable);
    }
  }

  if (component.children) {
    for (const child of component.children) {
      extractComponentTypes(child, types);
    }
  }

  return types;
}

/**
 * Generate a preview image from a GST
 * Uses secure server-side proxy
 */
export async function generatePreviewImage(
  gst: GeometricStructureTree,
  abortSignal?: AbortSignal
): Promise<string | null> {
  if (abortSignal?.aborted) {
    return null;
  }

  const prompt = gstToImagePrompt(gst);
  console.log('Image generation prompt:', prompt);

  try {
    // Call secure server-side proxy
    const response = await fetch('/api/gemini-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        numberOfImages: 1,
        aspectRatio: '1:1'
      }),
      signal: abortSignal
    });

    if (abortSignal?.aborted) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Image generation skipped:', errorData.error);
      return null;
    }

    const data = await response.json();
    if (data.imageBase64) {
      return `data:image/png;base64,${data.imageBase64}`;
    }

    console.log('No image generated');
    return null;

  } catch (error) {
    console.error('Image generation error:', error);
    // Don't throw - image preview is optional
    return null;
  }
}

/**
 * Check if image generation is available
 * Returns true - actual availability is determined server-side
 */
export function isImageGenAvailable(): boolean {
  return true; // Server will return error if not configured
}

export const previewImageService = {
  generatePreviewImage,
  isImageGenAvailable,
  gstToImagePrompt
};

export default previewImageService;
