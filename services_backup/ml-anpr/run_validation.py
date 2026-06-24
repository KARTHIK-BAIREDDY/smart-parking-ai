import os
import requests
import json
import re
import glob

# URL of the running ML service
URL = "http://127.0.0.1:8001/detect"

# Directory with test images
FAILURES_DIR = r"C:\Users\Lenovo\Documents\smart parking\public\audit-reports\failures"

def is_valid_indian_plate(text):
    text = re.sub(r'\s+', '', text).upper()
    pattern = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$'
    return bool(re.match(pattern, text))

def run_validation():
    print(f"Starting validation on images in {FAILURES_DIR}")
    
    # Get all 2_vehicle_crop.jpg files or 1_original_frame.jpg
    # Since we are testing plate detection inside vehicle crops, let's use 2_vehicle_crop.jpg
    image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "2_vehicle_crop.jpg"), recursive=True)
    
    if len(image_paths) == 0:
        # Fallback to original frame if vehicle crops not found
        image_paths = glob.glob(os.path.join(FAILURES_DIR, "**", "1_original_frame.jpg"), recursive=True)
        
    print(f"Found {len(image_paths)} images to test.")
    
    total_images = 0
    yolo_success = 0
    ocr_success = 0
    valid_format_count = 0
    
    sum_yolo_conf = 0.0
    sum_plate_conf = 0.0
    sum_ocr_conf = 0.0
    sum_aspect_ratio = 0.0
    
    for i, path in enumerate(image_paths):
        # We process a max of 50 images
        if i >= 50:
            break
            
        print(f"\nProcessing [{i+1}] {os.path.basename(os.path.dirname(path))}")
        total_images += 1
        
        with open(path, "rb") as f:
            files = {"file": (os.path.basename(path), f, "image/jpeg")}
            data = {
                "camera_id": "test_cam",
                # The entire image is the vehicle crop
                "vehicle_box": "[0, 0, 1000, 1000]"
            }
            try:
                response = requests.post(URL, files=files, data=data)
                
                if response.status_code == 200:
                    resp_json = response.json()
                    plate_box = resp_json.get("plateBox")
                    plate_text = resp_json.get("plateText", "")
                    ocr_conf = resp_json.get("confidence", 0)
                    
                    if plate_box and len(plate_box) == 4:
                        yolo_success += 1
                        sum_plate_conf += resp_json.get("plateConfidence", 0)
                        w, h = plate_box[2], plate_box[3]
                        if h > 0:
                            sum_aspect_ratio += (w / h)
                            
                    if plate_text:
                        ocr_success += 1
                        sum_ocr_conf += ocr_conf
                        if is_valid_indian_plate(plate_text):
                            valid_format_count += 1
                            print(f"  [VALID] {plate_text} (conf: {ocr_conf:.2f})")
                        else:
                            print(f"  [INVALID] {plate_text} (conf: {ocr_conf:.2f})")
                    else:
                        print("  [NO TEXT FOUND]")
                        
                else:
                    print(f"  API Error: {response.status_code}")
                    
            except Exception as e:
                print(f"  Request failed: {e}")

    # Metrics
    if total_images == 0:
        print("No images processed.")
        return
        
    print("\n" + "="*40)
    print("      VALIDATION METRICS REPORT")
    print("="*40)
    print(f"Total Images Processed: {total_images}")
    
    det_rate = (yolo_success / total_images) * 100
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

if __name__ == "__main__":
    run_validation()
