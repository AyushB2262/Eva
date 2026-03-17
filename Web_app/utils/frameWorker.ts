// src/utils/frameWorker.ts
let prevFrameData: Uint8ClampedArray | null = null;
let offscreenCanvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

// Helper to calculate difference between two pixel arrays
function hasSignificantChange(
    newData: Uint8ClampedArray,
    oldData: Uint8ClampedArray,
    width: number,
    height: number,
    threshold: number = 20, // difference in rgb values
    percentThreshold: number = 0.01 // what % of pixels need to change
): boolean {
    if (newData.length !== oldData.length) return true;

    // Sample pixels to save CPU. Check every 10th pixel.
    const step = 4 * 10;
    let changedPixels = 0;
    let totalSampled = 0;

    for (let i = 0; i < newData.length; i += step) {
        totalSampled++;
        const rDiff = Math.abs(newData[i] - oldData[i]);
        const gDiff = Math.abs(newData[i + 1] - oldData[i + 1]);
        const bDiff = Math.abs(newData[i + 2] - oldData[i + 2]);

        // If any channel changes more than threshold, count pixel as changed
        if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
            changedPixels++;
        }
    }

    return (changedPixels / totalSampled) > percentThreshold;
}

self.onmessage = async (e) => {
    const { bitmap, type } = e.data;

    if (!bitmap) return;

    try {
        let drawWidth = bitmap.width;
        let drawHeight = bitmap.height;

        // Strict resolution constraint (max 1080p) to keep payloads small
        if (drawWidth > 1920 || drawHeight > 1080) {
            const ratio = Math.min(1920 / drawWidth, 1080 / drawHeight);
            drawWidth = Math.floor(drawWidth * ratio);
            drawHeight = Math.floor(drawHeight * ratio);
        }

        if (!offscreenCanvas) {
            offscreenCanvas = new OffscreenCanvas(drawWidth, drawHeight);
            ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
        } else if (offscreenCanvas.width !== drawWidth || offscreenCanvas.height !== drawHeight) {
            offscreenCanvas.width = drawWidth;
            offscreenCanvas.height = drawHeight;
            // After resize, forces new frame detection
            prevFrameData = null;
        }

        if (!ctx) return;

        ctx.drawImage(bitmap, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        // Check adaptive frame skipping logic
        const imgData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height, { colorSpace: 'srgb' });

        let isSignificant = true;
        if (prevFrameData) {
            isSignificant = hasSignificantChange(imgData.data, prevFrameData, offscreenCanvas.width, offscreenCanvas.height);
        }

        if (isSignificant) {
            prevFrameData = new Uint8ClampedArray(imgData.data);

            const blob = await offscreenCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                self.postMessage({ base64Data, type });
            };
            reader.readAsDataURL(blob);
        } else {
            // Return null to signify frame was skipped
            self.postMessage({ base64Data: null, type, skipped: true });
        }
    } catch (err) {
        console.error("Frame worker error:", err);
    } finally {
        // Crucial: close bitmap to free memory immediately
        bitmap.close();
    }
};
