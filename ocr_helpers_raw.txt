export const EXPERIMENTAL_FEATURES = false;

console.log("ANPR_BUNDLE_LOADED_V2");
const YOLO_CONFIDENCE_THRESHOLD = 0.15;
const YOLO_INPUT_SIZE = 640;

import Tesseract from "tesseract.js";

interface ProcessedImage {
  src: string;
  name: string;
  roi?: [number, number, number, number];
  width?: number;
  height?: number;
}

function refinePlateCrop(imgData: ImageData, vehicleYLimit: number, basePy: number) {
  const w = imgData.width;
  const h = imgData.height;
  const data = imgData.data;

  // 1. Grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  }

  // 2. Sobel X and Y magnitude
  const mag = new Float32Array(w * h);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let px = 0, py = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * w + (x + kx)];
          px += val * sobelX[(ky + 1) * 3 + (kx + 1)];
          py += val * sobelY[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const m = Math.sqrt(px * px + py * py);
      mag[y * w + x] = m;
      if (m > maxMag) maxMag = m;
    }
  }

  // 3. Threshold > 80
  const binary = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const normalized = maxMag > 0 ? (mag[i] / maxMag) * 255 : 0;
    binary[i] = normalized > 80 ? 255 : 0;
  }

  // 4. Find connected white regions & compute bounding rectangle
  const visited = new Uint8Array(w * h);
  
  interface Candidate {
    x: number; y: number; w: number; h: number;
    centerY: number;
    aspectRatio: number;
    fillDensity: number;
    area: number;
    score: number;
    accepted: boolean;
    rejectionReason: string;
  }
  
  const candidates: Candidate[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (binary[y * w + x] === 255 && !visited[y * w + x]) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        
        const stack = [x, y];
        visited[y * w + x] = 1;

        while (stack.length > 0) {
          const cy = stack.pop()!;
          const cx = stack.pop()!;
          count++;
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

        const rw = maxX - minX + 1;
        const rh = maxY - minY + 1;
        const aspectRatio = rw / rh;
        const area = rw * rh;
        const fillDensity = count / area;
        const centerY = minY + rh / 2;
        const absoluteY = basePy + minY;

        const candidate: Candidate = {
          x: minX, y: minY, w: rw, h: rh,
          centerY, aspectRatio, fillDensity, area,
          score: 0, accepted: false, rejectionReason: ""
        };

        // STAGE 1 - Strict Filtration
        if (rw < 80) {
          candidate.rejectionReason = `width < 80 (${rw})`;
        } else if (rh < 20) {
          candidate.rejectionReason = `height < 20 (${rh})`;
        } else if (aspectRatio < 0.8 || aspectRatio > 6.5) {
          console.log("PLATE_AR", aspectRatio);
          console.log("CONTOUR_BOX_REJECTED_AR");
          candidate.rejectionReason = `aspect ratio out of bounds (${aspectRatio.toFixed(2)})`;
        } else if (fillDensity < 0.35 || fillDensity > 0.92) {
          candidate.rejectionReason = `fill density out of bounds (${fillDensity.toFixed(2)})`;
        } else if (absoluteY < vehicleYLimit) {
          candidate.rejectionReason = `too high on vehicle (y=${absoluteY} < limit=${vehicleYLimit})`;
        } else {
          // Passed Stage 1
          console.log("PLATE_AR", aspectRatio);
          console.log("CONTOUR_BOX_ACCEPTED");
          candidate.accepted = true;
          
          const aspectScore = 1 - Math.abs(aspectRatio - 4.2) / 4.2;
          const densityScore = 1 - Math.abs(fillDensity - 0.65);
          candidate.score = (area * 0.35) + (aspectScore * 0.30) + (densityScore * 0.20) + (rw * 0.15);
        }
        
        candidates.push(candidate);
      }
    }
  }

  console.log("--- CANDIDATE CONTOURS ---");
  candidates.forEach(c => {
    console.log(`Candidate: x=${c.x}, y=${c.y}, w=${c.w}, h=${c.h}, centerY=${c.centerY}, aspect=${c.aspectRatio.toFixed(2)}, density=${c.fillDensity.toFixed(2)}, score=${c.score.toFixed(2)}, accepted=${c.accepted}, reason=${c.rejectionReason}`);
  });

  // STAGE 2 - Final Selection
  const validCandidates = candidates.filter(c => c.accepted);
  let bestRect = null;
  let finalSelectedCandidate = null;

  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => b.centerY - a.centerY); // LOWEST first (highest Y)
    
    if (validCandidates.length > 1 && Math.abs(validCandidates[0].centerY - validCandidates[1].centerY) < 15) {
      // Tie-breaker using score
      if (validCandidates[1].score > validCandidates[0].score) {
         finalSelectedCandidate = validCandidates[1];
      } else {
         finalSelectedCandidate = validCandidates[0];
      }
    } else {
      finalSelectedCandidate = validCandidates[0];
    }
    
    console.log("FINAL_SELECTED_PLATE:", finalSelectedCandidate);

    // Final OCR Crop Padding
    let paddedX = finalSelectedCandidate.x - 6;
    let paddedY = finalSelectedCandidate.y - 4;
    let paddedW = finalSelectedCandidate.w + 12;
    let paddedH = finalSelectedCandidate.h + 8;
    
    paddedX = Math.max(0, paddedX);
    paddedY = Math.max(0, paddedY);
    paddedW = Math.min(w - paddedX, paddedW);
    paddedH = Math.min(h - paddedY, paddedH);

    bestRect = { x: paddedX, y: paddedY, w: paddedW, h: paddedH };
  }

  // 5. Compute deskew angle based on top edge pixels
  let deskewAngle = 0;
  if (finalSelectedCandidate) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let n = 0;
    
    const topLimit = finalSelectedCandidate.y + finalSelectedCandidate.h * 0.2;
    for (let x = finalSelectedCandidate.x; x < finalSelectedCandidate.x + finalSelectedCandidate.w; x++) {
      for (let y = finalSelectedCandidate.y; y < topLimit; y++) {
        if (binary[y * w + x] === 255) {
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
          n++;
          break;
        }
      }
    }
    
    if (n > 10) {
      const denominator = (n * sumX2 - sumX * sumX);
      if (denominator !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denominator;
        const angleRad = Math.atan(slope);
        deskewAngle = angleRad * (180 / Math.PI);
      }
    }
  }

  return { rect: bestRect, deskewAngle, allCandidates: candidates };
}

