

// Always use the official types and classes from @google/genai
import { GoogleGenAI } from "@google/genai";
import { resizeImage } from "./utils";
import { ImageQuality } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateMockup = async (
  baseImage: File,
  logoImage: File,
  color: string,
  quality: ImageQuality = '1K',
  onRetry?: (attempt: number) => void
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      throw new Error("API Key is missing. Please ensure you are in a valid execution context.");
  }

  // Create a new instance right before the call to ensure latest API key usage
  const ai = new GoogleGenAI({ apiKey });

  // Use 2048px resolution for base image
  const baseImageB64 = await resizeImage(baseImage, 2048);
  const logoImageB64 = await resizeImage(logoImage, 1024);

  // Model selection: ALWAYS use Pro for editing tasks involving text removal
  const modelName = 'gemini-3-pro-image-preview';

  /**
   * STRATEGY: "DIRECT RENOVATION"
   * The prompt is refined to specifically target the "blue" underlayment in the default photo,
   * while ensuring the logo adheres to the roof's geometry.
   */
  const prompt = `
    Input 1: Photo of a residential construction site.
    Input 2: A Transparent Brand Logo Pattern (not a solid block).
    
    Task: Replace the existing blue roof underlayment with a new custom synthetic fabric.
    
    Instructions:
    1.  Segmentation: Identify all roof surfaces currently covered in blue material.
    2.  Replacement: Replace this blue material with a new fabric in this specific color: ${color}.
    3.  Pattern Application: 
        - Tile the provided Logo (Input 2) diagonally across the new material.
        - Treat Input 2 as a cutout pattern; do NOT apply a solid background box.
        - CRITICAL: The logo pattern MUST follow the perspective and pitch of each individual roof plane.
        - The logo should look like it is printed ON the fabric, not floating above it.
    4.  Realism:
        - Apply self-shadowing and ambient occlusion from the environment.
        - Ensure the material texture looks like matte woven synthetic roofing underlayment.
    5.  Clean Up: Remove any old text (e.g. "Tyvek", "Logo Here") so the roof looks brand new.
  `;

  const callApi = async () => {
    // Pro model supports imageSize config
    const config: any = {
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: quality // '1K', '2K', or '4K'
      }
    };
    
    // Order: Prompt, Logo, Base Image
    return await ai.models.generateContent({
      model: modelName, 
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: logoImageB64 } },
          { inlineData: { mimeType: 'image/jpeg', data: baseImageB64 } }
        ]
      },
      config
    });
  };

  try {
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            response = await callApi();
            break;
        } catch (e: any) {
            attempts++;
            const msg = String(e.message || e);
            
            if (msg.includes('403') || msg.includes('401') || msg.includes('not authorized') || msg.includes('Requested entity was not found')) {
              // Pro model requires valid key / project selection
              throw new Error("PRO_MODEL_AUTH_ERROR");
            }

            const isRetryable = msg.includes('503') || msg.includes('500') || msg.includes('429') || 
                                msg.includes('overloaded') || msg.includes('fetch failed');
            
            if (!isRetryable || attempts >= maxAttempts) throw e;
            if (onRetry) onRetry(attempts + 1);
            await wait(2000);
        }
    }

    if (!response) throw new Error("Generation failed.");

    let generatedImageB64: string | undefined;
    const candidate = response.candidates?.[0];
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          generatedImageB64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!generatedImageB64) {
      throw new Error("The visualizer failed to generate the mockup. Please try again.");
    }

    return `data:image/png;base64,${generatedImageB64}`;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
