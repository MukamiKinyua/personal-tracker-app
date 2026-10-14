import { useAuth } from "@/_core/hooks/useAuth";
import { syncFiles } from "@/lib/fileSync";
import { useEffect } from "react";

/**
 * Keeps attached files backed up. Renders nothing.
 *
 * Runs when someone signs in, whenever the device comes back online, when the
 * app returns to the foreground, and on a slow timer as a safety net. Each
 * pass is cheap when nothing is waiting, and a failed one simply leaves the
 * files queued for the next.
 */
export function FileSyncBridge() {
  const auth = useAuth();
  const signedIn = Boolean(auth.user);

  useEffect(() => {
    if (!signedIn) return;
    const run = () => void syncFiles();
    run();
    window.addEventListener("online", run);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [signedIn]);

  return null;
}
