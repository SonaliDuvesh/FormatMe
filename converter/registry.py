
FORMAT_INFO = {
    "png": {"name": "PNG Image", "category": "image", "lossless": True, "ext": "png"},
    "jpeg": {"name": "JPEG Image", "category": "image", "lossless": False, "ext": "jpg"},
    "webp": {"name": "WebP Image", "category": "image", "lossless": False, "ext": "webp"},
    "gif": {"name": "GIF Animation / Image", "category": "image", "lossless": True, "ext": "gif"},
    "bmp": {"name": "BMP Bitmap", "category": "image", "lossless": True, "ext": "bmp"},
    "tiff": {"name": "TIFF Image", "category": "image", "lossless": True, "ext": "tiff"},
    "ico": {"name": "ICO Icon", "category": "image", "lossless": True, "ext": "ico"},
    "avif": {"name": "AVIF Image", "category": "image", "lossless": False, "ext": "avif"},
    "heic": {"name": "HEIC Image", "category": "image", "lossless": False, "ext": "heic"},

    "pdf": {"name": "PDF Document", "category": "pdf", "lossless": True, "ext": "pdf"},

    "mp4": {"name": "MP4 Video", "category": "video", "lossless": False, "ext": "mp4"},
    "webm": {"name": "WebM Video", "category": "video", "lossless": False, "ext": "webm"},
    "mkv": {"name": "MKV Video", "category": "video", "lossless": False, "ext": "mkv"},
    "avi": {"name": "AVI Video", "category": "video", "lossless": False, "ext": "avi"},
    "mov": {"name": "QuickTime MOV", "category": "video", "lossless": False, "ext": "mov"},
    "wmv": {"name": "WMV Video", "category": "video", "lossless": False, "ext": "wmv"},
    "3gp": {"name": "3GP Mobile Video", "category": "video", "lossless": False, "ext": "3gp"},

    "mp3": {"name": "MP3 Audio", "category": "audio", "lossless": False, "ext": "mp3"},
    "wav": {"name": "WAV Audio (Lossless PCM)", "category": "audio", "lossless": True, "ext": "wav"},
    "aac": {"name": "AAC Audio", "category": "audio", "lossless": False, "ext": "aac"},
    "m4a": {"name": "M4A Apple Audio", "category": "audio", "lossless": False, "ext": "m4a"},
    "flac": {"name": "FLAC Audio (Lossless)", "category": "audio", "lossless": True, "ext": "flac"},
    "ogg": {"name": "OGG Vorbis Audio", "category": "audio", "lossless": False, "ext": "ogg"},
    "opus": {"name": "Opus Audio", "category": "audio", "lossless": False, "ext": "opus"},
    "aiff": {"name": "AIFF Audio", "category": "audio", "lossless": True, "ext": "aiff"},
    "wma": {"name": "WMA Audio", "category": "audio", "lossless": False, "ext": "wma"},

    "docx": {"name": "Microsoft Word (DOCX)", "category": "document", "lossless": True, "ext": "docx"},
    "odt": {"name": "OpenDocument Text (ODT)", "category": "document", "lossless": True, "ext": "odt"},
    "rtf": {"name": "Rich Text Format (RTF)", "category": "document", "lossless": True, "ext": "rtf"},
    "html": {"name": "HTML Webpage", "category": "document", "lossless": True, "ext": "html"},
    "md": {"name": "Markdown Document", "category": "document", "lossless": True, "ext": "md"},
    "txt": {"name": "Plain Text (TXT)", "category": "document", "lossless": True, "ext": "txt"},

    "csv": {"name": "Comma-Separated Values (CSV)", "category": "data", "lossless": True, "ext": "csv"},
    "xlsx": {"name": "Excel Spreadsheet (XLSX)", "category": "data", "lossless": True, "ext": "xlsx"},
    "json": {"name": "JSON Structured Data", "category": "data", "lossless": True, "ext": "json"},

    "zip": {"name": "ZIP Archive", "category": "archive", "lossless": True, "ext": "zip"},
    "tar": {"name": "TAR Archive", "category": "archive", "lossless": True, "ext": "tar"},
    "tar.gz": {"name": "GZipped TAR (.tar.gz)", "category": "archive", "lossless": True, "ext": "tar.gz"},
    "tar.bz2": {"name": "BZip2 TAR (.tar.bz2)", "category": "archive", "lossless": True, "ext": "tar.bz2"},
    "tar.xz": {"name": "XZ TAR (.tar.xz)", "category": "archive", "lossless": True, "ext": "tar.xz"},
    "7z": {"name": "7-Zip Archive (.7z)", "category": "archive", "lossless": True, "ext": "7z"},
    "rar": {"name": "RAR Archive (.rar)", "category": "archive", "lossless": True, "ext": "rar"},
    "gz": {"name": "GZIP Compressed File", "category": "archive", "lossless": True, "ext": "gz"},
    "bz2": {"name": "BZIP2 Compressed File", "category": "archive", "lossless": True, "ext": "bz2"},
    "xz": {"name": "XZ Compressed File", "category": "archive", "lossless": True, "ext": "xz"},
}