/**
 * Creates multiple variations of the cropped plate image for OCR passes.
 */
export function preprocessImage(
  imageSrc: string,
  vehicleBox: [number, number, number, number],
  originalDimensions?: { width: number; height: number },
  vehicleType?: string
): Promise<{ 
  passes: ProcessedImage[]; 
  originalCrop: ProcessedImage; 
  plateCrop: ProcessedImage; 
  plateRectLog: string;
  telemetry: {
    initialPlateROI: number[],
    refinedPlateROI: number[],
    candidateROIs: number[][],
    deskewAngle: number,
    yoloConfidence?: number,
    yoloUsed?: boolean,
    yoloLatencyMs?: number
  }
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let finalRoiSource = "UNKNOWN";
    img.onload = async () => {
      try {
        console.log("PREPROCESS_ENTERED");
        console.log("PREPROCESS_START");
        const passes: ProcessedImage[] = [];

        let [vx, vy, vw, vh] = vehicleBox;

        if (originalDimensions) {
           const scaleX = img.width / originalDimensions.width;
           const scaleY = img.height / originalDimensions.height;
           vx *= scaleX;
           vy *= scaleY;
           vw *= scaleX;
           vh *= scaleY;
        }
        
        let px = vx;
        let py = vy;
        let pw = vw;
        let ph = vh;
        
        console.log("Vehicle Box", [vx, vy, vw, vh]);
        console.log("ROI Box (Full Vehicle Crop)", [px, py, pw, ph]);

        const plateRectLog = `Plate Crop relative to vehicle: X:${Math.round(px)}, Y:${Math.round(py)}, W:${Math.round(pw)}, H:${Math.round(ph)}`;

        if (pw <= 0 || ph <= 0) {
          throw new Error("Invalid plate crop dimensions");
        }

        // 1. Vehicle Crop (for preview)
        const vCanvas = document.createElement("canvas");
        vCanvas.width = vw;
        vCanvas.height = vh;
        const vCtx = vCanvas.getContext("2d");
        if (vCtx) vCtx.drawImage(img, vx, vy, vw, vh, 0, 0, vw, vh);
        const vehicleCrop: ProcessedImage = { src: vCanvas.toDataURL("image/jpeg"), name: "Vehicle Crop", width: vw, height: vh };

        // 2. Original Plate Crop
        const canvas = document.createElement("canvas");
        canvas.width = pw;
        canvas.height = ph;
        const ctx = canvas.getContext("2d");
        
        const fallbackTelemetry = {
          initialPlateROI: [px, py, pw, ph],
          refinedPlateROI: [px, py, pw, ph],
          candidateROIs: [],
          deskewAngle: 0
        };

        if (!ctx) return resolve({ passes: [], originalCrop: vehicleCrop, plateCrop: vehicleCrop, plateRectLog, telemetry: fallbackTelemetry });

        ctx.drawImage(img, px, py, pw, ph, 0, 0, pw, ph);
        const rawPlateDataUrl = canvas.toDataURL("image/jpeg");
        const plateCrop: ProcessedImage = { src: rawPlateDataUrl, name: "Plate Crop" };
        
        // 1-5. Localize Plate within ROI
        function localizePlateInROI(roiImageData: ImageData) {
          const w = roiImageData.width;
          const h = roiImageData.height;
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
              let px = 0, py = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const val = gray[(y + ky) * w + (x + kx)];
                  px += val * sobelX[(ky + 1) * 3 + (kx + 1)];
                  py += val * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
              }
              const m = Math.sqrt(px * px + py * py);
              mag[y * w + x] = m;
              if (m > maxMag) maxMag = m;
            }
          }

          const binary = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) {
            const normalized = maxMag > 0 ? (mag[i] / maxMag) * 255 : 0;
            binary[i] = normalized > 80 ? 255 : 0;
          }

          const visited = new Uint8Array(w * h);
          const candidates: { x: number, y: number, w: number, h: number, centerY: number, score: number, valid: boolean }[] = [];

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (binary[y * w + x] === 255 && !visited[y * w + x]) {
                let minX = x, maxX = x, minY = y, maxY = y;
                let pixelCount = 0;
                let edgeDensitySum = 0;
                
                const stack = [x, y];
                visited[y * w + x] = 1;

                while (stack.length > 0) {
                  const cy = stack.pop()!;
                  const cx = stack.pop()!;
                  
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

                const rw = maxX - minX + 1;
                const rh = maxY - minY + 1;
                const aspectRatio = rw / rh;
                const area = rw * rh;

                if (aspectRatio >= 0.8 && aspectRatio <= 6.5 && rw > 40 && rh > 15) {
                  console.log("PLATE_AR", aspectRatio);
                  console.log("CONTOUR_BOX_ACCEPTED");
                  const rectangularity = pixelCount / area; // fill factor
                  const avgEdgeDensity = edgeDensitySum / pixelCount;
                  
                  // Approximate character density by counting "holes" or internal transitions (simplified proxy using edge density & rectangularity)
                  const characterDensity = Math.min((avgEdgeDensity / maxMag) * rectangularity * 2.0, 1.0);
                  
                  const normRect = Math.min(rectangularity, 1.0);
                  const normEdge = Math.min(avgEdgeDensity / maxMag, 1.0);
                  const normY = maxY / h; // Location preference: higher Y is closer to bottom
                  
                  // Phase 5 Weighted Scoring: 40% rectangularity, 25% edge density, 20% character density, 15% location preference
                  const score = (normRect * 0.40) + (normEdge * 0.25) + (characterDensity * 0.20) + (normY * 0.15);
                  
                  candidates.push({ x: minX, y: minY, w: rw, h: rh, centerY: minY + rh / 2, score, valid: true });
                } else {
                  console.log("PLATE_AR", aspectRatio);
                  console.log("CONTOUR_BOX_REJECTED_AR");
                }
              }
            }
          }

          let bestCandidate = null;
          let bestScore = -Infinity;

          for (const c of candidates) {
            if (c.score > bestScore) {
              bestScore = c.score;
              bestCandidate = c;
            }
          }

          return { bestCandidate, candidates };
        }
        
        // Advanced Refinement
        let rX = px;
        let rY = py;
        let rW = pw;
        let rH = ph;
        let deskewAngle = 0;

        const candidateROIs: number[][] = [];
        
        // API Call to Python YOLOv8 Microservice
        let yoloResult = null;
        let yoloLatency = 0;
        let yoloConfidence = 0.0;
        let yoloUsed = false;
        
         try {
           const startTime = Date.now();
           const controller = new AbortController();
           const timeoutId = setTimeout(() => controller.abort(), 2500); // 2500ms timeout
           
           const originalWidth = vehicleCrop.width!;
           const originalHeight = vehicleCrop.height!;
           console.log("YOLO_REQUEST_START");
           console.log("YOLO request started");
           const res = await fetch("http://127.0.0.1:8000/detect-plate", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ vehicleCrop: rawPlateDataUrl }),
             signal: controller.signal
           });
           
           clearTimeout(timeoutId);

           // Save vehicle_crop.png (rawPlateDataUrl)
           const aVehicle = document.createElement("a");
           aVehicle.href = rawPlateDataUrl;
           aVehicle.download = "vehicle_crop.png";
           document.body.appendChild(aVehicle);
           aVehicle.click();
           document.body.removeChild(aVehicle);
           
           if (res.ok) {
             console.log("YOLO response received");
             const data = await res.json();
             console.log("YOLO_RESPONSE", data);
             yoloLatency = Date.now() - startTime;
             yoloConfidence = data.confidence;
             console.log(`YOLO confidence: ${yoloConfidence}`);
             console.log(`YOLO bbox: x=${data.x}, y=${data.y}, w=${data.width}, h=${data.height}`);
             
             console.log("YOLO confidence:", yoloConfidence, "threshold:", YOLO_CONFIDENCE_THRESHOLD, "using fallback:", yoloConfidence < YOLO_CONFIDENCE_THRESHOLD);
             if (yoloConfidence >= YOLO_CONFIDENCE_THRESHOLD && data.width > 0 && data.height > 0) {
               const yoloAspectRatio = data.width / data.height;
               console.log("YOLO_RESPONSE", data);
               console.log("YOLO_CONFIDENCE", data.confidence);
               console.log("YOLO_BOX", {
                 x: data.x,
                 y: data.y,
                 w: data.width,
                 h: data.height,
               });
               console.log(`YOLO_ASPECT_RATIO: ${yoloAspectRatio.toFixed(2)}`);

               if (yoloAspectRatio < 0.8 || yoloAspectRatio > 6.5) {
                 console.log("PLATE_AR", yoloAspectRatio);
                 console.log("YOLO_BOX_REJECTED_AR: Aspect ratio out of bounds.");
               } else {
                 console.log("PLATE_AR", yoloAspectRatio);
                 console.log("YOLO_BOX_ACCEPTED");
                 
                 const scaleX = originalWidth / YOLO_INPUT_SIZE;
                 const scaleY = originalHeight / YOLO_INPUT_SIZE;
                 const correctedX = data.x * scaleX;
                 const correctedY = data.y * scaleY;
                 const correctedW = data.width * scaleX;
                 const correctedH = data.height * scaleY;
                 
                 data.x = correctedX;
                 data.y = correctedY;
                 data.width = correctedW;
                 data.height = correctedH;
                 
                 console.log("Crop sent to OCR dimensions:", correctedW, correctedH);

                 yoloResult = data;
                 yoloUsed = true;
                 console.log("A: YOLO_SUCCESS");
                 
                 if (yoloConfidence < 0.70) {
                   console.warn(`MEDIUM CONFIDENCE (${yoloConfidence}): YOLO may be uncertain.`);
                 }
               }
             } else {
               console.log("B: YOLO_LOW_CONFIDENCE");
               console.log(`Fallback activated reason: Low confidence (${yoloConfidence}) or invalid size`);
             }
           } else {
             console.log("E: YOLO_EXCEPTION");
             console.log(`Fallback activated reason: API returned status ${res.status}`);
           }
        } catch (err: any) {
           if (err.name === 'AbortError') {
             console.log("C: YOLO_TIMEOUT");
             console.log("Fallback activated reason: Request timed out after 2500ms");
           } else {
             console.log("D: YOLO_CONNECTION_FAILED");
             console.log("YOLO_CONNECTION_FAILED", err);
             console.log(`Fallback activated reason: ${err.message}`);
           }
        }

        // Apply fallback if YOLO wasn't used
        const roiImgData = ctx.getImageData(0, 0, pw, ph);
        const { bestCandidate: refinedRect, candidates: allLocCandidates } = localizePlateInROI(roiImgData);

        if (refinedRect) {
          // Contour used, do not save debug_contour_crop.png as requested
        }
        
        // Save yolo_crop.png as requested
        if (yoloResult && yoloResult.width > 0 && yoloResult.height > 0) {
          const yCanvas = document.createElement("canvas");
          yCanvas.width = yoloResult.width;
          yCanvas.height = yoloResult.height;
          const yCtx = yCanvas.getContext("2d");
          if (yCtx) {
            yCtx.drawImage(img, px + yoloResult.x, py + yoloResult.y, yoloResult.width, yoloResult.height, 0, 0, yoloResult.width, yoloResult.height);
            const a = document.createElement("a");
            a.href = yCanvas.toDataURL("image/png");
            a.download = "yolo_crop.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }

        if (!yoloResult || yoloResult.confidence < YOLO_CONFIDENCE_THRESHOLD) {
          console.warn("FALLBACK ACTIVATED — reason:", !yoloResult ? "no detection" : "low confidence");
          if (yoloResult) {
            console.warn("YOLO confidence was:", yoloResult.confidence);
          }
          console.log("USING_FALLBACK_ROI");
          console.log("FALLBACK_ACTIVATED");
          console.log("YOLO_FALLBACK_USED");
          finalRoiSource = "FALLBACK";

          for (const c of allLocCandidates) {
            candidateROIs.push([px + c.x, py + c.y, c.w, c.h, c.score]);
          }

          if (refinedRect) {
            rX = px + refinedRect.x;
            rY = py + refinedRect.y;
            rW = refinedRect.w;
            rH = refinedRect.h;
          }
        } else if (yoloResult) {
          console.log("USING_YOLO_ROI");
          console.log("YOLO_SUCCESS_USED");
          finalRoiSource = "YOLO";
          rX = px + yoloResult.x;
          rY = py + yoloResult.y;
          rW = yoloResult.width;
          rH = yoloResult.height;
        }

        console.log("ROI_SELECTED");
        console.log("ROI_SOURCE_VALUE", finalRoiSource);
        console.log(`LOCALIZED BOX: ${Math.round(rX)},${Math.round(rY)},${Math.round(rW)},${Math.round(rH)}`);


          // 7. Create new preview: Localized Plate
          const locCanvas = document.createElement("canvas");
          locCanvas.width = rW;
          locCanvas.height = rH;
          const locCtx = locCanvas.getContext("2d");
          if (locCtx) {
            locCtx.drawImage(img, rX, rY, rW, rH, 0, 0, rW, rH);
            passes.push({ src: locCanvas.toDataURL("image/jpeg"), name: "Localized Plate", roi: [rX, rY, rW, rH] });
          }


        // Pass 2: Upscaled (12x) on REFINED crop
        const scale = 12;
        const scaleCanvas = document.createElement("canvas");
        scaleCanvas.width = rW * scale;
        scaleCanvas.height = rH * scale;
        const sctx = scaleCanvas.getContext("2d");
        
        if (sctx) {
          console.log("OCR input dimensions:", scaleCanvas.width, scaleCanvas.height);
          if (scaleCanvas.width <= 0 || scaleCanvas.height <= 0 || rW >= vw * 0.95 || rH >= vh * 0.95) {
            throw new Error("OCR received invalid crop — likely coordinate mapping failure");
          }
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(img, rX, rY, rW, rH, 0, 0, scaleCanvas.width, scaleCanvas.height);
          passes.push({ src: scaleCanvas.toDataURL("image/jpeg"), name: "Final OCR Input Crop", roi: [rX, rY, rW, rH] });

          // Pass 3: Grayscale
          const grayCanvas = document.createElement("canvas");
          grayCanvas.width = scaleCanvas.width;
          grayCanvas.height = scaleCanvas.height;
          const gctx = grayCanvas.getContext("2d");
          if (gctx) {
             gctx.filter = 'grayscale(100%)';
             gctx.drawImage(scaleCanvas, 0, 0);
             passes.push({ src: grayCanvas.toDataURL("image/jpeg"), name: "Grayscale", roi: [rX, rY, rW, rH] });
          }

          // Pass 4: Binary Threshold (140)
          const imgData = sctx.getImageData(0, 0, scaleCanvas.width, scaleCanvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i+1] + data[i+2]) / 3;
            const val = gray > 140 ? 255 : 0;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
          sctx.putImageData(imgData, 0, 0);
          passes.push({ src: scaleCanvas.toDataURL("image/jpeg"), name: "Thresholded Crop", roi: [rX, rY, rW, rH] });
          
          // Pass 5: Sharpened
          const sharpCanvas = document.createElement("canvas");
          sharpCanvas.width = scaleCanvas.width;
          sharpCanvas.height = scaleCanvas.height;
          const sharpCtx = sharpCanvas.getContext("2d");
          if (sharpCtx) {
             sharpCtx.filter = 'contrast(1.3) brightness(1.1) saturate(0)';
             sharpCtx.drawImage(scaleCanvas, 0, 0); // draw the thresholded image
             passes.push({ src: sharpCanvas.toDataURL("image/jpeg"), name: "Sharpened Crop", roi: [rX, rY, rW, rH] });
          }
        }

        console.log("PREPROCESS_EXITED");
        resolve({ 
          passes, 
          originalCrop: vehicleCrop, 
          plateCrop, 
          plateRectLog,
          telemetry: {
            initialPlateROI: [px, py, pw, ph],
            refinedPlateROI: [rX, rY, rW, rH],
            candidateROIs,
            deskewAngle: deskewAngle,
            yoloConfidence,
            yoloUsed,
            yoloLatencyMs: yoloLatency
          }
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err || "Unknown Preprocessing Error");
        console.error("Preprocessing FAILURE:", errorMsg);
        reject(new Error(errorMsg));
      }
    };
    img.onerror = () => {
      console.error("Preprocessing FAILURE: Image failed to load");
      reject(new Error("Image failed to load"));
    };
    img.src = imageSrc;
  });
}

