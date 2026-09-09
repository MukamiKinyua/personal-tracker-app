import { Db, MongoClient } from "mongodb";
import { ENV } from "./_core/env";

let clientPromise: Promise<MongoClient> | null = null;

export const mongoClientOptions = {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000,
  socketTimeoutMS: 3000,
  appName: "glory-mukami-personal-tracker",
} as const;

export type MongoReadiness = {
  configured: boolean;
  supported: boolean;
  reachable: boolean;
};

export function mongoUriStatus(uri = ENV.mongoUri) {
  const normalized = uri?.trim() ?? "";
  return {
    configured: normalized.length > 0,
    supported:
      normalized.startsWith("mongodb://") ||
      normalized.startsWith("mongodb+srv://"),
  };
}

function requireMongoUri() {
  const uri = ENV.mongoUri.trim();
  const status = mongoUriStatus(uri);
  if (!status.configured) throw new Error("MONGODB_URI is not configured");
  if (!status.supported)
    throw new Error("MONGODB_URI must begin with mongodb:// or mongodb+srv://");
  return uri;
}

export async function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(requireMongoUri(), mongoClientOptions);
    clientPromise = client.connect().catch((error: unknown) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}

export async function pingMongoDb() {
  const db = await getMongoDb();
  return db.command({ ping: 1 });
}

export async function mongoReadiness(): Promise<MongoReadiness> {
  const status = mongoUriStatus();
  if (!status.configured || !status.supported) {
    return { ...status, reachable: false };
  }

  try {
    const result = await pingMongoDb();
    return { ...status, reachable: result.ok === 1 };
  } catch {
    return { ...status, reachable: false };
  }
}
