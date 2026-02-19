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

  const transformerCount = context.electricalCounts['transformer'] ?? 0;
  const transformerSection = transformerCount > 0
    ? `\n- There are ${transformerCount} LARGE colored box(es) in the schematic — these are padmount transformers. Replace each one with a realistic green/gray padmount transformer at that exact location.`
    : '';

  return `You are given a 3D schematic of a solar PV installation. Use it as a spatial blueprint to produce a photorealistic aerial photograph of the same site.

The schematic contains colored lines and colored boxes that represent the engineering design. These are abstract overlays — not real objects. Ignore all colored lines and all SMALL boxes. The only boxes you should convert to real objects are the few LARGE boxes (transformers).

SITE DETAILS:
- ${context.panelCount} solar panel tables tilted at ${context.tiltAngle.toFixed(0)}° on ground-mount steel racking
- Panel table dimensions: ${context.panelDimensions.width.toFixed(1)}m × ${context.panelDimensions.height.toFixed(1)}m${transformerSection}

WHAT THE FINAL IMAGE MUST LOOK LIKE:
A real drone photograph taken at midday over this solar farm:
- Rows of dark blue/black solar panels on galvanized steel racking, casting realistic shadows
- Preserve the EXACT row layout, spacing, and arrangement from the schematic
- Natural terrain (grass, dirt, gravel) between and around the panel rows
- Gravel maintenance roads between panel sections${treeSection}${transformerCount > 0 ? '\n- Realistic padmount transformers ONLY where the schematic shows large boxes' : ''}
- Natural surroundings extending beyond the site

IMPORTANT — DO NOT ADD:
- Do NOT add any small electrical equipment (no inverters, no combiner boxes, no cabinets, no small enclosures)
- Do NOT add any wires, cables, or conduits
- Do NOT draw any colored lines
- Do NOT place any equipment where the schematic shows empty ground

WHAT TO REMOVE:
- All colored lines (these are engineering overlays, not real objects)
- All small colored boxes (these are schematic markers, not real objects)
- All wireframe outlines and grid lines
- Replace the entire scene with photorealistic equivalents`;
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
