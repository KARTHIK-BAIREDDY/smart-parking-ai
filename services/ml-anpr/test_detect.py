import requests
import json
import time

url = "http://127.0.0.1:8000/detect"
image_path = r"C:\Users\Lenovo\Documents\smart parking\public\audit-reports\failures\1782155489882-8LV9275\2_vehicle_crop.jpg"

with open(image_path, "rb") as f:
    files = {"file": ("2_vehicle_crop.jpg", f, "image/jpeg")}
    import uuid
    vid = str(uuid.uuid4())
    data = {
        "camera_id": "test_cam",
        "vehicle_box": json.dumps([0, 0, 1000, 1000]),
        "vehicle_id": vid
    }
    
    for i in range(5):
        try:
            f.seek(0)
            print(f"\n--- Sending request {i+1} ---")
            res = requests.post(url, files={"file": ("2_vehicle_crop.jpg", f, "image/jpeg")}, data=data)
            print("Response status:", res.status_code)
            print("Response body:", res.text)
        except requests.exceptions.ConnectionError:
            print("Waiting for server...")
            time.sleep(2)
