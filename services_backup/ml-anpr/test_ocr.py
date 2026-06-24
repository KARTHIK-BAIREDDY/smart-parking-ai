import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

import cv2
from paddleocr import PaddleOCR

print("Initializing PaddleOCR...")
ocr_model = PaddleOCR(use_angle_cls=True, lang='en', enable_mkldnn=False)

img_path = 'debug_plate_crop.jpg'
print(f"Loading image: {img_path}")
img = cv2.imread(img_path)

if img is None:
    print("FAILED TO LOAD IMAGE")
    exit(1)

print("Running OCR...")
try:
    ocr_results = ocr_model.ocr(img)
    print("RAW_RESULT:", ocr_results)
    
    plate_text = ""
    ocr_conf = 0.0
    
    if ocr_results and len(ocr_results) > 0:
        res = ocr_results[0]
        if isinstance(res, dict) and 'rec_texts' in res:
            texts = res.get('rec_texts', [])
            scores = res.get('rec_scores', [])
            for i in range(len(texts)):
                text = texts[i]
                conf = scores[i]
                cleaned_text = "".join(c for c in text if c.isalnum()).upper()
                if len(cleaned_text) >= 3:
                    if conf > ocr_conf:
                        plate_text = cleaned_text
                        ocr_conf = float(conf)
        elif isinstance(res, list):
            for line in res:
                if len(line) > 1 and len(line[1]) > 1:
                    text = line[1][0]
                    conf = line[1][1]
                    cleaned_text = "".join(c for c in text if c.isalnum()).upper()
                    if len(cleaned_text) >= 3:
                        if conf > ocr_conf:
                            plate_text = cleaned_text
                            ocr_conf = float(conf)

    print("TEXT:", plate_text)
    print("CONFIDENCE:", ocr_conf)
except Exception as e:
    print("OCR_CRASH:", str(e))
