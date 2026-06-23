import re

with open("src/lib/ocr-helpers.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove refinePlateCrop and localizePlateInROI completely
start_idx = content.find('function refinePlateCrop(')
end_idx = content.find('export function preprocessImage(')
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 2. Modify preprocessImage
# Inside preprocessImage, change px, py, pw, ph to be deterministic
deterministic_roi_code = '''
        let px = vx + vw * 0.2;
        let py = vy + vh * 0.6;
        let pw = vw * 0.6;
        let ph = vh * 0.3;
        
        // Ensure bounds
        px = Math.max(0, px);
        py = Math.max(0, py);
        pw = Math.min(img.width - px, pw);
        ph = Math.min(img.height - py, ph);
'''

find_px = content.find('let px = vx;\n        let py = vy;\n        let pw = vw;\n        let ph = vh;')
if find_px != -1:
    content = content[:find_px] + deterministic_roi_code + content[find_px + len('let px = vx;\n        let py = vy;\n        let pw = vw;\n        let ph = vh;'):]

# 3. Remove the call to localizePlateInROI and candidateROIs
# Remove from `// 1-5. Localize Plate within ROI` to `// 7. Create new preview: Localized Plate`
loc_start = content.find('// 1-5. Localize Plate within ROI')
if loc_start != -1:
    loc_end = content.find('// 7. Create new preview: Localized Plate')
    replacement = '''
        let rX = px;
        let rY = py;
        let rW = pw;
        let rH = ph;
        let deskewAngle = 0;
        const candidateROIs: number[][] = [];
        
        console.log(`LOCALIZED BOX: ${Math.round(rX)},${Math.round(rY)},${Math.round(rW)},${Math.round(rH)}`);
'''
    content = content[:loc_start] + replacement + content[loc_end:]

# 4. Modify executeOCR to ONLY receive the "Final OCR Input Crop"
# Wait, runMultiPassOCR currently gets all passes. 
# "Pass only the Final OCR Input Crop to Tesseract."
# We can filter `passes` inside `runMultiPassOCR` before passing to `executeOCR`.
run_multi_start = content.find('const ocrResult = await executeOCR(passes, debugLog);')
if run_multi_start != -1:
    replacement = '''const finalOcrPass = passes.filter(p => p.name === "Final OCR Input Crop");
    const ocrResult = await executeOCR(finalOcrPass, debugLog);'''
    content = content[:run_multi_start] + replacement + content[run_multi_start + len('const ocrResult = await executeOCR(passes, debugLog);'):]

with open("src/lib/ocr-helpers.ts", "w", encoding="utf-8") as f:
    f.write(content)
