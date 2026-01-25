/**
 * Preview Image Service
 * Generates concept images from GST using Gemini's image generation
 */

import { GoogleGenAI } from "@google/genai";
import { GeometricStructureTree } from '../types';

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }
  return new GoogleGenAI({ apiKey });
};

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
 */
export async function generatePreviewImage(
  gst: GeometricStructureTree,
  abortSignal?: AbortSignal
): Promise<string | null> {
  const ai = getClient();

  if (abortSignal?.aborted) {
    return null;
  }

  const prompt = gstToImagePrompt(gst);
  console.log('Image generation prompt:', prompt);

  try {
    // Use Gemini's image generation model
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/png'
      }
    });

    if (abortSignal?.aborted) {
      return null;
    }

    // Extract base64 image from response
    if (response.generatedImages && response.generatedImages.length > 0) {
      const image = response.generatedImages[0];
      if (image.image?.imageBytes) {
        // Convert to data URL
        return `data:image/png;base64,${image.image.imageBytes}`;
      }
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
 */
export function isImageGenAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
}

export const previewImageService = {
  generatePreviewImage,
  isImageGenAvailable,
  gstToImagePrompt
};

export default previewImageService;
