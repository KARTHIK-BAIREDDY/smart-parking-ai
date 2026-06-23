import Tesseract from 'tesseract.js';

export interface ProcessedImage {
  name: string;
  src: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cvScore?: number;
  cvPeaks?: number;
  cvDensity?: number;
}

export interface OcrTelemetry {
  vehicleType?: string;
  startTime: number;
  steps: {
    name: string;
    duration: number;
    success: boolean;
    details: string;
  }[];
  refinedPlateROI?: number[];
  initialPlateROI?: number[];
  candidateROIs?: number[][];
  deskewAngle?: number;
}

function calculatePixelStats(src: string): Promise<{width: number, height: number, avgBrightness: number, minPixel: number, maxPixel: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({width: 0, height: 0, avgBrightness: 0, minPixel: 0, maxPixel: 0});
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      let min = 255;
      let max = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        const v = imgData.data[i];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      resolve({
        width: img.width,
        height: img.height,
        avgBrightness: Math.round(sum / (img.width * img.height)),
        minPixel: Math.round(min),
        maxPixel: Math.round(max)
      });
    };
    img.src = src;
  });
}

function generateCandidates(vehicleImageData: ImageData): any[] {
  const w = vehicleImageData.width;
  const h = vehicleImageData.height;
  const data = vehicleImageData.data;

  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  }

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

  for (let i = 0; i < w * h; i++) {
    mag[i] = maxMag > 0 ? (mag[i] / maxMag) : 0;
  }

  const candidates: any[] = [];
  
  const windowSizes = [
    { w: Math.round(w * 0.4), h: Math.round(h * 0.15) },
    { w: Math.round(w * 0.6), h: Math.round(h * 0.15) },
    { w: Math.round(w * 0.5), h: Math.round(h * 0.25) },
    { w: Math.round(w * 0.4), h: Math.round(h * 0.30) },
  ];

  const stepX = Math.round(w * 0.05);
  const stepY = Math.round(h * 0.05);

  for (const size of windowSizes) {
    if (size.w < 30 || size.h < 15) continue;
    
    const startY = Math.round(h * 0.15); 
    
    for (let y = startY; y <= h - size.h; y += stepY) {
      for (let x = 0; x <= w - size.w; x += stepX) {
        let totalEdges = 0;
        const vProj = new Float32Array(size.w);
        
        for (let px = 0; px < size.w; px++) {
          let colSum = 0;
          for (let py = 0; py < size.h; py++) {
            const m = mag[(y + py) * w + (x + px)];
            if (m > 0.2) {
              colSum += m;
              totalEdges += m;
            }
          }
          vProj[px] = colSum;
        }

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
          let firstPx = 0;
          while (firstPx < size.w && vProj[firstPx] < peakThreshold * 0.5) firstPx++;
          let lastPx = size.w - 1;
          while (lastPx >= 0 && vProj[lastPx] < peakThreshold * 0.5) lastPx--;
          
          if (lastPx > firstPx + 10) {
            const tightX = x + firstPx;
            const tightW = lastPx - firstPx + 1;
            
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

  candidates.sort((a, b) => b.score - a.score);
  const finalCandidates: any[] = [];
  
  for (const c of candidates) {
    let overlap = false;
    for (const fc of finalCandidates) {
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

  return finalCandidates.slice(0, 3);
}

export async function preprocessImage(
  imageSrc: string,
  detection: [number, number, number, number],
  originalDimensions?: { width: number; height: number },
  vehicleType?: string
) {
  const ocrTelemetry: OcrTelemetry = {
    vehicleType: vehicleType,
    startTime: Date.now(),
    steps: []
  };

  const canvas = document.createElement("canvas");
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSrc;
  });

  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");
  ctx.drawImage(img, 0, 0);

  const vx = Math.max(0, Math.floor(detection[0]));
  const vy = Math.max(0, Math.floor(detection[1]));
  const vw = Math.min(canvas.width - vx, Math.floor(detection[2]));
  const vh = Math.min(canvas.height - vy, Math.floor(detection[3]));

  const originalCrop: ProcessedImage = {
    name: "Original",
    src: canvas.toDataURL("image/jpeg"),
    x: vx,
    y: vy,
    w: vw,
    h: vh
  };

  const vehicleCanvas = document.createElement("canvas");
  vehicleCanvas.width = vw;
  vehicleCanvas.height = vh;
  const vCtx = vehicleCanvas.getContext("2d");
  if (!vCtx) throw new Error("Could not get vehicle canvas context");

  vCtx.drawImage(
    canvas,
    vx, vy, vw, vh,
    0, 0, vw, vh
  );

  const vehicleImageData = vCtx.getImageData(0, 0, vw, vh);
  
  const startTime = performance.now();
  const cvCandidates = generateCandidates(vehicleImageData);
  
  ocrTelemetry.candidateROIs = cvCandidates.map(c => [vx + c.x, vy + c.y, c.w, c.h, c.score, c.peaks, c.density]);
  
  ocrTelemetry.steps.push({
    name: "CV Candidate Generation",
    duration: performance.now() - startTime,
    success: cvCandidates.length > 0,
    details: `Generated ${cvCandidates.length} potential plate regions via CV projection analysis`
  });

  const candidatesData: ProcessedImage[] = [];

  for (let i = 0; i < cvCandidates.length; i++) {
    const candidate = cvCandidates[i];
    const px = Math.floor(candidate.x);
    const py = Math.floor(candidate.y);
    const pw = Math.floor(candidate.w);
    const ph = Math.floor(candidate.h);

    const plateCanvas = document.createElement("canvas");
    plateCanvas.width = pw;
    plateCanvas.height = ph;
    const pCtx = plateCanvas.getContext("2d");
    if (!pCtx) continue;

    pCtx.drawImage(
      vehicleCanvas,
      px, py, pw, ph,
      0, 0, pw, ph
    );

    const scale = 12;
    const scaleCanvas = document.createElement("canvas");
    scaleCanvas.width = pw * scale;
    scaleCanvas.height = ph * scale;
    const sCtx = scaleCanvas.getContext("2d");
    if (!sCtx) continue;
    sCtx.imageSmoothingEnabled = false;
    sCtx.drawImage(plateCanvas, 0, 0, scaleCanvas.width, scaleCanvas.height);

    const imgData = sCtx.getImageData(0, 0, scaleCanvas.width, scaleCanvas.height);
    const data = imgData.data;

    for (let j = 0; j < data.length; j += 4) {
      const r = data[j];
      const g = data[j + 1];
      const b = data[j + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const val = gray > 140 ? 255 : 0;
      data[j] = val;
      data[j + 1] = val;
      data[j + 2] = val;
    }
    sCtx.putImageData(imgData, 0, 0);
    
    const sharpenData = sCtx.getImageData(0, 0, scaleCanvas.width, scaleCanvas.height);
    const sd = sharpenData.data;
    const sw = scaleCanvas.width;
    const sh = scaleCanvas.height;
    for (let sy = 1; sy < sh - 1; sy++) {
      for (let sx = 1; sx < sw - 1; sx++) {
        const idx = (sy * sw + sx) * 4;
        const val = 5 * sd[idx] - sd[idx - 4] - sd[idx + 4] - sd[idx - sw * 4] - sd[idx + sw * 4];
        const v = Math.min(255, Math.max(0, val));
        sd[idx] = v; sd[idx+1] = v; sd[idx+2] = v;
      }
    }
    sCtx.putImageData(sharpenData, 0, 0);

    candidatesData.push({
      name: `Candidate ${i+1}`,
      src: scaleCanvas.toDataURL("image/jpeg", 0.95),
      x: vx + px,
      y: vy + py,
      w: pw,
      h: ph,
      cvScore: candidate.score,
      cvPeaks: candidate.peaks,
      cvDensity: candidate.density
    });
  }

  return { 
    passes: [originalCrop, ...candidatesData], 
    originalCrop, 
    plateCrop: originalCrop, 
    plateRectLog: { x: vx, y: vy, w: vw, h: vh },
    telemetry: ocrTelemetry
  };
}

export async function runMultiPassOCR(
  imageSrc: string,
  vehicleBox: [number, number, number, number],
  originalDimensions?: { width: number; height: number },
  vehicleType?: string
): Promise<{ 
  text: string; 
  confidence: number; 
  debugLog: string[]; 
  previews: ProcessedImage[];
  boxes?: {
    initialPlateROI?: number[],
    refinedPlateROI?: number[],
    candidateROIs?: number[][],
    deskewAngle?: number
  }
} | null> {
  const debugLog: string[] = [];

  console.log("OCR Started");
  console.log("Vehicle Box:", vehicleBox);

  try {
    const { passes, originalCrop, telemetry } = await preprocessImage(
      imageSrc, 
      vehicleBox, 
      originalDimensions,
      vehicleType
    );
    debugLog.push(JSON.stringify(vehicleBox));

    if (passes.length === 0) {
      debugLog.push("Failed to generate CV candidates.");
      return { 
        text: "", 
        confidence: 0, 
        debugLog, 
        previews: [originalCrop],
        boxes: telemetry
      };
    }

    const ocrResult = await executeOCR(passes, debugLog);
    const bestResult = ocrResult?.bestResult || null;

    if (!bestResult) {
      debugLog.push("All OCR candidates failed.");
      return { 
        text: "", 
        confidence: 0, 
        debugLog, 
        previews: [originalCrop, ...passes],
        boxes: telemetry
      };
    }

    const winningPass = passes.find(p => p.name === bestResult.name);
    if (winningPass) {
      telemetry.refinedPlateROI = [winningPass.x!, winningPass.y!, winningPass.w!, winningPass.h!];
    }
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      debugLog,
      previews: [originalCrop, ...passes],
      boxes: telemetry
    };
  } catch (error: any) {
    console.error("OCR Pipeline Error:", error);
    debugLog.push(`Error: ${error.message}`);
    return { 
      text: "", 
      confidence: 0, 
      debugLog, 
      previews: [],
      boxes: undefined
    };
  }
}

export async function executeOCR(passes: ProcessedImage[], debugLog: string[]): Promise<{
  bestResult: { text: string; confidence: number; name: string; isValidFormat?: boolean } | null;
  allResults: { name: string; text: string; rawText: string; confidence: number }[];
} | null> {
  console.log("OCR_START");
  let bestResult: { text: string; confidence: number; name: string; isValidFormat?: boolean } | null = null;
  const allResults: { name: string; text: string; rawText: string; confidence: number }[] = [];
  const indianPlateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

  try {
    const workerRes = await fetch("/tesseract/worker.min.js");
    if (!workerRes.ok) throw new Error("OCR worker file missing");
  } catch (e: any) {
    throw new Error(`Local Tesseract asset missing: ${e.message}`);
  }

  for (const pass of passes) {
    debugLog.push(`--- Evaluating ${pass.name} ---`);
    debugLog.push(`CV Score: ${pass.cvScore?.toFixed(2)} (Peaks: ${pass.cvPeaks})`);
    
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      
      const worker = await Tesseract.createWorker("eng", 1, {
        workerPath: `${origin}/tesseract/worker.min.js`,
        corePath: `${origin}/tesseract`,
        langPath: `${origin}/tesseract`
      });
      
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
      });

      const { data } = await worker.recognize(pass.src);
      await worker.terminate();

      const rawText = data.text.trim();
      const text = rawText.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const conf = data.confidence;

      debugLog.push(`OCR Result: "${text}" - Conf: ${Math.round(conf)}%`);

      if (!text || text.length < 3) {
        debugLog.push(`Rejected: Text too short`);
        continue;
      }

      const matchesRegex = indianPlateRegex.test(text);
      
      let ocrScore = conf;
      if (matchesRegex) ocrScore += 50; 
      ocrScore += text.length * 2; 
      
      const combinedScore = (pass.cvScore! * 20) + ocrScore;

      let currentBestScore = 0;
      if (bestResult) {
         currentBestScore = bestResult.confidence; 
      }

      if (combinedScore > currentBestScore) {
          bestResult = { text, confidence: combinedScore, name: pass.name, isValidFormat: matchesRegex };
          debugLog.push(`New Winner! Score: ${Math.round(combinedScore)}`);
      }

      allResults.push({ name: pass.name, text, rawText, confidence: conf });
    } catch (e: any) {
      debugLog.push(`Error in ${pass.name}: ${e.message}`);
    }
  }

  if (bestResult) {
      const actualResult = allResults.find(r => r.name === bestResult!.name);
      if (actualResult) {
          bestResult.confidence = actualResult.confidence;
      }
  }

  console.log("OCR_COMPLETE");
  return { bestResult, allResults };
}
