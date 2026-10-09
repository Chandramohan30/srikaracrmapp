/**
 * Reads an image file and returns a compressed JPEG data URL (max 1280px side).
 * A phone screenshot of 3-5 MB becomes ~150-400 KB, so uploads stay fast.
 */
export async function fileToCompressedDataUrl(file: File, maxSide = 1280, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG or WEBP).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image is too large. Please choose a screenshot under 15 MB.');
  }

  const url = URL.createObjectURL(file);
  try {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read this image. Try another screenshot.'));
      i.src = url;
    });

    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process images.');
    ctx.fillStyle = '#ffffff'; // flatten transparency
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
