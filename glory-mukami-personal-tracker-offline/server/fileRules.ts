/**
 * What a stored file is allowed to be.
 *
 * Pure functions, no I/O, so the rules that decide what the server will hold
 * (and how it hands it back) can be tested without a database. The upload
 * route applies every one of these; none is left to the client's word.
 */

import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  isSupportedDocumentMimeType,
} from "./documentStorage";

export const FILE_MAX_BYTES = DOCUMENT_UPLOAD_MAX_BYTES;

/** Per-account ceiling, so one account cannot fill the database. */
export function fileQuotaBytes(env = process.env.FILE_QUOTA_MB): number {
  const megabytes = Number(env);
  return (Number.isFinite(megabytes) && megabytes > 0 ? megabytes : 100) * 1024 * 1024;
}

/**
 * Ids are minted by the client (a UUID), which lets a file be added offline
 * and uploaded later without the server ever renaming it. Constrained hard
 * because the id ends up in a URL and a database filter.
 */
export function isValidFileId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value);
}

export function isAllowedFileType(mime: string): boolean {
  return isSupportedDocumentMimeType(mime);
}

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, index) => buffer[offset + index] === byte);

/**
 * Whether the bytes are what the declared type claims.
 *
 * A file named .jpg that is really a script is the oldest upload trick there
 * is. Types with a fixed signature are checked against it; the loosely
 * defined ones (plain text, Office zip containers, a generic binary) are
 * checked only for the zip header where one is required.
 */
export function contentMatchesType(mime: string, data: Buffer): boolean {
  switch (mime.toLowerCase()) {
    case "image/jpeg":
      return startsWith(data, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8);
    case "application/pdf":
      // The spec allows a little leading junk; 1 KiB is the usual allowance.
      return data.subarray(0, 1024).includes("%PDF-");
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return startsWith(data, [0x50, 0x4b, 0x03, 0x04]);
    default:
      return true;
  }
}

/**
 * Only formats a browser renders passively are shown inline. Everything else
 * is offered as a download, so a stored file can never run as part of the app.
 */
export function dispositionFor(mime: string): "inline" | "attachment" {
  return ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
    mime.toLowerCase()
  )
    ? "inline"
    : "attachment";
}

/** Header-safe, for Content-Disposition. */
export function safeDownloadName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "file";
}
