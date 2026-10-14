/**
 * Attach documents and photos to a record.
 *
 * Reusable: it takes the list of FileRefs a record holds and reports the new
 * list. Adding a file stores it on this device first (so it works offline and
 * signed out) and then asks the sync step to back it up. The record itself
 * only ever keeps the small reference.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import {
  FILE_ACCEPT,
  fileProblem,
  formatBytes,
  isPhotoType,
  newFileId,
  resolveMimeType,
  type FileRef,
} from "@/lib/fileRefs";
import { loadFileBlob, syncFiles } from "@/lib/fileSync";
import {
  FILES_CHANGED_EVENT,
  listLocalFiles,
  putLocalFile,
  removeLocalFile,
  type LocalFile,
} from "@/lib/fileStore";
import { preparePhoto, preparedPhotoIdentity } from "@/lib/photo";
import { useCallback, useEffect, useRef, useState } from "react";

/** Backup state of each file, kept current as the sync step works. */
function useLocalStatuses() {
  const [statuses, setStatuses] = useState<Record<string, LocalFile>>({});
  const refresh = useCallback(async () => {
    try {
      const all = await listLocalFiles();
      setStatuses(Object.fromEntries(all.map(file => [file.id, file])));
    } catch {
      setStatuses({});
    }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener(FILES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FILES_CHANGED_EVENT, refresh);
  }, [refresh]);
  return statuses;
}

function Thumbnail({ file }: { file: FileRef }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!isPhotoType(file.mimeType)) return;
    let made: string | undefined;
    let cancelled = false;
    void loadFileBlob(file).then(blob => {
      if (!blob || cancelled) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [file]);

  if (url) return <img className="file-thumb" src={url} alt="" />;
  return (
    <span className="file-thumb file-thumb-icon" aria-hidden="true">
      {isPhotoType(file.mimeType) ? "▣" : "▤"}
    </span>
  );
}

function statusText(
  local: LocalFile | undefined,
  signedIn: boolean
): { text: string; tone: "ok" | "wait" | "warn" } {
  if (!local) return { text: "Backed up to your account", tone: "ok" };
  if (local.synced) return { text: "Backed up to your account", tone: "ok" };
  if (local.syncError) return { text: local.syncError, tone: "warn" };
  return signedIn
    ? { text: "On this device · backing up…", tone: "wait" }
    : { text: "On this device only · sign in to back up", tone: "wait" };
}

export function FileAttachments({
  files,
  onChange,
  label = "Files and photos",
}: {
  files: FileRef[];
  onChange: (next: FileRef[]) => void;
  label?: string;
}) {
  const auth = useAuth();
  const statuses = useLocalStatuses();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string>();
  // The latest list, so adding several files in a row never loses one.
  const latest = useRef(files);
  latest.current = files;

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setMessage(undefined);
    const added: FileRef[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const problem = fileProblem(file);
      if (problem) {
        problems.push(`${file.name}: ${problem}`);
        continue;
      }
      try {
        const reported = resolveMimeType(file.name, file.type);
        const prepared = await preparePhoto(file, reported);
        const identity = preparedPhotoIdentity(file, prepared, reported);
        const ref: FileRef = {
          id: newFileId(),
          name: identity.name,
          mimeType: identity.mimeType,
          size: prepared.size,
          addedAt: new Date().toISOString(),
        };
        await putLocalFile({
          ...ref,
          blob: prepared instanceof File ? prepared : new Blob([prepared], { type: identity.mimeType }),
          synced: false,
        });
        added.push(ref);
      } catch {
        problems.push(`${file.name}: could not be stored on this device.`);
      }
    }
    if (added.length > 0) {
      onChange([...latest.current, ...added]);
      // Back up in the background; never awaited, never blocks adding.
      void syncFiles();
    }
    setMessage(problems.length > 0 ? problems.join(" ") : undefined);
    setBusy(false);
  }

  async function open(file: FileRef) {
    const blob = await loadFileBlob(file);
    if (!blob) {
      setMessage(`${file.name} is not available on this device or your account.`);
      return;
    }
    const url = URL.createObjectURL(new Blob([blob], { type: file.mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener";
    if (isPhotoType(file.mimeType) || file.mimeType === "application/pdf") {
      link.target = "_blank";
    } else {
      link.download = file.name;
    }
    link.click();
    // Long enough for the new tab or download to have taken it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function remove(file: FileRef) {
    setConfirming(undefined);
    onChange(latest.current.filter(item => item.id !== file.id));
    try {
      await removeLocalFile(file.id);
      void syncFiles();
    } catch {
      // The reference is gone either way; the stored copy can be cleared from
      // Settings.
    }
  }

  return (
    <div className="file-attachments">
      <div className="file-attachments-head">
        <b>{label}</b>
        <div className="file-attachments-add">
          <label className="file-add-button">
            {busy ? "Adding…" : "Add file"}
            <input
              type="file"
              multiple
              accept={FILE_ACCEPT}
              disabled={busy}
              onChange={event => {
                void add(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="file-add-button">
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy}
              onChange={event => {
                void add(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <small className="file-empty">
          Nothing attached. Photos are resized and have their location data
          removed before they are stored.
        </small>
      ) : (
        <ul>
          {files.map(file => {
            const status = statusText(statuses[file.id], auth.isAuthenticated);
            return (
              <li key={file.id}>
                <Thumbnail file={file} />
                <div className="file-meta">
                  <button type="button" className="file-name" onClick={() => void open(file)}>
                    {file.name}
                  </button>
                  <small>
                    {formatBytes(file.size)} ·{" "}
                    <span className={`file-status file-status-${status.tone}`}>
                      {status.text}
                    </span>
                  </small>
                </div>
                {confirming === file.id ? (
                  <div className="file-confirm">
                    <button type="button" onClick={() => void remove(file)}>
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirming(undefined)}>
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => setConfirming(file.id)}
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {message ? (
        <p className="file-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
