import os
from ultralytics import YOLO
from PIL import Image
import io

def run_detection(event=None):
    model_path = "model.pt"
    test_image_path = "test.jpg"  # replace with your test image if local

    print(f"Loading model from {model_path}...")
    model = YOLO(model_path)

    print(f"Running inference on {test_image_path}...")
    results = model(test_image_path)

    # Extract detection info
    detections = results[0].boxes
    output = []

    for box in detections:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = box.conf[0].item()
        cls = int(box.cls[0].item())
        label = model.names[cls]
        output.append({
            "class": label,
            "confidence": round(conf, 4),
            "bbox": [x1, y1, x2, y2]
        })

    print("✅ Inference complete:")
    for item in output:
        print(item)

    return {
        "statusCode": 200,
        "body": output
    }
