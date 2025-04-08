from PIL import Image, ImageDraw

def draw_boxes(image_path, detections, output_path):
    image = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(image)

    for det in detections:
        bbox = det["bbox"]
        label = f"{det['class']} ({det['confidence']:.2f})"
        draw.rectangle(bbox, outline="red", width=2)
        draw.text((bbox[0], bbox[1] - 10), label, fill="red")

    image.save(output_path)
