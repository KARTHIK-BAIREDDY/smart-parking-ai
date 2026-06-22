import base64
import os
import time
import sys
from fastapi import FastAPI, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from pydantic import BaseModel  # type: ignore
import numpy as np  # type: ignore
import cv2  # type: ignore
from typing import List, Optional

app = FastAPI(title="ML ANPR Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "best.pt"
model = None
MODEL_LOADED = False

@app.on_event("startup")
def load_model():
    global model, MODEL_LOADED
    if not os.path.exists(MODEL_PATH):
        print("\n" + "="*60)
        print("CRITICAL ERROR: YOLOv8 weights file not found!")
        print(f"Missing file: {os.path.abspath(MODEL_PATH)}")
        print("Please run: python download_model.py")
        print("="*60 + "\n")
        sys.exit(1)
        
    try:
        from ultralytics import YOLO  # type: ignore
        print(f"Loading YOLO model from {MODEL_PATH}...")
        model = YOLO(MODEL_PATH)  # type: ignore
        
        # STEP 6: Startup Validation
        if "person" in model.names.values():
            raise RuntimeError("Invalid model loaded. COCO model detected.")
            
        MODEL_LOADED = True
        print("YOLO model loaded successfully!")
    except Exception as e:
        print(f"Failed to load YOLO model: {e}")
        sys.exit(1)

class DetectRequest(BaseModel):
    vehicleCrop: str

class BenchmarkRequest(BaseModel):
    images: List[str]

@app.get("/health")
def health_check():
    return {
        "status": "ok" if MODEL_LOADED else "error",
        "modelLoaded": MODEL_LOADED,
        "modelName": "ml-debi/yolov8-license-plate-detection",
        "version": "1.0.0"
    }

def process_base64_image(base64_string: str) -> Optional[np.ndarray]:
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.post("/detect-plate")
def detect_plate(req: DetectRequest):
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    try:
        img = process_base64_image(req.vehicleCrop)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        if model is None:
            raise HTTPException(status_code=503, detail="Model is None")

        print("--- YOLO VALIDATION AUDIT ---")
        print(f"MODEL NAMES: {model.names}")
        print(f"Num classes: {len(model.names)}")
        
        crop_height, crop_width = img.shape[:2]
        crop_area = crop_width * crop_height
        
        # Step 3: Save raw input
        cv2.imwrite("vehicle_crop.jpg", img)
        vis_img = img.copy()

        results = model.predict(source=img, conf=0.10, verbose=False)
        
        best_box = None
        best_conf = 0.0
        
        if results is not None:
            for r in results:
                if r.boxes is not None:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        cls_id = int(box.cls[0])
                        cls_name = model.names[cls_id] if model.names and cls_id in model.names else str(cls_id)
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        print(f"DETECTION: class_id={cls_id}, class_name={cls_name}, confidence={conf:.3f}, xyxy=[{x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}]")
                        
                        # Draw on vis_img
                        cv2.rectangle(vis_img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                        cv2.putText(vis_img, f"{cls_name} {conf:.2f}", (int(x1), int(y1)-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

                        if conf > best_conf:
                            best_conf = conf
                            converted_x = int(x1)
                            converted_y = int(y1)
                            converted_width = int(x2 - x1)
                            converted_height = int(y2 - y1)
                            
                            print(f"COORD CONVERSION: crop_width={crop_width}, crop_height={crop_height}")
                            print(f"raw_xyxy=[{x1:.2f}, {y1:.2f}, {x2:.2f}, {y2:.2f}]")
                            print(f"converted_x={converted_x}, converted_y={converted_y}, converted_width={converted_width}, converted_height={converted_height}")
                            
                            plate_area = converted_width * converted_height
                            ratio = plate_area / crop_area
                            print(f"AREA CHECK: ratio={ratio:.3f}")
                            
                            if ratio > 0.60:
                                print("LOG: YOLO_INVALID_BOX_TOO_LARGE")
                                best_conf = 0.0
                                converted_width = 0
                                converted_height = 0
                                converted_x = 0
                                converted_y = 0
                            
                            best_box = {
                                "x": converted_x,
                                "y": converted_y,
                                "width": converted_width,
                                "height": converted_height,
                                "confidence": float(best_conf)
                            }
        
        cv2.imwrite("yolo_raw_boxes.jpg", vis_img)
                    
        if best_box:
            return best_box
        else:
            return { "x": 0, "y": 0, "width": 0, "height": 0, "confidence": 0.0 }
            
    except Exception as e:
        print(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/benchmark")
def benchmark(req: BenchmarkRequest):
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    total_time = 0.0
    total_conf = 0.0
    success_count = 0
    
    try:
        for b64_img in req.images:
            img = process_base64_image(b64_img)
            if img is None:
                continue
                
            start_time = time.time()
            if model is None:
                continue
            results = model.predict(source=img, conf=0.10, verbose=False)
            elapsed = (time.time() - start_time) * 1000
            total_time += float(elapsed)
            
            best_conf = 0.0
            if results is not None:
                for r in results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            conf = float(box.conf[0])
                            if conf > best_conf:
                                best_conf = conf
                        
            if best_conf >= 0.40:
                success_count += 1
                total_conf += best_conf
                
        num_images = len(req.images)
        if num_images == 0:
            return { "avgInferenceMs": 0, "avgConfidence": 0, "successRate": 0 }
            
        return {
            "avgInferenceMs": total_time / num_images,
            "avgConfidence": total_conf / num_images,
            "successRate": success_count / num_images
        }
    except Exception as e:
        print(f"Benchmark error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-info")
def model_info():
    if model is None:
        return {"error": "Model not loaded"}
    
    file_size_mb = 0
    if os.path.exists(MODEL_PATH):
        file_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
        
    return {
        "modelPath": os.path.abspath(MODEL_PATH),
        "classCount": len(model.names),
        "classes": list(model.names.values()),
        "fileSizeMB": round(file_size_mb, 2)
    }

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
