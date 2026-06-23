const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function testTesseractObjectDetection(imagePath, type) {
    const img = await loadImage(imagePath);
    const scale = 4;
    const canvas = createCanvas(img.width * scale, img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataPixels = imgData.data;
    for (let i = 0; i < dataPixels.length; i += 4) {
        const g = (dataPixels[i] + dataPixels[i+1] + dataPixels[i+2]) / 3;
        const val = g > 130 ? 255 : 0;
        dataPixels[i] = val;
        dataPixels[i+1] = val;
        dataPixels[i+2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    console.log(`Running Tesseract full-image detection on ${type}...`);
    const worker = await Tesseract.createWorker("eng", 1);
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO
    });

    const { data } = await worker.recognize(canvas.toBuffer('image/jpeg'));
    await worker.terminate();

    let bestBox = null;
    let bestText = "";
    let highestScore = 0;

    if (data.blocks) {
        for (const block of data.blocks) {
            for (const paragraph of block.paragraphs) {
                for (const line of paragraph.lines) {
                    const text = line.text.replace(/[^A-Z0-9]/gi, "");
                    let score = 0;
                    
                    if (text.length >= 5 && text.length <= 13) score += 10;
                    if (text.match(/^[A-Z]{2}/)) score += 20; // Starts with State code
                    if (text.match(/\d{4}$/)) score += 20; // Ends with 4 digits
                    if (text.includes("TN") || text.includes("KA")) score += 30; // Known states

                    if (score > highestScore && text.length > 3) {
                        highestScore = score;
                        bestText = text;
                        bestBox = {
                            x: line.bbox.x0 / scale,
                            y: line.bbox.y0 / scale,
                            w: (line.bbox.x1 - line.bbox.x0) / scale,
                            h: (line.bbox.y1 - line.bbox.y0) / scale
                        };
                    }
                }
            }
        }
    }

    if (bestBox) {
        console.log(`FOUND PLATE OBJECT:`, bestBox, `Text:`, bestText, `Score:`, highestScore);
    } else {
        console.log(`NO PLATE OBJECT FOUND.`);
    }
}

async function main() {
    await testTesseractObjectDetection('public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg', 'truck');
    await testTesseractObjectDetection('public/audit-reports/failures/1782148963034-BIVMTA/2_vehicle_crop.jpg', 'motorcycle');
}

main().catch(console.error);
