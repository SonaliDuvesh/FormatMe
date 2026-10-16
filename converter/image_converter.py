import os
from PIL import Image, ImageSequence
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

def convert_image(input_path, output_path, target_format, options=None):
    options = options or {}
    quality = int(options.get('quality', 90))
    tgt = target_format.lower()
    if tgt in ('jpg', 'jpeg'):
        tgt = 'jpeg'

    with Image.open(input_path) as img:
        is_animated = getattr(img, "is_animated", False) and img.n_frames > 1

        if is_animated and tgt in ('webp', 'gif'):
            frames = []
            durations = []
            for frame in ImageSequence.Iterator(img):
                f = frame.copy()
                durations.append(frame.info.get('duration', 100))
                frames.append(f)

            save_kwargs = {
                "save_all": True,
                "append_images": frames[1:],
                "duration": durations,
                "loop": img.info.get('loop', 0),
            }
            if tgt == 'webp':
                save_kwargs["quality"] = quality
                save_kwargs["format"] = "WEBP"
            else:
                save_kwargs["format"] = "GIF"

            frames[0].save(output_path, **save_kwargs)
            return output_path

        if tgt in ('jpeg', 'bmp'):
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                alpha = img.convert("RGBA")
                bg.paste(alpha, mask=alpha.split()[3])
                img_to_save = bg
            else:
                img_to_save = img.convert("RGB")
        elif tgt == 'ico':
            img_to_save = img.convert("RGBA")
            if img_to_save.size[0] > 256 or img_to_save.size[1] > 256:
                img_to_save = img_to_save.resize((256, 256), Image.Resampling.LANCZOS)
        elif tgt == 'pdf':
            if img.mode in ('RGBA', 'LA'):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                alpha = img.convert("RGBA")
                bg.paste(alpha, mask=alpha.split()[3])
                img_to_save = bg
            else:
                img_to_save = img.convert("RGB")
        else:
            img_to_save = img

        save_kwargs = {}
        if tgt in ('jpeg', 'webp'):
            save_kwargs["quality"] = quality
        if tgt == 'jpeg':
            save_kwargs["optimize"] = True
        if tgt == 'png':
            save_kwargs["optimize"] = True

        pil_format = tgt.upper()
        if pil_format == 'JPG':
            pil_format = 'JPEG'

        img_to_save.save(output_path, format=pil_format, **save_kwargs)
        return output_path

def combine_images_to_pdf(input_paths, output_path):
    if not input_paths:
        raise ValueError("No images provided for PDF creation.")

    pil_images = []
    for p in input_paths:
        with Image.open(p) as img:
            if img.mode in ('RGBA', 'LA'):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                alpha = img.convert("RGBA")
                bg.paste(alpha, mask=alpha.split()[3])
                pil_images.append(bg)
            else:
                pil_images.append(img.convert("RGB"))

    first_image = pil_images[0]
    rest_images = pil_images[1:] if len(pil_images) > 1 else []

    first_image.save(output_path, "PDF", resolution=100.0, save_all=True, append_images=rest_images)
    return output_path

def extract_image_text(input_path, output_path):
    import shutil
    import pytesseract

    tess_bin = shutil.which("tesseract") or "/home/linuxbrew/.linuxbrew/bin/tesseract"
    if os.path.exists(tess_bin):
        pytesseract.pytesseract.tesseract_cmd = tess_bin

    with Image.open(input_path) as img:
        text = pytesseract.image_to_string(img)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text.strip())

    return output_path

