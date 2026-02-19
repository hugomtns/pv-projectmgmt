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
  // Build equipment summary
  const equipmentLines: string[] = [];
  for (const [type, count] of Object.entries(context.electricalCounts)) {
    if (count > 0) equipmentLines.push(`  - ${count} ${type.replace(/_/g, ' ')}(s)`);
  }
  const equipmentSection = equipmentLines.length > 0
    ? equipmentLines.join('\n')
    : '  - None visible';

  const treeSection = context.treeCount > 0
    ? `\n- ${context.treeCount} tree(s) present on site`
    : '';

  const boundarySection = context.boundaryTypes.length > 0
    ? `\n- Site boundaries: ${context.boundaryTypes.join(', ')}`
    : '';

  return `Transform this 3D schematic rendering of a solar PV installation into a photorealistic aerial photograph.

DESIGN SPECIFICATIONS:
- ${context.panelCount} solar panel tables on ground-mount racking
- Panel table size: ${context.panelDimensions.width.toFixed(2)}m × ${context.panelDimensions.height.toFixed(2)}m
- Tilt angle: ${context.tiltAngle.toFixed(1)}°
- View: ${context.cameraMode === '3d' ? 'Perspective / oblique aerial' : 'Top-down orthographic'}${treeSection}${boundarySection}
- Equipment on site:
${equipmentSection}

COLOR LEGEND — what each color in the schematic represents:
- Dark blue/black tilted rectangles = Solar panel tables (rows of PV modules on steel racking)
- Small GREEN boxes = String inverters (wall-mounted electrical cabinets, roughly 0.6m × 0.4m × 0.2m)
- Larger PURPLE/VIOLET boxes = Transformers (padmount oil-cooled, roughly 2m × 1.5m × 1.5m)
- RED lines = DC string cables (run from panels to inverters — these are mostly routed along racking or in cable trays, barely visible from above)
- BLUE lines = AC cables (run from inverters to transformers — also mostly concealed in underground trenches)
- PURPLE/MAGENTA lines or paths = Maintenance corridors / access roads between panel rows (gravel or compacted earth paths)
- Dashed GRAY lines = Underground cable trenches (not visible on surface — show as subtle ground disturbance at most)
- ORANGE lines = Generic cabling (routed along structures, barely visible)
- GREEN tree shapes (trunk + crown) = Existing trees on the site
- Gray/white boundary lines = Fences, roads, or site perimeter

RENDERING INSTRUCTIONS:
1. PANELS: Replace the schematic rectangles with realistic solar modules — dark blue/black cells with anti-reflective coating, silver aluminum frames, visible cell grid pattern. Keep the exact same placement, count, and tilt angle.
2. RACKING: Add realistic galvanized steel ground-mount racking/torque tubes supporting the panels.
3. INVERTERS: Replace green boxes with realistic small gray/white electrical enclosures mounted on simple support posts.
4. TRANSFORMERS: Replace purple boxes with realistic green or gray padmount transformers with cooling fins.
5. CABLES: DC and AC cables should be mostly INVISIBLE from this aerial view — they run underground in trenches or along racking. Do NOT draw colored lines on the ground. At most, show subtle parallel ground marks where trenches were dug.
6. CORRIDORS: Replace purple paths with realistic gravel or compacted earth maintenance roads/paths between panel rows.
7. TREES: Render as realistic trees matching the size and species typical for the region.
8. GROUND: Natural terrain — grass, gravel, or dry earth depending on the landscape. Include realistic shadows from panels and trees based on midday sun.
9. SURROUNDINGS: Extend the landscape naturally beyond the site boundary with appropriate terrain.

CRITICAL: Maintain the EXACT layout, spacing, and arrangement from the reference image. Do not add, remove, or rearrange any elements. The spatial arrangement is the engineering design.`;
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
