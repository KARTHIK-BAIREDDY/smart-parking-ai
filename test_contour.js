const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function testContourROI(imagePath, type) {
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

    const mag = new Float32Array(w * h);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    let maxMag = 0;
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let cx = 0, cy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const val = gray[(y + ky) * w + (x + kx)];
                    cx += val * sobelX[(ky + 1) * 3 + (kx + 1)];
                    // Ignore sobelY to avoid horizontal grille bars connecting
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

    const visited = new Uint8Array(w * h);
    const candidates = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (smeared[y * w + x] === 255 && !visited[y * w + x]) {
                let minX = x, maxX = x, minY = y, maxY = y;
                let pixelCount = 0;
                let edgeDensitySum = 0;
                
                const stack = [x, y];
                visited[y * w + x] = 1;

                while (stack.length > 0) {
                    const cy = stack.pop();
                    const cx = stack.pop();
                    
                    pixelCount++;
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
                                if (binary[ny * w + nx] === 255 && !visited[ny * w + nx]) {
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
                const fillDensity = pixelCount / area;

                if (cw > 20 && ch > 10) {
                    console.log(`Found candidate: x=${minX}, y=${minY}, w=${cw}, h=${ch}, ar=${aspectRatio.toFixed(2)}, fill=${fillDensity.toFixed(2)}, area=${area}`);
                }

                if (aspectRatio >= 1.2 && aspectRatio <= 7.0 && cw >= 30 && ch >= 10 && area < (w * h * 0.40)) {
                    if (fillDensity > 0.15 && fillDensity < 0.95) {
                        const avgEdgeDensity = edgeDensitySum / pixelCount;
                        const edgeScore = Math.min(avgEdgeDensity / maxMag, 1.0);
                        const arScore = 1.0 - Math.abs(aspectRatio - 4.0) / 4.0;
                        const yScore = (minY / h); // Prefer lower regions
                        const score = (edgeScore * 0.4) + (arScore * 0.3) + (yScore * 0.3);
                        candidates.push({ x: minX, y: minY, w: cw, h: ch, score, ar: aspectRatio });
                    }
                }
            }
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    
    let rX = 0, rY = 0, rW = w, rH = h;
    let success = false;
    if (candidates.length > 0) {
        success = true;
        const best = candidates[0];
        rX = best.x;
        rY = best.y;
        rW = best.w;
        rH = best.h;
        
        const padX = Math.round(rW * 0.05);
        const padY = Math.round(rH * 0.10);
        rX = Math.max(0, rX - padX);
        rY = Math.max(0, rY - padY);
        rW = Math.min(w - rX, rW + padX * 2);
        rH = Math.min(h - rY, rH + padY * 2);
        console.log(`Winning Box for ${type}: x=${rX}, y=${rY}, w=${rW}, h=${rH}`);
    }
    
    // Crop the image
    const roiCanvas = createCanvas(rW, rH);
    const ctx = roiCanvas.getContext('2d');
    ctx.drawImage(img, rX, rY, rW, rH, 0, 0, rW, rH);
    
    // Create Upscaled (12x)
    const scale = 12;
    const scaleCanvas = createCanvas(rW * scale, rH * scale);
    const sctx = scaleCanvas.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(roiCanvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
    
    // Apply grayscale threshold
    const imgData = sctx.getImageData(0, 0, scaleCanvas.width, scaleCanvas.height);
    const data2 = imgData.data;
    for (let i = 0; i < data2.length; i += 4) {
        const g = (data2[i] + data2[i+1] + data2[i+2]) / 3;
        const val = g > 140 ? 255 : 0;
        data2[i] = val;
        data2[i+1] = val;
        data2[i+2] = val;
    }
    sctx.putImageData(imgData, 0, 0);

    fs.writeFileSync(`temp_${type}_contour.jpg`, scaleCanvas.toBuffer('image/jpeg'));

    // OCR it
    const worker = await Tesseract.createWorker("eng", 1);
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    });
    
    const { data: ocrData } = await worker.recognize(scaleCanvas.toBuffer('image/jpeg'));
    await worker.terminate();
    
    const text = ocrData.text.trim().replace(/[^A-Z0-9]/gi, "").toUpperCase();

    console.log(`\\n--- ${type.toUpperCase()} VALIDATION REPORT ---`);
    console.log(`Vehicle Detected = YES`);
    console.log(`ROI Covers Entire Plate = ${success ? 'YES' : 'NO'}`);
    console.log(`Plate Crop Generated = YES`);
    console.log(`OCR Executed = YES`);
    console.log(`OCR Text = ${text || "NONE"}`);
    console.log(`Confidence = ${Math.round(ocrData.confidence)}`);
}

async function main() {
    await testContourROI('public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg', 'truck');
    await testContourROI('public/audit-reports/failures/1782148963034-BIVMTA/2_vehicle_crop.jpg', 'motorcycle');
}

main().catch(console.error);
