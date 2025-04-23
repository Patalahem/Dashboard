from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import os
from botocore.exceptions import NoCredentialsError, ClientError

app = Flask(__name__)
CORS(app)

S3_BUCKET = "amplify-d1axuk0owb4pv8-ma-amplifyteamdrivebucket28-lr54pp9hbiro"
s3 = boto3.client("s3")

@app.route("/detect", methods=["POST"])
def detect():
    # Lazy imports so startup (GET /) stays fast
    from detect_airplane import run_detection as detect_airplanes
    from detect_ship     import run_detection as detect_ships
    from detect_combined import run_combined

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

    detections  = result["detections"]
    output_path = result["annotated_path"]
    s3_key      = f"processed/{os.path.basename(output_path)}"

    try:
        s3.upload_file(output_path, S3_BUCKET, s3_key)
    except NoCredentialsError:
        return jsonify({"error": "S3 credentials not available"}), 500
    except ClientError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message":   "Detection completed",
        "s3_url":    f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}",
        "detections":detections,
        "filename":  os.path.basename(output_path)
    })

@app.route("/", methods=["GET"])
def health_check():
    return "OK", 200

if __name__ == "__main__":
    # We’re running under gunicorn so this block only hits local runs
    app.run(host="0.0.0.0", port=8080)
