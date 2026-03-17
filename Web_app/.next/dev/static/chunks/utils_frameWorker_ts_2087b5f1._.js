(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/utils/frameWorker.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// src/utils/frameWorker.ts
let prevFrameData = null;
let offscreenCanvas = null;
let ctx = null;
// Helper to calculate difference between two pixel arrays
function hasSignificantChange(newData, oldData, width, height, threshold = 20, percentThreshold = 0.01 // what % of pixels need to change
) {
    if (newData.length !== oldData.length) return true;
    // Sample pixels to save CPU. Check every 10th pixel.
    const step = 4 * 10;
    let changedPixels = 0;
    let totalSampled = 0;
    for(let i = 0; i < newData.length; i += step){
        totalSampled++;
        const rDiff = Math.abs(newData[i] - oldData[i]);
        const gDiff = Math.abs(newData[i + 1] - oldData[i + 1]);
        const bDiff = Math.abs(newData[i + 2] - oldData[i + 2]);
        // If any channel changes more than threshold, count pixel as changed
        if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
            changedPixels++;
        }
    }
    return changedPixels / totalSampled > percentThreshold;
}
self.onmessage = async (e)=>{
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
            ctx = offscreenCanvas.getContext('2d', {
                willReadFrequently: true
            });
        } else if (offscreenCanvas.width !== drawWidth || offscreenCanvas.height !== drawHeight) {
            offscreenCanvas.width = drawWidth;
            offscreenCanvas.height = drawHeight;
            // After resize, forces new frame detection
            prevFrameData = null;
        }
        if (!ctx) return;
        ctx.drawImage(bitmap, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        // Check adaptive frame skipping logic
        const imgData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height, {
            colorSpace: 'srgb'
        });
        let isSignificant = true;
        if (prevFrameData) {
            isSignificant = hasSignificantChange(imgData.data, prevFrameData, offscreenCanvas.width, offscreenCanvas.height);
        }
        if (isSignificant) {
            prevFrameData = new Uint8ClampedArray(imgData.data);
            const blob = await offscreenCanvas.convertToBlob({
                type: 'image/jpeg',
                quality: 0.5
            });
            const reader = new FileReader();
            reader.onloadend = ()=>{
                const base64Data = reader.result.split(',')[1];
                self.postMessage({
                    base64Data,
                    type
                });
            };
            reader.readAsDataURL(blob);
        } else {
            // Return null to signify frame was skipped
            self.postMessage({
                base64Data: null,
                type,
                skipped: true
            });
        }
    } catch (err) {
        console.error("Frame worker error:", err);
    } finally{
        // Crucial: close bitmap to free memory immediately
        bitmap.close();
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=utils_frameWorker_ts_2087b5f1._.js.map