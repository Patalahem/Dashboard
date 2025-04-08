from ultralytics import YOLO
from utils.draw_boxes import draw_boxes
from utils.save_json import save_detections_as_json
import os

def run_detection(image_path):
    model = YOLO("models/ship.pt")
    results = model(image_path)[0]

    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        detections.append({
            "class": model.names[class_id],
            "confidence": confidence,
            "bbox": [x1, y1, x2, y2]
        })

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    output_image = f"/tmp/{base_name}_ship_annotated.jpg"
    output_json = f"/tmp/{base_name}_ship_detections.json"

    draw_boxes(image_path, detections, output_image)
    save_detections_as_json(detections, output_json)

    return {
        "detections": detections,
        "annotated_path": output_image
    }
