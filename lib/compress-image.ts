const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION_PX = 2000;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<{ file: File | null; error?: string }> {
  if (!file.type.startsWith("image/")) return { file };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file };
  }

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    const ratio = Math.min(MAX_DIMENSION_PX / width, MAX_DIMENSION_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const baseName = file.name.replace(/\.[^.]+$/, ".jpg");

  for (const quality of [0.85, 0.72, 0.60]) {
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) break;
    if (blob.size <= MAX_UPLOAD_BYTES) {
      return { file: new File([blob], baseName, { type: "image/jpeg" }) };
    }
  }

  return { file: null, error: "Image is too large to upload even after compression. Please use an image under 2 MB." };
}
