const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function testLocalization(imagePath, type) {
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

    const binary = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const normalized = maxMag > 0 ? (mag[i] / maxMag) * 255 : 0;
        binary[i] = normalized > 80 ? 255 : 0;
    }

    // Smear horizontally
    const smeared = new Uint8Array(w * h);
    const smearDistance = Math.round(w * 0.04);
    for (let y = 0; y < h; y++) {
        let active = 0;
        for (let x = 0; x < w; x++) {
            if (binary[y * w + x] === 255) active = smearDistance;
            if (active > 0) { smeared[y * w + x] = 255; active--; }
        }
        active = 0;
        for (let x = w - 1; x >= 0; x--) {
            if (binary[y * w + x] === 255) active = smearDistance;
            if (active > 0) { smeared[y * w + x] = 255; active--; }
        }
    }
    
    // Vertical smear to connect multi-line plates (like motorcycles)
    const smearedV = new Uint8Array(w * h);
    const smearV = Math.round(h * 0.03);
    for (let x = 0; x < w; x++) {
        let active = 0;
        for (let y = 0; y < h; y++) {
            if (smeared[y * w + x] === 255) active = smearV;
            if (active > 0) { smearedV[y * w + x] = 255; active--; }
        }
        active = 0;
        for (let y = h - 1; y >= 0; y--) {
            if (smeared[y * w + x] === 255) active = smearV;
            if (active > 0) { smearedV[y * w + x] = 255; active--; }
        }
    }

    const visited = new Uint8Array(w * h);
    const candidates = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (smearedV[y * w + x] === 255 && !visited[y * w + x]) {
                let minX = x, maxX = x, minY = y, maxY = y;
                let edgeDensitySum = 0;
                
                const stack = [x, y];
                visited[y * w + x] = 1;

                while (stack.length > 0) {
                    const cy = stack.pop();
                    const cx = stack.pop();
                    
                    edgeDensitySum += mag[cy * w + cx];
                    
                    if (cx < minX) minX = cx;
                    if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy;
                    if (cy > maxY) maxY = cy;

                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = cx + dx;
                            const ny = cy + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                if (smearedV[ny * w + nx] === 255 && !visited[ny * w + nx]) {
                                    visited[ny * w + nx] = 1;
                                    stack.push(nx, ny);
                                }
                            }
                        }
                    }
                }

                const cw = maxX - minX + 1;
                const ch = maxY - minY + 1;
                const aspectRatio = cw / ch;
                const area = cw * ch;

                if (aspectRatio >= 1.0 && aspectRatio <= 7.0 && cw >= 30 && ch >= 10 && area < (w * h * 0.40)) {
                    // Projection Profile Analysis inside the bounding box
                    const vProj = new Float32Array(cw);
                    let totalBoxEdges = 0;
                    for (let px = 0; px < cw; px++) {
                        let colSum = 0;
                        for (let py = 0; py < ch; py++) {
                            const m = mag[(minY + py) * w + (minX + px)];
                            colSum += m;
                            totalBoxEdges += m;
                        }
                        vProj[px] = colSum;
                    }
                    
                    // Count peaks
                    let peaks = 0;
                    let inPeak = false;
                    const peakThreshold = (totalBoxEdges / cw) * 0.5; // Adaptive threshold
                    for (let px = 0; px < cw; px++) {
                        if (vProj[px] > peakThreshold) {
                            if (!inPeak) { peaks++; inPeak = true; }
                        } else {
                            inPeak = false;
                        }
                    }

                    // Stroke consistency
                    const avgEdgeDensity = totalBoxEdges / area;
                    const densityScore = Math.min(avgEdgeDensity / maxMag, 1.0);
                    
                    // A typical plate has 6-10 characters (peaks). Grilles often have 1-3 or 20+ thin peaks.
                    let peakScore = 0;
                    if (peaks >= 4 && peaks <= 15) peakScore = 1.0;
                    else if (peaks >= 2 && peaks <= 20) peakScore = 0.5;
                    
                    const arScore = 1.0 - Math.abs(aspectRatio - 4.0) / 4.0;
                    const score = (densityScore * 0.4) + (peakScore * 0.4) + (arScore * 0.2);
                    
                    if (peakScore > 0) {
                        candidates.push({ x: minX, y: minY, w: cw, h: ch, score, peaks, densityScore });
                    }
                }
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    
    console.log(`\\n--- Localization on ${type.toUpperCase()} ---`);
    candidates.slice(0, 5).forEach((c, i) => {
        console.log(`Candidate ${i+1}: x=${c.x}, y=${c.y}, w=${c.w}, h=${c.h}, score=${c.score.toFixed(2)}, peaks=${c.peaks}, density=${c.densityScore.toFixed(2)}`);
    });
}

async function main() {
    await testLocalization('public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg', 'truck');
    await testLocalization('public/audit-reports/failures/1782148963034-BIVMTA/2_vehicle_crop.jpg', 'motorcycle');
}

main().catch(console.error);
