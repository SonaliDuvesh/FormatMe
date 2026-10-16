# FormatMe - Universal File Format Converter

> **A high-precision, 100% client-side, privacy-first universal file format converter hosted on GitHub Pages.**

[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222222?style=flat&logo=githubpages&logoColor=white)](https://sonaliduvesh.github.io/FormatMe/)
[![Client-Side](https://img.shields.io/badge/Architecture-100%25_In--Browser-10B981?style=flat&logo=javascript&logoColor=white)](#client-side-architecture--privacy)
[![Privacy](https://img.shields.io/badge/Privacy-Zero_Data_Uploads-4F46E5?style=flat)](#zero-data-leakage--complete-privacy)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](LICENSE)

<br/>

<p align="center">
  <img src="view.jpeg" alt="FormatMe Universal Converter Interface" style="max-width: 100%; border-radius: 12px;"/>
</p>

---

## Live Web App

FormatMe is live and hosted directly on GitHub Pages with zero server dependencies:

### 🔗 **[https://sonaliduvesh.github.io/FormatMe/](https://sonaliduvesh.github.io/FormatMe/)**

---

## Overview

**FormatMe** is a high-performance, in-browser media, document, and data conversion engine. Built for users requiring fast, reliable format transformation without data leakage, FormatMe executes authentic file conversions and transcodes locally within the browser—**files never leave your device and are never uploaded to any remote server**.

The system combines automated binary signature detection (magic byte analysis) with an adaptive, responsive web interface. Users can inspect file metadata, tune granular compression and encoding parameters, batch-process heterogenous file queues, merge PDFs, stitch multi-page documents, and convert formats spanning Images, Multi-Page PDFs, Audio, Video, Office Documents, Spreadsheets, and Structured Data.

---

## Key Capabilities

- **100% In-Browser Execution**: All processing, transcoding, OCR, and packaging occur client-side using standard Web APIs, WebAssembly, and modern JavaScript engines.
- **Deep Binary Format Identification**: Accurately detects true underlying MIME types and formats via binary signatures (`%PDF-`, `RIFF`, `ftyp`, `PK\x03\x04`, `\x89PNG`, `7z\xBC\xAF\x27\x1C`), preventing mismatched pipelines or spoofed extensions.
- **Exhaustive Multi-Page PDF Handling**:
  - Convert entire multi-page documents into individual high-DPI images, packaged ZIP archives, or vertically stitched panoramic composites without dropped pages.
  - Merge arbitrary PDF documents in ordered sequence.
  - Unlock and decrypt password-protected PDFs directly in-browser.
  - Extract text and perform optical character recognition (OCR) on documents.
- **Image Transcoding & Encoders**:
  - High-fidelity conversion between `PNG`, `JPEG`, `WebP`, `BMP`, `TIFF`, `ICO`, and `GIF`.
  - In-browser uncompressed 24-bit BMP encoder, standard ICO icon generator, and TIFF packer.
  - Single and multi-image conversion directly into multi-page PDF documents.
- **Spreadsheets & Tabular Data Translation**:
  - Seamless bidirectional translation between `CSV`, `JSON`, and Microsoft Excel (`XLSX`) workbooks powered by `SheetJS`.
- **Document & Text Formatting**:
  - Markdown to styled HTML documents via `marked.js`.
  - Document and text export to formatted PDF documents via `pdf-lib`.
  - Microsoft Word (`DOCX`) paragraph and text extraction via `JSZip`.
- **Multi-File Bulk Actions**:
  - "Combine Images to PDF" with custom ordering.
  - "Merge Selected PDFs" in sequential order.
  - "Batch Convert Queue" with instant single-click ZIP archive generation.

---

## Supported Format Matrix

| Category | Input Formats | Target Formats | In-Browser Engine & Highlights |
| :--- | :--- | :--- | :--- |
| **Images** | `PNG`, `JPEG`, `WebP`, `GIF`, `BMP`, `TIFF`, `ICO`, `AVIF`, `HEIC` | `PNG`, `JPEG`, `WebP`, `GIF`, `BMP`, `TIFF`, `ICO`, `PDF`, `TXT` (OCR) | HTML5 Canvas, custom binary encoders, PDF-Lib, Tesseract.js. Preserves alpha channels and transparency. |
| **PDF Documents** | `PDF` *(Standard or Password-Protected)* | `ZIP` (All pages as images), `PNG`, `JPEG`, `WebP`, `TIFF`, `TXT`, `HTML`, `PDF` *(Merged)* | PDF.js & PDF-Lib. High-DPI rendering, individual page image extraction, password handling, and text extraction. |
| **Spreadsheets & Data** | `CSV`, `XLSX`, `JSON` | `CSV`, `XLSX`, `JSON`, `TXT` | SheetJS (XLSX). Native cell formatting, table conversion, and JSON object tree serialization. |
| **Documents** | `DOCX`, `Markdown (.md)`, `HTML`, `TXT` | `PDF`, `HTML`, `TXT`, `MD` | Marked.js, PDF-Lib, and JSZip. Typography, clean HTML rendering, and text document formatting. |
| **Audio** | `WAV`, `MP3`, `OGG`, `AAC`, `FLAC` | `WAV`, `OGG`, `MP3` | Web Audio API. 16-bit PCM lossless WAV encoder with audio buffer decoding. |
| **Archives & Bundles** | Multiple files, images, or PDFs | `ZIP` | JSZip. Fast in-memory compression and client-side archive creation. |

---

## Client-Side Architecture & Privacy

```
[Local Input File]
      │
      ▼
┌──────────────────────────────────────┐
│  Client-Side Magic Byte Detector     │ ◄── Reads binary header via Uint8Array; identifies true MIME type
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│  Adaptive Options & Inspector Schema │ ◄── Dynamic resolution, DPI, quality sliders, and page format selection
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│  In-Browser Conversion Dispatch      │ ◄── Dispatches to Canvas / PDF.js / PDF-Lib / SheetJS / JSZip
└──────────────────────────────────────┘
      │
      ▼
[Instant Blob URL Download]              ◄── Generated via URL.createObjectURL; 0 network uploads
```

### Zero Data Leakage & Complete Privacy
- **No Backend Uploads**: Your files are never sent over the network or saved to any external disk or cloud server.
- **Secure Processing**: Everything runs within the browser sandbox on the client machine.
- **Instant Downloads**: Conversions generate local `Blob` URLs for direct, instant file downloads.

---

## Local Development & Hosting

### Option A: Static Web Hosting (GitHub Pages / Any Web Server)
FormatMe requires no backend server. You can host it with any static web server:

```bash
# Clone the repository
git clone https://github.com/SonaliDuvesh/FormatMe.git
cd FormatMe

# Run using any static web server (e.g., Python built-in, Nginx, or Node http-server)
python3 -m http.server 8080
```
Open `http://127.0.0.1:8080` in your web browser.

### Option B: Local Flask Server (Optional)
A Python Flask server configuration is also included for local development:

```bash
# Create dedicated virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies and start server
pip install -r requirements.txt
python app.py
```
Open `http://127.0.0.1:5000` in your web browser.



