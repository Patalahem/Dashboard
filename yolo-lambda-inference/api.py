from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import os
from botocore.exceptions import NoCredentialsError, ClientError

app = Flask(__name__)

# 100 MB max upload size
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# only allow your front-end’s origin for CORS preflight
CORS(app, origins=["https://www.sarenity-project.com"])

S3_BUCKET = "amplify-d1axuk0owb4pv8-ma-amplifyteamdrivebucket28-lr54pp9hbiro"
s3 = boto3.client("s3")


@app.route("/detect", methods=["POST"])
def detect():
    # 2. enforce origin on each POST
    origin = request.headers.get("Origin") or request.headers.get("Referer")
    if origin != "https://www.sarenity-project.com":
        return jsonify({"error": "Unauthorized origin"}), 403

    # lazy‐load your detection functions so that GET / stays fast
    from detect_airplane       import run_detection as detect_airplanes
    from detect_ship           import run_detection as detect_ships
    from detect_combined       import run_combined
    from detect_combined_model import run_detection as detect_combined_model

    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded"}), 400

    image     = request.files["image"]
    image_path = f"/tmp/{image.filename}"
    image.save(image_path)

    mode = request.form.get("mode", "airplane")
    if mode == "airplane":
        result = detect_airplanes(image_path)
    elif mode == "ship":
        result = detect_ships(image_path)
    elif mode == "both":
        result = run_combined(image_path)
    elif mode == "combinedModel":
        result = detect_combined_model(image_path)
    else:
        return jsonify({"error": "Invalid mode"}), 400

    detections     = result["detections"]
    annotated_path = result["annotated_path"]
    json_path      = result["json_path"]

    img_key  = f"processed/{os.path.basename(annotated_path)}"
    json_key = f"processed/{os.path.basename(json_path)}"

    try:
        s3.upload_file(annotated_path, S3_BUCKET, img_key)
        s3.upload_file(json_path,      S3_BUCKET, json_key)
    except NoCredentialsError:
        return jsonify({"error": "S3 credentials not available"}), 500
    except ClientError as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message":    "Detection completed",
        "s3_url":     f"https://{S3_BUCKET}.s3.amazonaws.com/{img_key}",
        "detections": detections,
        "filename":   os.path.basename(annotated_path),
        "json_key":   json_key
    })


@app.route("/", methods=["GET"])
def health_check():
    return "OK", 200


if __name__ == "__main__":
    # under gunicorn in prod this block is skipped
    app.run(host="0.0.0.0", port=8080)