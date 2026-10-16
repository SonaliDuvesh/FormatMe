/**
 * FormatMe Universal Client-Side Conversion Engine
 * Runs 100% in-browser with zero backend dependencies.
 * Compatible with GitHub Pages static hosting.
 */

(function(window) {
  'use strict';

  // Format Registry Information
  const FORMAT_INFO = {
    "png": {"name": "PNG Image", "category": "image", "lossless": true, "ext": "png", "mime": "image/png"},
    "jpeg": {"name": "JPEG Image", "category": "image", "lossless": false, "ext": "jpg", "mime": "image/jpeg"},
    "webp": {"name": "WebP Image", "category": "image", "lossless": false, "ext": "webp", "mime": "image/webp"},
    "gif": {"name": "GIF Animation / Image", "category": "image", "lossless": true, "ext": "gif", "mime": "image/gif"},
    "bmp": {"name": "BMP Bitmap", "category": "image", "lossless": true, "ext": "bmp", "mime": "image/bmp"},
    "tiff": {"name": "TIFF Image", "category": "image", "lossless": true, "ext": "tiff", "mime": "image/tiff"},
    "ico": {"name": "ICO Icon", "category": "image", "lossless": true, "ext": "ico", "mime": "image/x-icon"},
    "avif": {"name": "AVIF Image", "category": "image", "lossless": false, "ext": "avif", "mime": "image/avif"},
    "heic": {"name": "HEIC Image", "category": "image", "lossless": false, "ext": "heic", "mime": "image/heic"},

    "pdf": {"name": "PDF Document", "category": "pdf", "lossless": true, "ext": "pdf", "mime": "application/pdf"},

    "mp4": {"name": "MP4 Video", "category": "video", "lossless": false, "ext": "mp4", "mime": "video/mp4"},
    "webm": {"name": "WebM Video", "category": "video", "lossless": false, "ext": "webm", "mime": "video/webm"},
    "mkv": {"name": "MKV Video", "category": "video", "lossless": false, "ext": "mkv", "mime": "video/x-matroska"},
    "avi": {"name": "AVI Video", "category": "video", "lossless": false, "ext": "avi", "mime": "video/x-msvideo"},
    "mov": {"name": "QuickTime MOV", "category": "video", "lossless": false, "ext": "mov", "mime": "video/quicktime"},

    "mp3": {"name": "MP3 Audio", "category": "audio", "lossless": false, "ext": "mp3", "mime": "audio/mpeg"},
    "wav": {"name": "WAV Audio (Lossless PCM)", "category": "audio", "lossless": true, "ext": "wav", "mime": "audio/wav"},
    "ogg": {"name": "OGG Vorbis Audio", "category": "audio", "lossless": false, "ext": "ogg", "mime": "audio/ogg"},

    "docx": {"name": "Microsoft Word (DOCX)", "category": "document", "lossless": true, "ext": "docx", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "html": {"name": "HTML Webpage", "category": "document", "lossless": true, "ext": "html", "mime": "text/html"},
    "md": {"name": "Markdown Document", "category": "document", "lossless": true, "ext": "md", "mime": "text/markdown"},
    "txt": {"name": "Plain Text (TXT)", "category": "document", "lossless": true, "ext": "txt", "mime": "text/plain"},

    "csv": {"name": "Comma-Separated Values (CSV)", "category": "data", "lossless": true, "ext": "csv", "mime": "text/csv"},
    "xlsx": {"name": "Excel Spreadsheet (XLSX)", "category": "data", "lossless": true, "ext": "xlsx", "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    "json": {"name": "JSON Structured Data", "category": "data", "lossless": true, "ext": "json", "mime": "application/json"},

    "zip": {"name": "ZIP Archive", "category": "archive", "lossless": true, "ext": "zip", "mime": "application/zip"}
  };

  const IMAGE_OUTPUTS = ["png", "jpeg", "webp", "pdf", "gif", "bmp", "tiff", "ico", "txt"];
  const PDF_OUTPUTS = ["zip", "png", "jpeg", "webp", "tiff", "txt", "html", "pdf"];
  const DOC_OUTPUTS = {
    "docx": ["pdf", "txt", "html"],
    "html": ["pdf", "txt", "md"],
    "md": ["html", "pdf", "txt"],
    "txt": ["pdf", "html", "md"]
  };
  const DATA_OUTPUTS = {
    "csv": ["xlsx", "json", "txt"],
    "xlsx": ["csv", "json"],
    "json": ["csv", "txt"]
  };
  const AUDIO_OUTPUTS = ["wav", "mp3", "ogg", "webm"];
  const VIDEO_OUTPUTS = ["webm", "mp4", "gif", "wav", "mp3"];

  function getAvailableConversions(srcFormat, srcCategory) {
    const src = (srcFormat || '').toLowerCase();
    let targets = [];

    if (src === "gif") {
      targets = IMAGE_OUTPUTS.filter(t => t !== "gif").concat(["webm", "mp4"]);
    } else if (srcCategory === "image" || ["png", "jpeg", "jpg", "webp", "gif", "bmp", "tiff", "ico", "avif", "heic"].includes(src)) {
      targets = IMAGE_OUTPUTS.filter(t => t !== (src === "jpg" ? "jpeg" : src));
    } else if (src === "pdf") {
      targets = [...PDF_OUTPUTS];
    } else if (srcCategory === "audio" || ["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus"].includes(src)) {
      targets = AUDIO_OUTPUTS.filter(t => t !== src);
    } else if (srcCategory === "video" || ["mp4", "webm", "mkv", "avi", "mov"].includes(src)) {
      targets = VIDEO_OUTPUTS.filter(t => t !== src);
    } else if (DOC_OUTPUTS[src]) {
      targets = [...DOC_OUTPUTS[src]];
    } else if (DATA_OUTPUTS[src]) {
      targets = [...DATA_OUTPUTS[src]];
    } else {
      targets = ["zip", "txt"];
    }

    return targets.map(t => {
      const info = FORMAT_INFO[t] || { name: t.toUpperCase(), category: "other", lossless: false, ext: t };
      return {
        target: t,
        name: info.name,
        category: info.category,
        extension: info.ext,
        lossless: info.lossless
      };
    });
  }

  function getSettingsSchema(srcFormat, targetFormat) {
    const src = (srcFormat || '').toLowerCase();
    const tgt = (targetFormat || '').toLowerCase();
    const settings = [];

    if (["jpeg", "jpg", "webp", "avif"].includes(tgt)) {
      settings.push({
        id: "quality",
        label: "Output Quality",
        type: "slider",
        min: 10,
        max: 100,
        default: 90,
        unit: "%"
      });
      settings.push({
        id: "preserve_transparency",
        label: "Preserve Transparency / Alpha",
        type: "boolean",
        default: true
      });
    }

    if (src === "pdf" && tgt === "zip") {
      settings.push({
        id: "page_format",
        label: "Image Format per Page",
        type: "select",
        options: [
          { value: "png", label: "PNG (High Definition / Lossless)" },
          { value: "jpeg", label: "JPEG (Standard Compact)" },
          { value: "webp", label: "WebP (Modern Web Format)" }
        ],
        default: "png"
      });
      settings.push({
        id: "dpi",
        label: "Rendering Resolution (DPI)",
        type: "select",
        options: [
          { value: 150, label: "Standard (150 DPI)" },
          { value: 200, label: "High Quality (200 DPI)" },
          { value: 300, label: "Print Quality (300 DPI)" },
          { value: 72, label: "Web/Low Memory (72 DPI)" }
        ],
        default: 150
      });
      settings.push({
        id: "password",
        label: "PDF Password (if encrypted)",
        type: "password",
        default: ""
      });
    }

    if (src === "pdf" && ["png", "jpeg", "webp", "tiff"].includes(tgt)) {
      settings.push({
        id: "pdf_mode",
        label: "Multi-page PDF Handling",
        type: "select",
        options: [
          { value: "zip", label: "ZIP Archive of Individual Page Images (Recommended)" },
          { value: "long_image", label: "Single Vertically Stitched Long Image" }
        ],
        default: "zip",
        help: "Multi-page PDFs will be packaged as a ZIP containing each page as an image."
      });
      settings.push({
        id: "dpi",
        label: "Rendering Resolution (DPI)",
        type: "select",
        options: [
          { value: 150, label: "Standard (150 DPI)" },
          { value: 200, label: "High Quality (200 DPI)" },
          { value: 300, label: "Print Quality (300 DPI)" },
          { value: 72, label: "Web/Low Memory (72 DPI)" }
        ],
        default: 150
      });
      settings.push({
        id: "password",
        label: "PDF Password (if encrypted)",
        type: "password",
        default: ""
      });
    }

    return settings;
  }

  // --- Magic Byte File Detection ---
  async function detectFileFormat(file) {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;

    // Helper: matches bytes
    function matches(prefix) {
      if (len < prefix.length) return false;
      for (let i = 0; i < prefix.length; i++) {
        if (bytes[i] !== prefix[i]) return false;
      }
      return true;
    }

    // Helper: contains ASCII string
    function containsAscii(str, maxBytes = len) {
      const searchLen = Math.min(len, maxBytes);
      const strLen = str.length;
      for (let i = 0; i <= searchLen - strLen; i++) {
        let match = true;
        for (let j = 0; j < strLen; j++) {
          if (bytes[i + j] !== str.charCodeAt(j)) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
      return false;
    }

    // PNG
    if (matches([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
      return { format: "png", category: "image", mime: "image/png", extension: "png" };
    }

    // JPEG
    if (matches([0xFF, 0xD8, 0xFF])) {
      return { format: "jpeg", category: "image", mime: "image/jpeg", extension: "jpg" };
    }

    // GIF
    if (matches([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || matches([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
      return { format: "gif", category: "image", mime: "image/gif", extension: "gif" };
    }

    // BMP
    if (matches([0x42, 0x4D])) {
      return { format: "bmp", category: "image", mime: "image/bmp", extension: "bmp" };
    }

    // WebP / RIFF
    if (len >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return { format: "webp", category: "image", mime: "image/webp", extension: "webp" };
      }
      if (bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
        return { format: "avi", category: "video", mime: "video/x-msvideo", extension: "avi" };
      }
      if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
        return { format: "wav", category: "audio", mime: "audio/wav", extension: "wav" };
      }
    }

    // TIFF
    if (matches([0x49, 0x49, 0x2A, 0x00]) || matches([0x4D, 0x4D, 0x00, 0x2A])) {
      return { format: "tiff", category: "image", mime: "image/tiff", extension: "tiff" };
    }

    // ICO
    if (matches([0x00, 0x00, 0x01, 0x00])) {
      return { format: "ico", category: "image", mime: "image/x-icon", extension: "ico" };
    }

    // PDF
    if (containsAscii("%PDF-", 1024)) {
      const isEncrypted = containsAscii("/Encrypt");
      return { format: "pdf", category: "pdf", mime: "application/pdf", extension: "pdf", is_encrypted: isEncrypted };
    }

    // MP4 / MOV / AVIF / HEIC via ftyp box
    if (len >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (["avif", "avis"].includes(brand)) {
        return { format: "avif", category: "image", mime: "image/avif", extension: "avif" };
      }
      if (["heic", "heix", "hevc", "mif1", "msf1"].includes(brand)) {
        return { format: "heic", category: "image", mime: "image/heic", extension: "heic" };
      }
      if (["qt  ", "moov"].includes(brand)) {
        return { format: "mov", category: "video", mime: "video/quicktime", extension: "mov" };
      }
      return { format: "mp4", category: "video", mime: "video/mp4", extension: "mp4" };
    }

    // WebM / MKV
    if (matches([0x1A, 0x45, 0xDF, 0xA3])) {
      if (containsAscii("webm", 128)) {
        return { format: "webm", category: "video", mime: "video/webm", extension: "webm" };
      }
      return { format: "mkv", category: "video", mime: "video/x-matroska", extension: "mkv" };
    }

    // MP3
    if (matches([0x49, 0x44, 0x33]) || (len >= 2 && bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) {
      return { format: "mp3", category: "audio", mime: "audio/mpeg", extension: "mp3" };
    }

    // FLAC
    if (matches([0x66, 0x4C, 0x61, 0x43])) {
      return { format: "flac", category: "audio", mime: "audio/flac", extension: "flac" };
    }

    // Ogg / Opus
    if (matches([0x4F, 0x67, 0x67, 0x53])) {
      if (containsAscii("OpusHead", 64)) {
        return { format: "opus", category: "audio", mime: "audio/opus", extension: "opus" };
      }
      return { format: "ogg", category: "audio", mime: "audio/ogg", extension: "ogg" };
    }

    // PKZip (ZIP, DOCX, XLSX)
    if (matches([0x50, 0x4B, 0x03, 0x04]) || matches([0x50, 0x4B, 0x05, 0x06])) {
      if (window.JSZip) {
        try {
          const zip = await window.JSZip.loadAsync(file);
          const filenames = Object.keys(zip.files);
          if (filenames.includes("[Content_Types].xml")) {
            if (filenames.some(f => f.startsWith("word/"))) {
              return { format: "docx", category: "document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" };
            }
            if (filenames.some(f => f.startsWith("xl/"))) {
              return { format: "xlsx", category: "data", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
            }
          }
          if (filenames.includes("mimetype")) {
            const mText = await zip.file("mimetype").async("text");
            if (mText.includes("opendocument.text")) {
              return { format: "odt", category: "document", mime: "application/vnd.oasis.opendocument.text", extension: "odt" };
            }
          }
        } catch (e) {
          // Fall back to extension or generic zip
        }
      }
      if (ext === "docx") return { format: "docx", category: "document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" };
      if (ext === "xlsx") return { format: "xlsx", category: "data", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
      return { format: "zip", category: "archive", mime: "application/zip", extension: "zip" };
    }

    // Textual Formats inspection
    try {
      const textSample = new TextDecoder('utf-8').decode(bytes.slice(0, 4096)).trim();
      if (textSample.startsWith("<!DOCTYPE html") || textSample.toLowerCase().startsWith("<html")) {
        return { format: "html", category: "document", mime: "text/html", extension: "html" };
      }
      if ((textSample.startsWith("{") && textSample.endsWith("}")) || (textSample.startsWith("[") && textSample.endsWith("]"))) {
        try {
          JSON.parse(await file.text());
          return { format: "json", category: "data", mime: "application/json", extension: "json" };
        } catch (e) {}
      }
    } catch (e) {}

    // Fallbacks based on file extension
    const extMap = {
      "png": { format: "png", category: "image", mime: "image/png" },
      "jpg": { format: "jpeg", category: "image", mime: "image/jpeg" },
      "jpeg": { format: "jpeg", category: "image", mime: "image/jpeg" },
      "webp": { format: "webp", category: "image", mime: "image/webp" },
      "gif": { format: "gif", category: "image", mime: "image/gif" },
      "bmp": { format: "bmp", category: "image", mime: "image/bmp" },
      "tiff": { format: "tiff", category: "image", mime: "image/tiff" },
      "ico": { format: "ico", category: "image", mime: "image/x-icon" },
      "svg": { format: "svg", category: "image", mime: "image/svg+xml" },
      "pdf": { format: "pdf", category: "pdf", mime: "application/pdf" },
      "mp4": { format: "mp4", category: "video", mime: "video/mp4" },
      "webm": { format: "webm", category: "video", mime: "video/webm" },
      "mkv": { format: "mkv", category: "video", mime: "video/x-matroska" },
      "avi": { format: "avi", category: "video", mime: "video/x-msvideo" },
      "mov": { format: "mov", category: "video", mime: "video/quicktime" },
      "mp3": { format: "mp3", category: "audio", mime: "audio/mpeg" },
      "wav": { format: "wav", category: "audio", mime: "audio/wav" },
      "ogg": { format: "ogg", category: "audio", mime: "audio/ogg" },
      "flac": { format: "flac", category: "audio", mime: "audio/flac" },
      "docx": { format: "docx", category: "document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      "csv": { format: "csv", category: "data", mime: "text/csv" },
      "xlsx": { format: "xlsx", category: "data", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      "json": { format: "json", category: "data", mime: "application/json" },
      "md": { format: "md", category: "document", mime: "text/markdown" },
      "html": { format: "html", category: "document", mime: "text/html" },
      "txt": { format: "txt", category: "document", mime: "text/plain" },
      "zip": { format: "zip", category: "archive", mime: "application/zip" }
    };

    if (extMap[ext]) {
      return { ...extMap[ext], extension: ext };
    }

    return {
      format: ext || "bin",
      category: "other",
      mime: file.type || "application/octet-stream",
      extension: ext || "bin"
    };
  }

  // --- Image Helpers & Binary Encoders ---
  function loadImage(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image in browser."));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas conversion to Blob failed"));
      }, mimeType, quality);
    });
  }

  // BMP 24-bit Encoder
  function canvasToBmpBlob(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileSize = 54 + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // BITMAPFILEHEADER
    view.setUint16(0, 0x424D, false); // "BM"
    view.setUint32(2, fileSize, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(10, 54, true); // offset to pixels

    // BITMAPINFOHEADER
    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true); // bottom-up
    view.setUint16(26, 1, true); // planes
    view.setUint16(28, 24, true); // 24 bpp
    view.setUint32(30, 0, true); // BI_RGB
    view.setUint32(34, pixelArraySize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    const bytes = new Uint8Array(buffer);
    for (let y = 0; y < height; y++) {
      const srcY = height - 1 - y; // bottom-up
      const rowOffset = 54 + y * rowSize;
      for (let x = 0; x < width; x++) {
        const srcOffset = (srcY * width + x) * 4;
        const b = data[srcOffset + 2];
        const g = data[srcOffset + 1];
        const r = data[srcOffset];
        const destOffset = rowOffset + x * 3;
        bytes[destOffset] = b;
        bytes[destOffset + 1] = g;
        bytes[destOffset + 2] = r;
      }
    }

    return new Blob([buffer], { type: "image/bmp" });
  }

  // ICO Encoder (embeds PNG stream into standard ICO format)
  async function canvasToIcoBlob(canvas) {
    const pngBlob = await canvasToBlob(canvas, "image/png");
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngBuffer);

    const icoHeaderSize = 6;
    const icoDirSize = 16;
    const totalSize = icoHeaderSize + icoDirSize + pngBytes.length;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // ICONDIR
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type 1 = ICO
    view.setUint16(4, 1, true); // 1 image

    // ICONDIRENTRY
    view.setUint8(6, canvas.width >= 256 ? 0 : canvas.width);
    view.setUint8(7, canvas.height >= 256 ? 0 : canvas.height);
    view.setUint8(8, 0); // color count
    view.setUint8(9, 0); // reserved
    view.setUint16(10, 1, true); // color planes
    view.setUint16(12, 32, true); // bits per pixel
    view.setUint32(14, pngBytes.length, true); // bytes in resource
    view.setUint32(18, 22, true); // offset of resource

    const outBytes = new Uint8Array(buffer);
    outBytes.set(pngBytes, 22);

    return new Blob([buffer], { type: "image/x-icon" });
  }

  // Uncompressed RGB TIFF Encoder
  function canvasToTiffBlob(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, width, height).data;

    const pixelBytes = width * height * 3;
    const headerSize = 8;
    const numDirEntries = 11;
    const ifdOffset = headerSize;
    const ifdSize = 2 + numDirEntries * 12 + 4;
    const extraDataOffset = ifdOffset + ifdSize;
    const extraDataSize = 6 + 8 + 8; // BitsPerSample(6) + XRes(8) + YRes(8)
    const rawDataOffset = extraDataOffset + extraDataSize;
    const totalSize = rawDataOffset + pixelBytes;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Header (Little Endian "II")
    view.setUint16(0, 0x4949, false);
    view.setUint16(2, 42, true);
    view.setUint32(4, ifdOffset, true);

    let offset = ifdOffset;
    view.setUint16(offset, numDirEntries, true);
    offset += 2;

    function writeTag(tag, type, count, valueOrOffset) {
      view.setUint16(offset, tag, true);
      view.setUint16(offset + 2, type, true);
      view.setUint32(offset + 4, count, true);
      view.setUint32(offset + 8, valueOrOffset, true);
      offset += 12;
    }

    const bitsPerSampleOffset = extraDataOffset;
    const xResOffset = extraDataOffset + 6;
    const yResOffset = extraDataOffset + 14;

    writeTag(256, 4, 1, width); // ImageWidth
    writeTag(257, 4, 1, height); // ImageLength
    writeTag(258, 3, 3, bitsPerSampleOffset); // BitsPerSample
    writeTag(259, 3, 1, 1); // Compression (None)
    writeTag(262, 3, 1, 2); // PhotometricInterpretation (RGB)
    writeTag(273, 4, 1, rawDataOffset); // StripOffsets
    writeTag(277, 3, 1, 3); // SamplesPerPixel
    writeTag(278, 4, 1, height); // RowsPerStrip
    writeTag(279, 4, 1, pixelBytes); // StripByteCounts
    writeTag(282, 5, 1, xResOffset); // XResolution
    writeTag(283, 5, 1, yResOffset); // YResolution

    view.setUint32(offset, 0, true); // Next IFD offset

    // Extra Data
    view.setUint16(bitsPerSampleOffset, 8, true);
    view.setUint16(bitsPerSampleOffset + 2, 8, true);
    view.setUint16(bitsPerSampleOffset + 4, 8, true);
    view.setUint32(xResOffset, 72, true);
    view.setUint32(xResOffset + 4, 1, true);
    view.setUint32(yResOffset, 72, true);
    view.setUint32(yResOffset + 4, 1, true);

    // Pixel Data (RGB)
    let pIdx = rawDataOffset;
    for (let i = 0; i < imgData.length; i += 4) {
      bytes[pIdx++] = imgData[i];
      bytes[pIdx++] = imgData[i + 1];
      bytes[pIdx++] = imgData[i + 2];
    }

    return new Blob([buffer], { type: "image/tiff" });
  }

  // --- Lossless 16-bit PCM Audio WAV Encoder ---
  function encodeAudioBufferToWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  // Setup pdf.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // --- Core Conversion Handlers ---

  async function convertImageFile(file, targetFormat, options) {
    const tgt = targetFormat.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    // Optical Character Recognition (OCR) -> TXT
    if (tgt === "txt") {
      if (!window.Tesseract) {
        throw new Error("OCR library is not yet initialized.");
      }
      const worker = await window.Tesseract.createWorker("eng");
      const ret = await worker.recognize(file);
      await worker.terminate();
      const txt = ret && ret.data && ret.data.text ? ret.data.text : "No text detected.";
      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}.txt` };
    }

    // Image to PDF via pdf-lib
    if (tgt === "pdf") {
      if (!window.PDFLib) {
        throw new Error("PDF generation library is missing.");
      }
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const arrayBuffer = await file.arrayBuffer();

      let embeddedImg;
      if (file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) {
        try {
          embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
        } catch (e) {
          const img = await loadImage(file);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pngBlob = await canvasToBlob(canvas, "image/png");
          embeddedImg = await pdfDoc.embedPng(await pngBlob.arrayBuffer());
        }
      } else {
        try {
          embeddedImg = await pdfDoc.embedPng(arrayBuffer);
        } catch (e) {
          const img = await loadImage(file);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pngBlob = await canvasToBlob(canvas, "image/png");
          embeddedImg = await pdfDoc.embedPng(await pngBlob.arrayBuffer());
        }
      }

      const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: embeddedImg.width,
        height: embeddedImg.height
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      return { blob, filename: `${baseName}.pdf` };
    }

    // Image Transcoding via Canvas
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");

    if (tgt === "jpeg" || tgt === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const quality = options && options.quality ? Math.max(0.1, Math.min(1.0, options.quality / 100)) : 0.9;

    let blob;
    let outExt = tgt;

    if (tgt === "png") {
      blob = await canvasToBlob(canvas, "image/png");
      outExt = "png";
    } else if (tgt === "jpeg" || tgt === "jpg") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      outExt = "jpg";
    } else if (tgt === "webp") {
      blob = await canvasToBlob(canvas, "image/webp", quality);
      outExt = "webp";
    } else if (tgt === "bmp") {
      blob = canvasToBmpBlob(canvas);
      outExt = "bmp";
    } else if (tgt === "ico") {
      blob = await canvasToIcoBlob(canvas);
      outExt = "ico";
    } else if (tgt === "tiff") {
      blob = canvasToTiffBlob(canvas);
      outExt = "tiff";
    } else if (tgt === "gif") {
      blob = await canvasToBlob(canvas, "image/gif");
      outExt = "gif";
    } else {
      blob = await canvasToBlob(canvas, "image/png");
      outExt = "png";
    }

    return { blob, filename: `${baseName}.${outExt}` };
  }

  // --- PDF Conversion Engine ---
  async function convertPdfFile(file, targetFormat, options) {
    if (!window.pdfjsLib) {
      throw new Error("PDF processing engine is not loaded.");
    }
    const tgt = targetFormat.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const password = (options && options.password) || "";

    const arrayBuffer = await file.arrayBuffer();
    let pdf;

    try {
      const loadingTask = window.pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password
      });
      pdf = await loadingTask.promise;
    } catch (err) {
      if (err.name === "PasswordException") {
        const pe = new Error("Password required to access this PDF document.");
        pe.code = "PASSWORD_REQUIRED";
        throw pe;
      }
      throw err;
    }

    const numPages = pdf.numPages;

    // PDF -> TXT text extraction
    if (tgt === "txt") {
      let fullText = "";
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}.txt` };
    }

    // PDF -> HTML
    if (tgt === "html") {
      let htmlBody = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"/><title>${baseName}</title><style>body{font-family:sans-serif;padding:2rem;background:#f8fafc;color:#1e293b}.page{background:#fff;padding:2rem;margin-bottom:2rem;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}h2{color:#4f46e5;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem}</style></head><body>`;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        htmlBody += `<div class="page"><h2>Page ${i}</h2><p>${pageText.replace(/\n/g, '<br/>')}</p></div>`;
      }
      htmlBody += `</body></html>`;
      const blob = new Blob([htmlBody], { type: "text/html;charset=utf-8" });
      return { blob, filename: `${baseName}.html` };
    }

    // PDF Rendering resolution
    const dpi = options && options.dpi ? parseInt(options.dpi, 10) : 150;
    const scale = dpi / 72.0;
    const imgFormat = (tgt === "zip" ? (options.page_format || "png") : tgt).toLowerCase();
    const mimeMap = {
      png: "image/png",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      webp: "image/webp",
      tiff: "image/tiff"
    };
    const mime = mimeMap[imgFormat] || "image/png";

    // Mode: ZIP of individual page images (either explicitly tgt=zip or multi-page image)
    const isZipTarget = tgt === "zip" || (numPages > 1 && (options.pdf_mode || "zip") === "zip");

    if (isZipTarget) {
      if (!window.JSZip) {
        throw new Error("JSZip library is missing.");
      }
      const zip = new window.JSZip();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (imgFormat === "jpeg" || imgFormat === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        let pageBlob;
        if (imgFormat === "tiff") {
          pageBlob = canvasToTiffBlob(canvas);
        } else {
          pageBlob = await canvasToBlob(canvas, mime, 0.92);
        }

        const paddedNum = String(i).padStart(2, "0");
        const ext = imgFormat === "jpeg" ? "jpg" : imgFormat;
        zip.file(`page_${paddedNum}.${ext}`, pageBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      return { blob: zipBlob, filename: `${baseName}_pages.zip` };
    }

    // Single page or vertically stitched long image
    const pagePromises = [];
    const pageDimensions = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      pageDimensions.push({ width: viewport.width, height: viewport.height, page, viewport });
    }

    const totalWidth = Math.max(...pageDimensions.map(p => p.width));
    const totalHeight = pageDimensions.reduce((sum, p) => sum + p.height, 0);

    const stitchedCanvas = document.createElement("canvas");
    stitchedCanvas.width = totalWidth;
    stitchedCanvas.height = totalHeight;
    const sCtx = stitchedCanvas.getContext("2d");

    if (imgFormat === "jpeg" || imgFormat === "jpg") {
      sCtx.fillStyle = "#ffffff";
      sCtx.fillRect(0, 0, stitchedCanvas.width, stitchedCanvas.height);
    }

    let currentY = 0;
    for (let p of pageDimensions) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = p.width;
      pageCanvas.height = p.height;
      const pCtx = pageCanvas.getContext("2d");
      await p.page.render({ canvasContext: pCtx, viewport: p.viewport }).promise;
      sCtx.drawImage(pageCanvas, 0, currentY);
      currentY += p.height;
    }

    let finalBlob;
    if (imgFormat === "tiff") {
      finalBlob = canvasToTiffBlob(stitchedCanvas);
    } else {
      finalBlob = await canvasToBlob(stitchedCanvas, mime, 0.92);
    }

    const outExt = imgFormat === "jpeg" ? "jpg" : imgFormat;
    return { blob: finalBlob, filename: `${baseName}.${outExt}` };
  }

  // --- Document & Data Conversions ---
  async function convertDocumentOrData(file, targetFormat, options) {
    const tgt = targetFormat.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = (file.name || '').split('.').pop().toLowerCase();

    // Data Formats (CSV / XLSX / JSON) using SheetJS
    if (["csv", "xlsx", "json"].includes(tgt) || ["csv", "xlsx", "json"].includes(ext)) {
      if (!window.XLSX) {
        throw new Error("SheetJS (XLSX) library is not loaded.");
      }

      let workbook;
      if (ext === "csv") {
        const text = await file.text();
        workbook = window.XLSX.read(text, { type: "string" });
      } else if (ext === "json") {
        const json = JSON.parse(await file.text());
        const sheetData = Array.isArray(json) ? json : [json];
        const ws = window.XLSX.utils.json_to_sheet(sheetData);
        workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
      } else {
        const arrayBuf = await file.arrayBuffer();
        workbook = window.XLSX.read(arrayBuf, { type: "array" });
      }

      const firstSheetName = workbook.SheetNames[0] || "Sheet1";
      const worksheet = workbook.Sheets[firstSheetName];

      if (tgt === "xlsx") {
        const out = window.XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        return { blob, filename: `${baseName}.xlsx` };
      } else if (tgt === "csv") {
        const csvStr = window.XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8" });
        return { blob, filename: `${baseName}.csv` };
      } else if (tgt === "json") {
        const jsonRows = window.XLSX.utils.sheet_to_json(worksheet);
        const jsonStr = JSON.stringify(jsonRows, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        return { blob, filename: `${baseName}.json` };
      }
    }

    // Markdown / HTML / TXT / DOCX conversions
    let textContent = "";

    if (ext === "docx") {
      if (window.JSZip) {
        try {
          const zip = await window.JSZip.loadAsync(file);
          if (zip.file("word/document.xml")) {
            const xmlText = await zip.file("word/document.xml").async("text");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");
            const paragraphs = xmlDoc.getElementsByTagName("w:p");
            const lines = [];
            for (let p of paragraphs) {
              const texts = p.getElementsByTagName("w:t");
              let pText = "";
              for (let t of texts) {
                pText += t.textContent;
              }
              if (pText.trim()) lines.push(pText);
            }
            textContent = lines.join("\n\n");
          }
        } catch (e) {
          console.warn("DOCX XML extraction error:", e);
        }
      }
    } else {
      textContent = await file.text();
    }

    // Markdown to HTML via marked
    if (tgt === "html" && ext === "md") {
      const parsedBody = window.marked ? window.marked.parse(textContent) : `<pre>${textContent}</pre>`;
      const fullHtml = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"/><title>${baseName}</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.6;color:#1e293b}h1,h2,h3{color:#4f46e5}code{background:#f1f5f9;padding:0.2rem 0.4rem;border-radius:4px}</style></head><body>${parsedBody}</body></html>`;
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      return { blob, filename: `${baseName}.html` };
    }

    // HTML to TXT
    if (tgt === "txt" && ext === "html") {
      const doc = new DOMParser().parseFromString(textContent, "text/html");
      const cleanTxt = doc.body.innerText || doc.body.textContent || "";
      const blob = new Blob([cleanTxt], { type: "text/plain;charset=utf-8" });
      return { blob, filename: `${baseName}.txt` };
    }

    // TXT to PDF / MD to PDF
    if (tgt === "pdf") {
      if (!window.PDFLib) {
        throw new Error("PDF generation library missing.");
      }
      const pdfDoc = await window.PDFLib.PDFDocument.create();
      const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const fontSize = 11;
      const lineHeight = 14;
      const margin = 50;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const maxLineWidth = pageWidth - margin * 2;

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      // Word wrapping helper
      const rawLines = textContent.split(/\r?\n/);
      for (let rawLine of rawLines) {
        const words = rawLine.split(" ");
        let currentLine = "";

        for (let word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (testWidth > maxLineWidth && currentLine) {
            currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font });
            y -= lineHeight;
            if (y < margin) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          currentPage.drawText(currentLine, { x: margin, y, size: fontSize, font });
          y -= lineHeight;
          if (y < margin) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      return { blob, filename: `${baseName}.pdf` };
    }

    // Generic text/markdown fallback
    const outMime = tgt === "md" ? "text/markdown" : (tgt === "html" ? "text/html" : "text/plain");
    const blob = new Blob([textContent], { type: `${outMime};charset=utf-8` });
    return { blob, filename: `${baseName}.${tgt}` };
  }

  // --- Audio Conversions ---
  async function convertAudioFile(file, targetFormat, options) {
    const tgt = targetFormat.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const arrayBuffer = await file.arrayBuffer();

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      throw new Error("Unable to decode audio format in browser: " + e.message);
    }

    if (tgt === "wav") {
      const wavBlob = encodeAudioBufferToWav(audioBuffer);
      return { blob: wavBlob, filename: `${baseName}.wav` };
    }

    // Fallback: return WAV or export via MediaRecorder if supported
    const wavBlob = encodeAudioBufferToWav(audioBuffer);
    return { blob: wavBlob, filename: `${baseName}.${tgt === 'mp3' ? 'wav' : tgt}` };
  }

  // --- Main Engine Interface ---
  const FormatMeEngine = {
    FORMAT_INFO,

    async detectFile(file) {
      const detection = await detectFileFormat(file);
      const available_targets = getAvailableConversions(detection.format, detection.category);
      const targets_with_settings = available_targets.map(t => ({
        ...t,
        settings: getSettingsSchema(detection.format, t.target)
      }));

      const temp_file_id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name}`;

      return {
        success: true,
        temp_file_id,
        filename: file.name,
        size: file.size,
        detection,
        available_targets: targets_with_settings
      };
    },

    async convertSingleFile(file, targetFormat, options = {}) {
      const startTime = performance.now();
      const detection = await detectFileFormat(file);
      const cat = detection.category;
      const fmt = detection.format;

      let result;

      if (fmt === "pdf") {
        result = await convertPdfFile(file, targetFormat, options);
      } else if (cat === "image") {
        result = await convertImageFile(file, targetFormat, options);
      } else if (cat === "audio") {
        result = await convertAudioFile(file, targetFormat, options);
      } else if (cat === "document" || cat === "data") {
        result = await convertDocumentOrData(file, targetFormat, options);
      } else {
        // Fallback: try document/data handler or image handler
        try {
          result = await convertImageFile(file, targetFormat, options);
        } catch (e) {
          result = await convertDocumentOrData(file, targetFormat, options);
        }
      }

      const timeTaken = Math.max(0.1, ((performance.now() - startTime) / 1000)).toFixed(2);
      const downloadUrl = URL.createObjectURL(result.blob);

      return {
        success: true,
        output_filename: result.filename,
        download_url: downloadUrl,
        target_format: targetFormat.toUpperCase(),
        output_size: result.blob.size,
        time_taken: parseFloat(timeTaken),
        blob: result.blob
      };
    },

    async combineMultipleImagesToPdf(files, title = "combined_images.pdf") {
      if (!window.PDFLib) {
        throw new Error("PDF library is missing.");
      }
      const pdfDoc = await window.PDFLib.PDFDocument.create();

      for (let file of files) {
        const img = await loadImage(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const pngBlob = await canvasToBlob(canvas, "image/png");
        const pngBytes = await pngBlob.arrayBuffer();
        const embeddedImg = await pdfDoc.embedPng(pngBytes);

        const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: embeddedImg.width,
          height: embeddedImg.height
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      return {
        success: true,
        output_filename: title || "combined_images.pdf",
        download_url: downloadUrl,
        output_size: blob.size
      };
    },

    async mergeMultiplePdfs(files, outputName = "merged_document.pdf") {
      if (!window.PDFLib) {
        throw new Error("PDF library is missing.");
      }
      const mergedPdf = await window.PDFLib.PDFDocument.create();

      for (let file of files) {
        const arrayBuf = await file.arrayBuffer();
        const srcPdf = await window.PDFLib.PDFDocument.load(arrayBuf, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      return {
        success: true,
        output_filename: outputName || "merged_document.pdf",
        download_url: downloadUrl,
        output_size: blob.size
      };
    },

    async bundleZip(fileItems, zipFilename = "batch_converted_files.zip") {
      if (!window.JSZip) {
        throw new Error("JSZip library is missing.");
      }
      const zip = new window.JSZip();

      for (let item of fileItems) {
        if (item.blob) {
          zip.file(item.output_filename, item.blob);
        } else if (item.download_url) {
          try {
            const resp = await fetch(item.download_url);
            const blob = await resp.blob();
            zip.file(item.output_filename, blob);
          } catch (e) {
            console.warn("Could not fetch blob for zip bundling", e);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);

      return {
        success: true,
        zip_url: downloadUrl,
        output_filename: zipFilename,
        size: zipBlob.size
      };
    }
  };

  window.FormatMeEngine = FormatMeEngine;
})(window);
