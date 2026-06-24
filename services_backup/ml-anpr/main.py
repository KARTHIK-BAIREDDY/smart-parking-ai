import os

# Fix for PaddlePaddle 3.0 OneDNN Bug on Windows
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"
import cv2
import json
import uuid
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from paddleocr import PaddleOCR
from collections import defaultdict
import time
from scipy.optimize import linear_sum_assignment

app = FastAPI(title="ML ANPR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://autopark-ai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
model_path = 'plate_detector.pt'
abs_model_path = os.path.abspath(model_path)
print("MODEL_FILE_EXISTS:", os.path.exists(abs_model_path))
if os.path.exists(abs_model_path):
    print("MODEL_FILE_SIZE:", os.path.getsize(abs_model_path))
print("ABSOLUTE_MODEL_PATH:", abs_model_path)

if not os.path.exists(abs_model_path):
    raise RuntimeError(f"{model_path} not found")

try:
    plate_model = YOLO(model_path)
except Exception as e:
    raise RuntimeError(f"Failed to load {model_path}: {e}")

print("MODEL_CLASSES:", plate_model.names)
invalid_classes = ['person', 'car', 'truck', 'bus', 'motorcycle']
if any(c in plate_model.names.values() for c in invalid_classes):
    raise RuntimeError("Wrong model loaded. Contains generic COCO classes instead of dedicated plate classes.")

ocr_model = PaddleOCR(use_angle_cls=True, lang='en', enable_mkldnn=False)

print("========== ANPR STARTUP ==========")
print("MODEL_FILENAME:", os.path.basename(abs_model_path))
print("MODEL_CLASSES:", plate_model.names)
print("MODEL_SOURCE:", "Koushim/yolov8-license-plate-detection (HuggingFace)")
print("MODEL_PATH:", getattr(plate_model, "ckpt_path", "UNKNOWN"))
print("OCR_ENGINE:", type(ocr_model).__name__)
print("==================================")

# Simple IoU based tracker
class SimpleTracker:
    def __init__(self, max_time_gap=3.0, max_frame_gap=30, area_tolerance=0.4):
        # tracks[id] = { 'box': [x,y,w,h], 'last_seen_time': float, 'last_seen_frame': int, 'dominant_plate': str, 'vehicle_type': str }
        self.tracks = {}
        self.next_id = 1
        self.max_time_gap = max_time_gap
        self.max_frame_gap = max_frame_gap
        self.area_tolerance = area_tolerance
        self.frame_counter = 0

    def iou(self, boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
        yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])

        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0:
            return 0

        boxAArea = boxA[2] * boxA[3]
        boxBArea = boxB[2] * boxB[3]
        return interArea / float(boxAArea + boxBArea - interArea)

    def is_area_similar(self, boxA, boxB):
        areaA = boxA[2] * boxA[3]
        areaB = boxB[2] * boxB[3]
        if areaA == 0 or areaB == 0: return False
        ratio = areaA / areaB if areaA < areaB else areaB / areaA
        return (1.0 - ratio) <= self.area_tolerance

    def expire_tracks(self, current_time, camera_id):
        expired = []
        for tid, tinfo in self.tracks.items():
            time_gap = current_time - tinfo['last_seen_time']
            frame_gap = self.frame_counter - tinfo['last_seen_frame']
            
            if time_gap > self.max_time_gap or frame_gap > self.max_frame_gap:
                expired.append(tid)
                
        for tid in expired:
            print(f"TRACK_EXPIRED: {tid} (Time gap or frame gap exceeded)")
            self.remove_track(tid, camera_id)

    def remove_track(self, tid, camera_id):
        if tid in self.tracks:
            del self.tracks[tid]
            print(f"TRACK_REMOVED: {tid}")
        if camera_id in vehicle_votes and tid in vehicle_votes[camera_id]:
            del vehicle_votes[camera_id][tid]
            print(f"VOTE_BUCKET_CLEARED: {tid}")

    def update(self, detection_box, current_time, current_plate, camera_id, vehicle_type=None):
        self.frame_counter += 1
        self.expire_tracks(current_time, camera_id)

        best_iou = 0
        best_track_id = None

        for track_id, track_info in self.tracks.items():
            iou_val = self.iou(detection_box, track_info['box'])
            if iou_val > best_iou:
                best_iou = iou_val
                best_track_id = track_id

        # Check conditions for track continuation
        if best_track_id is not None and best_iou >= 0.3:
            tinfo = self.tracks[best_track_id]
            area_ok = self.is_area_similar(detection_box, tinfo['box'])
            
            # Plate drift check
            plate_ok = True
            if current_plate and is_valid_indian_plate(current_plate):
                dom = tinfo.get('dominant_plate')
                if dom and dom != current_plate:
                    # If the dominant plate differs from the newly detected high-confidence plate
                    plate_ok = False
            
            if area_ok and plate_ok and (not vehicle_type or not tinfo.get('vehicle_type') or tinfo.get('vehicle_type') == vehicle_type):
                self.tracks[best_track_id]['box'] = detection_box
                self.tracks[best_track_id]['last_seen_time'] = current_time
                self.tracks[best_track_id]['last_seen_frame'] = self.frame_counter
                self.tracks[best_track_id]['vehicle_type'] = vehicle_type
                print(f"TRACK_UPDATED: {best_track_id}")
                return best_track_id
            else:
                reason = "Area change or plate drift"
                if vehicle_type and tinfo.get('vehicle_type') and tinfo.get('vehicle_type') != vehicle_type:
                    old_type = tinfo.get('vehicle_type')
                    print("TRACK_ID:", best_track_id)
                    print("PREVIOUS_TYPE:", old_type)
                    print("CURRENT_TYPE:", vehicle_type)
                    print(f"TRACK_EXPIRED: vehicle type change {old_type} -> {vehicle_type}")
                    reason = f"Vehicle type changed: {old_type} -> {vehicle_type}"
                print(f"TRACK_EXPIRED: {best_track_id} ({reason})")
                self.remove_track(best_track_id, camera_id)
                print("ACTIVE_TRACKS:", list(self.tracks.keys()))
                print("ACTIVE_VOTE_BUCKETS:", list(vehicle_votes[camera_id].keys()))

        # Create new track
        track_id = self.next_id
        self.tracks[track_id] = {
            'box': detection_box, 
            'last_seen_time': current_time, 
            'last_seen_frame': self.frame_counter,
            'dominant_plate': current_plate if current_plate and is_valid_indian_plate(current_plate) else None,
            'vehicle_type': vehicle_type
        }
        self.next_id += 1
        print(f"TRACK_CREATED: {track_id}")
        print(f"VOTE_BUCKET_CREATED: {track_id}")
        return track_id

    def update_dominant_plate(self, tid, plate):
        if tid in self.tracks and plate and is_valid_indian_plate(plate):
            self.tracks[tid]['dominant_plate'] = plate

