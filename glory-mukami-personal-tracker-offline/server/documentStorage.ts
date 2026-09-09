export const DOCUMENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

export const DOCUMENT_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "application/octet-stream",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isSupportedDocumentMimeType(value: string) {
  return DOCUMENT_UPLOAD_MIME_TYPES.has(value.toLowerCase());
}

export function sanitizeDocumentFileName(value: string) {
  const safeName = value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  return safeName || "document";
}
