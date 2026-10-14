/**
 * Backing files up to the account, and fetching them back.
 *
 * The device is the source of truth; this only copies. It is safe to run at
 * any time and as often as you like: uploads are idempotent on the file id,
 * a failed attempt leaves the file queued, and nothing here ever blocks
 * adding or opening a file. Signed out or offline, it does nothing.
 */

import { apiUrl, authHeaders } from "./api";
import type { FileRef } from "./fileRefs";
import {
  forgetTombstone,
  getLocalFile,
  listFilesToSync,
  markSyncFailed,
  markSynced,
  putLocalFile,
  type LocalFile,
} from "./fileStore";

let running: Promise<SyncResult> | null = null;

export type SyncResult = { uploaded: number; deleted: number; failed: number };

function reasonFor(status: number): string {
  if (status === 413) return "Your account's file storage is full.";
  if (status === 415) return "The server would not accept this file type.";
  if (status === 401 || status === 403) return "Sign in to back this file up.";
  return "Could not back this file up yet. It will be retried.";
}

async function uploadOne(file: LocalFile): Promise<"ok" | "stop" | "failed"> {
  if (!file.blob) return "failed";
  const response = await fetch(apiUrl(`/api/files/${encodeURIComponent(file.id)}`), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": file.mimeType,
      "X-File-Name": encodeURIComponent(file.name),
      ...authHeaders(),
    },
    body: file.blob,
  });
  if (response.ok) {
    await markSynced(file.id);
    return "ok";
  }
  await markSyncFailed(file.id, reasonFor(response.status));
  // Not signed in: every other file would fail the same way.
  return response.status === 401 || response.status === 403 ? "stop" : "failed";
}

async function deleteOne(file: LocalFile): Promise<boolean> {
  const response = await fetch(apiUrl(`/api/files/${encodeURIComponent(file.id)}`), {
    method: "DELETE",
    credentials: "include",
    headers: authHeaders(),
  });
  if (response.ok) {
    await forgetTombstone(file.id);
    return true;
  }
  return false;
}

/** Uploads what is waiting and applies queued deletions. */
export function syncFiles(): Promise<SyncResult> {
  // One pass at a time: two overlapping passes would upload the same file twice.
  running ??= (async () => {
    const result: SyncResult = { uploaded: 0, deleted: 0, failed: 0 };
    try {
      for (const file of await listFilesToSync()) {
        try {
          if (file.deleted) {
            if (await deleteOne(file)) result.deleted += 1;
            else result.failed += 1;
            continue;
          }
          const outcome = await uploadOne(file);
          if (outcome === "ok") result.uploaded += 1;
          else result.failed += 1;
          if (outcome === "stop") break;
        } catch {
          // Offline or the server is down: leave it queued.
          result.failed += 1;
        }
      }
    } catch {
      // The local store itself is unavailable.
    }
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * The bytes of a file: from this device if it is here, otherwise from the
 * account (which is how a file added on another device, or before a reinstall,
 * comes back). A fetched copy is kept locally so it opens offline next time.
 */
export async function loadFileBlob(ref: FileRef): Promise<Blob | null> {
  try {
    const local = await getLocalFile(ref.id);
    if (local?.blob) return local.blob;
  } catch {
    // Fall through to the account.
  }
  try {
    const response = await fetch(apiUrl(`/api/files/${encodeURIComponent(ref.id)}`), {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    await putLocalFile({
      id: ref.id,
      name: ref.name,
      mimeType: ref.mimeType,
      size: blob.size,
      addedAt: ref.addedAt,
      blob,
      synced: true,
    });
    return blob;
  } catch {
    return null;
  }
}
