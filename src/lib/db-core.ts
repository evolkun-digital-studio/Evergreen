// Connection core without `server-only`, so the proxy can use it too. App code imports lib/db.
import dns from "node:dns";
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  failure: DatabaseConnectionError | null;
  retryAt: number;
};

// Cached on globalThis so hot reloads and warm serverless invocations reuse one pool.
const globalForMongoose = globalThis as unknown as { __mongoose?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.__mongoose ??= {
  conn: null,
  promise: null,
  failure: null,
  retryAt: 0,
});
cache.failure ??= null;
cache.retryAt ??= 0;

export type DatabaseConnectionErrorCode = "missing_uri" | "wrong_database" | "bad_auth" | "unreachable" | "unknown";

export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: DatabaseConnectionErrorCode,
  ) {
    super(message);
    this.name = "DatabaseConnectionError";
  }
}

export function isDatabaseConnectionError(error: unknown): error is DatabaseConnectionError {
  if (error instanceof DatabaseConnectionError) return true;
  if (!error || typeof error !== "object") return false;
  const nested = (error as { cause?: unknown }).cause;
  return nested ? isDatabaseConnectionError(nested) : false;
}

function sanitizedConnectionError(error: unknown): DatabaseConnectionError {
  const value = error as { code?: number | string; codeName?: string; name?: string; message?: string };
  const message = String(value?.message ?? "").toLowerCase();
  if (value?.code === 18 || value?.codeName === "AuthenticationFailed" || message.includes("authentication failed") || message.includes("bad auth")) {
    return new DatabaseConnectionError("MongoDB login failed: check MONGODB_URI", "bad_auth");
  }
  if (
    value?.code === "ENOTFOUND" ||
    value?.code === "ECONNREFUSED" ||
    value?.code === "ETIMEDOUT" ||
    value?.name === "MongoServerSelectionError" ||
    value?.name === "MongooseServerSelectionError" ||
    message.includes("enotfound") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("server selection")
  ) {
    return new DatabaseConnectionError("Can't reach MongoDB Atlas: add your IP in Network Access", "unreachable");
  }
  return new DatabaseConnectionError("MongoDB is unavailable", "unknown");
}

async function resolveSrvUri(uri: string, dnsServers: string[]): Promise<string> {
  const match = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(.*)$/);
  if (!match) return uri;

  const [, credentials, hostname, tail] = match;
  const resolver = new dns.promises.Resolver();
  resolver.setServers(dnsServers);

  const records = await resolver.resolveSrv(`_mongodb._tcp.${hostname}`);
  const txtRecords = await resolver.resolveTxt(hostname).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") return [];
    throw error;
  });

  const queryIndex = tail.indexOf("?");
  const pathname = queryIndex === -1 ? tail || "/" : tail.slice(0, queryIndex) || "/";
  const originalParams = new URLSearchParams(queryIndex === -1 ? "" : tail.slice(queryIndex + 1));
  const params = new URLSearchParams(txtRecords.flat().join(""));
  for (const [key, value] of originalParams) params.set(key, value);
  params.set("tls", "true");

  const hosts = records
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");
  return `mongodb://${credentials}@${hosts}${pathname}?${params.toString()}`;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && cache.conn.connection.readyState === 1) return cache.conn;
  if (cache.failure && Date.now() < cache.retryAt) throw cache.failure;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseConnectionError("MONGODB_URI is not set", "missing_uri");
  const dbName = process.env.MONGODB_DB;
  if (dbName !== "evergreen") throw new DatabaseConnectionError("MONGODB_DB must be set to evergreen", "wrong_database");

  const dnsServers = process.env.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  try {
    const connectionUri =
      uri.startsWith("mongodb+srv://") && dnsServers?.length
        ? await resolveSrvUri(uri, dnsServers)
        : uri;
    cache.promise ??= mongoose.connect(connectionUri, {
      dbName,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3_000,
      connectTimeoutMS: 3_000,
      // Indexes are created explicitly by `npm run db:indexes`; building them on boot slows cold starts.
      autoIndex: false,
    });
    cache.conn = await cache.promise;
    cache.failure = null;
    cache.retryAt = 0;
  } catch (error) {
    cache.promise = null;
    cache.failure = sanitizedConnectionError(error);
    cache.retryAt = Date.now() + 30_000;
    throw cache.failure;
  }
  return cache.conn;
}

/** Runs `fn` inside a transaction (requires a replica set, which Atlas always is). */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const conn = await connectDB();
  const session = await conn.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