IMAGE_OUTPUTS = ["png", "jpeg", "webp", "pdf", "gif", "bmp", "tiff", "ico", "avif", "txt"]

VIDEO_OUTPUTS = ["mp4", "webm", "mkv", "avi", "mov", "gif", "mp3", "wav", "aac", "flac", "ogg"]

AUDIO_OUTPUTS = ["mp3", "wav", "aac", "m4a", "flac", "ogg", "opus", "aiff", "mp4", "webm", "mkv", "mov", "avi"]

PDF_OUTPUTS = ["zip", "png", "jpeg", "webp", "tiff", "txt", "html", "pdf"]

DOC_OUTPUTS = {
    "docx": ["pdf", "odt", "txt", "html"],
    "odt": ["pdf", "docx", "txt", "html"],
    "rtf": ["pdf", "docx", "txt", "html"],
    "html": ["pdf", "txt", "md"],
    "md": ["html", "pdf", "docx", "txt"],
    "txt": ["pdf", "html", "md"],
}

DATA_OUTPUTS = {
    "csv": ["xlsx", "json", "txt"],
    "xlsx": ["csv", "json"],
    "json": ["csv", "txt"],
}

ARCHIVE_OUTPUTS = ["zip", "tar", "tar.gz", "tar.bz2", "tar.xz", "7z"]

def get_available_conversions(src_format, src_category=None):
    src_format = src_format.lower()
    if src_format in ('jpg', 'jpeg'):
        src_format = 'jpeg'

    targets = []

    if src_format == "gif":
        targets = [t for t in IMAGE_OUTPUTS if t != "gif"] + ["mp4", "webm"]

    elif src_category == "image" or src_format in ("png", "jpeg", "webp", "gif", "bmp", "tiff", "ico", "avif", "heic"):
        targets = [t for t in IMAGE_OUTPUTS if t != src_format]

    elif src_format == "pdf":
        targets = PDF_OUTPUTS

    elif src_category == "video" or src_format in ("mp4", "webm", "mkv", "avi", "mov", "wmv", "3gp"):
        targets = [t for t in VIDEO_OUTPUTS if t != src_format]

    elif src_category == "audio" or src_format in ("mp3", "wav", "aac", "m4a", "flac", "ogg", "opus", "aiff", "wma"):
        targets = [t for t in AUDIO_OUTPUTS if t != src_format]

    elif src_format in DOC_OUTPUTS:
        targets = DOC_OUTPUTS[src_format]

    elif src_format in DATA_OUTPUTS:
        targets = DATA_OUTPUTS[src_format]

    elif src_category == "archive" or src_format in ("zip", "tar", "tar.gz", "tar.bz2", "tar.xz", "7z", "rar", "gz", "bz2", "xz"):
        targets = [t for t in ARCHIVE_OUTPUTS if t != src_format]

    result = []
    for t in targets:
        info = FORMAT_INFO.get(t, {"name": t.upper(), "category": "other", "lossless": False, "ext": t})
        result.append({
            "target": t,
            "name": info["name"],
            "category": info["category"],
            "extension": info["ext"],
            "lossless": info["lossless"]
        })

    return result

