/**
 * The device registry.
 *
 * Each device that syncs is recorded here with its own cursor, so the phone
 * being up to date says nothing about what the tablet has seen. It also backs
 * the settings screen that lists which devices hold a copy of the journal, and
 * the revoke that cuts a lost one off.
 */

import { getMongoDb } from "./mongo";

export type StoredDevice = {
  ownerId: number;
  deviceId: string;
  label: string;
  kind: string;
  cursor: number;
  active: boolean;
  createdAt: Date;
  lastSeenAt: Date;
};

export type DeviceView = Omit<
  StoredDevice,
  "ownerId" | "createdAt" | "lastSeenAt"
> & {
  createdAt: string;
  lastSeenAt: string;
};

const indexPromises = new Map<string, Promise<void>>();

async function devicesCollection() {
  const db = await getMongoDb();
  const devices = db.collection<StoredDevice>("journal_devices");
  const key = db.databaseName;

  if (!indexPromises.has(key)) {
    indexPromises.set(
      key,
      Promise.all([
        devices.createIndex(
          { ownerId: 1, deviceId: 1 },
          { unique: true, name: "owner_device_unique" }
        ),
        devices.createIndex(
          { ownerId: 1, lastSeenAt: -1 },
          { name: "owner_last_seen" }
        ),
      ]).then(() => undefined)
    );
  }

  await indexPromises.get(key);
  return devices;
}

function toView(device: StoredDevice): DeviceView {
  return {
    deviceId: device.deviceId,
    label: device.label,
    kind: device.kind,
    cursor: device.cursor,
    active: device.active,
    createdAt: device.createdAt.toISOString(),
    lastSeenAt: device.lastSeenAt.toISOString(),
  };
}

/**
 * Records that a device is syncing, creating it on first sight.
 *
 * A revoked device stays revoked: re-registering must not be a way to quietly
 * undo a revoke from the device that was cut off.
 */
export async function touchDevice({
  ownerId,
  deviceId,
  label,
  kind,
  cursor,
}: {
  ownerId: number;
  deviceId: string;
  label: string;
  kind: string;
  cursor?: number;
}): Promise<{ device: DeviceView; revoked: boolean }> {
  const devices = await devicesCollection();
  const now = new Date();

  const existing = await devices.findOne({ ownerId, deviceId });
  if (existing && !existing.active) {
    return { device: toView(existing), revoked: true };
  }

  const result = await devices.findOneAndUpdate(
    { ownerId, deviceId },
    {
      $set: {
        label,
        kind,
        lastSeenAt: now,
        ...(typeof cursor === "number" ? { cursor } : {}),
      },
      $setOnInsert: { ownerId, deviceId, active: true, createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );

  return {
    device: toView(
      result ?? {
        ownerId,
        deviceId,
        label,
        kind,
        cursor: cursor ?? 0,
        active: true,
        createdAt: now,
        lastSeenAt: now,
      }
    ),
    revoked: false,
  };
}

export async function listDevices(ownerId: number): Promise<DeviceView[]> {
  const devices = await devicesCollection();
  const found = await devices
    .find({ ownerId })
    .sort({ lastSeenAt: -1 })
    .toArray();
  return found.map(toView);
}

/**
 * Cuts a device off. Its records stay on the server — this stops that device
 * syncing, it does not delete what it contributed.
 */
export async function revokeDevice(
  ownerId: number,
  deviceId: string
): Promise<boolean> {
  const devices = await devicesCollection();
  const result = await devices.updateOne(
    { ownerId, deviceId },
    { $set: { active: false } }
  );
  return result.modifiedCount > 0;
}

export async function renameDevice(
  ownerId: number,
  deviceId: string,
  label: string
): Promise<boolean> {
  const devices = await devicesCollection();
  const result = await devices.updateOne(
    { ownerId, deviceId },
    { $set: { label } }
  );
  return result.modifiedCount > 0;
}

/** Whether this device is still allowed to sync. */
export async function isDeviceActive(
  ownerId: number,
  deviceId: string
): Promise<boolean> {
  const devices = await devicesCollection();
  const device = await devices.findOne({ ownerId, deviceId });
  // Unknown devices are allowed; they register on their first sync.
  return device ? device.active : true;
}

export async function purgeDevices(ownerId: number): Promise<number> {
  const devices = await devicesCollection();
  const result = await devices.deleteMany({ ownerId });
  return result.deletedCount ?? 0;
}
