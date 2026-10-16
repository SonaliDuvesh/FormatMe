import subprocess
import os

def convert_audio(input_path, output_path, target_format, options=None):
    options = options or {}
    tgt = target_format.lower()
    bitrate = options.get("audio_bitrate", "256k")
    sample_rate = options.get("sample_rate", None)

    cmd = ["ffmpeg", "-y", "-i", input_path]

    if sample_rate:
        cmd.extend(["-ar", str(sample_rate)])

    if tgt == "mp3":
        cmd.extend(["-c:a", "libmp3lame", "-b:a", bitrate])
    elif tgt == "wav":
        cmd.extend(["-c:a", "pcm_s16le"])
    elif tgt in ("aac", "m4a"):
        cmd.extend(["-c:a", "aac", "-b:a", bitrate])
    elif tgt == "flac":
        cmd.extend(["-c:a", "flac"])
    elif tgt == "ogg":
        cmd.extend(["-c:a", "libvorbis", "-b:a", bitrate])
    elif tgt == "opus":
        cmd.extend(["-c:a", "libopus", "-b:a", bitrate])
    elif tgt == "aiff":
        cmd.extend(["-c:a", "pcm_s16be"])
    elif tgt == "wma":
        cmd.extend(["-c:a", "wmav2", "-b:a", bitrate])
    else:
        cmd.extend(["-b:a", bitrate])

    cmd.append(output_path)

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg audio conversion failed: {proc.stderr[-1000:]}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Audio conversion completed but output file is missing or empty.")

    return output_path

def convert_audio_to_video(input_path, output_path, target_format, options=None):
    options = options or {}
    resolution = options.get("resolution", "1920x1080")
    if resolution == "original" or not resolution:
        resolution = "1920x1080"
    fps = int(options.get("fps", 30))
    tgt = target_format.lower()
    bitrate = options.get("audio_bitrate", "192k")

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=black:s={resolution}:r={fps}",
        "-i", input_path
    ]

    if tgt == "mp4":
        cmd.extend([
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", bitrate,
            "-movflags", "+faststart"
        ])
    elif tgt == "webm":
        cmd.extend([
            "-c:v", "libvpx-vp9",
            "-pix_fmt", "yuv420p",
            "-c:a", "libopus",
            "-b:a", bitrate
        ])
    elif tgt == "mkv":
        cmd.extend([
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", bitrate
        ])
    elif tgt == "mov":
        cmd.extend([
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", bitrate
        ])
    elif tgt == "avi":
        cmd.extend([
            "-c:v", "mpeg4",
            "-pix_fmt", "yuv420p",
            "-c:a", "libmp3lame",
            "-b:a", bitrate
        ])
    else:
        cmd.extend([
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", bitrate
        ])

    cmd.extend(["-shortest", output_path])

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg audio-to-video conversion failed: {proc.stderr[-1000:]}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError("Audio-to-video conversion finished but output file is missing or empty.")

    return output_path

