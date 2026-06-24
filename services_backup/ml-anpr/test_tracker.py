import time
from collections import defaultdict
import main

# Reset global state
main.trackers.clear()
main.vehicle_votes.clear()

camera_id = "test-cam"
box = [100, 100, 200, 200]

def simulate_frame(plate_text, current_time, conf=0.99):
    tracker = main.trackers[camera_id]
    vehicle_id = tracker.update(box, current_time, plate_text, camera_id)
    
    if plate_text:
        tracker.update_dominant_plate(vehicle_id, plate_text)
        main.vehicle_votes[camera_id][vehicle_id].append({
            'text': plate_text,
            'conf': conf * 100
        })
        
    votes = main.vehicle_votes[camera_id][vehicle_id]
    final_text, final_conf = main.get_majority_vote(votes)
    
    print(f"OCR text: {plate_text}")
    print(f"vehicle_id: V{vehicle_id}")
    print(f"vote bucket contents: {votes}")
    print(f"final vote: {final_text}")
    print("-" * 40)

t = time.time()
print("=== Vehicle A ===")
simulate_frame("TN28CV9475", t)
simulate_frame("TN28CV9475", t + 0.1)

print("=== Vehicle B (Same Box, Plate changed) ===")
simulate_frame("MH12TR6518", t + 1.0)
simulate_frame("MH12TR6518", t + 1.1)

print("=== Vehicle C (Same Box, Timeout) ===")
simulate_frame("KA01AB1234", t + 5.0)
simulate_frame("KA01AB1234", t + 5.1)
