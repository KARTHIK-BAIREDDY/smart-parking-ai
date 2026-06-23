const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');

async function testTesseractDetection(imagePath, type) {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataPixels = imgData.data;
    for (let i = 0; i < dataPixels.length; i += 4) {
        const g = (dataPixels[i] + dataPixels[i+1] + dataPixels[i+2]) / 3;
        const val = g > 140 ? 255 : 0;
        dataPixels[i] = val;
        dataPixels[i+1] = val;
        dataPixels[i+2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    console.log(`Running Tesseract object detection on ${type}...`);
    const worker = await Tesseract.createWorker("eng", 1);
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO
    });
    
    const { data } = await worker.recognize(canvas.toBuffer('image/jpeg'));
    await worker.terminate();

    let bestBox = null;
    let bestText = "";
    
    if (data.blocks) {
        for (const block of data.blocks) {
            for (const paragraph of block.paragraphs) {
                for (const line of paragraph.lines) {
                    for (const word of line.words) {
                        const text = word.text.replace(/[^A-Z0-9]/gi, "");
                        if (text.length >= 4) {
                             console.log(`Found candidate text: ${text} at`, word.bbox);
                             if (text.length > bestText.length) {
                                 bestText = text;
                                 bestBox = word.bbox;
                             }
                        }
                    }
                }
            }
        }
    }

    if (bestBox) {
        console.log(`Best Plate Box:`, bestBox, `Text:`, bestText);
    } else {
        console.log(`No plate found.`);
    }
}

async function main() {
    await testTesseractDetection('public/audit-reports/failures/1782131999912-CV947528/2_vehicle_crop.jpg', 'truck');
    await testTesseractDetection('public/audit-reports/failures/1782148963034-BIVMTA/2_vehicle_crop.jpg', 'motorcycle');
}

main().catch(console.error);
