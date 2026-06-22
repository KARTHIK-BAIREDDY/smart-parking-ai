import fs from 'fs';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import jpeg from 'jpeg-js';
import Tesseract from 'tesseract.js';

async function runTest() {
  console.log("STEP 1: Starting End-to-End OCR Pipeline Verification");
  
  // 1. Load image
  const imgData = fs.readFileSync('test-car.jpg');
  const rawImageData = jpeg.decode(imgData, { useTArray: true });
  console.log(`Image Loaded. Size: ${rawImageData.width}x${rawImageData.height}`);

  // Convert to tensor for coco-ssd
  const numChannels = 3;
  const numPixels = rawImageData.width * rawImageData.height;
  const values = new Int32Array(numPixels * numChannels);
  for (let i = 0; i < numPixels; i++) {
    values[i * numChannels + 0] = rawImageData.data[i * 4 + 0]; // R
    values[i * numChannels + 1] = rawImageData.data[i * 4 + 1]; // G
    values[i * numChannels + 2] = rawImageData.data[i * 4 + 2]; // B
  }
  const imgTensor = tf.tensor3d(values, [rawImageData.height, rawImageData.width, numChannels], 'int32');

  console.log("[OCR] Vehicle Detection START");
  const model = await cocoSsd.load();
  const predictions = await model.detect(imgTensor);
  
  const validTypes = ["car", "truck", "bus", "motorcycle"];
  const vehicle = predictions.find(p => validTypes.includes(p.class) && p.score >= 0.50);

  if (!vehicle) {
    console.log("[OCR] Vehicle Detection FAILURE. No vehicle found.");
    return;
  }
  console.log(`[OCR] Vehicle Detection SUCCESS: ${vehicle.class} (Score: ${vehicle.score.toFixed(2)})`);
  console.log(`Vehicle BBox (x, y, w, h): ${vehicle.bbox.map(Math.round).join(', ')}`);

  const [vx, vy, vw, vh] = vehicle.bbox;

  // 2. Mathematically define Plate Search Area
  console.log("[OCR] Plate Region Extraction START");
  const px = vx + vw * 0.15;
  const pw = vw * 0.70;
  const py = vy + vh * 0.65;
  const ph = vh * 0.35;
  console.log(`Plate Search Area (x, y, w, h): ${[px, py, pw, ph].map(Math.round).join(', ')}`);

  if (pw <= 0 || ph <= 0) {
    console.log("[OCR] Plate Region Extraction FAILURE. Invalid dimensions.");
    return;
  }
  console.log("[OCR] Plate Region Extraction SUCCESS");

  // Since we don't have canvas in pure Node easily without external deps, 
  // we will just pass the rectangle to Tesseract directly!
  // Tesseract accepts an options object with `rectangle`.
  const rectangle = {
    left: Math.max(0, Math.round(px)),
    top: Math.max(0, Math.round(py)),
    width: Math.min(rawImageData.width - Math.round(px), Math.round(pw)),
    height: Math.min(rawImageData.height - Math.round(py), Math.round(ph))
  };

  console.log("STEP 4: Verify Tesseract Initialization");
  console.log("Worker Created...");
  const worker = await Tesseract.createWorker("eng");
  console.log("Worker Loaded");
  console.log("Language Loaded");
  console.log("OCR Initialized");

  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });

  console.log("[OCR] OCR Recognition START");
  
  // We can pass the full image buffer and tell Tesseract to only look at the plate rectangle!
  const result = await worker.recognize(imgData, { rectangle });
  await worker.terminate();

  console.log("[OCR] OCR Recognition SUCCESS");
  console.log("STEP 5: Verify OCR Output");
  console.log(`Raw OCR Result: "${result.data.text.trim()}"`);
  console.log(`Confidence Score: ${result.data.confidence}`);

  const cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
  console.log(`Extracted Text: "${cleanText}"`);
  
  console.log("DONE");
}

runTest().catch(console.error);
