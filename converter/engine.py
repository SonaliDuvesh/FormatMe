import os
import time
import shutil
import tempfile
import uuid
from .detector import detect_file_format
from .registry import FORMAT_INFO, get_available_conversions
from .image_converter import convert_image, combine_images_to_pdf, extract_image_text
from .pdf_converter import convert_pdf_to_images, merge_pdfs, extract_pdf_text, extract_pdf_html
from .video_converter import convert_video, extract_audio
from .audio_converter import convert_audio, convert_audio_to_video
from .doc_converter import convert_document
from .archive_converter import convert_archive, create_zip_from_files

MAX_FILE_SIZE = 500 * 1024 * 1024

class ConversionEngine:
    def __init__(self, output_dir=None):
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "outputs")
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def convert_single_file(self, input_path, target_format, options=None, original_filename=None):
        options = options or {}
        start_time = time.time()

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        file_size = os.path.getsize(input_path)
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed limit (500 MB).")

        detection = detect_file_format(input_path, original_filename)
        src_format = detection["format"]
        src_category = detection["category"]

        orig_name = original_filename or os.path.basename(input_path)
        orig_lower = orig_name.lower()
        if orig_lower.endswith('.tar.gz'):
            base_name = orig_name[:-7]
        elif orig_lower.endswith('.tar.bz2'):
            base_name = orig_name[:-8]
        elif orig_lower.endswith('.tar.xz'):
            base_name = orig_name[:-7]
        else:
            base_name = os.path.splitext(orig_name)[0]

        target_format = target_format.lower()
        if target_format in ('jpg', 'jpeg'):
            target_ext = 'jpg'
        else:
            target_ext = FORMAT_INFO.get(target_format, {}).get("ext", target_format)

        output_filename = f"{base_name}_converted.{target_ext}"
        output_path = os.path.join(self.output_dir, f"{uuid.uuid4().hex}_{output_filename}")

        actual_output_path = None

        if src_format == "pdf":
            if target_format == "zip":
                page_fmt = options.get("page_format", "png").lower()
                opts = dict(options)
                opts["pdf_mode"] = "zip"
                output_filename = f"{base_name}_pages.zip"
                output_path = os.path.join(self.output_dir, f"{uuid.uuid4().hex}_{output_filename}")
                actual_output_path = convert_pdf_to_images(input_path, output_path, page_fmt, opts)
            elif target_format in ("png", "jpeg", "webp", "tiff"):
                actual_output_path = convert_pdf_to_images(input_path, output_path, target_format, options)
                if actual_output_path.endswith('.zip') and not output_filename.endswith('.zip'):
                    output_filename = f"{base_name}_pages.zip"
            elif target_format == "txt":
                actual_output_path = extract_pdf_text(input_path, output_path, password=options.get("password"))
            elif target_format == "html":
                actual_output_path = extract_pdf_html(input_path, output_path, password=options.get("password"))
            elif target_format == "pdf":
                shutil.copyfile(input_path, output_path)
                actual_output_path = output_path
            else:
                raise ValueError(f"Unsupported conversion from PDF to {target_format}")

        elif src_category == "image":
            if target_format == "pdf":
                actual_output_path = combine_images_to_pdf([input_path], output_path)
            elif target_format in ("mp4", "webm"):
                actual_output_path = convert_video(input_path, output_path, target_format, options)
            elif target_format == "txt":
                actual_output_path = extract_image_text(input_path, output_path)
            else:
                actual_output_path = convert_image(input_path, output_path, target_format, options)

        elif src_category == "video":
            actual_output_path = convert_video(input_path, output_path, target_format, options)

        elif src_category == "audio":
            if target_format in ("mp4", "webm", "mkv", "avi", "mov"):
                actual_output_path = convert_audio_to_video(input_path, output_path, target_format, options)
            else:
                actual_output_path = convert_audio(input_path, output_path, target_format, options)

        elif src_category in ("document", "data"):
            actual_output_path = convert_document(input_path, output_path, src_format, target_format, options)

        elif src_category == "archive":
            actual_output_path = convert_archive(input_path, output_path, src_format, target_format, options)

        else:
            raise ValueError(f"Cannot convert from detected type '{src_format}' to '{target_format}'.")

        if not actual_output_path or not os.path.exists(actual_output_path):
            raise RuntimeError("Conversion failed: Output file was not generated.")

        out_size = os.path.getsize(actual_output_path)
        if out_size == 0:
            raise RuntimeError("Conversion failed: Output file is empty (0 bytes).")

        elapsed = round(time.time() - start_time, 2)
        final_filename = os.path.basename(actual_output_path).split('_', 1)[-1] if '_' in os.path.basename(actual_output_path) else os.path.basename(actual_output_path)

        ret_format = 'zip' if actual_output_path.endswith('.zip') else target_format

        return {
            "success": True,
            "output_path": actual_output_path,
            "output_filename": final_filename,
            "target_format": ret_format,
            "output_size": out_size,
            "time_taken": elapsed,
        }

    def combine_multiple_images_to_pdf(self, input_paths, output_filename="combined_images.pdf"):
        output_path = os.path.join(self.output_dir, f"{uuid.uuid4().hex}_{output_filename}")
        combine_images_to_pdf(input_paths, output_path)
        return {
            "success": True,
            "output_path": output_path,
            "output_filename": output_filename,
            "target_format": "pdf",
            "output_size": os.path.getsize(output_path)
        }

    def merge_multiple_pdfs(self, input_paths, output_filename="merged_document.pdf"):
        output_path = os.path.join(self.output_dir, f"{uuid.uuid4().hex}_{output_filename}")
        merge_pdfs(input_paths, output_path)
        return {
            "success": True,
            "output_path": output_path,
            "output_filename": output_filename,
            "target_format": "pdf",
            "output_size": os.path.getsize(output_path)
        }

    def create_batch_zip(self, file_paths, zip_filename="converted_batch.zip"):
        output_path = os.path.join(self.output_dir, f"{uuid.uuid4().hex}_{zip_filename}")
        create_zip_from_files(file_paths, output_path)
        return {
            "success": True,
            "output_path": output_path,
            "output_filename": zip_filename,
            "target_format": "zip",
            "output_size": os.path.getsize(output_path)
        }
