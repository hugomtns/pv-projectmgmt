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
  /** Counts of electrical components by type */
  electricalCounts: Record<string, number>;
  /** Number of trees in the scene */
  treeCount: number;
  /** Boundary types present (e.g. fence, road, pv_area) */
  boundaryTypes: string[];
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
  const treeSection = context.treeCount > 0
    ? `\n- Realistic trees where the schematic shows green tree shapes`
    : '';

  const hasRoads = context.boundaryTypes.includes('road') || context.boundaryTypes.includes('alignment');
  const roadSection = hasRoads
    ? '\n- Gravel or paved access roads exactly where the schematic shows road/path boundaries — preserve all road routes and widths'
    : '\n- Gravel maintenance paths between panel sections';

  return `You are given a 3D schematic of a solar PV installation. Use it as a spatial blueprint to produce a photorealistic aerial photograph of the same site.

The schematic contains colored lines and colored boxes representing the engineering design — these are abstract overlays, not real objects. Your job is to replace this entire scene with a realistic photograph while preserving the EXACT spatial layout.

SITE DETAILS:
- ${context.panelCount} solar panel tables tilted at ${context.tiltAngle.toFixed(0)}° on ground-mount steel racking
- Panel table dimensions: ${context.panelDimensions.width.toFixed(1)}m × ${context.panelDimensions.height.toFixed(1)}m

WHAT THE FINAL IMAGE MUST LOOK LIKE:
A real drone photograph taken at midday over this solar farm:
- Rows of dark blue/black solar panels on galvanized steel racking, casting realistic shadows
- Preserve the EXACT row layout, spacing, and arrangement from the schematic${roadSection}${treeSection}
- Natural terrain (grass, dirt, gravel) around the panels
- Natural surroundings extending beyond the site

DO NOT ADD ANY ELECTRICAL EQUIPMENT — no inverters, no transformers, no cabinets, no enclosures, no boxes of any kind. Equipment will be composited in post-processing.

WHAT TO REMOVE:
- All colored lines and colored boxes (engineering overlays — ignore them entirely)
- All wireframe outlines and grid lines`;
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
