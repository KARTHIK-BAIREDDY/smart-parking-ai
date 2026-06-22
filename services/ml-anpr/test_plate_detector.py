import sys
import os
import cv2  # type: ignore
import time

MODEL_PATH = "best.pt"

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_plate_detector.py <path_to_image>")
        sys.exit(1)

    img_path = sys.argv[1]
    
    if not os.path.exists(img_path):
        print(f"Error: File not found -> {img_path}")
        sys.exit(1)

    if not os.path.exists(MODEL_PATH):
        print(f"Error: YOLO weights not found -> {MODEL_PATH}")
        print("Run 'python download_model.py' first.")
        sys.exit(1)

    YOLO = None
    try:
        from ultralytics import YOLO  # type: ignore
    except ImportError:
        print("Error: ultralytics is not installed. Run 'pip install -r requirements.txt'")
        sys.exit(1)

    print(f"Loading model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)

    print(f"Loading image {img_path}...")
    img = cv2.imread(img_path)
    
    if img is None:
        print(f"Error: OpenCV could not read the image -> {img_path}")
        sys.exit(1)

    print("\nRunning inference...")
    start_time = time.time()
    
    results = model.predict(source=img, conf=0.10, verbose=False)
    
    elapsed = (time.time() - start_time) * 1000
    print(f"Inference complete in {elapsed:.2f} ms\n")

    best_conf = 0.0
    best_box = None

    if results is not None:
        for r in results:
            if r.boxes is not None:
                for box in r.boxes:
                    conf = float(box.conf[0])
                    if conf > best_conf:
                        best_conf = conf
                        best_box = box

    if best_box is not None:
        x1, y1, x2, y2 = best_box.xyxy[0].tolist()
        print("--- PLATE DETECTED ---")
        print(f"Confidence : {best_conf * 100:.2f}%")
        print(f"Box (x,y)  : ({int(x1)}, {int(y1)})")
        print(f"Dimensions : {int(x2 - x1)}W x {int(y2 - y1)}H")
        
        # Draw box and save
        cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
        label = f"Plate {best_conf:.2f}"
        cv2.putText(img, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        output_path = f"output_{os.path.basename(img_path)}"
        cv2.imwrite(output_path, img)
        print(f"Saved visualization to -> {output_path}")
    else:
        print("--- NO PLATE DETECTED ---")

if __name__ == "__main__":
    main()
