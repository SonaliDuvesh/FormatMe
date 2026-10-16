import os
import json
import uuid
import time
from flask import Flask, request, jsonify, render_template, send_from_directory, abort
from werkzeug.utils import secure_filename

from converter.detector import detect_file_format
from converter.registry import FORMAT_INFO, get_available_conversions, get_settings_schema
from converter.engine import ConversionEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024
app.config["UPLOAD_DIR"] = UPLOAD_DIR
app.config["OUTPUT_DIR"] = OUTPUT_DIR

engine = ConversionEngine(output_dir=OUTPUT_DIR)

@app.before_request
def ensure_directories_exist():
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)
    os.makedirs(app.config["OUTPUT_DIR"], exist_ok=True)

@app.errorhandler(500)
def handle_internal_error(e):
    return jsonify({"error": "Internal server error occurred.", "details": str(e)}), 500

@app.errorhandler(413)
def handle_too_large(e):
    return jsonify({"error": "File exceeds allowable size limit (500 MB)."}), 413

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/detect", methods=["POST"])
def detect_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)
    safe_name = secure_filename(file.filename) or "upload.bin"
    temp_id = uuid.uuid4().hex
    temp_path = os.path.join(app.config["UPLOAD_DIR"], f"{temp_id}_{safe_name}")
    try:
        file.save(temp_path)
    except Exception as e:
        return jsonify({"error": f"Failed to save upload: {str(e)}"}), 500

    try:
        detection = detect_file_format(temp_path, safe_name)
        file_size = os.path.getsize(temp_path)
        available_targets = get_available_conversions(detection["format"], detection["category"])

        targets_with_settings = []
        for t in available_targets:
            settings = get_settings_schema(detection["format"], t["target"])
            targets_with_settings.append({
                **t,
                "settings": settings
            })

        return jsonify({
            "success": True,
            "temp_file_id": f"{temp_id}_{safe_name}",
            "filename": safe_name,
            "size": file_size,
            "detection": detection,
            "available_targets": targets_with_settings
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/convert", methods=["POST"])
def convert():
    temp_file_id = request.form.get("temp_file_id")
    target_format = request.form.get("target_format")
    options_json = request.form.get("options", "{}")
    
    try:
        options = json.loads(options_json) if options_json else {}
    except Exception:
        options = {}

    file_path = None
    original_filename = None

    if temp_file_id:
        safe_temp_id = secure_filename(temp_file_id)
        candidate_path = os.path.join(app.config["UPLOAD_DIR"], safe_temp_id)
        if os.path.exists(candidate_path):
            file_path = candidate_path
            original_filename = safe_temp_id.split("_", 1)[-1] if "_" in safe_temp_id else safe_temp_id

    if not file_path and "file" in request.files:
        file = request.files["file"]
        if file.filename != "":
            safe_name = secure_filename(file.filename)
            temp_id = uuid.uuid4().hex
            file_path = os.path.join(app.config["UPLOAD_DIR"], f"{temp_id}_{safe_name}")
            file.save(file_path)
            original_filename = safe_name

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "No valid input file provided or file expired."}), 400

    if not target_format:
        return jsonify({"error": "Target format is required."}), 400

    try:
        res = engine.convert_single_file(file_path, target_format, options, original_filename)
        output_basename = os.path.basename(res["output_path"])
        download_url = f"/download/{output_basename}"

        return jsonify({
            "success": True,
            "output_filename": res["output_filename"],
            "download_url": download_url,
            "target_format": res["target_format"],
            "output_size": res["output_size"],
            "time_taken": res["time_taken"]
        })
    except PermissionError as pe:
        return jsonify({"error": str(pe), "code": "PASSWORD_REQUIRED"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/combine-images-to-pdf", methods=["POST"])
def combine_images():
    file_ids = request.form.getlist("file_ids")
    files = request.files.getlist("files")
    pdf_title = request.form.get("title", "combined_images.pdf")

    input_paths = []

    for fid in file_ids:
        safe_fid = secure_filename(fid)
        p = os.path.join(app.config["UPLOAD_DIR"], safe_fid)
        if os.path.exists(p):
            input_paths.append(p)

    for f in files:
        if f.filename:
            safe_name = secure_filename(f.filename)
            temp_path = os.path.join(app.config["UPLOAD_DIR"], f"{uuid.uuid4().hex}_{safe_name}")
            f.save(temp_path)
            input_paths.append(temp_path)

    if not input_paths:
        return jsonify({"error": "No valid images provided."}), 400

    try:
        res = engine.combine_multiple_images_to_pdf(input_paths, pdf_title)
        output_basename = os.path.basename(res["output_path"])
        return jsonify({
            "success": True,
            "output_filename": res["output_filename"],
            "download_url": f"/download/{output_basename}",
            "output_size": res["output_size"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/merge-pdfs", methods=["POST"])
def merge_pdf_route():
    file_ids = request.form.getlist("file_ids")
    files = request.files.getlist("files")
    output_name = request.form.get("output_name", "merged_document.pdf")

    input_paths = []
    for fid in file_ids:
        safe_fid = secure_filename(fid)
        p = os.path.join(app.config["UPLOAD_DIR"], safe_fid)
        if os.path.exists(p):
            input_paths.append(p)

    for f in files:
        if f.filename:
            safe_name = secure_filename(f.filename)
            temp_path = os.path.join(app.config["UPLOAD_DIR"], f"{uuid.uuid4().hex}_{safe_name}")
            f.save(temp_path)
            input_paths.append(temp_path)

    if len(input_paths) < 2:
        return jsonify({"error": "At least 2 PDF documents are required to merge."}), 400

    try:
        res = engine.merge_multiple_pdfs(input_paths, output_name)
        output_basename = os.path.basename(res["output_path"])
        return jsonify({
            "success": True,
            "output_filename": res["output_filename"],
            "download_url": f"/download/{output_basename}",
            "output_size": res["output_size"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/batch-convert", methods=["POST"])
def batch_convert():
    data = request.get_json()
    if not data or "items" not in data:
        return jsonify({"error": "Invalid batch payload."}), 400

    results = []
    output_paths = []

    for item in data["items"]:
        temp_file_id = item.get("temp_file_id")
        target_format = item.get("target_format")
        options = item.get("options", {})
        original_filename = item.get("filename")

        safe_temp_id = secure_filename(temp_file_id) if temp_file_id else None
        file_path = os.path.join(app.config["UPLOAD_DIR"], safe_temp_id) if safe_temp_id else None

        if not file_path or not os.path.exists(file_path):
            results.append({"filename": original_filename, "success": False, "error": "File not found"})
            continue

        try:
            res = engine.convert_single_file(file_path, target_format, options, original_filename)
            output_basename = os.path.basename(res["output_path"])
            output_paths.append(res["output_path"])
            results.append({
                "filename": original_filename,
                "output_filename": res["output_filename"],
                "download_url": f"/download/{output_basename}",
                "success": True,
                "size": res["output_size"],
                "time_taken": res["time_taken"]
            })
        except Exception as e:
            results.append({"filename": original_filename, "success": False, "error": str(e)})

    batch_zip_url = None
    if len(output_paths) > 1:
        zip_res = engine.create_batch_zip(output_paths, "batch_converted_files.zip")
        batch_zip_url = f"/download/{os.path.basename(zip_res['output_path'])}"

    return jsonify({
        "success": True,
        "results": results,
        "batch_zip_url": batch_zip_url
    })

@app.route("/api/bundle-zip", methods=["POST"])
def bundle_zip():
    data = request.get_json() or {}
    download_urls = data.get("download_urls", [])
    output_paths = []
    for u in download_urls:
        basename = os.path.basename(u)
        path = os.path.join(app.config["OUTPUT_DIR"], secure_filename(basename))
        if os.path.exists(path):
            output_paths.append(path)

    if len(output_paths) > 1:
        zip_res = engine.create_batch_zip(output_paths, "batch_converted_files.zip")
        return jsonify({
            "success": True,
            "zip_url": f"/download/{os.path.basename(zip_res['output_path'])}"
        })
    return jsonify({"error": "Not enough files to bundle"}), 400

@app.route("/download/<path:filename>")
def download_file(filename):
    safe_filename = secure_filename(filename)
    file_path = os.path.join(app.config["OUTPUT_DIR"], safe_filename)

    if not os.path.exists(file_path):
        abort(404)

    download_name = safe_filename.split("_", 1)[-1] if "_" in safe_filename else safe_filename

    return send_from_directory(
        app.config["OUTPUT_DIR"],
        safe_filename,
        as_attachment=True,
        download_name=download_name
    )

@app.route("/api/system-info")
def system_info():
    import subprocess
    import shutil

    ffmpeg_installed = shutil.which("ffmpeg") is not None
    soffice_installed = shutil.which("soffice") is not None
    tesseract_installed = (shutil.which("tesseract") is not None) or os.path.exists("/home/linuxbrew/.linuxbrew/bin/tesseract")

    return jsonify({
        "ffmpeg": ffmpeg_installed,
        "libreoffice": soffice_installed,
        "tesseract_ocr": tesseract_installed,
        "pymupdf": True,
        "pillow": True,
        "openpyxl": True,
        "python_docx": True
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
