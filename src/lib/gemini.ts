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
    ? `\n- ${context.treeCount} tree(s) present on site`
    : '';

  const boundarySection = context.boundaryTypes.length > 0
    ? `\n- Site boundaries: ${context.boundaryTypes.join(', ')}`
    : '';

  const inverterCount = context.electricalCounts['inverter'] ?? 0;
  const transformerCount = context.electricalCounts['transformer'] ?? 0;
  const combinerCount = context.electricalCounts['combiner'] ?? 0;

  // Only mention equipment that actually exists
  const equipmentDesc: string[] = [];
  if (inverterCount > 0) equipmentDesc.push(`${inverterCount} small string inverter cabinet(s)`);
  if (transformerCount > 0) equipmentDesc.push(`${transformerCount} padmount transformer(s)`);
  if (combinerCount > 0) equipmentDesc.push(`${combinerCount} combiner box(es)`);

  const equipmentSentence = equipmentDesc.length > 0
    ? `The site includes ${equipmentDesc.join(', ')} — these are visible as small 3D box shapes in the schematic.`
    : 'There is no electrical equipment on this site beyond the panels and racking.';

  return `You are given a 3D schematic of a solar PV installation. Use it ONLY as a spatial blueprint to produce a photorealistic aerial photograph of the same site.

The schematic contains colored lines and wireframe boxes that represent the engineering design. These are NOT real objects — they are abstract design overlays. Your job is to completely remove all schematic artifacts (colored lines, wireframe overlays, colored boxes, labels) and replace the entire scene with a realistic photograph.

SITE DETAILS:
- ${context.panelCount} solar panel tables tilted at ${context.tiltAngle.toFixed(0)}° on ground-mount steel racking
- Panel table dimensions: ${context.panelDimensions.width.toFixed(1)}m × ${context.panelDimensions.height.toFixed(1)}m${treeSection}${boundarySection}
- ${equipmentSentence}
- Gravel or compacted earth access roads run between the panel rows

WHAT THE FINAL IMAGE SHOULD LOOK LIKE:
Imagine a real drone photograph taken at midday over this solar farm. You should see:
- Rows of dark blue/black solar panels on galvanized steel racking, casting shadows on the ground
- Natural terrain (grass, dirt, gravel) between and around the panel rows
- Gravel maintenance roads between panel sections${context.treeCount > 0 ? '\n- Realistic trees where the schematic shows tree shapes' : ''}${inverterCount > 0 ? '\n- Small gray/white inverter cabinets on posts — only where the schematic shows small box shapes near panels' : ''}${transformerCount > 0 ? '\n- Green/gray padmount transformers — only where the schematic shows larger box shapes' : ''}
- No visible cables or wiring (all underground)
- Natural surroundings extending beyond the site

WHAT MUST NOT APPEAR IN THE FINAL IMAGE:
- No colored lines of any kind (no red, blue, purple, orange, green, or gray lines)
- No wireframe overlays or schematic markings
- No colored boxes — replace each box with the corresponding realistic equipment at that location
- No labels, annotations, or grid lines
- No equipment in locations where the schematic shows empty ground

Use the schematic purely for spatial arrangement — the position of every panel, road, tree, and piece of equipment. Then render everything as if photographed by a real camera.`;
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
