from flask import Flask, request, jsonify
from detect_airplane import run_detection as detect_airplanes
from detect_ship import run_detection as detect_ships
from detect_combined import run_combined
import os
import boto3
from botocore.exceptions import NoCredentialsError
from datetime import datetime

app = Flask(__name__)

# Configure AWS S3 (replace with your bucket name)
S3_BUCKET = "your-s3-bucket-name"
s3 = boto3.client("s3", region_name="us-east-1")

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
        s3_output = image.filename.replace(".jpg", "_airplane_annotated.jpg")
    elif mode == "ship":
        result = detect_ships(image_path)
        s3_output = image.filename.replace(".jpg", "_ship_annotated.jpg")
    elif mode == "both":
        result = run_combined(image_path)
        s3_output = image.filename.replace(".jpg", "_combined_annotated.jpg")
    else:
        return jsonify({"error": "Invalid mode"}), 400

    # Upload processed image to S3
    local_output_path = f"/tmp/{s3_output}"
    s3_key = f"processed/{s3_output}"
    try:
        s3.upload_file(local_output_path, S3_BUCKET, s3_key)
    except NoCredentialsError:
        return jsonify({"error": "S3 credentials not available"}), 500

    return jsonify({
        "message": "Success",
        "s3_key": s3_key
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8080)