def get_settings_schema(src_format, target_format):
    src = src_format.lower()
    if src in ('jpg', 'jpeg'):
        src = 'jpeg'
    tgt = target_format.lower()
    if tgt in ('jpg', 'jpeg'):
        tgt = 'jpeg'

    settings = []

    if tgt in ("jpeg", "webp", "avif"):
        settings.append({
            "id": "quality",
            "label": "Output Quality",
            "type": "slider",
            "min": 10,
            "max": 100,
            "default": 90,
            "unit": "%"
        })
        settings.append({
            "id": "preserve_transparency",
            "label": "Preserve Transparency / Alpha",
            "type": "boolean",
            "default": True
        })

    if src == "pdf" and tgt == "zip":
        settings.append({
            "id": "page_format",
            "label": "Image Format per Page",
            "type": "select",
            "options": [
                {"value": "png", "label": "PNG (High Definition / Lossless)"},
                {"value": "jpeg", "label": "JPEG (Standard Compact)"},
                {"value": "webp", "label": "WebP (Modern Web Format)"}
            ],
            "default": "png"
        })
        settings.append({
            "id": "dpi",
            "label": "Rendering Resolution (DPI)",
            "type": "select",
            "options": [
                {"value": 150, "label": "Standard (150 DPI)"},
                {"value": 200, "label": "High Quality (200 DPI)"},
                {"value": 300, "label": "Print Quality (300 DPI)"},
                {"value": 72, "label": "Web/Low Memory (72 DPI)"}
            ],
            "default": 150
        })
        settings.append({
            "id": "password",
            "label": "PDF Password (if encrypted)",
            "type": "password",
            "default": ""
        })

    if src == "pdf" and tgt in ("png", "jpeg", "webp", "tiff"):
        settings.append({
            "id": "pdf_mode",
            "label": "Multi-page PDF Handling",
            "type": "select",
            "options": [
                {"value": "zip", "label": "ZIP Archive of Individual Page Images (Recommended)"},
                {"value": "long_image", "label": "Single Vertically Stitched Long Image"},
            ],
            "default": "zip",
            "help": "Multi-page PDFs will be packaged as a ZIP containing each page as an image."
        })
        settings.append({
            "id": "dpi",
            "label": "Rendering Resolution (DPI)",
            "type": "select",
            "options": [
                {"value": 150, "label": "Standard (150 DPI)"},
                {"value": 200, "label": "High Quality (200 DPI)"},
                {"value": 300, "label": "Print Quality (300 DPI)"},
                {"value": 72, "label": "Web/Low Memory (72 DPI)"}
            ],
            "default": 150
        })
        settings.append({
            "id": "password",
            "label": "PDF Password (if encrypted)",
            "type": "password",
            "default": ""
        })

    if tgt == "gif":
        settings.append({
            "id": "fps",
            "label": "Animation Frame Rate (FPS)",
            "type": "select",
            "options": [
                {"value": 15, "label": "15 FPS (Smooth)"},
                {"value": 12, "label": "12 FPS (Standard)"},
                {"value": 10, "label": "10 FPS (Compact)"},
                {"value": 24, "label": "24 FPS (Fluid)"}
            ],
            "default": 15
        })
        settings.append({
            "id": "gif_width",
            "label": "GIF Width",
            "type": "select",
            "options": [
                {"value": "480", "label": "480px (Balanced)"},
                {"value": "640", "label": "640px (High Quality)"},
                {"value": "320", "label": "320px (Compact)"},
                {"value": "original", "label": "Original Dimensions"}
            ],
            "default": "480"
        })

    if tgt in ("mp4", "webm", "mkv", "avi", "mov"):
        is_audio_source = src_format in ("mp3", "wav", "aac", "m4a", "flac", "ogg", "opus", "aiff", "wma")
        if is_audio_source:
            settings.append({
                "id": "screen_style",
                "label": "Video Visual Track",
                "type": "select",
                "options": [
                    {"value": "black", "label": "Solid Black Screen (Standard)"}
                ],
                "default": "black"
            })
            settings.append({
                "id": "resolution",
                "label": "Video Resolution",
                "type": "select",
                "options": [
                    {"value": "1920x1080", "label": "1080p (Full HD)"},
                    {"value": "1280x720", "label": "720p (HD)"},
                    {"value": "854x480", "label": "480p (SD)"}
                ],
                "default": "1920x1080"
            })
            settings.append({
                "id": "fps",
                "label": "Video Frame Rate",
                "type": "select",
                "options": [
                    {"value": 30, "label": "30 FPS (Standard)"},
                    {"value": 24, "label": "24 FPS (Cinematic)"},
                    {"value": 60, "label": "60 FPS (Smooth)"}
                ],
                "default": 30
            })
            settings.append({
                "id": "audio_bitrate",
                "label": "Audio Bitrate",
                "type": "select",
                "options": [
                    {"value": "320k", "label": "320 kbps (High Fidelity)"},
                    {"value": "256k", "label": "256 kbps (Standard)"},
                    {"value": "192k", "label": "192 kbps"},
                    {"value": "128k", "label": "128 kbps (Compact)"}
                ],
                "default": "192k"
            })
        else:
            settings.append({
                "id": "video_quality",
                "label": "Video Quality (CRF)",
                "type": "select",
                "options": [
                    {"value": 18, "label": "High Quality (CRF 18)"},
                    {"value": 23, "label": "Standard / Balanced (CRF 23)"},
                    {"value": 28, "label": "High Compression (CRF 28)"}
                ],
                "default": 23
            })
            settings.append({
                "id": "resolution",
                "label": "Resolution Scale",
                "type": "select",
                "options": [
                    {"value": "original", "label": "Original Resolution"},
                    {"value": "1920x1080", "label": "1080p (Full HD)"},
                    {"value": "1280x720", "label": "720p (HD)"},
                    {"value": "854x480", "label": "480p (SD)"}
                ],
                "default": "original"
            })
            settings.append({
                "id": "preserve_audio",
                "label": "Preserve Audio Track",
                "type": "boolean",
                "default": True
            })

    if tgt in ("mp3", "wav", "aac", "m4a", "flac", "ogg", "opus"):
        settings.append({
            "id": "audio_bitrate",
            "label": "Audio Bitrate",
            "type": "select",
            "options": [
                {"value": "320k", "label": "320 kbps (High Fidelity)"},
                {"value": "256k", "label": "256 kbps (Standard)"},
                {"value": "192k", "label": "192 kbps"},
                {"value": "128k", "label": "128 kbps (Compact)"}
            ],
            "default": "256k"
        })

    if tgt in ("zip", "tar.gz", "tar.bz2", "tar.xz", "7z"):
        settings.append({
            "id": "compression_level",
            "label": "Archive Compression Level",
            "type": "select",
            "options": [
                {"value": "standard", "label": "Standard (Balanced)"},
                {"value": "maximum", "label": "Maximum (Smallest Size)"},
                {"value": "fast", "label": "Fast (Speed Priority)"}
            ],
            "default": "standard"
        })

    return settings
