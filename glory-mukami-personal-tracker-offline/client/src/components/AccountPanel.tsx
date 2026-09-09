/**
 * The account and sync panel.
 *
 * This is where the app has to be straight with someone about where their
 * journal actually lives. A tracker that says "Saved" while five years of
 * entries sit in one browser has misled its user, so every state here names
 * the guarantee it is really offering — on this device only, or on the account
 * as well — and never implies a backup that does not exist.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useRecordStore } from "@/contexts/RecordStoreContext";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import {
  describeRevoke,
  devicesSummary,
  lastSeenLabel,
  sortDevices,
  type DeviceRecord,
} from "@/lib/core/devices";
import { describeDurability } from "@/lib/core/storage";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";

export function AccountPanel() {
  const auth = useAuth();
  const store = useRecordStore();
  const signIn = useGoogleSignIn();
  const utils = trpc.useUtils();

  const signedIn = Boolean(auth.user);

  const devicesQuery = trpc.devices.list.useQuery(undefined, {
    enabled: signedIn,
    retry: false,
  });
  const revokeDevice = trpc.devices.revoke.useMutation({
    onSuccess: () => void utils.devices.list.invalidate(),
  });

  const [confirmingRevoke, setConfirmingRevoke] = useState<string>();

  const devices = useMemo<DeviceRecord[]>(() => {
    const rows = (devicesQuery.data ?? []) as DeviceRecord[];
    return sortDevices(
      rows.map(row => ({
        ...row,
        isCurrent: row.deviceId === store.device?.deviceId,
      }))
    );
  }, [devicesQuery.data, store.device?.deviceId]);

  // The one sentence that says what is actually guaranteed.
  const durability = store.storage
    ? describeDurability(store.storage, signedIn)
    : null;

  return (
    <div className="account-panel">
      <div className="account-heading">
        <b>Your account</b>
        <small>{store.syncStatusMessage}</small>
      </div>

      {durability ? (
        <p
          className={`account-durability account-durability-${durability.level}`}
        >
          {durability.message}
        </p>
      ) : null}

      {signedIn ? (
        <>
          <div className="account-identity">
            <div>
              <b>{auth.user?.name || auth.user?.email || "Signed in"}</b>
              {auth.user?.email ? <small>{auth.user.email}</small> : null}
            </div>
            <button type="button" onClick={() => void auth.logout()}>
              Sign out
            </button>
          </div>

          <div className="account-sync-row">
            <span>
              {store.pendingWrites > 0
                ? `${store.pendingWrites} change${store.pendingWrites === 1 ? "" : "s"} waiting`
                : "Nothing waiting to send"}
            </span>
            <button
              type="button"
              onClick={store.syncNow}
              disabled={!store.online}
            >
              Sync now
            </button>
          </div>

          <div className="account-devices">
            <div className="account-devices-heading">
              <b>Devices</b>
              <small>{devicesSummary(devices)}</small>
            </div>

            {devicesQuery.isLoading ? (
              <p className="account-note">
                Checking which devices are syncing…
              </p>
            ) : devices.length === 0 ? (
              <p className="account-note">
                No devices recorded yet. This one appears after its first sync.
              </p>
            ) : (
              <ul>
                {devices.map(device => (
                  <li
                    key={device.deviceId}
                    className={device.active ? "" : "revoked"}
                  >
                    <div>
                      <b>
                        {device.label}
                        {device.isCurrent ? " · this device" : ""}
                      </b>
                      <small>
                        {device.active
                          ? lastSeenLabel(device)
                          : "No longer syncing"}
                      </small>
                    </div>

                    {device.active && !device.isCurrent ? (
                      confirmingRevoke === device.deviceId ? (
                        <div className="account-confirm">
                          {/* Honest about what revoking does and does not do. */}
                          <small>{describeRevoke(device).warning}</small>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                revokeDevice.mutate({
                                  deviceId: device.deviceId,
                                });
                                setConfirmingRevoke(undefined);
                              }}
                            >
                              Stop syncing
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingRevoke(undefined)}
                            >
                              Keep it
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingRevoke(device.deviceId)}
                        >
                          Stop syncing
                        </button>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : signIn.available ? (
        <div className="account-signin">
          <p>
            Signing in keeps a second copy of your journal to your account, so
            it survives losing or reinstalling the app, and lets your phone,
            laptop and tablet show the same entries.
          </p>
          <button
            type="button"
            className="account-google"
            onClick={() => void signIn.signIn()}
            disabled={signIn.busy}
          >
            {signIn.busy ? "Signing in…" : "Continue with Google"}
          </button>
          {signIn.error ? (
            <p className="account-error" role="alert">
              {signIn.error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="account-note">
          Sync is not set up on this server yet, so your journal is kept on this
          device only. Everything still works — export a backup to keep a second
          copy.
        </p>
      )}
    </div>
  );
}
