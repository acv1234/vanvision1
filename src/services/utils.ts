

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const resizeImage = (file: File, maxWidth = 2048): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const recolorLogo = (file: File, targetColor: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const maxDim = 800; 
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
             const ratio = Math.min(maxDim / w, maxDim / h);
             w = Math.round(w * ratio);
             h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // ---------------------------------------------------------
        // IMPROVED BACKGROUND REMOVAL
        // ---------------------------------------------------------
        
        // Check for existing transparency
        let significantTransparencyFound = false;
        let transparentPixelCount = 0;
        const sampleLimit = 1000;
        const step = Math.floor(data.length / 4 / sampleLimit) || 1;

        for (let i = 0; i < data.length; i += 4 * step) {
            if (data[i + 3] < 20) {
                transparentPixelCount++;
            }
        }
        
        if (transparentPixelCount > (data.length / 4 / step) * 0.05) {
            significantTransparencyFound = true;
        }

        // Remove background if needed
        if (!significantTransparencyFound) {
            // STEP 1: Identify border color (usually white)
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            
            const addSample = (idx: number) => {
                const off = idx * 4;
                rSum += data[off];
                gSum += data[off+1];
                bSum += data[off+2];
                count++;
            };

            // Sample perimeter
            for (let x = 0; x < w; x++) {
                addSample(x);
                addSample((h - 1) * w + x);
            }
            for (let y = 0; y < h; y++) {
                addSample(y * w);
                addSample(y * w + (w - 1));
            }

            const borderR = rSum / count;
            const borderG = gSum / count;
            const borderB = bSum / count;

            // STEP 2: Find potential colored background
            // Sample center 60% of image to find dominant background color
            const centerStartX = Math.floor(w * 0.2);
            const centerEndX = Math.floor(w * 0.8);
            const centerStartY = Math.floor(h * 0.2);
            const centerEndY = Math.floor(h * 0.8);
            
            const colorMap = new Map<string, number>();
            let centerCount = 0;
            
            for (let y = centerStartY; y < centerEndY; y += 2) {
                for (let x = centerStartX; x < centerEndX; x += 2) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Bucket colors to ~16 value increments
                    const rBucket = Math.floor(r / 16);
                    const gBucket = Math.floor(g / 16);
                    const bBucket = Math.floor(b / 16);
                    const colorKey = `${rBucket},${gBucket},${bBucket}`;
                    
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                    centerCount++;
                }
            }
            
            // Find most common color in center
            let maxCount = 0;
            let dominantColorKey = '';
            for (const [colorKey, pixelCount] of colorMap.entries()) {
                if (pixelCount > maxCount) {
                    maxCount = pixelCount;
                    dominantColorKey = colorKey;
                }
            }
            
            // If this dominant color represents >40% of center area, it's likely a background rectangle
            const hasColoredBackground = maxCount / centerCount > 0.4;
            
            let centerR = 0, centerG = 0, centerB = 0;
            if (hasColoredBackground && dominantColorKey) {
                const [rBucket, gBucket, bBucket] = dominantColorKey.split(',').map(Number);
                centerR = rBucket * 16 + 8; // Center of bucket
                centerG = gBucket * 16 + 8;
                centerB = bBucket * 16 + 8;
            }

            // STEP 3: Remove both border color AND colored background
            const tolerance = 60;
            const centerTolerance = 40; // Tighter tolerance for center color
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Check distance to border color
                const borderDist = Math.sqrt(
                    (r - borderR) * (r - borderR) + 
                    (g - borderG) * (g - borderG) + 
                    (b - borderB) * (b - borderB)
                );

                // Check distance to center background color (if exists)
                let centerDist = Infinity;
                if (hasColoredBackground) {
                    centerDist = Math.sqrt(
                        (r - centerR) * (r - centerR) + 
                        (g - centerG) * (g - centerG) + 
                        (b - centerB) * (b - centerB)
                    );
                }

                // Remove if matches either border or center background
                if (borderDist < tolerance) {
                    data[i + 3] = 0;
                } else if (borderDist < tolerance + 20) {
                    const alpha = (borderDist - tolerance) / 20 * 255;
                    data[i + 3] = Math.min(255, alpha);
                } else if (centerDist < centerTolerance) {
                    data[i + 3] = 0;
                } else if (centerDist < centerTolerance + 20) {
                    const alpha = (centerDist - centerTolerance) / 20 * 255;
                    data[i + 3] = Math.min(255, alpha);
                }
            }
            
            // CRITICAL: Update the canvas with background-removed data
            ctx.putImageData(imageData, 0, 0);
        }

        // ---------------------------------------------------------
        // RECOLORING - PRESERVES LOGO DETAILS
        // ---------------------------------------------------------

        if (targetColor !== 'original') {
             // CRITICAL FIX: Get fresh imageData after background removal
             const freshImageData = ctx.getImageData(0, 0, w, h);
             const freshData = freshImageData.data;
             
             const targetRgb = hexToRgb(targetColor);
             
             for (let i = 0; i < freshData.length; i += 4) {
                 const alpha = freshData[i + 3];
                 
                 // Skip fully transparent pixels
                 if (alpha === 0) continue;
                 
                 const originalR = freshData[i];
                 const originalG = freshData[i + 1];
                 const originalB = freshData[i + 2];
                 
                 // Calculate luminance to preserve shading
                 const luminance = (0.299 * originalR + 0.587 * originalG + 0.114 * originalB) / 255;
                 
                 // Check if pixel is very close to white (RGB values)
                 const isNearWhite = originalR > 150 && originalG > 150 && originalB > 150;
                 
                 // CRITICAL: Aggressively remove light background pixels
                 if (luminance > 0.60 || alpha < 200 || isNearWhite) {
                     freshData[i + 3] = 0;
                 } else {
                     // BRIGHTNESS FIX: Boost luminance to make colors closer to chosen color
                     // Remap from [0, 0.60] to [0.5, 1.0] to brighten while preserving shading
                     const boostedLuminance = 0.5 + (luminance / 0.60) * 0.5;
                     
                     // Apply new color with boosted luminance
                     freshData[i] = Math.min(255, targetRgb.r * boostedLuminance);
                     freshData[i + 1] = Math.min(255, targetRgb.g * boostedLuminance);
                     freshData[i + 2] = Math.min(255, targetRgb.b * boostedLuminance);
                 }
             }
             
             // Put the recolored data back on canvas
             ctx.putImageData(freshImageData, 0, 0);
        }

        const finalDataUrl = canvas.toDataURL('image/png');
        resolve(finalDataUrl.split(',')[1]);
      };
      
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export const applyWatermark = async (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = base64Image;
    
    mainImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = mainImg.width;
        canvas.height = mainImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
             resolve(base64Image);
             return;
        }

        ctx.drawImage(mainImg, 0, 0);

        const watermarkImg = new Image();
        watermarkImg.crossOrigin = "anonymous";
        const watermarkUrl = 'https://vanboxelsupply.com/wp-content/uploads/2025/12/vanboxel_watermark_transparent_white.png';
        watermarkImg.src = `https://wsrv.nl/?url=${encodeURIComponent(watermarkUrl)}&output=png&w=240`;

        const drawPattern = () => {
            ctx.save();
            ctx.globalAlpha = 0.7; 
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            const w = watermarkImg.width;
            const h = watermarkImg.height;
            const stepX = w * 2.0; 
            const stepY = h * 4.3; 
            const areaSize = Math.max(canvas.width, canvas.height) * 3;
            const startPos = -areaSize / 2;
            const endPos = areaSize / 2;
            for (let y = startPos; y < endPos; y += stepY) {
                const rowIndex = Math.round((y - startPos) / stepY);
                for (let x = startPos; x < endPos; x += stepX) {
                    const offsetX = (rowIndex % 2 === 0) ? 0 : stepX / 2;
                    ctx.drawImage(watermarkImg, x + offsetX, y);
                }
            }
            ctx.restore();
            try {
                const finalData = canvas.toDataURL('image/png');
                resolve(finalData);
            } catch (e) {
                resolve(base64Image);
            }
        };

        watermarkImg.onload = drawPattern;
        watermarkImg.onerror = (e) => {
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-45 * Math.PI / 180);
            ctx.font = "bold 60px sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            const area = Math.max(canvas.width, canvas.height) * 2;
            for (let y = -area/2; y < area/2; y += 360) {
                 for (let x = -area/2; x < area/2; x += 510) {
                    ctx.fillText("VanBoxel Supply", x, y);
                 }
            }
            ctx.restore();
            resolve(canvas.toDataURL('image/png'));
        };
    };
    mainImg.onerror = (e) => reject(e);
  });
};

