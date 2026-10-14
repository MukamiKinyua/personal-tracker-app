/**
 * Pure helpers for attached files and photos: the shape a record keeps, what
 * may be attached, and the size maths. No browser APIs, so all of it is
 * testable on its own. The actual bytes live in fileStore.ts, never in the
 * record: a record only holds a small reference, so a journal full of photos
 * still syncs and exports as light JSON.
 */

/** What a record stores about an attached file. */
export type FileRef = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  addedAt: string;
};

/** Mirrors the server's allow-list (server/documentStorage.ts). */
export const FILE_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,text/plain,text/markdown,.docx,.xlsx";

export const FILE_MAX_BYTES = 15 * 1024 * 1024;

export const PHOTO_MAX_EDGE = 2048;

export function newFileId(): string {
  return crypto.randomUUID();
}

export function isPhotoType(mime: string): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(mime.toLowerCase());
}

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * A file's type: what the browser reported, or failing that (Office files
 * often arrive with none) what its extension says.
 */
export function resolveMimeType(name: string, reported: string): string {
  const declared = reported.trim().toLowerCase();
  if (declared && declared !== "application/octet-stream") return declared;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? declared;
}

/** A message for the person, or null when the file is acceptable. */
export function fileProblem(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > FILE_MAX_BYTES) return "Choose a file smaller than 15 MB.";
  const mime = resolveMimeType(file.name, file.type);
  if (!(FILE_MIME_TYPES as readonly string[]).includes(mime)) {
    return "This file type is not supported. Use a PDF, a photo, text, or an Office document.";
  }
  return null;
}

/** The size an image should be scaled to so its longest edge is `max`. */
export function fitWithin(
  width: number,
  height: number,
  max = PHOTO_MAX_EDGE
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
