import requests
import time
import json
import main
from threading import Thread
import uvicorn
import copy
import logging

logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)

# Mock OCR to return our test sequence
plate_sequence = [
    "MH12TR6518", "MH12TR6518", # CAR A
    "KA03MX4821", "KA03MX4821", # MOTORCYCLE B
]
seq_idx = 0

def mock_ocr(img):
    plate = plate_sequence[seq_idx % len(plate_sequence)]
    return [{'rec_texts': [plate], 'rec_scores': [0.99]}]

main.ocr_model.ocr = mock_ocr

class MockBox:
    def __init__(self):
        self.cls = [type('obj', (object,), {'item': lambda self: 0})()]
        self.conf = [type('obj', (object,), {'item': lambda self: 0.99})()]
        import numpy as np
        self.xyxy = np.array([[0, 0, 150, 50]])

class MockResult:
    def __init__(self):
        self.boxes = [MockBox()]

def mock_yolo(*args, **kwargs):
    return [MockResult()]

main.plate_model = mock_yolo
main.plate_model.names = {0: 'license_plate'}

def run_server():
    uvicorn.run(main.app, host="127.0.0.1", port=8002, log_level="critical")

server_thread = Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(3)

url = "http://127.0.0.1:8002/detect"
img_path = r"fake_image.jpg"
box = [100, 100, 200, 200]

def send_req(vtype="CAR"):
    global seq_idx
    with open(img_path, "rb") as f:
        files = {'file': ('frame.jpg', f, 'image/jpeg')}
        data = {'camera_id': 'entry-cam-1', 'vehicle_box': json.dumps(box), 'vehicle_type': vtype}
        r = requests.post(url, files=files, data=data)
        seq_idx += 1
        if r.status_code == 200:
            resp = r.json()
            return resp
        else:
            print("ERROR", r.text)
            return None

print("\n" + "="*50)
print("========== PROCESS VEHICLE A (CAR) ==========")
print("Frame 1:")
send_req("CAR")
print("Frame 2:")
send_req("CAR")

print("\nWAITING FOR CAR EXIT (No Track Expiration)...")
# Immediate arrival, no expiration gap
time.sleep(0.5)

print("\n========== PROCESS VEHICLE B (MOTORCYCLE) ==========")
print("Frame 1:")
send_req("MOTORCYCLE")
print("Frame 2:")
send_req("MOTORCYCLE")

print("\n========== MEMORY INSPECTION ==========")
active_tracks = len(main.trackers['entry-cam-1'].tracks)
vote_buckets = len(main.vehicle_votes['entry-cam-1'])
print("Active Tracks:", active_tracks)
print("Vote Buckets:", vote_buckets)

if active_tracks != vote_buckets:
    print("FAILURE: MEMORY LEAK")
else:
    print("SUCCESS: Memory perfectly matches tracks.")