function calculatePixelStats(src: string): Promise<{ width: number; height: number; avgBrightness: number; minPixel: number; maxPixel: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ width: img.width, height: img.height, avgBrightness: 0, minPixel: 0, maxPixel: 0 });
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0, min = 255, max = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const brightness = imgData[i] * 0.299 + imgData[i+1] * 0.587 + imgData[i+2] * 0.114;
        sum += brightness;
        if (brightness < min) min = brightness;
        if (brightness > max) max = brightness;
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

/**
 * Runs multi-pass OCR on a cropped region of the image.
 */
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
    initialPlateROI: number[],
    refinedPlateROI: number[],
    candidateROIs: number[][],
    deskewAngle: number
  }
} | null> {
  const debugLog: string[] = [];

  console.log("OCR Started");
  console.log("Vehicle Box:", vehicleBox);

  try {
    const { passes, originalCrop, plateCrop, plateRectLog, telemetry } = await preprocessImage(
      imageSrc, 
      vehicleBox, 
      originalDimensions,
      vehicleType
    );
    debugLog.push(plateRectLog);

    if (passes.length === 0) {
      debugLog.push("Failed to preprocess image crop.");
      console.error("OCR FAILURE", "Failed to preprocess image crop.");
      console.log(`OCR OUTPUT:  \nConfidence: 0`);
      return { 
        text: "", 
        confidence: 0, 
        debugLog, 
        previews: [originalCrop],
        boxes: telemetry
      };
    }

    if (telemetry.refinedPlateROI && (telemetry.refinedPlateROI[2] < 120 || telemetry.refinedPlateROI[3] < 30)) {
      debugLog.push(`OCR rejected: Crop too small (W:${Math.round(telemetry.refinedPlateROI[2])}, H:${Math.round(telemetry.refinedPlateROI[3])})`);
      console.error("OCR FAILURE", "Crop too small.");
      return {
        text: "",
        confidence: 0,
        debugLog,
        previews: [originalCrop, plateCrop, ...passes.slice(0, 1)], // Include Original, Initial ROI, Localized Plate
        boxes: telemetry
      };
    }

    let bestResult: { text: string; confidence: number; name: string; isValidFormat?: boolean } | null = null;
    const indianPlateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
    console.log("Tesseract Input Ready. Number of passes:", passes.length);

    if (telemetry.yoloUsed) {
      console.log("USING_YOLO_ROI");
      console.log("final_roi_source: YOLO");
    } else {
      console.log("USING_FALLBACK_ROI");
      console.log("final_roi_source: FALLBACK");
    }
    console.log(`final_roi_width: ${Math.round(telemetry.refinedPlateROI[2])}`);
    console.log(`final_roi_height: ${Math.round(telemetry.refinedPlateROI[3])}`);

    // STEP 2: Save actual OCR input image
    if (passes.length > 0) {
      const finalOcrCrop = passes[passes.length - 1].src;
      const a = document.createElement("a");
      a.href = finalOcrCrop;
      a.download = "final_ocr_input.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    const ocrResult = await executeOCR(passes, debugLog);
    bestResult = ocrResult?.bestResult || null;

    if (!bestResult) {
      debugLog.push("All OCR passes failed to produce valid text.");
      console.log(`OCR OUTPUT:  \nConfidence: 0`);
      return { 
        text: "", 
        confidence: 0, 
        debugLog, 
        previews: passes,
        boxes: telemetry
      };
    }

    console.log(`FINAL SELECTED TEXT: ${bestResult.text} (${bestResult.confidence}%) from ${bestResult.name}`);
    
    return {
      text: bestResult.text,
      confidence: bestResult.confidence,
      debugLog,
      previews: [originalCrop, plateCrop, ...passes.filter(p => p.name !== "Original" && p.name !== "Plate Crop")],
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

/**
 * Executes Tesseract OCR on a given array of image passes.
 */
export async function executeOCR(passes: ProcessedImage[], debugLog: string[]): Promise<{
  bestResult: { text: string; confidence: number; name: string; isValidFormat?: boolean } | null;
  allResults: { name: string; text: string; rawText: string; confidence: number }[];
} | null> {
  console.log("OCR_START");
  let bestResult: { text: string; confidence: number; name: string; isValidFormat?: boolean } | null = null;
  const allResults: { name: string; text: string; rawText: string; confidence: number }[] = [];
  const indianPlateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

  const votingPasses = passes;

  // Network diagnostic
  try {
    const workerRes = await fetch("/tesseract/worker.min.js");
    if (!workerRes.ok) throw new Error("OCR worker file missing");
  } catch (e: any) {
    throw new Error(`Local Tesseract asset missing: ${e.message}`);
  }

  for (const pass of votingPasses) {
    debugLog.push(`--- OCR Pass: ${pass.name} ---`);
    console.log(`--- OCR Pass: ${pass.name} ---`);
    
    const stats = await calculatePixelStats(pass.src);
    console.log(`OCR PASS: ${pass.name}`);
    console.log(`Width: ${stats.width}`);
    console.log(`Height: ${stats.height}`);
    console.log(`Average Brightness: ${stats.avgBrightness}`);
    console.log(`Min Pixel: ${stats.minPixel}`);
    console.log(`Max Pixel: ${stats.maxPixel}`);

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

      console.log("TESSERACT CONFIG:", {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        psm: Tesseract.PSM.SINGLE_BLOCK,
        oem: 'DEFAULT (or worker default)',
        language: 'eng'
      });

      console.log(`OCR INPUT SOURCE: ${pass.name}`);
      if (pass.roi) {
        console.log(`OCR ROI: ${Math.round(pass.roi[0])},${Math.round(pass.roi[1])},${Math.round(pass.roi[2])},${Math.round(pass.roi[3])}`);
      } else {
        console.log(`OCR ROI: UNKNOWN`);
      }

      const { data } = await worker.recognize(pass.src);
      await worker.terminate();

      // Only strip completely invalid characters to evaluate raw OCR
      const rawText = data.text.trim();
      const text = rawText.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const conf = data.confidence;

      debugLog.push(`Result: "${text}" (Raw: "${rawText}") - Conf: ${Math.round(conf)}%`);
      console.log(`RAW OCR:\n${rawText}`);
      console.log(`NORMALIZED OCR:\n${text}`);
      console.log(`CONFIDENCE:\n${Math.round(conf)}`);

      if (!text) {
        debugLog.push(`Rejected: Empty text`);
        continue;
      }

      // Check regex
      const matchesRegex = indianPlateRegex.test(text);
      console.log(`REGEX MATCH:\n${matchesRegex}`);
      
      console.log({
        passName: pass.name,
        text: text,
        confidence: conf
      });

      if (matchesRegex) {
        // If it matches exact Indian format, prioritize it highly
        if (!bestResult || !bestResult.isValidFormat || conf > bestResult.confidence) {
          bestResult = { text, confidence: conf, name: pass.name, isValidFormat: true };
          debugLog.push(`Accepted: Best match (valid format)`);
        } else {
          debugLog.push(`Ignored: Valid format, but lower confidence than previous best`);
        }
      } else {
        debugLog.push(`REJECTION REASON:\nfailed Indian plate pattern`);
        // We still keep the best text even if it fails regex, so it can be sent to UI for debugging
        if (!bestResult || (!bestResult.isValidFormat && conf > bestResult.confidence)) {
          bestResult = { text, confidence: conf, name: pass.name, isValidFormat: false };
        }
      }

      allResults.push({ name: pass.name, text, rawText, confidence: conf });
    } catch (e: any) {
      debugLog.push(`Error in ${pass.name}: ${e.message}`);
      console.error(`Error in OCR pass ${pass.name}:`, e);
    }
  }

  console.log("OCR_COMPLETE");
  return { bestResult, allResults };
}
