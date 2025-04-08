import json
import os

def save_detections_as_json(detections, output_path):
    with open(output_path, "w") as f:
        json.dump(detections, f, indent=4)
