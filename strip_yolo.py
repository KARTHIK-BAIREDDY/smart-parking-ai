import re

with open("src/lib/ocr-helpers.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove YOLO constants
content = re.sub(r'const YOLO_CONFIDENCE_THRESHOLD = 0\.40;\nconst YOLO_INPUT_SIZE = 640;\n', '', content)

# 2. Remove yolo variables
content = re.sub(r'let yoloConfidence = 0;\n\s*let yoloUsed = false;\n\s*let yoloLatency = 0;\n\s*let yoloResult: any = null;\n\s*let finalRoiSource = "UNKNOWN";\n', '', content)

# 3. Remove the entire YOLO fetch block
# We will find the start of the block and the end.
fetch_start = content.find('try {\n           const startTime = Date.now();')
if fetch_start != -1:
    fetch_end = content.find('// Apply fallback if YOLO wasn\'t used')
    if fetch_end != -1:
        content = content[:fetch_start] + content[fetch_end:]

# 4. Clean up the fallback logic section
# From: `// Apply fallback if YOLO wasn't used` down to `console.log("ROI_SELECTED");`
fallback_start = content.find('// Apply fallback if YOLO wasn\'t used')
if fallback_start != -1:
    fallback_end = content.find('console.log("ROI_SELECTED");')
    if fallback_end != -1:
        replacement = '''const roiImgData = ctx.getImageData(0, 0, pw, ph);
        const { bestCandidate: refinedRect, candidates: allLocCandidates } = localizePlateInROI(roiImgData);

        for (const c of allLocCandidates) {
          candidateROIs.push([px + c.x, py + c.y, c.w, c.h, c.score]);
        }

        if (refinedRect) {
          rX = px + refinedRect.x;
          rY = py + refinedRect.y;
          rW = refinedRect.w;
          rH = refinedRect.h;
        }

        '''
        content = content[:fallback_start] + replacement + content[fallback_end + len('console.log("ROI_SELECTED");\n        console.log("ROI_SOURCE_VALUE", finalRoiSource);\n'):]

# 5. Remove telemetry interface additions
content = re.sub(r'\s*yoloConfidence\?: number;\n\s*yoloUsed\?: boolean;\n\s*yoloLatencyMs\?: number;', '', content)
content = re.sub(r'\s*yoloConfidence,\n\s*yoloUsed,\n\s*yoloLatencyMs: yoloLatency', '', content)

# 6. Remove final_ocr_input.png download
final_ocr_download_start = content.find('// STEP 2: Save actual OCR input image')
if final_ocr_download_start != -1:
    final_ocr_download_end = content.find('const ocrResult = await executeOCR(passes, debugLog);')
    if final_ocr_download_end != -1:
        content = content[:final_ocr_download_start] + content[final_ocr_download_end:]

# 7. Remove YOLO references in runMultiPassOCR logs
yolo_log_start = content.find('if (telemetry.yoloUsed) {')
if yolo_log_start != -1:
    yolo_log_end = content.find('console.log(`final_roi_width: ${Math.round(telemetry.refinedPlateROI[2])}`);')
    if yolo_log_end != -1:
        content = content[:yolo_log_start] + content[yolo_log_end:]

# 8. Remove `vehicle_crop.png` download
vehicle_download_start = content.find('// STEP 1: Save vehicle crop for debugging')
if vehicle_download_start != -1:
    vehicle_download_end = content.find('// 1-5. Localize Plate within ROI')
    if vehicle_download_end != -1:
        content = content[:vehicle_download_start] + content[vehicle_download_end:]

with open("src/lib/ocr-helpers.ts", "w", encoding="utf-8") as f:
    f.write(content)
