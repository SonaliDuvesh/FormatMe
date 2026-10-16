import os
import json
import zipfile
import struct

def detect_file_format(filepath, filename=None):
    if not os.path.exists(filepath):
        return None

    file_size = os.path.getsize(filepath)
    ext = os.path.splitext(filename or filepath)[1].lower().lstrip('.')

    with open(filepath, 'rb') as f:
        header = f.read(4096)

    if header.startswith(b'\x89PNG\r\n\x1a\n'):
        return {"format": "png", "category": "image", "mime": "image/png", "extension": "png"}
    if header.startswith(b'\xff\xd8\xff'):
        return {"format": "jpeg", "category": "image", "mime": "image/jpeg", "extension": "jpg"}
    if header.startswith(b'GIF87a') or header.startswith(b'GIF89a'):
        return {"format": "gif", "category": "image", "mime": "image/gif", "extension": "gif"}
    if header.startswith(b'BM'):
        return {"format": "bmp", "category": "image", "mime": "image/bmp", "extension": "bmp"}
    if len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return {"format": "webp", "category": "image", "mime": "image/webp", "extension": "webp"}
    if header.startswith(b'II*\x00') or header.startswith(b'MM\x00*'):
        return {"format": "tiff", "category": "image", "mime": "image/tiff", "extension": "tiff"}
    if header.startswith(b'\x00\x00\x01\x00'):
        return {"format": "ico", "category": "image", "mime": "image/x-icon", "extension": "ico"}

    if len(header) >= 12 and header[4:8] == b'ftyp':
        brand = header[8:12]
        if brand in (b'avif', b'avis'):
            return {"format": "avif", "category": "image", "mime": "image/avif", "extension": "avif"}
        if brand in (b'heic', b'heix', b'hevc', b'mif1', b'msf1'):
            return {"format": "heic", "category": "image", "mime": "image/heic", "extension": "heic"}
        if brand in (b'qt  ', b'moov'):
            return {"format": "mov", "category": "video", "mime": "video/quicktime", "extension": "mov"}
        return {"format": "mp4", "category": "video", "mime": "video/mp4", "extension": "mp4"}

    if header.startswith(b'%PDF-'):
        is_encrypted = False
        if b'/Encrypt' in header:
            is_encrypted = True
        else:
            with open(filepath, 'rb') as f:
                content = f.read(65536)
                if b'/Encrypt' in content:
                    is_encrypted = True
        return {
            "format": "pdf",
            "category": "pdf",
            "mime": "application/pdf",
            "extension": "pdf",
            "is_encrypted": is_encrypted
        }

    if header.startswith(b'\x1a\x45\xdf\xa3'):
        if b'webm' in header[:64]:
            return {"format": "webm", "category": "video", "mime": "video/webm", "extension": "webm"}
        return {"format": "mkv", "category": "video", "mime": "video/x-matroska", "extension": "mkv"}
    
    if len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'AVI ':
        return {"format": "avi", "category": "video", "mime": "video/x-msvideo", "extension": "avi"}

    if len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WAVE':
        return {"format": "wav", "category": "audio", "mime": "audio/wav", "extension": "wav"}

    if header.startswith(b'ID3') or (len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
        return {"format": "mp3", "category": "audio", "mime": "audio/mpeg", "extension": "mp3"}

    if header.startswith(b'fLaC'):
        return {"format": "flac", "category": "audio", "mime": "audio/flac", "extension": "flac"}

    if header.startswith(b'OggS'):
        if b'OpusHead' in header:
            return {"format": "opus", "category": "audio", "mime": "audio/opus", "extension": "opus"}
        if b'vorbis' in header or b'theora' not in header:
            return {"format": "ogg", "category": "audio", "mime": "audio/ogg", "extension": "ogg"}
        return {"format": "ogv", "category": "video", "mime": "video/ogg", "extension": "ogv"}

    if header.startswith(b'FORM') and len(header) >= 12 and header[8:12] == b'AIFF':
        return {"format": "aiff", "category": "audio", "mime": "audio/x-aiff", "extension": "aiff"}

    if header.startswith(b'0&\xb2u\x8ef\xcf\x11\xa6\xd9\x00\xaa\x00b\xcel'):
        if ext == 'wma':
            return {"format": "wma", "category": "audio", "mime": "audio/x-ms-wma", "extension": "wma"}
        return {"format": "wmv", "category": "video", "mime": "video/x-ms-wmv", "extension": "wmv"}

    if header.startswith(b'PK\x03\x04') or header.startswith(b'PK\x05\x06'):
        try:
            with zipfile.ZipFile(filepath, 'r') as z:
                namelist = z.namelist()
                if '[Content_Types].xml' in namelist:
                    if any('word/' in name for name in namelist):
                        return {"format": "docx", "category": "document", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "extension": "docx"}
                    if any('xl/' in name for name in namelist):
                        return {"format": "xlsx", "category": "document", "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "extension": "xlsx"}
                if 'mimetype' in namelist:
                    with z.open('mimetype') as m:
                        mt = m.read().strip()
                        if b'vnd.oasis.opendocument.text' in mt:
                            return {"format": "odt", "category": "document", "mime": "application/vnd.oasis.opendocument.text", "extension": "odt"}
        except Exception:
            pass
        return {"format": "zip", "category": "archive", "mime": "application/zip", "extension": "zip"}

    if header.startswith(b'7z\xbc\xaf\x27\x1c'):
        return {"format": "7z", "category": "archive", "mime": "application/x-7z-compressed", "extension": "7z"}

    if header.startswith(b'Rar!\x1a\x07\x00') or header.startswith(b'Rar!\x1a\x07\x01'):
        return {"format": "rar", "category": "archive", "mime": "application/vnd.rar", "extension": "rar"}

    if header.startswith(b'BZh'):
        if ext in ('tbz2', 'tar.bz2'):
            return {"format": "tar.bz2", "category": "archive", "mime": "application/x-bzip2", "extension": "tar.bz2"}
        return {"format": "bz2", "category": "archive", "mime": "application/x-bzip2", "extension": "bz2"}

    if header.startswith(b'\xfd7zXZ\x00'):
        if ext in ('txz', 'tar.xz'):
            return {"format": "tar.xz", "category": "archive", "mime": "application/x-xz", "extension": "tar.xz"}
        return {"format": "xz", "category": "archive", "mime": "application/x-xz", "extension": "xz"}

    if header.startswith(b'\x1f\x8b'):
        if ext in ('tgz', 'tar.gz'):
            return {"format": "tar.gz", "category": "archive", "mime": "application/gzip", "extension": "tar.gz"}
        return {"format": "gz", "category": "archive", "mime": "application/gzip", "extension": "gz"}

    if len(header) >= 262 and header[257:262] == b'ustar':
        return {"format": "tar", "category": "archive", "mime": "application/x-tar", "extension": "tar"}

    if header.startswith(b'{\\rtf'):
        return {"format": "rtf", "category": "document", "mime": "application/rtf", "extension": "rtf"}

    try:
        sample_text = header.decode('utf-8', errors='ignore').strip()
        if sample_text.startswith('<!DOCTYPE html') or sample_text.startswith('<html'):
            return {"format": "html", "category": "document", "mime": "text/html", "extension": "html"}

        if (sample_text.startswith('{') and sample_text.endswith('}')) or (sample_text.startswith('[') and sample_text.endswith(']')):
            try:
                with open(filepath, 'r', encoding='utf-8') as jf:
                    json.load(jf)
                return {"format": "json", "category": "data", "mime": "application/json", "extension": "json"}
            except Exception:
                pass

        if ext == 'csv':
            return {"format": "csv", "category": "data", "mime": "text/csv", "extension": "csv"}
        if ext in ('md', 'markdown'):
            return {"format": "md", "category": "document", "mime": "text/markdown", "extension": "md"}
        if ext == 'txt':
            return {"format": "txt", "category": "document", "mime": "text/plain", "extension": "txt"}

        if b'\x00' not in header[:512]:
            if ext in ('csv', 'tsv'):
                return {"format": "csv", "category": "data", "mime": "text/csv", "extension": "csv"}
            return {"format": "txt", "category": "document", "mime": "text/plain", "extension": "txt"}
    except Exception:
        pass

    EXT_MAP = {
        'png': ('image', 'image/png'),
        'jpg': ('image', 'image/jpeg'),
        'jpeg': ('image', 'image/jpeg'),
        'webp': ('image', 'image/webp'),
        'gif': ('image', 'image/gif'),
        'bmp': ('image', 'image/bmp'),
        'tiff': ('image', 'image/tiff'),
        'tif': ('image', 'image/tiff'),
        'ico': ('image', 'image/x-icon'),
        'heic': ('image', 'image/heic'),
        'avif': ('image', 'image/avif'),
        'mp4': ('video', 'video/mp4'),
        'mov': ('video', 'video/quicktime'),
        'avi': ('video', 'video/x-msvideo'),
        'mkv': ('video', 'video/x-matroska'),
        'webm': ('video', 'video/webm'),
        'wmv': ('video', 'video/x-ms-wmv'),
        'mpeg': ('video', 'video/mpeg'),
        'mpg': ('video', 'video/mpeg'),
        '3gp': ('video', 'video/3gpp'),
        'mp3': ('audio', 'audio/mpeg'),
        'wav': ('audio', 'audio/wav'),
        'aac': ('audio', 'audio/aac'),
        'm4a': ('audio', 'audio/mp4'),
        'flac': ('audio', 'audio/flac'),
        'ogg': ('audio', 'audio/ogg'),
        'opus': ('audio', 'audio/opus'),
        'aiff': ('audio', 'audio/x-aiff'),
        'wma': ('audio', 'audio/x-ms-wma'),
        'pdf': ('pdf', 'application/pdf'),
        'docx': ('document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        'odt': ('document', 'application/vnd.oasis.opendocument.text'),
        'rtf': ('document', 'application/rtf'),
        'html': ('document', 'text/html'),
        'htm': ('document', 'text/html'),
        'md': ('document', 'text/markdown'),
        'txt': ('document', 'text/plain'),
        'csv': ('data', 'text/csv'),
        'xlsx': ('data', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        'json': ('data', 'application/json'),
        'zip': ('archive', 'application/zip'),
        'tar': ('archive', 'application/x-tar'),
        'tgz': ('archive', 'application/gzip'),
        'tar.gz': ('archive', 'application/gzip'),
        'gz': ('archive', 'application/gzip'),
        'tbz2': ('archive', 'application/x-bzip2'),
        'tar.bz2': ('archive', 'application/x-bzip2'),
        'bz2': ('archive', 'application/x-bzip2'),
        'txz': ('archive', 'application/x-xz'),
        'tar.xz': ('archive', 'application/x-xz'),
        'xz': ('archive', 'application/x-xz'),
        '7z': ('archive', 'application/x-7z-compressed'),
        'rar': ('archive', 'application/vnd.rar'),
    }

    norm_ext = 'jpeg' if ext == 'jpg' else ext
    if ext in EXT_MAP:
        cat, mime = EXT_MAP[ext]
        return {"format": norm_ext, "category": cat, "mime": mime, "extension": ext}

    return {"format": "unknown", "category": "unknown", "mime": "application/octet-stream", "extension": ext or "bin"}
