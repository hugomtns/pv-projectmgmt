/**
 * Gemini API Integration for AI Image Generation
 *
 * Uses Google's Gemini 3 Pro Image Preview to generate
 * photorealistic images from 3D canvas captures of solar layouts.
 */

import { aiLogger } from './aiLogger';

const IMAGE_MODEL = 'gemini-3-pro-image-preview';

export interface DesignContext {
  panelCount: number;
  panelDimensions: { width: number; height: number };
  tiltAngle: number;
  equipmentTypes: string[];
  cameraMode: '3d' | '2d';
}

export interface GenerateImageParams {
  canvasImage: string; // base64 PNG
  designContext: DesignContext;
}

export interface GenerateImageResult {
  success: boolean;
  image?: string; // base64 PNG
  error?: string;
}

/**
 * Build the prompt for Gemini to generate a realistic solar installation image
 */
function buildPrompt(context: DesignContext): string {
  const equipmentList = context.equipmentTypes.length > 0
    ? context.equipmentTypes.join(', ')
    : 'none visible';

  return `Generate a photorealistic aerial view of a solar installation based on this 3D rendering.

Design specifications:
- ${context.panelCount} solar panels
- Panel size: ${context.panelDimensions.width.toFixed(2)}m x ${context.panelDimensions.height.toFixed(2)}m
- Tilt angle: ${context.tiltAngle.toFixed(1)} degrees
- Equipment: ${equipmentList}
- View: ${context.cameraMode === '3d' ? 'Perspective view' : 'Top-down orthographic view'}

Transform the 3D schematic into a realistic photograph showing:
- Actual solar panel textures with anti-reflective coating and typical blue/black coloring
- Realistic shadows based on panel tilt and sun position
- Surrounding landscape (grass, gravel, or appropriate ground cover)
- Natural midday lighting conditions
- Any visible electrical equipment (inverters, transformers)
- Mounting structures and racking systems

Important: Maintain the exact panel placement and layout from the reference image. Do not add or remove panels.`;
}

/**
 * Generate a photorealistic image from a 3D canvas capture
 *
 * @param params - Canvas image (base64) and design context
 * @returns Generated image as base64 PNG or error message
 */
export async function generateRealisticImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.',
    };
  }

  const prompt = buildPrompt(params.designContext);

  const finish = aiLogger.start({
    feature: 'image-generation',
    model: IMAGE_MODEL,
    promptLength: prompt.length,
    hasImageInput: true,
    metadata: {
      panelCount: params.designContext.panelCount,
      cameraMode: params.designContext.cameraMode,
    },
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: params.canvasImage,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['image', 'text'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed: ${response.status}`;
      finish({ status: 'error', httpStatus: response.status, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();

    // Extract token usage if available
    const usageMetadata = data.usageMetadata;
    const tokenUsage = usageMetadata
      ? {
          promptTokens: usageMetadata.promptTokenCount,
          completionTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        }
      : undefined;

    // Extract the generated image from the response
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { data: string } }) => part.inlineData?.data
    );

    if (!imagePart?.inlineData?.data) {
      // Check if there's text feedback instead
      const textPart = data.candidates?.[0]?.content?.parts?.find(
        (part: { text?: string }) => part.text
      );
      const error = textPart?.text || 'No image was generated. Please try again.';
      finish({ status: 'error', httpStatus: response.status, error, tokenUsage });
      return {
        success: false,
        error,
      };
    }

    finish({ status: 'success', httpStatus: response.status, tokenUsage });
    return {
      success: true,
      image: imagePart.inlineData.data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    finish({ status: 'error', error: `Failed to generate image: ${message}` });
    return {
      success: false,
      error: `Failed to generate image: ${message}`,
    };
  }
}
