import urllib.request
import os

MODEL_URL = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
MODEL_PATH = "best.pt"

print(f"Downloading YOLOv8 License Plate Detection weights from: {MODEL_URL}")
print("Please wait, this may take a minute or two depending on your connection...")

try:
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    file_size = os.path.getsize(MODEL_PATH)
    print(f"\nDownload complete! Saved to {MODEL_PATH}")
    print(f"File size: {file_size / (1024 * 1024):.2f} MB")
except Exception as e:
    print(f"\nError downloading model: {e}")
    print("\nIf you are behind a firewall or offline, you must manually place 'best.pt' in the services/ml-anpr directory.")
