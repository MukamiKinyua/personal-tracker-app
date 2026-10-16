/**
 * The seam between the web app and the phone it may be running inside.
 *
 * Everything the browser cannot do — deliver a notification while the app is
 * closed, sign in with the device's Google account, feed a home-screen widget
 * — goes through here, and every function degrades to "not available" rather
 * than throwing when there is no native layer. The rest of the app never asks
 * which platform it is on; it asks whether a capability exists.
 */

import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import { SocialLogin } from "@capgo/capacitor-social-login";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/* ------------------------------------------------------------------------ */
/* Sign-in                                                                   */
/* ------------------------------------------------------------------------ */

let socialLoginReady: Promise<void> | undefined;

/**
 * Obtains a Google ID token from the device's own account picker.
 *
 * The token's audience is the WEB client id — that is what Google's
 * Credential Manager requires and what the server already verifies — so the
 * Android build and the browser produce the same kind of token and the
 * server does not care which it was.
 */
export async function nativeGoogleIdToken(
  webClientId: string
): Promise<string> {
  socialLoginReady ??= SocialLogin.initialize({ google: { webClientId } });
  await socialLoginReady;

  const response = await SocialLogin.login({
    provider: "google",
    options: {},
  });

  const result = response.result as { idToken?: string | null };
  if (!result.idToken) {
    throw new Error("Google did not return a sign-in token.");
  }
  return result.idToken;
}

/* ------------------------------------------------------------------------ */
/* Notifications                                                             */
/* ------------------------------------------------------------------------ */

export type PlannedNotification = {
  id: number;
  title: string;
  body: string;
  hour: number;
  minute: number;
};

export async function notificationsPermitted(): Promise<boolean> {
  if (isNative()) {
    const status = await LocalNotifications.checkPermissions();
    return status.display === "granted";
  }
  return (
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    const status = await LocalNotifications.requestPermissions();
    return status.display === "granted";
  }
  if (typeof Notification === "undefined") return false;
  return (await Notification.requestPermission()) === "granted";
}

/** A one-off notification at a specific moment (an assignment due, say). */
export type PlannedOneOff = {
  id: number;
  title: string;
  body: string;
  at: Date;
};

/**
 * Replaces the device's whole schedule: the daily repeats and the dated
 * one-offs together.
 *
 * Cancel-then-schedule rather than a diff: the plan is a handful of daily
 * repeats and a bounded number of one-offs, and a diff that got out of step
 * with the device would leave a reminder the user switched off still firing -
 * the one failure that breaks trust in the whole feature. Because everything
 * pending is cancelled, both kinds have to be handed over in the same call, or
 * one would silently erase the other.
 */
export async function scheduleAll(
  daily: PlannedNotification[],
  oneOffs: PlannedOneOff[] = []
): Promise<void> {
  if (!isNative()) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map(({ id }) => ({ id })),
    });
  }
  if (daily.length === 0 && oneOffs.length === 0) return;

  await LocalNotifications.schedule({
    notifications: [
      ...daily.map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: {
          on: { hour: item.hour, minute: item.minute },
          repeats: true,
          allowWhileIdle: true,
        },
      })),
      ...oneOffs.map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: { at: item.at, allowWhileIdle: true },
      })),
    ],
  });
}

/** Daily repeats only; kept for callers that have no dated notifications. */
export function scheduleDaily(plan: PlannedNotification[]): Promise<void> {
  return scheduleAll(plan, []);
}

/**
 * Runs `callback` each time the app returns to the foreground. The dated
 * notifications are planned a fortnight ahead, so every return is a chance to
 * extend the window and drop anything that has since been done.
 */
export function onAppResume(callback: () => void): () => void {
  if (!isNative()) return () => undefined;
  let handle: { remove: () => Promise<void> } | undefined;
  let removed = false;
  void App.addListener("resume", callback).then(listener => {
    if (removed) void listener.remove();
    else handle = listener;
  });
  return () => {
    removed = true;
    void handle?.remove();
  };
}

/** Shows one now. Used by the browser path, which can only act while open. */
export async function showNow(title: string, body: string): Promise<boolean> {
  if (isNative()) {
    await LocalNotifications.schedule({
      notifications: [{ id: Date.now() % 100000, title, body }],
    });
    return true;
  }
  if (!(await notificationsPermitted())) return false;
  new Notification(title, { body, icon: "/icons/icon-192.png" });
  return true;
}

/* ------------------------------------------------------------------------ */
/* Home-screen widget                                                        */
/* ------------------------------------------------------------------------ */

export type WidgetSummary = {
  waterMl: number;
  waterGoalMl: number;
  tasksOpen: number;
  /** "Rest 1:20 · Squat", or absent when nothing is running. */
  timer?: string;
  updatedAt: string;
};

const WIDGET_KEY = "widget";

type WidgetBridgePlugin = {
  refresh(): Promise<void>;
};

/**
 * Tiny native plugin (android/.../WidgetBridge.kt) that pokes the widget to
 * redraw. Preferences is where the data goes — it is backed by the same
 * SharedPreferences file the widget reads — and this is the nudge that says
 * "now".
 */
const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge", {
  web: () => Promise.resolve({ refresh: async () => undefined }),
});

export async function publishWidget(summary: WidgetSummary): Promise<void> {
  if (!isNative()) return;
  await Preferences.set({ key: WIDGET_KEY, value: JSON.stringify(summary) });
  try {
    await WidgetBridge.refresh();
  } catch {
    // No widget placed, or an older APK without the bridge: the data is
    // still written and the next periodic redraw will pick it up.
  }
}

/* ------------------------------------------------------------------------ */
/* Backup                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Hands a backup file to the user on Android.
 *
 * There is no Downloads folder an in-app `<a download>` click can reach from
 * inside the WebView, so the file is written to the app's private cache and
 * then handed to the system share sheet — the user picks Drive, a Downloads
 * app, email, whatever they trust to survive a reinstall. Returns false when
 * there is no native layer, so the caller falls back to the browser's own
 * download link.
 */
export async function saveBackupFile(
  filename: string,
  contents: string
): Promise<boolean> {
  if (!isNative()) return false;

  const written = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  await Share.share({
    title: "Save your backup",
    url: written.uri,
  });

  return true;
}
