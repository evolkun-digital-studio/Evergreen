// Redirect lookup for the proxy. Runs on every page request, so it reads an in-memory table that
// is refreshed from MongoDB at most once a minute and never waits more than 1.5 s for the DB.
// Uses the raw collection (no models) so the proxy bundle stays free of `server-only` code.
import { connectDB, isDbConfigured } from "@/lib/db-core";
import { logServerError } from "@/lib/log";

type RedirectEntry = { to: string; code: 301 | 302 };

const TTL_MS = 60_000;
const RETRY_MS = 30_000;
const MAX_WAIT_MS = 1_500;

let table = new Map<string, RedirectEntry>();
let loadedAt = 0;
let loading: Promise<void> | null = null;

async function load() {
  const conn = await connectDB();
  const db = conn.connection.db;
  if (!db) throw new Error("No database handle");
  const rows = await db
    .collection<{ fromPath: string; toPath: string; statusCode: number }>("redirects")
    .find({}, { projection: { fromPath: 1, toPath: 1, statusCode: 1 } })
    .toArray();
  table = new Map(rows.map((r) => [normalize(r.fromPath), { to: r.toPath, code: r.statusCode === 302 ? 302 : 301 }]));
  loadedAt = Date.now();
}

export function normalize(path: string): string {
  let p = path.trim();
  try {
    p = decodeURI(p);
  } catch {
    /* keep as typed */
  }
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

export async function findRedirect(pathname: string): Promise<RedirectEntry | null> {
  if (!isDbConfigured()) return null;
  if (Date.now() - loadedAt > TTL_MS) {
    loading ??= load()
      .catch((error) => {
        logServerError("[redirects] refresh failed", error);
        loadedAt = Date.now() - TTL_MS + RETRY_MS; // retry soon, keep serving the last table
      })
      .finally(() => {
        loading = null;
      });
    await Promise.race([loading, new Promise((r) => setTimeout(r, MAX_WAIT_MS))]);
  }
  return table.get(normalize(pathname)) ?? null;
}

export async function recordHit(fromPath: string) {
  try {
    const conn = await connectDB();
    await conn.connection.db
      ?.collection("redirects")
      .updateOne({ fromPath: normalize(fromPath) }, { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } });
  } catch {
    /* hit counts are best-effort */
  }
}
