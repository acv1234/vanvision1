

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
        
        const dataUrl = canvas.toDataURL('image/png'); // Force PNG for alpha support
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
        // 1. Setup Canvas
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

        // Draw original image
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // ---------------------------------------------------------
        // BACKGROUND REMOVAL STRATEGY: Global Color Keying
        // ---------------------------------------------------------
        
        // 1. Check for Existing Transparency (Alpha channel usage)
        let significantTransparencyFound = false;
        let transparentPixelCount = 0;
        const sampleLimit = 1000;
        const step = Math.floor(data.length / 4 / sampleLimit) || 1;

        for (let i = 0; i < data.length; i += 4 * step) {
            if (data[i + 3] < 20) {
                transparentPixelCount++;
            }
        }
        
        // If > 5% of sampled pixels are transparent, we assume the user uploaded a valid PNG cutout.
        if (transparentPixelCount > (data.length / 4 / step) * 0.05) {
            significantTransparencyFound = true;
        }

        // If the image is opaque (like a JPEG or white-bg PNG), we remove the background.
        if (!significantTransparencyFound) {
            
            // 2. Identify Background Color from Borders
            // We sample the perimeter of the image to find the dominant color.
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            
            const addSample = (idx: number) => {
                const off = idx * 4;
                rSum += data[off];
                gSum += data[off+1];
                bSum += data[off+2];
                count++;
            };

            // Top & Bottom Rows
            for (let x = 0; x < w; x++) {
                addSample(x); // Top row
                addSample((h - 1) * w + x); // Bottom row
            }
            // Left & Right Columns
            for (let y = 0; y < h; y++) {
                addSample(y * w); // Left col
                addSample(y * w + (w - 1)); // Right col
            }

            const bgR = rSum / count;
            const bgG = gSum / count;
            const bgB = bSum / count;

            // 3. Remove Background (Global Keying)
            // This removes ALL pixels matching the background color, handling islands (like inside 'O')
            const tolerance = 60; // Tuning for JPEG artifacts
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];

                // Euclidean distance for better color matching
                const dist = Math.sqrt(
                    (r - bgR) * (r - bgR) + 
                    (g - bgG) * (g - bgG) + 
                    (b - bgB) * (b - bgB)
                );

                if (dist < tolerance) {
                    data[i + 3] = 0; // Make Transparent
                } else if (dist < tolerance + 20) {
                     // Soft edges
                     const alpha = (dist - tolerance) / 20 * 255;
                     data[i + 3] = Math.min(255, alpha);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }

        // ---------------------------------------------------------
        // RECOLORING
        // ---------------------------------------------------------

        if (targetColor !== 'original') {
             const targetRgb = hexToRgb(targetColor);
             
             // Iterate through pixels and replace RGB while preserving alpha and shading (luminance)
             for (let i = 0; i < data.length; i += 4) {
                 const alpha = data[i + 3];
                 
                 if (alpha > 0) {
                     // Calculate luminance to preserve shading
                     const originalR = data[i];
                     const originalG = data[i + 1];
                     const originalB = data[i + 2];
                     
                     // Standard perceived luminance formula
                     const luminance = (0.299 * originalR + 0.587 * originalG + 0.114 * originalB) / 255;
                     
                     // Apply target color modulated by luminance
                     data[i] = targetRgb.r * luminance;
                     data[i + 1] = targetRgb.g * luminance;
                     data[i + 2] = targetRgb.b * luminance;
                 }
             }
             
             ctx.putImageData(imageData, 0, 0);
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
