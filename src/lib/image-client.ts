// Client-side photo compression for invoice/receipt attachments. Downscales
// to a max dimension and re-encodes as JPEG so a 6 MB phone photo becomes a
// few hundred KB before it's stored as a data URL.
export async function compressImageToDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.72,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
