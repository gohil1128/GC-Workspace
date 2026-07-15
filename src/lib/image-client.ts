// Turn an invoice attachment into a storable data URL. Images get downscaled
// and re-encoded (a 6 MB phone photo becomes a few hundred KB); PDFs can't be
// compressed in the browser, so they're size-capped and read as-is.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function fileToAttachmentDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error("PDF too large — keep it under 4 MB");
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the PDF"));
      reader.readAsDataURL(file);
    });
  }
  return compressImageToDataUrl(file);
}

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
