import os
import zipfile
from PIL import Image
import pymupdf
import pypdf

MAX_SAFE_HEIGHT = 32000
MAX_SAFE_PIXELS = 100_000_000

def open_pdf_document(input_path, password=None):
    doc = pymupdf.open(input_path)
    if doc.is_encrypted:
        if not password:
            raise PermissionError("The PDF is password-protected. Please provide a password.")
        if not doc.authenticate(password):
            raise PermissionError("Incorrect password for the protected PDF.")
    return doc

def convert_pdf_to_images(input_path, output_path, target_format="png", options=None):
    import io
    options = options or {}
    mode = options.get("pdf_mode", "zip")
    dpi = int(options.get("dpi", 150))
    password = options.get("password", None)
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)

    doc = open_pdf_document(input_path, password=password)
    page_count = len(doc)
    if page_count == 0:
        doc.close()
        raise ValueError("PDF document has 0 pages.")

    fmt = target_format.upper()
    if fmt == 'JPG':
        fmt = 'JPEG'
    save_kwargs = {}
    if fmt == 'JPEG':
        save_kwargs['quality'] = int(options.get('quality', 90))

    ext = target_format.lower()
    if ext == 'jpeg':
        ext = 'jpg'

    # If exactly 1 page and not explicitly saving as .zip file
    if page_count == 1 and mode != "zip" and not output_path.lower().endswith('.zip'):
        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()
        img.save(output_path, format=fmt, **save_kwargs)
        return output_path

    # If long_image mode explicitly chosen for multi-page PDF
    if mode == "long_image" and not output_path.lower().endswith('.zip'):
        rendered_images = []
        total_height = 0
        max_width = 0
        for i in range(page_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            rendered_images.append(img)
            total_height += pix.height
            if pix.width > max_width:
                max_width = pix.width
        doc.close()

        total_pixels = max_width * total_height
        if total_height <= MAX_SAFE_HEIGHT and total_pixels <= MAX_SAFE_PIXELS:
            combined = Image.new("RGB", (max_width, total_height), (255, 255, 255))
            current_y = 0
            for img in rendered_images:
                x_offset = (max_width - img.width) // 2
                combined.paste(img, (x_offset, current_y))
                current_y += img.height
            combined.save(output_path, format=fmt, **save_kwargs)
            return output_path
        # If it exceeds safe pixels, fall through to ZIP package

    # Default / ZIP mode: Stream pages directly into ZIP without disk writes or conflicts
    zip_path = output_path
    if not zip_path.lower().endswith('.zip'):
        zip_path = os.path.splitext(output_path)[0] + '.zip'

    digits = max(2, len(str(page_count)))
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for i in range(page_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            page_filename = f"page_{i+1:0{digits}d}.{ext}"
            img_buf = io.BytesIO()
            img.save(img_buf, format=fmt, **save_kwargs)
            zf.writestr(page_filename, img_buf.getvalue())
            img.close()

    doc.close()
    return zip_path

def merge_pdfs(input_paths, output_path):
    if not input_paths:
        raise ValueError("No PDF files provided for merging.")

    writer = pypdf.PdfWriter()
    for p in input_paths:
        reader = pypdf.PdfReader(p)
        for page in reader.pages:
            writer.add_page(page)

    with open(output_path, "wb") as f_out:
        writer.write(f_out)

    return output_path

def get_tesseract_cmd():
    import shutil
    return shutil.which("tesseract") or "/home/linuxbrew/.linuxbrew/bin/tesseract"

def ocr_page_image(page, dpi=200):
    try:
        import pytesseract
        tess_bin = get_tesseract_cmd()
        if os.path.exists(tess_bin):
            pytesseract.pytesseract.tesseract_cmd = tess_bin

        zoom = dpi / 72.0
        mat = pymupdf.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        extracted = pytesseract.image_to_string(img)
        return extracted.strip()
    except Exception as e:
        return ""

def extract_pdf_text(input_path, output_path, password=None):
    doc = open_pdf_document(input_path, password=password)
    full_text = []
    for i, page in enumerate(doc, start=1):
        page_text = page.get_text().strip()

        if len(page_text) < 10:
            ocr_text = ocr_page_image(page)
            if ocr_text:
                page_text = ocr_text

        full_text.append(f"--- Page {i} ---\n{page_text}\n")
    doc.close()

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(full_text))

    return output_path

def extract_pdf_html(input_path, output_path, password=None):
    doc = open_pdf_document(input_path, password=password)
    html_chunks = ["<!DOCTYPE html><html><head><meta charset='utf-8'><title>PDF Content</title></head><body>"]
    for i, page in enumerate(doc, start=1):
        html_chunks.append(f"<div class='page' id='page-{i}'>")
        raw_text = page.get_text().strip()

        if len(raw_text) < 10:
            ocr_text = ocr_page_image(page)
            if ocr_text:
                escaped_ocr = ocr_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
                html_chunks.append(f"<p>{escaped_ocr}</p>")
            else:
                html_chunks.append("<p>[Scanned page: no text recognized]</p>")
        else:
            html_chunks.append(page.get_text("html"))

        html_chunks.append("</div><hr/>")
    html_chunks.append("</body></html>")
    doc.close()

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(html_chunks))

    return output_path