# Directory creation for persistent debug crops
os.makedirs("debug_crops/original", exist_ok=True)
os.makedirs("debug_crops/enhanced", exist_ok=True)
os.makedirs("debug_crops/failed", exist_ok=True)
os.makedirs("debug_crops/successful", exist_ok=True)

def enhance_b(img):
    # CLAHE -> Upscale (3x)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl1 = clahe.apply(gray)
    h, w = cl1.shape[:2]
    upscaled = cv2.resize(cl1, (w*3, h*3), interpolation=cv2.INTER_CUBIC)
    # Convert back to BGR for PaddleOCR
    return cv2.cvtColor(upscaled, cv2.COLOR_GRAY2BGR)

def enhance_c(img):
    # CLAHE -> Bilateral -> Adaptive Threshold
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl1 = clahe.apply(gray)
    blur = cv2.bilateralFilter(cl1, 11, 17, 17)
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

# Global state
trackers = defaultdict(SimpleTracker)
# vehicle_votes: {camera_id: {vehicle_id: [ {text: str, conf: float} ]}}
vehicle_votes = defaultdict(lambda: defaultdict(list))

import re

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
    # Clean up non-alphanumeric chars
    best_text = re.sub(r'[^A-Z0-9]', '', best_text.upper())
    return best_text, best_conf

def get_majority_vote(votes):
    if not votes:
        return "", 0.0
    
    text_scores = defaultdict(float)
    text_confs = defaultdict(list)
    
    for vote in votes:
        text = vote['text']
        conf = vote['conf']
        
        score = conf
        if is_valid_indian_plate(text):
            score *= 2.0
            
        text_scores[text] += score
        text_confs[text].append(conf)
        
    best_text = max(text_scores, key=text_scores.get)
    avg_conf = sum(text_confs[best_text]) / len(text_confs[best_text])
    return best_text, avg_conf

