import os
import tarfile
import zipfile
import gzip
import bz2
import lzma
import shutil
import subprocess

MAX_EXTRACT_FILES = 2000
MAX_EXTRACT_BYTES = 500 * 1024 * 1024

def is_safe_path(base_dir, path, follow_symlinks=False):
    base = os.path.realpath(base_dir) if follow_symlinks else os.path.abspath(base_dir)
    matchpath = os.path.realpath(path) if follow_symlinks else os.path.abspath(path)
    return base == os.path.commonpath((base, matchpath))

def safe_extract_zip(zip_path, extract_dir):
    with zipfile.ZipFile(zip_path, 'r') as zf:
        total_size = 0
        file_count = 0
        for member in zf.infolist():
            file_count += 1
            total_size += member.file_size
            if file_count > MAX_EXTRACT_FILES:
                raise ValueError("Archive contains too many files (exceeds safe limit).")
            if total_size > MAX_EXTRACT_BYTES:
                raise ValueError("Archive uncompressed size exceeds safe limit (possible zip bomb).")

            target_path = os.path.join(extract_dir, member.filename)
            if not is_safe_path(extract_dir, target_path):
                raise PermissionError(f"Malicious archive member detected: {member.filename}")

        zf.extractall(extract_dir)

def safe_extract_tar(tar_path, extract_dir):
    with tarfile.open(tar_path, 'r:*') as tf:
        total_size = 0
        file_count = 0
        for member in tf.getmembers():
            file_count += 1
            total_size += member.size
            if file_count > MAX_EXTRACT_FILES:
                raise ValueError("Archive contains too many files (exceeds safe limit).")
            if total_size > MAX_EXTRACT_BYTES:
                raise ValueError("Archive uncompressed size exceeds safe limit.")

            target_path = os.path.join(extract_dir, member.name)
            if not is_safe_path(extract_dir, target_path):
                raise PermissionError(f"Malicious archive member detected: {member.name}")

        tf.extractall(extract_dir)

def safe_extract_7z(archive_path, extract_dir):
    cmd = ['7z', 'x', '-y', f'-o{extract_dir}', os.path.abspath(archive_path)]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        err = res.stderr.decode(errors='ignore') or "7z extraction failed"
        raise RuntimeError(f"Failed to extract archive: {err}")

    total_size = 0
    file_count = 0
    for root, dirs, files in os.walk(extract_dir):
        for f in files:
            file_count += 1
            fp = os.path.join(root, f)
            total_size += os.path.getsize(fp)
            if file_count > MAX_EXTRACT_FILES:
                raise ValueError("Archive contains too many files (exceeds safe limit).")
            if total_size > MAX_EXTRACT_BYTES:
                raise ValueError("Archive uncompressed size exceeds safe limit.")

def convert_archive(input_path, output_path, src_format, target_format, options=None):
    options = options or {}
    src = src_format.lower()
    tgt = target_format.lower()
    compression_level = options.get("compression_level", "standard")

    temp_dir = output_path + "_extracted"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        if src == "zip":
            safe_extract_zip(input_path, temp_dir)
        elif src in ("tar", "tar.gz", "tgz", "tar.bz2", "tbz2", "tar.xz", "txz"):
            safe_extract_tar(input_path, temp_dir)
        elif src in ("7z", "rar"):
            safe_extract_7z(input_path, temp_dir)
        elif src == "gz":
            out_file = os.path.join(temp_dir, os.path.splitext(os.path.basename(input_path))[0])
            with gzip.open(input_path, 'rb') as f_in, open(out_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        elif src == "bz2":
            out_file = os.path.join(temp_dir, os.path.splitext(os.path.basename(input_path))[0])
            with bz2.open(input_path, 'rb') as f_in, open(out_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        elif src == "xz":
            out_file = os.path.join(temp_dir, os.path.splitext(os.path.basename(input_path))[0])
            with lzma.open(input_path, 'rb') as f_in, open(out_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        else:
            try:
                safe_extract_7z(input_path, temp_dir)
            except Exception:
                raise ValueError(f"Unsupported source archive format: {src}")

        if tgt == "zip":
            create_zip_from_dir(temp_dir, output_path, compression_level)
        elif tgt == "tar":
            create_tar_from_dir(temp_dir, output_path, mode="w")
        elif tgt in ("tar.gz", "tgz"):
            create_tar_from_dir(temp_dir, output_path, mode="w:gz", compression_level=compression_level)
        elif tgt in ("tar.bz2", "tbz2"):
            create_tar_from_dir(temp_dir, output_path, mode="w:bz2", compression_level=compression_level)
        elif tgt in ("tar.xz", "txz"):
            create_tar_from_dir(temp_dir, output_path, mode="w:xz")
        elif tgt == "7z":
            create_7z_from_dir(temp_dir, output_path, compression_level)
        else:
            raise ValueError(f"Unsupported target archive format: {tgt}")

        return output_path
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

def create_zip_from_dir(dir_path, zip_path, compression_level="standard"):
    compress_level_map = {
        "fast": 1,
        "standard": 6,
        "maximum": 9
    }
    level = compress_level_map.get(compression_level, 6)

    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=level) as zf:
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dir_path)
                zf.write(full_path, arcname=rel_path)

def create_tar_from_dir(dir_path, tar_path, mode="w", compression_level="standard"):
    compress_kwargs = {}
    if mode in ("w:gz", "w:bz2"):
        compress_level_map = {
            "fast": 1,
            "standard": 6,
            "maximum": 9
        }
        compress_kwargs["compresslevel"] = compress_level_map.get(compression_level, 6)

    with tarfile.open(tar_path, mode, **compress_kwargs) as tf:
        for item in sorted(os.listdir(dir_path)):
            full_path = os.path.join(dir_path, item)
            tf.add(full_path, arcname=item)

def create_7z_from_dir(dir_path, output_7z_path, compression_level="standard"):
    level_map = {
        "fast": "-mx=1",
        "standard": "-mx=5",
        "maximum": "-mx=9"
    }
    mx_flag = level_map.get(compression_level, "-mx=5")
    cmd = ['7z', 'a', '-y', mx_flag, os.path.abspath(output_7z_path), '.']
    res = subprocess.run(cmd, cwd=dir_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        err = res.stderr.decode(errors='ignore') or "7z creation failed"
        raise RuntimeError(f"Failed to create 7z archive: {err}")

def create_zip_from_files(file_paths, output_zip_path):
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for p in file_paths:
            base = os.path.basename(p)
            clean_name = base.split('_', 1)[-1] if '_' in base else base
            zf.write(p, arcname=clean_name)
    return output_zip_path
