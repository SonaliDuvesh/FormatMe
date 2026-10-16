import subprocess
import os

def has_audio_stream(input_path):
    cmd = ["ffprobe", "-v", "error", "-show_streams", "-select_streams", "a", input_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return "codec_type=audio" in res.stdout

def convert_video(input_path, output_path, target_format, options=None):
    options = options or {}
    tgt = target_format.lower()

    AUDIO_FORMATS = ("mp3", "wav", "aac", "flac", "ogg", "opus", "m4a", "aiff")
    if tgt in AUDIO_FORMATS:
        return extract_audio(input_path, output_path, tgt, options)

    if tgt == "gif":
        fps = options.get("fps", 15)
        width = options.get("gif_width", "480")
        if width == "original":
            scale_filter = "scale=trunc(iw/2)*2:trunc(ih/2)*2"
        else:
            scale_filter = f"scale='min({width},iw)':-2"

        filter_complex = f"fps={fps},{scale_filter}:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse"
        cmd = ["ffmpeg", "-y", "-i", input_path, "-vf", filter_complex, output_path]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg GIF conversion error: {res.stderr}")
        return output_path

    cmd = ["ffmpeg", "-y", "-i", input_path]

    res_opt = options.get("resolution", "original")
    if res_opt != "original" and res_opt:
        vf_filter = f"scale={res_opt}:force_original_aspect_ratio=decrease,pad={res_opt}:(ow-iw)/2:(oh-ih)/2,scale=trunc(iw/2)*2:trunc(ih/2)*2"
    else:
        vf_filter = "scale=trunc(iw/2)*2:trunc(ih/2)*2"

    cmd.extend(["-vf", vf_filter])

    if tgt == "mp4":
        cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"])
        crf = options.get("video_quality", 23)
        cmd.extend(["-crf", str(crf)])
    elif tgt == "webm":
        cmd.extend(["-c:v", "libvpx-vp9", "-b:v", "0"])
        crf = options.get("video_quality", 28)
        cmd.extend(["-crf", str(crf)])
    elif tgt == "mkv":
        cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p"])
    elif tgt == "avi":
        cmd.extend(["-c:v", "mpeg4", "-qscale:v", "3"])
    elif tgt == "mov":
        cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p"])

    has_audio = has_audio_stream(input_path)
    preserve_audio = options.get("preserve_audio", True)

    if has_audio and preserve_audio:
        if tgt == "mp4" or tgt == "mov":
            cmd.extend(["-c:a", "aac", "-b:a", "192k"])
        elif tgt == "webm":
            cmd.extend(["-c:a", "libopus"])
        else:
            cmd.extend(["-c:a", "copy"])
    else:
        cmd.append("-an")

    cmd.append(output_path)

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg video conversion failed: {proc.stderr[-1000:]}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("FFmpeg finished but output video file is missing or empty.")

    return output_path

def extract_audio(input_path, output_path, target_format, options=None):
    options = options or {}
    tgt = target_format.lower()

    cmd = ["ffmpeg", "-y", "-i", input_path, "-vn"]

    if tgt == "mp3":
        cmd.extend(["-c:a", "libmp3lame", "-b:a", options.get("audio_bitrate", "256k")])
    elif tgt == "wav":
        cmd.extend(["-c:a", "pcm_s16le"])
    elif tgt in ("aac", "m4a"):
        cmd.extend(["-c:a", "aac", "-b:a", options.get("audio_bitrate", "256k")])
    elif tgt == "flac":
        cmd.extend(["-c:a", "flac"])
    elif tgt == "ogg":
        cmd.extend(["-c:a", "libvorbis", "-q:a", "5"])
    elif tgt == "opus":
        cmd.extend(["-c:a", "libopus", "-b:a", options.get("audio_bitrate", "128k")])

    cmd.append(output_path)

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {proc.stderr[-1000:]}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Audio extraction succeeded but output file is missing or empty.")

    return output_path
