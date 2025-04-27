import os
from detect_airplane import run_detection as detect_airplanes
from detect_ship import run_detection as detect_ships
from utils.draw_boxes import draw_boxes
from utils.save_json import save_detections_as_json

def run_combined(image_path):
    airplane_result = detect_airplanes(image_path)
    ship_result = detect_ships(image_path)

    all_detections = airplane_result["detections"] + ship_result["detections"]

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    output_image = f"/tmp/{base_name}_combined_annotated.jpg"
    output_json = f"/tmp/{base_name}_combined_detections.json"

    draw_boxes(image_path, all_detections, output_image)
    save_detections_as_json(all_detections, output_json)

    return {
        "detections": all_detections,
        "annotated_path": output_image,
        "json_path":      output_json
    }
