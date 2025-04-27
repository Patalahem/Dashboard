from ultralytics import YOLO
from utils.draw_boxes import draw_boxes
from utils.save_json import save_detections_as_json
import os

def run_detection(image_path):
    # load your single combined model
    model = YOLO("models/combined.pt")
    results = model(image_path)[0]

    # collect detections
    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        confidence = float(box.conf[0])
        class_id   = int(box.cls[0])
        detections.append({
            "class":      model.names[class_id],
            "confidence": confidence,
            "bbox":       [x1, y1, x2, y2]
        })

    # build output paths
    base_name    = os.path.splitext(os.path.basename(image_path))[0]
    output_image = f"/tmp/{base_name}_combined_annotated.jpg"
    output_json  = f"/tmp/{base_name}_combined_detections.json"

    # draw & save
    draw_boxes(image_path, detections, output_image)
    save_detections_as_json(detections, output_json)

    # return both annotated image and json paths
    return {
        "detections":     detections,
        "annotated_path": output_image,
        "json_path":      output_json
    }