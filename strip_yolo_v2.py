import re

with open("src/lib/ocr-helpers.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove YOLO constants
content = re.sub(r'const YOLO_CONFIDENCE_THRESHOLD = [\d\.]+;\n', '', content)
content = re.sub(r'const YOLO_INPUT_SIZE = \d+;\n', '', content)

# 2. Remove yolo telemetry types
content = re.sub(r'\s*yoloConfidence\?: number;.*?\n', '\n', content)
content = re.sub(r'\s*yoloUsed\?: boolean;.*?\n', '\n', content)
content = re.sub(r'\s*yoloLatencyMs\?: number;.*?\n', '\n', content)

# 3. Remove YOLO try-catch block and variables
# Find "let yoloResult = null;" and "let finalRoiSource"
yolo_vars_pattern = r'\s*// API Call to Python YOLOv8 Microservice.*?let yoloUsed = false;\n'
content = re.sub(yolo_vars_pattern, '\n', content, flags=re.DOTALL)

# Delete try-catch block for YOLO
fetch_start = content.find('try {\n           const startTime = Date.now();')
if fetch_start != -1:
    fallback_start = content.find('// Apply fallback if YOLO wasn\'t used')
    content = content[:fetch_start] + content[fallback_start:]

# 4. Simplify fallback logic block (remove all the "if (yoloResult)" checks)
fallback_start = content.find('// Apply fallback if YOLO wasn\'t used')
if fallback_start != -1:
    roi_selected_end = content.find('console.log(`LOCALIZED BOX:')
    
    replacement = '''// Execute Pure Contour Localization
        const roiImgData = ctx.getImageData(0, 0, pw, ph);
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
    content = content[:fallback_start] + replacement + content[roi_selected_end:]

# 5. Remove telemetry assignments
content = re.sub(r'\s*yoloConfidence,', '', content)
content = re.sub(r'\s*yoloUsed,', '', content)
content = re.sub(r'\s*yoloLatencyMs: yoloLatency,?', '', content)

# 6. Remove OCR downloads
dl_1 = content.find('// STEP 1: Save vehicle crop for debugging')
if dl_1 != -1:
    dl_1_end = content.find('// 1-5. Localize Plate within ROI')
    content = content[:dl_1] + content[dl_1_end:]

dl_2 = content.find('// STEP 2: Save actual OCR input image')
if dl_2 != -1:
    dl_2_end = content.find('const ocrResult = await executeOCR')
    content = content[:dl_2] + content[dl_2_end:]

# 7. Remove YOLO references in OCR
yolo_log_start = content.find('if (telemetry.yoloUsed) {')
if yolo_log_start != -1:
    yolo_log_end = content.find('console.log(`final_roi_width:')
    content = content[:yolo_log_start] + content[yolo_log_end:]

with open("src/lib/ocr-helpers.ts", "w", encoding="utf-8") as f:
    f.write(content)
