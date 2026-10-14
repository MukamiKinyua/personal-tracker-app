/**
 * Photos are re-encoded before they are stored.
 *
 * Two reasons, and the second matters more than the first. A phone photo is
 * several megabytes and the journal does not need that; and a camera's JPEG
 * carries EXIF metadata - often the exact GPS position it was taken at. Drawing
 * the image onto a canvas and encoding it again keeps the picture and drops
 * every byte of that metadata, so a photo of a document or a room does not
 * quietly record where the person lives.
 */

import { fitWithin, isPhotoType, PHOTO_MAX_EDGE } from "./fileRefs";

export async function preparePhoto(file: File, mimeType: string): Promise<Blob> {
  if (!isPhotoType(mimeType)) return file;
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") {
    return file;
  }
  try {
    // "from-image" applies the camera's rotation, which the canvas would
    // otherwise lose along with the metadata.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no transparency; a transparent PNG would turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const encoded = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!encoded) return file;
    // A small PNG (a screenshot, a scan) can get bigger as a JPEG; those carry
    // no location data, so the original is kept. A camera JPEG is always
    // re-encoded, for the metadata.
    if (mimeType === "image/png" && encoded.size >= file.size) return file;
    return encoded;
  } catch {
    return file;
  }
}

/** The type and name a prepared photo should be stored under. */
export function preparedPhotoIdentity(
  original: { name: string },
  prepared: Blob,
  originalType: string
): { name: string; mimeType: string } {
  if (prepared.type === "image/jpeg" && originalType !== "image/jpeg") {
    return {
      name: original.name.replace(/\.[^.]+$/, "") + ".jpg",
      mimeType: "image/jpeg",
    };
  }
  return { name: original.name, mimeType: prepared.type || originalType };
}
