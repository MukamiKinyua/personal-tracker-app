/**
 * The answer to "is my journal actually backed up?", in one block.
 *
 * It reads what the sync engine, the server and the file queue each know and
 * combines them with backupStatus(), so a green tick means every one of them
 * agrees. It exists because the quiet failure modes (signed out, an
 * unreachable database, a stalled queue) all look like a working app.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useRecordStore } from "@/contexts/RecordStoreContext";
import { backupStatus, type BackupLevel } from "@/lib/core/backupStatus";
import { FILES_CHANGED_EVENT, listFilesToSync } from "@/lib/fileStore";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

/** Files waiting to be copied to the account, and why one failed, if it did. */
function useFileBackupState() {
  const [state, setState] = useState<{ waiting: number; problem?: string }>({
    waiting: 0,
  });
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const queued = await listFilesToSync();
        if (cancelled) return;
        setState({
          waiting: queued.filter(file => !file.deleted).length,
          problem: queued.find(file => !file.deleted && file.syncError)?.syncError,
        });
      } catch {
        if (!cancelled) setState({ waiting: 0 });
      }
    };
    void refresh();
    window.addEventListener(FILES_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(FILES_CHANGED_EVENT, refresh);
    };
  }, []);
  return state;
}

const MARK: Record<BackupLevel, string> = {
  ok: "✓",
  waiting: "…",
  warn: "!",
  off: "–",
};

export function BackupStatus() {
  const auth = useAuth();
  const store = useRecordStore();
  const signedIn = Boolean(auth.user);

  // Whether the server can reach its database. Unknown until it answers, and
  // unknown is not treated as a failure.
  const connection = trpc.journal.connection.useQuery(undefined, {
    enabled: signedIn,
    retry: 1,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const files = useFileBackupState();

  // So "2 minutes ago" keeps moving without anything else changing.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = backupStatus({
    signedIn,
    online: store.online,
    pendingWrites: store.pendingWrites,
    lastSyncedAt: store.sync.lastSyncedAt,
    lastError: store.sync.lastError,
    conflicts: store.conflicts.length,
    serverReady: connection.isSuccess ? connection.data.ready : undefined,
    filesWaiting: files.waiting,
    fileProblem: files.problem,
    now,
  });

  return (
    <div
      className={`backup-status backup-status-${status.level}`}
      role="status"
      aria-live="polite"
    >
      <span className="backup-status-mark" aria-hidden="true">
        {MARK[status.level]}
      </span>
      <div className="backup-status-copy">
        <b>{status.headline}</b>
        {status.detail ? <small>{status.detail}</small> : null}
        {signedIn ? <small>Last backed up: {status.lastBackedUp}</small> : null}
      </div>
    </div>
  );
}
