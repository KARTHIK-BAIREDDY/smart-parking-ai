const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const vehicleImagePath = 'public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg';

async function main() {
    const img = await loadImage(vehicleImagePath);
    const vw = img.width;
    const vh = img.height;
    
    // Truck math
    let px = vw * 0.25;
    let py = vh * 0.78;
    let pw = vw * 0.50;
    let ph = vh * 0.12;

    if (pw / ph < 3.0) {
        ph = pw / 3.0;
    }

    if (ph > vh * 0.20) {
        ph = vh * 0.20;
    }
    
    console.log("Vehicle Box coordinates:");
    console.log(`vw: ${vw}, vh: ${vh}`);
    console.log("\\nROI coordinates:");
    console.log(`px: ${Math.round(px)}, py: ${Math.round(py)}, pw: ${Math.round(pw)}, ph: ${Math.round(ph)}`);
    console.log(`\\nROI width/height ratio: ${(pw / ph).toFixed(2)}`);
    
    // Crop the image
    const roiCanvas = createCanvas(pw, ph);
    const ctx = roiCanvas.getContext('2d');
    ctx.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
    
    // Create Upscaled (12x)
    const scale = 12;
    const scaleCanvas = createCanvas(pw * scale, ph * scale);
    const sctx = scaleCanvas.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(roiCanvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
    
    // OCR it
    const worker = await Tesseract.createWorker("eng", 1);
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    });
    
    const buffer = scaleCanvas.toBuffer('image/jpeg');
    fs.writeFileSync('temp_truck_roi.jpg', buffer);
    
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    
    console.log(`\\nOCR result: ${data.text.trim().replace(/[^A-Z0-9]/gi, "").toUpperCase()}`);
}

main().catch(console.error);
