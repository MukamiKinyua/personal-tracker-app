/**
 * Files, kept in the same MongoDB as the journal (GridFS).
 *
 * The journal already needs Mongo, so keeping files beside it means one thing
 * to host, back up and secure rather than a second storage service. Every
 * operation is scoped by owner id: a file id alone never finds anything, so
 * guessing someone else's id reads nothing.
 */

import { GridFSBucket, type Db } from "mongodb";
import { Readable } from "node:stream";
import { getMongoDb } from "./mongo";

export type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

const BUCKET = "user_files";

type FileMeta = { ownerId: number; fileId: string; name: string; mimeType: string };

const indexed = new Map<string, Promise<unknown>>();

async function bucket(): Promise<{ bucket: GridFSBucket; db: Db }> {
  const db = await getMongoDb();
  if (!indexed.has(db.databaseName)) {
    indexed.set(
      db.databaseName,
      db
        .collection(`${BUCKET}.files`)
        .createIndex(
          { "metadata.ownerId": 1, "metadata.fileId": 1 },
          { unique: true, name: "owner_file_unique" }
        )
        .catch(() => undefined)
    );
  }
  await indexed.get(db.databaseName);
  return { bucket: new GridFSBucket(db, { bucketName: BUCKET }), db };
}

const toStored = (doc: {
  length: number;
  uploadDate: Date;
  metadata?: Partial<FileMeta>;
}): StoredFile => ({
  id: doc.metadata?.fileId ?? "",
  name: doc.metadata?.name ?? "file",
  mimeType: doc.metadata?.mimeType ?? "application/octet-stream",
  size: doc.length,
  uploadedAt: doc.uploadDate.toISOString(),
});

export async function findFile(
  ownerId: number,
  fileId: string
): Promise<StoredFile | null> {
  const { db } = await bucket();
  const doc = await db
    .collection(`${BUCKET}.files`)
    .findOne({ "metadata.ownerId": ownerId, "metadata.fileId": fileId });
  return doc ? toStored(doc as never) : null;
}

export async function listFiles(ownerId: number): Promise<StoredFile[]> {
  const { db } = await bucket();
  const docs = await db
    .collection(`${BUCKET}.files`)
    .find({ "metadata.ownerId": ownerId })
    .sort({ uploadDate: -1 })
    .toArray();
  return docs.map(doc => toStored(doc as never));
}

export async function usedBytes(ownerId: number): Promise<number> {
  const { db } = await bucket();
  const result = await db
    .collection(`${BUCKET}.files`)
    .aggregate<{ total: number }>([
      { $match: { "metadata.ownerId": ownerId } },
      { $group: { _id: null, total: { $sum: "$length" } } },
    ])
    .toArray();
  return result[0]?.total ?? 0;
}

/**
 * Stores a file. Idempotent on (owner, id): a retry after a dropped
 * connection finds the file already there and does nothing, which is what
 * lets the client upload "until it works" without making duplicates.
 */
export async function saveFile(
  ownerId: number,
  file: { id: string; name: string; mimeType: string; data: Buffer }
): Promise<{ stored: StoredFile; created: boolean }> {
  const existing = await findFile(ownerId, file.id);
  if (existing) return { stored: existing, created: false };

  const { bucket: gridfs } = await bucket();
  const metadata: FileMeta = {
    ownerId,
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
  };
  await new Promise<void>((resolve, reject) => {
    const upload = gridfs.openUploadStream(file.id, { metadata });
    upload.on("error", reject);
    upload.on("finish", () => resolve());
    Readable.from(file.data).pipe(upload);
  });

  const stored = await findFile(ownerId, file.id);
  if (!stored) throw new Error("The file was not stored.");
  return { stored, created: true };
}

export async function openFileStream(ownerId: number, fileId: string) {
  const { bucket: gridfs, db } = await bucket();
  const doc = await db
    .collection(`${BUCKET}.files`)
    .findOne({ "metadata.ownerId": ownerId, "metadata.fileId": fileId });
  if (!doc) return null;
  return {
    meta: toStored(doc as never),
    stream: gridfs.openDownloadStream(doc._id as never),
  };
}

export async function deleteFile(
  ownerId: number,
  fileId: string
): Promise<boolean> {
  const { bucket: gridfs, db } = await bucket();
  const doc = await db
    .collection(`${BUCKET}.files`)
    .findOne({ "metadata.ownerId": ownerId, "metadata.fileId": fileId });
  if (!doc) return false;
  await gridfs.delete(doc._id as never);
  return true;
}

/** Account deletion: every file the account ever stored goes with it. */
export async function purgeFilesForOwner(ownerId: number): Promise<number> {
  const { bucket: gridfs, db } = await bucket();
  const docs = await db
    .collection(`${BUCKET}.files`)
    .find({ "metadata.ownerId": ownerId }, { projection: { _id: 1 } })
    .toArray();
  for (const doc of docs) await gridfs.delete(doc._id as never);
  return docs.length;
}
