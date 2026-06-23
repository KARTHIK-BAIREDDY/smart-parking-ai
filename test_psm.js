const Tesseract = require('tesseract.js');
const path = require('path');

const imagePath = path.join(__dirname, 'public/audit-reports/failures/1782148963034-BIVMTA/4_localized_crop.jpg');

async function testPSM(psm, name) {
  const worker = await Tesseract.createWorker("eng", 1, {});
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tessedit_pageseg_mode: psm
  });

  const { data } = await worker.recognize(imagePath);
  await worker.terminate();

  const rawText = data.text.trim();
  const text = rawText.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  
  console.log(`\n--- PSM ${psm} (${name}) ---`);
  console.log(`RAW: ${rawText.replace(/\n/g, '\\n')}`);
  console.log(`NORMALIZED: ${text}`);
  console.log(`CONFIDENCE: ${Math.round(data.confidence)}%`);
}

async function run() {
  console.log("Testing Tesseract PSM modes on 4_localized_crop.jpg...");
  await testPSM(Tesseract.PSM.SINGLE_BLOCK, "SINGLE_BLOCK"); // 6
  await testPSM(Tesseract.PSM.SINGLE_LINE, "SINGLE_LINE"); // 7
  await testPSM(Tesseract.PSM.SPARSE_TEXT, "SPARSE_TEXT"); // 11
}

run();
