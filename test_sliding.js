const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function testSlidingWindow(imagePath, type) {
    const img = await loadImage(imagePath);
    const w = img.width;
    const h = img.height;
    
    const vCanvas = createCanvas(w, h);
    const vCtx = vCanvas.getContext('2d');
    vCtx.drawImage(img, 0, 0, w, h);
    
    const roiImageData = vCtx.getImageData(0, 0, w, h);
    const data = roiImageData.data;

    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    }

    // Vertical Sobel
    const mag = new Float32Array(w * h);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    let maxMag = 0;
    
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let cx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const val = gray[(y + ky) * w + (x + kx)];
                    cx += val * sobelX[(ky + 1) * 3 + (kx + 1)];
                }
            }
            const m = Math.abs(cx);
            mag[y * w + x] = m;
            if (m > maxMag) maxMag = m;
        }
    }

    // Normalize magnitude
    for (let i = 0; i < w * h; i++) {
        mag[i] = maxMag > 0 ? (mag[i] / maxMag) : 0;
    }

    const candidates = [];
    
    // Standard plate aspect ratios and relative sizes
    // Motorcycle plates are more square (1.5 - 2.5 AR), car/truck plates are wider (3.0 - 5.0 AR)
    const windowSizes = [
        { w: Math.round(w * 0.4), h: Math.round(h * 0.15) }, // Wide car plate
        { w: Math.round(w * 0.6), h: Math.round(h * 0.15) }, // Very wide car plate
        { w: Math.round(w * 0.5), h: Math.round(h * 0.25) }, // Square motorcycle plate
        { w: Math.round(w * 0.4), h: Math.round(h * 0.30) }, // Square motorcycle plate
    ];

    const stepX = Math.round(w * 0.05);
    const stepY = Math.round(h * 0.05);

    for (const size of windowSizes) {
        if (size.w < 30 || size.h < 15) continue;
        
        // Scan the lower 70% of the image
        const startY = Math.round(h * 0.3);
        
        for (let y = startY; y <= h - size.h; y += stepY) {
            for (let x = 0; x <= w - size.w; x += stepX) {
                
                // Calculate properties for this window
                let totalEdges = 0;
                const vProj = new Float32Array(size.w);
                
                for (let px = 0; px < size.w; px++) {
                    let colSum = 0;
                    for (let py = 0; py < size.h; py++) {
                        const m = mag[(y + py) * w + (x + px)];
                        if (m > 0.2) { // Threshold weak noise
                            colSum += m;
                            totalEdges += m;
                        }
                    }
                    vProj[px] = colSum;
                }

                // Stroke consistency (Peak counting)
                let peaks = 0;
                let inPeak = false;
                const peakThreshold = (totalEdges / size.w) * 0.5; 
                
                for (let px = 0; px < size.w; px++) {
                    if (vProj[px] > peakThreshold) {
                        if (!inPeak) { peaks++; inPeak = true; }
                    } else {
                        inPeak = false;
                    }
                }

                const density = totalEdges / (size.w * size.h);
                
                let peakScore = 0;
                if (peaks >= 4 && peaks <= 12) peakScore = 1.0;
                else if (peaks >= 2 && peaks <= 16) peakScore = 0.5;
                
                const score = (density * 5.0) + peakScore;

                if (density > 0.02 && peakScore > 0) {
                    // Tighten the bounding box around the actual peaks
                    let firstPx = 0;
                    while (firstPx < size.w && vProj[firstPx] < peakThreshold * 0.5) firstPx++;
                    let lastPx = size.w - 1;
                    while (lastPx >= 0 && vProj[lastPx] < peakThreshold * 0.5) lastPx--;
                    
                    if (lastPx > firstPx + 10) {
                        const tightX = x + firstPx;
                        const tightW = lastPx - firstPx + 1;
                        
                        // Horizontal projection within tight X to find tight Y
                        const hProj = new Float32Array(size.h);
                        let totalHT = 0;
                        for (let py = 0; py < size.h; py++) {
                            let rowSum = 0;
                            for (let px = firstPx; px <= lastPx; px++) {
                                rowSum += mag[(y + py) * w + (x + px)];
                            }
                            hProj[py] = rowSum;
                            totalHT += rowSum;
                        }
                        
                        const hThreshold = (totalHT / size.h) * 0.5;
                        let firstPy = 0;
                        while (firstPy < size.h && hProj[firstPy] < hThreshold) firstPy++;
                        let lastPy = size.h - 1;
                        while (lastPy >= 0 && hProj[lastPy] < hThreshold) lastPy--;
                        
                        if (lastPy > firstPy + 5) {
                            const tightY = y + firstPy;
                            const tightH = lastPy - firstPy + 1;
                            
                            // Add a small 10% pad for safety
                            const padX = Math.round(tightW * 0.1);
                            const padY = Math.round(tightH * 0.2);
                            const finalX = Math.max(0, tightX - padX);
                            const finalY = Math.max(0, tightY - padY);
                            const finalW = Math.min(w - finalX, tightW + padX * 2);
                            const finalH = Math.min(h - finalY, tightH + padY * 2);

                            candidates.push({ x: finalX, y: finalY, w: finalW, h: finalH, score, peaks, density });
                        }
                    }
                }
            }
        }
    }

    // Sort and apply Non-Maximum Suppression (NMS)
    candidates.sort((a, b) => b.score - a.score);
    const finalCandidates = [];
    
    for (const c of candidates) {
        let overlap = false;
        for (const fc of finalCandidates) {
            // Compute IoU
            const ix = Math.max(c.x, fc.x);
            const iy = Math.max(c.y, fc.y);
            const iw = Math.min(c.x + c.w, fc.x + fc.w) - ix;
            const ih = Math.min(c.y + c.h, fc.y + fc.h) - iy;
            
            if (iw > 0 && ih > 0) {
                const intersection = iw * ih;
                const union = (c.w * c.h) + (fc.w * fc.h) - intersection;
                if (intersection / union > 0.3) {
                    overlap = true;
                    break;
                }
            }
        }
        if (!overlap) {
            finalCandidates.push(c);
        }
    }

    console.log(`\\n--- Localization on ${type.toUpperCase()} ---`);
    finalCandidates.slice(0, 5).forEach((c, i) => {
        console.log(`Candidate ${i+1}: x=${c.x}, y=${c.y}, w=${c.w}, h=${c.h}, score=${c.score.toFixed(2)}, peaks=${c.peaks}, density=${c.density.toFixed(3)}`);
    });
}

async function main() {
    await testSlidingWindow('public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg', 'truck');
    await testSlidingWindow('public/audit-reports/failures/1782148963034-BIVMTA/2_vehicle_crop.jpg', 'motorcycle');
}

main().catch(console.error);
