import os
import glob
import cv2
import re
import time
from ultralytics import YOLO
from paddleocr import PaddleOCR

os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

def is_valid_indian_plate(text):
    text = re.sub(r'\s+', '', text).upper()
    pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
    return bool(re.match(pattern, text))

def extract_ocr_text(ocr_results):
    best_text = ""
    best_conf = 0.0
    if ocr_results and len(ocr_results) > 0 and ocr_results[0]:
        res = ocr_results[0]
        if isinstance(res, dict) and 'rec_texts' in res:
            texts = res.get('rec_texts', [])
            scores = res.get('rec_scores', [])
            for text, conf in zip(texts, scores):
                if conf > best_conf:
                    best_text = text
                    best_conf = float(conf)
        elif isinstance(res, list):
            for line in res:
                if len(line) > 1 and len(line[1]) > 1:
                    text = line[1][0]
                    conf = float(line[1][1])
                    if conf > best_conf:
                        best_text = text
                        best_conf = conf
    best_text = re.sub(r'[^A-Z0-9]', '', best_text.upper())
    return best_text, best_conf

def enhance_b(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl1 = clahe.apply(gray)
    h, w = cl1.shape[:2]
    upscaled = cv2.resize(cl1, (w*3, h*3), interpolation=cv2.INTER_CUBIC)
    return cv2.cvtColor(upscaled, cv2.COLOR_GRAY2BGR)

def enhance_c(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl1 = clahe.apply(gray)
    blur = cv2.bilateralFilter(cl1, 11, 17, 17)
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

FAILURES_DIR = r"C:\Users\Lenovo\Documents\smart parking\public\audit-reports\failures"

plate_model = YOLO("plate_detector.pt")
ocr_model = PaddleOCR(use_angle_cls=True, lang='en', enable_mkldnn=False)

image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "2_vehicle_crop.jpg"), recursive=True)
if len(image_paths) == 0:
    image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "1_original_frame.jpg"), recursive=True)

total_images = 0
yolo_success = 0
ocr_success = 0
valid_format_count = 0

sum_yolo_conf = 0.0
sum_plate_conf = 0.0
sum_ocr_conf = 0.0
sum_aspect_ratio = 0.0

for i, path in enumerate(image_paths):
    if i >= 50:
        break
    
    total_images += 1
    img = cv2.imread(path)
    if img is None: continue
    
    results = plate_model(img, conf=0.35, verbose=False)
    
    plate_box = None
    best_plate_conf = 0.0
    
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = plate_model.names.get(cls_id, str(cls_id))
            conf = box.conf[0].item()
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            if cls_name.lower() in ["plate", "license_plate"]:
                if conf > best_plate_conf:
                    best_plate_conf = conf
                    plate_box = [x1, y1, x2 - x1, y2 - y1]
    
    if plate_box is not None:
        yolo_success += 1
        sum_plate_conf += best_plate_conf
        x, y, w, h = [int(v) for v in plate_box]
        x = max(0, x)
        y = max(0, y)
        w = min(img.shape[1] - x, w)
        h = min(img.shape[0] - y, h)
        if w > 0 and h > 0:
            sum_aspect_ratio += (w / h)
            plate_crop = img[y:y+h, x:x+w]
            
            res_a = ocr_model.ocr(plate_crop)
            text_a, conf_a = extract_ocr_text(res_a)
            
            img_b = enhance_b(plate_crop)
            res_b = ocr_model.ocr(img_b)
            text_b, conf_b = extract_ocr_text(res_b)
            
            img_c = enhance_c(plate_crop)
            res_c = ocr_model.ocr(img_c)
            text_c, conf_c = extract_ocr_text(res_c)
            
            options = [(text_a, conf_a, 'A'), (text_b, conf_b, 'B'), (text_c, conf_c, 'C')]
            best_opt = None
            for text, conf, name in options:
                if is_valid_indian_plate(text):
                    if best_opt is None or conf > best_opt[1] or not is_valid_indian_plate(best_opt[0]):
                        best_opt = (text, conf, name)
            
            if best_opt is None:
                best_opt = max(options, key=lambda x: x[1])
                
            plate_text, ocr_conf, _ = best_opt
            
            if plate_text:
                ocr_success += 1
                sum_ocr_conf += ocr_conf
                if is_valid_indian_plate(plate_text):
                    valid_format_count += 1

print("\n" + "="*40)
print("      VALIDATION METRICS REPORT")
print("="*40)
print(f"Total Images Processed: {total_images}")

det_rate = (yolo_success / total_images) * 100 if total_images > 0 else 0
print(f"Detection Success Rate: {det_rate:.2f}% ({yolo_success}/{total_images})")

ocr_rate = (ocr_success / yolo_success) * 100 if yolo_success > 0 else 0
print(f"OCR Success Rate (from detected): {ocr_rate:.2f}% ({ocr_success}/{yolo_success})")

valid_rate = (valid_format_count / ocr_success) * 100 if ocr_success > 0 else 0
print(f"Valid Plate Format Rate: {valid_rate:.2f}% ({valid_format_count}/{ocr_success})")

avg_ocr_conf = (sum_ocr_conf / ocr_success) if ocr_success > 0 else 0
print(f"Average OCR Confidence: {avg_ocr_conf:.2f}")

avg_plate_conf = (sum_plate_conf / yolo_success) if yolo_success > 0 else 0
print(f"Mean Plate Box Confidence: {avg_plate_conf:.2f}")

avg_aspect = (sum_aspect_ratio / yolo_success) if yolo_success > 0 else 0
print(f"Mean Plate Aspect Ratio: {avg_aspect:.2f}")
print("="*40)
