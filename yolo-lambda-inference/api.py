from flask import Flask, request, jsonify, send_file, send_from_directory
from detect_airplane import run_detection as detect_airplanes
from detect_ship import run_detection as detect_ships
from detect_combined import run_combined
import os

app = Flask(__name__)

@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded"}), 400

    image = request.files["image"]
    image_path = f"/tmp/{image.filename}"
    image.save(image_path)

    mode = request.form.get("mode", "airplane")
    if mode == "airplane":
        result = detect_airplanes(image_path)
    elif mode == "ship":
        result = detect_ships(image_path)
    elif mode == "both":
        result = run_combined(image_path)
    else:
        return jsonify({"error": "Invalid mode"}), 400

    annotated_path = result.get("annotated_path")
    if annotated_path and os.path.exists(annotated_path):
        return send_file(annotated_path, mimetype="image/jpeg")
    else:
        return jsonify(result)

# ✅ NEW: Serve annotated image separately
@app.route("/image/<filename>")
def get_image(filename):
    return send_from_directory("/tmp", filename)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)