const CHAT_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQAOQphUIg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=ydfE1Z98t_J02pcBLtN-PEGp_L6q-Uk-u2AajLAVufA";

export const sendLeadToChat = async (email: string) => {
  try {
    await fetch(CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        text: `New VanVision Lead Captured\n---------------------------\nEmail: ${email}\nTimestamp: ${new Date().toLocaleString()}`
      })
    });
  } catch (e) {
    console.error("Failed to send lead to chat", e);
  }
};

export const sendErrorToChat = async (errorMsg: string, email: string = 'Unknown') => {
  try {
    await fetch(CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        text: `⚠️ VanVision Error Alert\n---------------------------\nUser: ${email}\nError: ${errorMsg}\nTimestamp: ${new Date().toLocaleString()}`
      })
    });
  } catch (e) {
    console.error("Failed to send error to chat", e);
  }
};

interface UploadPayload {
  mockupImage: string;
  logoImage?: string;
  email: string;
}

export const uploadImageToDrive = async (data: UploadPayload) => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2gQvHU6_MVf91q9Xu97p5Pf51FjxmSN7rHmorQtI6fVfZh0gLv6nKYCWyDdJLKupaNg/exec";
  try {
    const cleanMockup = data.mockupImage.includes(',') ? data.mockupImage.split(',')[1] : data.mockupImage;
    const cleanLogo = data.logoImage && data.logoImage.includes(',') ? data.logoImage.split(',')[1] : data.logoImage;
    const payload = { mockupImage: cleanMockup, logoImage: cleanLogo, email: data.email };
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain" },
    });
    const json = await response.json();
    if (json.status === 'error' || json.result === 'error') {
        throw new Error(json.message || "Google Script reported an error");
    }
  } catch (e) {
    console.error("Failed to upload images to Drive", e);
    throw e;
  }
};