@app.post("/detect")
async def detect_plate(
    file: UploadFile = File(...), 
    camera_id: str = Form(...),
    vehicle_box: str = Form(...), # JSON string "[x,y,w,h]"
    vehicle_type: str = Form(None)
):
    print("========== DETECT REQUEST ==========")
    print("CAMERA_ID:", camera_id)
    print("VEHICLE_TYPE:", vehicle_type)
    print("ALL_VOTE_KEYS:", list(vehicle_votes.keys()))
    tracker_context = trackers.get(camera_id)
    print("TRACKS_BEFORE:", tracker_context.tracks if tracker_context else {})
    print("VOTE_BUCKETS_BEFORE:", dict(vehicle_votes.get(camera_id, {})))

    assert vehicle_type is not None, "Vehicle type must be provided by frontend"
    assert vehicle_type != "", "Vehicle type cannot be empty"
    print("VEHICLE_TYPE_RECEIVED:", vehicle_type)
    print("TIMESTAMP:", time.time())
    print("VEHICLE_TYPE_RECEIVED:", vehicle_type)
    print("CAMERA_ID:", camera_id)
    start_time = time.time()
    
    try:
        # 1. Parse vehicle box
        v_box = json.loads(vehicle_box) # [x, y, w, h]
        
        # 3. Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        os.makedirs("debug_frames", exist_ok=True)
        filename = f"debug_frames/{int(time.time()*1000)}.jpg"
        cv2.imwrite(filename, img)
        print("FRAME_SAVED:", filename)
        
        if img is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image format"})
            
        # 4. Plate Detection (YOLO)
        # Assuming the image sent is the FULL frame to keep context, 
        # or it's the vehicle crop. 
        # If the frontend sends the FULL frame, we should crop the vehicle first to focus YOLO.
        # Let's assume frontend sends the vehicle crop for bandwidth efficiency, 
        # or we just run YOLO on whatever is sent.
        # Actually, running YOLO on the vehicle crop is faster and more accurate.
        results = plate_model(img, conf=0.35, verbose=False)
        print("YOLO_BOX_COUNT:", len(results[0].boxes))
        
        yolo_classes = []
        yolo_confidences = []
        plate_box = None
        best_plate_conf = 0.0
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                cls_name = plate_model.names.get(cls_id, str(cls_id))
                conf = box.conf[0].item()
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                yolo_classes.append(cls_name)
                yolo_confidences.append(conf)
                
                print("CLASS:", cls_name)
                print("CONFIDENCE:", conf)
                print("BOX:", [x1, y1, x2, y2])
                
                if cls_name.lower() not in ["plate", "license_plate"]:
                    continue
                
                if conf > best_plate_conf:
                    best_plate_conf = conf
                    plate_box = [x1, y1, x2 - x1, y2 - y1]
                    print("PLATE_BOX:", plate_box)
                    print("PLATE_CONFIDENCE:", conf)
                    
        print("YOLO_CLASSES:", yolo_classes)
        print("YOLO_CONFIDENCES:", yolo_confidences)
                    
        plate_text = ""
        ocr_conf = 0.0
        
        if plate_box is not None:
            # 5. PaddleOCR on Plate Crop
            x, y, w, h = [int(v) for v in plate_box]
            # Ensure within bounds
            x = max(0, x)
            y = max(0, y)
            w = min(img.shape[1] - x, w)
            h = min(img.shape[0] - y, h)
            
            if w <= 0 or h <= 0:
                return JSONResponse(status_code=400, content={"error": "Invalid plate crop dimensions", "plateText": "", "confidence": 0})
                
            plate_crop = img[y:y+h, x:x+w]
            
            crop_h, crop_w = plate_crop.shape[:2]
            aspect_ratio = crop_w / crop_h if crop_h > 0 else 0
            
            print("PLATE_CROP_WIDTH:", crop_w)
            print("PLATE_CROP_HEIGHT:", crop_h)
            print("PLATE_ASPECT_RATIO:", aspect_ratio)
            
            if crop_w < 40 or crop_h < 15 or aspect_ratio < 1.5 or aspect_ratio > 8.0:
                return JSONResponse(status_code=400, content={"error": "invalid_plate_crop"})
            
            cv2.imwrite("debug_plate_crop.jpg", plate_crop)
            print("PLATE_CROP_SHAPE:", plate_crop.shape)
            
            if plate_crop.size == 0:
                return JSONResponse(status_code=400, content={"error": "Empty plate crop", "plateText": "", "confidence": 0})
                
            timestamp = int(time.time() * 1000)
            base_filename = f"{timestamp}_{camera_id}"
            
            ocr_start = time.time()
            
            # Pipeline A: Original
            res_a = ocr_model.ocr(plate_crop)
            text_a, conf_a = extract_ocr_text(res_a)
            cv2.imwrite(f"debug_crops/original/{base_filename}_A.jpg", plate_crop)
            
            # Pipeline B: CLAHE -> Upscale
            img_b = enhance_b(plate_crop)
            res_b = ocr_model.ocr(img_b)
            text_b, conf_b = extract_ocr_text(res_b)
            cv2.imwrite(f"debug_crops/enhanced/{base_filename}_B.jpg", img_b)
            
            # Pipeline C: CLAHE -> Bilateral -> Adaptive Threshold
            img_c = enhance_c(plate_crop)
            res_c = ocr_model.ocr(img_c)
            text_c, conf_c = extract_ocr_text(res_c)
            cv2.imwrite(f"debug_crops/enhanced/{base_filename}_C.jpg", img_c)
            
            ocr_time_ms = int((time.time() - ocr_start) * 1000)
            
            print(f"--- OCR PIPELINE A/B/C [{ocr_time_ms}ms] ---")
            print(f"A (Original): '{text_a}' (conf: {conf_a:.3f})")
            print(f"B (Upscaled): '{text_b}' (conf: {conf_b:.3f})")
            print(f"C (Thresh):   '{text_c}' (conf: {conf_c:.3f})")
            
            # Prioritize valid indian plate, then confidence
            options = [
                (text_a, conf_a, 'A', plate_crop), 
                (text_b, conf_b, 'B', img_b), 
                (text_c, conf_c, 'C', img_c)
            ]
            
            best_opt = None
            for text, conf, name, img in options:
                if is_valid_indian_plate(text):
                    if best_opt is None or conf > best_opt[1] or not is_valid_indian_plate(best_opt[0]):
                        best_opt = (text, conf, name, img)
            
            if best_opt is None:
                # no valid indian plate found, fallback to max confidence
                best_opt = max(options, key=lambda x: x[1])
                
            plate_text, ocr_conf, final_name, final_img = best_opt
            print(f"SELECTED: Pipeline {final_name} -> '{plate_text}' (conf: {ocr_conf:.3f})")
            
            if is_valid_indian_plate(plate_text):
                cv2.imwrite(f"debug_crops/successful/{base_filename}_selected_{final_name}.jpg", final_img)
            else:
                cv2.imwrite(f"debug_crops/failed/{base_filename}_selected_{final_name}.jpg", final_img)
            
            print("OCR_RAW_TEXT:", plate_text)
            print("OCR_CONFIDENCE:", ocr_conf)
        
        # 6. Track vehicle & Voting
        tracker = trackers[camera_id]
        vehicle_id = tracker.update(v_box, time.time(), plate_text, camera_id, vehicle_type)
        print("VEHICLE_ID:", vehicle_id)
        
        if plate_text:
            tracker.update_dominant_plate(vehicle_id, plate_text)
            vehicle_votes[camera_id][vehicle_id].append({
                'text': plate_text,
                'conf': ocr_conf * 100 # percentage
            })
            
        votes = vehicle_votes[camera_id][vehicle_id]
        
        # Dump vote bucket before final vote
        print("CURRENT_VOTE_BUCKET:", votes)
        
        final_text, final_conf = get_majority_vote(votes)
        print("FINAL_VOTE:", final_text)
        print("RETURNING_PLATE:", final_text)
        print("FRAME_COUNT:", len(votes))
        
        for idx, v in enumerate(votes):
            print(f"FRAME_{idx+1}_TEXT:", v['text'])
            
        
        print("========== VEHICLE TRACE ==========")
        print("TRACK_ID:", vehicle_id)
        print("OCR_RAW_TEXT:", plate_text)
        print("FINAL_VOTE:", final_text)
        print("VEHICLE_TYPE:", vehicle_type)
        print("VOTE_BUCKET:", vehicle_votes[camera_id].get(vehicle_id))
        print("ACTIVE_TRACKS:", list(tracker.tracks.keys()))
        print("===================================")
        
        processing_time = int((time.time() - start_time) * 1000)
        
        print("========== DETECT RESPONSE ==========")
        print("OCR_RAW_TEXT:", plate_text)
        print("OCR_CONFIDENCE:", ocr_conf)
        print("TRACK_ID:", vehicle_id)
        print("FINAL_VOTE:", final_text)
        print("TRACKS_AFTER:", tracker.tracks)
        print("VOTE_BUCKETS_AFTER:", dict(vehicle_votes.get(camera_id, {})))
        
        response_data = {
            "plateText": final_text,
            "confidence": final_conf,
            "plateBox": plate_box,
            "plateConfidence": best_plate_conf,
            "vehicleId": f"V{vehicle_id}",
            "voteCount": len(votes),
            "frameCount": len(votes),
            "processingTime": processing_time
        }
        
        print("BACKEND_RESPONSE:", response_data)
        return response_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/clear_state")
async def clear_state(camera_id: str = Form(...)):
    print("CLEAR_STATE CALLED")
    print("CAMERA:", camera_id)
    print("CLEAR_STATE_CALLED")
    print("CAMERA_ID:", camera_id)
    print(f"========== CLEARING STATE FOR CAMERA {camera_id} ==========")
    
    cleared_tracks = 0
    if camera_id in trackers:
        cleared_tracks = len(trackers[camera_id].tracks)
        trackers[camera_id].tracks.clear()
        print(f"CLEARED {cleared_tracks} TRACKS")
        
    if camera_id in vehicle_votes:
        vehicle_votes[camera_id].clear()
        print("CLEARED VOTE BUCKETS")
        
    return {"status": "success", "cleared_tracks": cleared_tracks}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
