import os
import cv2
import csv
import time
import numpy as np
import json
import difflib

# Import from main backend to ensure exact same pipeline and tracker logic
import main

# Paths
BASE_DIR = "validation_dataset"
RAW_FRAMES_DIR = os.path.join(BASE_DIR, "raw_frames")
VEHICLE_CROPS_DIR = os.path.join(BASE_DIR, "vehicle_crops")
PLATE_CROPS_DIR = os.path.join(BASE_DIR, "plate_crops")
FAILURES_DIR = os.path.join(BASE_DIR, "failures")
GROUND_TRUTH_CSV = os.path.join(BASE_DIR, "ground_truth.csv")
REPORT_CSV = "validation_report.csv"
SUMMARY_TXT = "summary.txt"

os.makedirs(RAW_FRAMES_DIR, exist_ok=True)
os.makedirs(VEHICLE_CROPS_DIR, exist_ok=True)
os.makedirs(PLATE_CROPS_DIR, exist_ok=True)
os.makedirs(FAILURES_DIR, exist_ok=True)

if not os.path.exists(GROUND_TRUTH_CSV):
    with open(GROUND_TRUTH_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "expected_plate"])

# Read ground truth
ground_truth = {}
with open(GROUND_TRUTH_CSV, "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        ground_truth[row["filename"]] = row["expected_plate"]

total_images = len(ground_truth)
if total_images == 0:
    print("No images found in ground_truth.csv. Please populate validation_dataset/raw_frames/ and ground_truth.csv.")

detected_count = 0
exact_match_count = 0
total_chars = 0
correct_chars = 0
false_positives = 0
failures = 0

report_rows = []

# Reset tracker to ensure clean state
main.trackers.clear()
CAMERA_ID = "validation-cam"
main.trackers[CAMERA_ID] = main.SimpleTracker(CAMERA_ID)
main.trackers[CAMERA_ID].next_id = 1

print(f"Starting validation on {total_images} images...")

for filename, expected_plate in ground_truth.items():
    img_path = os.path.join(RAW_FRAMES_DIR, filename)
    if not os.path.exists(img_path):
        print(f"File missing: {img_path}")
        continue
        
    img = cv2.imread(img_path)
    if img is None:
        print(f"Could not read image: {img_path}")
        continue
        
    h, w = img.shape[:2]
    # Since we don't have frontend vehicle detection, assume the frame is the vehicle crop, 
    # or the vehicle dominates the frame.
    vehicle_box = [0, 0, w, h]
    vehicle_crop = img.copy()
    
    cv2.imwrite(os.path.join(VEHICLE_CROPS_DIR, filename), vehicle_crop)
    
    start_time = time.time()
    
    # 1. Run actual YOLO
    results = main.model(vehicle_crop, conf=0.25)
    
    if len(results) == 0 or len(results[0].boxes) == 0:
        detected_plate = ""
        ocr_conf = 0.0
        plate_conf = 0.0
        exact_match = False
        char_acc = 0.0
        
        # Save failure
        cv2.imwrite(os.path.join(FAILURES_DIR, filename), img)
        failures += 1
        
        print(f"FRAME: {filename}")
        print(f"EXPECTED: {expected_plate}")
        print(f"OCR_RESULT: NONE (No Plate Detected)")
        print(f"VEHICLE_ID: NONE")
        print(f"VOTE_COUNT: 0")
        print(f"TRACK_ID: NONE")
        print(f"FINAL_RESPONSE: NONE")
        print("-" * 40)
    else:
        detected_count += 1
        best_box = results[0].boxes[0]
        plate_conf = float(best_box.conf[0])
        x1, y1, x2, y2 = map(int, best_box.xyxy[0])
        plate_crop = vehicle_crop[y1:y2, x1:x2]
        
        cv2.imwrite(os.path.join(PLATE_CROPS_DIR, filename), plate_crop)
        
        # 3. Run actual PaddleOCR A/B/C pipelines (as implemented in main.py)
        # To perfectly mimic main.py, we call the same exact extraction functions
        
        # A. Original
        res_a = main.ocr_model.ocr(plate_crop)
        text_a, conf_a = main.extract_ocr_text(res_a)
        
        # B. Upscaled
        img_b = main.enhance_b(plate_crop)
        res_b = main.ocr_model.ocr(img_b)
        text_b, conf_b = main.extract_ocr_text(res_b)
        
        # C. Thresh
        img_c = main.enhance_c(plate_crop)
        res_c = main.ocr_model.ocr(img_c)
        text_c, conf_c = main.extract_ocr_text(res_c)
        
        # Select best
        candidates = [
            (text_a, conf_a, "Pipeline A"),
            (text_b, conf_b, "Pipeline B"),
            (text_c, conf_c, "Pipeline C")
        ]
        
        best_text, best_conf, best_pipe = "", 0.0, ""
        for t, c, p in candidates:
            if t and c > best_conf:
                best_text, best_conf, best_pipe = t, c, p
                
        ocr_text = best_text
        ocr_conf = best_conf
        
        # Feed into tracking to test contamination
        vid, vcount, final_plate = main.trackers[CAMERA_ID].update(CAMERA_ID, vehicle_box, ocr_text, ocr_conf)
        
        exact_match = (final_plate == expected_plate)
        if exact_match:
            exact_match_count += 1
            char_acc = 100.0
        else:
            if final_plate and expected_plate:
                dist = 1.0 - difflib.SequenceMatcher(None, final_plate, expected_plate).ratio()
                char_acc = (1.0 - dist) * 100
            else:
                char_acc = 0.0
            false_positives += 1
            failures += 1
            
            # Save all mismatch crops
            fail_base = os.path.join(FAILURES_DIR, os.path.splitext(filename)[0])
            cv2.imwrite(f"{fail_base}_original.jpg", img)
            cv2.imwrite(f"{fail_base}_vehicle.jpg", vehicle_crop)
            cv2.imwrite(f"{fail_base}_plate.jpg", plate_crop)
            with open(f"{fail_base}_info.txt", "w") as info:
                info.write(f"EXPECTED: {expected_plate}\n")
                info.write(f"OCR_TEXT: {ocr_text}\n")
                info.write(f"FINAL_VOTE: {final_plate}\n")
                
        print(f"FRAME: {filename}")
        print(f"EXPECTED: {expected_plate}")
        print(f"OCR_RESULT: {ocr_text}")
        print(f"VEHICLE_ID: {vid}")
        print(f"VOTE_COUNT: {vcount}")
        print(f"TRACK_ID: {vid}")
        print(f"FINAL_RESPONSE: {final_plate}")
        print("-" * 40)
        
    proc_time = int((time.time() - start_time) * 1000)
    
    report_rows.append({
        "filename": filename,
        "expected_plate": expected_plate,
        "detected_plate": final_plate if 'final_plate' in locals() else "",
        "exact_match": str(exact_match).lower(),
        "character_accuracy": f"{char_acc:.2f}",
        "ocr_confidence": f"{ocr_conf:.4f}",
        "plate_confidence": f"{plate_conf:.4f}",
        "processing_time_ms": proc_time
    })

# Write report
with open(REPORT_CSV, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "filename", "expected_plate", "detected_plate", "exact_match", 
        "character_accuracy", "ocr_confidence", "plate_confidence", "processing_time_ms"
    ])
    writer.writeheader()
    writer.writerows(report_rows)

# Compute global metrics
det_rate = (detected_count / total_images * 100) if total_images > 0 else 0
exact_rate = (exact_match_count / total_images * 100) if total_images > 0 else 0
avg_char_acc = 0.0
if len(report_rows) > 0:
    avg_char_acc = sum(float(r["character_accuracy"]) for r in report_rows) / len(report_rows)

summary = f"""REAL-WORLD VALIDATION SUMMARY
=============================
Total Images: {total_images}
Detection Success Rate: {det_rate:.2f}%
OCR Exact Match Rate: {exact_rate:.2f}%
Character Accuracy Rate: {avg_char_acc:.2f}%
Failure Count: {failures}
False Positives: {false_positives}
"""

with open(SUMMARY_TXT, "w") as f:
    f.write(summary)

print(summary)
