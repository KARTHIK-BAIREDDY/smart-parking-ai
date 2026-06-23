import os
import glob
import cv2
import re
import math
from ultralytics import YOLO
from paddleocr import PaddleOCR

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

def is_valid_indian_plate(text):
    text = re.sub(r'\s+', '', text).upper()
    pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
    return bool(re.match(pattern, text))

def extract_ocr_text(ocr_results):
    full_text = ""
    confs = []
    if ocr_results and len(ocr_results) > 0 and ocr_results[0]:
        res = ocr_results[0]
        if isinstance(res, list):
            for line in res:
                if len(line) > 1 and len(line[1]) > 1:
                    text = line[1][0]
                    conf = float(line[1][1])
                    full_text += text
                    confs.append(conf)
                    
    best_text = re.sub(r'[^A-Z0-9]', '', full_text.upper())
    avg_conf = sum(confs) / len(confs) if confs else 0.0
    return best_text, avg_conf

FAILURES_DIR = r"C:\Users\Lenovo\Documents\smart parking\public\audit-reports\failures"

plate_model = YOLO("plate_detector.pt")
ocr_model = PaddleOCR(use_angle_cls=True, lang='en', enable_mkldnn=False)

image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "2_vehicle_crop.jpg"), recursive=True)
if len(image_paths) == 0:
    image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "1_original_frame.jpg"), recursive=True)

# Limit to 50 images
image_paths = image_paths[:50]
total_images = len(image_paths)

padding_levels = [0.0, 0.05, 0.10, 0.15, 0.20]

# Metrics per padding level
metrics = {
    p: {
        "detected": 0,
        "ocr_success": 0, 
        "valid_format": 0,
        "sum_conf": 0.0
    } for p in padding_levels
}

for i, path in enumerate(image_paths):
    print(f"\nProcessing [{i+1}/{total_images}] {os.path.basename(os.path.dirname(path))}")
    img = cv2.imread(path)
    if img is None: continue
    
    img_h, img_w = img.shape[:2]
    
    # Run YOLO
    results = plate_model(img, conf=0.35, verbose=False)
    
    best_plate_box = None
    best_plate_conf = 0.0
    
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = plate_model.names.get(cls_id, str(cls_id))
            conf = box.conf[0].item()
            if cls_name.lower() in ["plate", "license_plate"]:
                if conf > best_plate_conf:
                    best_plate_conf = conf
                    best_plate_box = box.xyxy[0].tolist() # [x1, y1, x2, y2]
    
    if best_plate_box is None:
        print("  [No Plate Detected]")
        continue
        
    x1_o, y1_o, x2_o, y2_o = best_plate_box
    bw = x2_o - x1_o
    bh = y2_o - y1_o
    
    for pad in padding_levels:
        metrics[pad]["detected"] += 1
        
        # Calculate padding pixels
        pad_w = bw * pad
        pad_h = bh * pad
        
        # Expand and clamp
        x1 = max(0, int(x1_o - pad_w))
        y1 = max(0, int(y1_o - pad_h))
        x2 = min(img_w, int(x2_o + pad_w))
        y2 = min(img_h, int(y2_o + pad_h))
        
        if (x2 - x1) <= 0 or (y2 - y1) <= 0:
            continue
            
        crop = img[y1:y2, x1:x2]
        res = ocr_model.ocr(crop)
        text, conf = extract_ocr_text(res)
        
        text_len = len(text)
        is_valid = is_valid_indian_plate(text)
        
        print(f"  PAD {int(pad*100)}% | TEXT: '{text}' | CONF: {conf:.2f} | LEN: {text_len} | VALID: {is_valid}")
        
        if text:
            metrics[pad]["ocr_success"] += 1
            metrics[pad]["sum_conf"] += conf
            if is_valid:
                metrics[pad]["valid_format"] += 1

print("\n" + "="*50)
print("      PADDING EXPERIMENT RESULTS")
print("="*50)
print(f"Total Images: {total_images}\n")

for pad in padding_levels:
    m = metrics[pad]
    det = m["detected"]
    ocr = m["ocr_success"]
    valid = m["valid_format"]
    avg_conf = m["sum_conf"] / ocr if ocr > 0 else 0.0
    
    print(f"PADDING {int(pad*100)}%:")
    print(f"  Detected Plates:   {det}/{total_images}")
    print(f"  OCR Extracted:     {ocr}/{det}")
    print(f"  Valid Format Rate: {(valid/ocr)*100:.2f}% ({valid}/{ocr}) if ocr>0")
    print(f"  Average Conf:      {avg_conf:.2f}")
    print("-" * 30)
