import "server-only";
import { createSign } from "node:crypto";
import { connectDB } from "@/lib/db";
import { IndexingLog } from "@/lib/models";
import { readSiteSettings } from "@/lib/data/settings";
import { SITE_URL } from "@/lib/cms/constants";

export type IndexingAction = "URL_UPDATED" | "URL_DELETED";
type Engine = "indexnow" | "google";
type Outcome = { ok: boolean; code: number | null; response: string };

// Retry schedule after a failure: 1 min, 5 min, 30 min, 2 h, 12 h — then give up.
const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];

export function isPublicSite(): boolean {
  try {
    const host = new URL(SITE_URL).hostname;
    return !/^(localhost|127\.|0\.0\.0\.0|\[::1\]|.*\.local)$/.test(host);
  } catch {
    return false;
  }
}

// --- IndexNow (Bing, Yandex, Seznam, Naver…) ------------------------------------------------

async function submitIndexNow(urls: string[]): Promise<Outcome> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return { ok: false, code: null, response: "INDEXNOW_KEY is not set" };
  const host = new URL(SITE_URL).host;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.text()).slice(0, 500);
    // 200 = submitted, 202 = accepted pending key validation.
    return { ok: res.status === 200 || res.status === 202, code: res.status, response: body || res.statusText };
  } catch (error) {
    return { ok: false, code: null, response: (error as Error).message };
  }
}

// --- Google Indexing API (optional; officially only for JobPosting / BroadcastEvent pages) --------

let googleToken: { value: string; expires: number } | null = null;

async function googleAccessToken(): Promise<string> {
  if (googleToken && googleToken.expires > Date.now() + 60_000) return googleToken.value;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!json.access_token) throw new Error(json.error_description ?? `Token request failed (${res.status})`);
  googleToken = { value: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return googleToken.value;
}

async function submitGoogle(url: string, action: IndexingAction): Promise<Outcome> {
  try {
    const token = await googleAccessToken();
    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, type: action }),
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, code: res.status, response: (await res.text()).slice(0, 500) };
  } catch (error) {
    return { ok: false, code: null, response: (error as Error).message };
  }
}

// --- Orchestration --------------------------------------------------------------------------

async function log(url: string, engine: Engine, action: IndexingAction, outcome: Outcome, attempts = 1) {
  // 4xx other than 429 won't fix themselves (bad key, forbidden URL): don't retry those.
  const retryable = !outcome.ok && (outcome.code === null || outcome.code === 429 || outcome.code >= 500) && attempts <= BACKOFF_MS.length;
  return IndexingLog.create({
    url,
    engine,
    action,
    status: outcome.ok ? "SUCCESS" : retryable ? "RETRYING" : "FAILED",
    attempts,
    nextAttemptAt: retryable ? new Date(Date.now() + BACKOFF_MS[attempts - 1]) : null,
    responseCode: outcome.code,
    response: outcome.response,
  });
}

/**
 * Tells search engines that URLs changed. Called after publish/update/unpublish/slug change
 * (via `after()`, so the editor never waits). Respects the Settings toggles.
 */
export async function notifyIndexing(urls: string[], action: IndexingAction, opts: { force?: boolean } = {}) {
  const list = [...new Set(urls)].filter(Boolean);
  if (!list.length) return [];
  await connectDB();
  const settings = await readSiteSettings();
  const results: { url: string; engine: Engine; ok: boolean; response: string }[] = [];

  if (!isPublicSite()) {
    for (const url of list) {
      await log(url, "indexnow", action, { ok: false, code: null, response: "Not submitted: NEXT_PUBLIC_SITE_URL is not a public URL." }, 99);
      results.push({ url, engine: "indexnow", ok: false, response: "Site URL is not public" });
    }
    return results;
  }

  if (settings.indexNowEnabled || opts.force) {
    const outcome = await submitIndexNow(list);
    for (const url of list) {
      await log(url, "indexnow", action, outcome);
      results.push({ url, engine: "indexnow", ok: outcome.ok, response: outcome.response });
    }
  }
  if (settings.googleIndexingEnabled && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    for (const url of list) {
      const outcome = await submitGoogle(url, action);
      await log(url, "google", action, outcome);
      results.push({ url, engine: "google", ok: outcome.ok, response: outcome.response });
    }
  }
  return results;
}

/** Cron: resubmits failed calls whose backoff has elapsed. */
export async function retryIndexing(limit = 50) {
  await connectDB();
  const due = await IndexingLog.find({ status: "RETRYING", nextAttemptAt: { $lte: new Date() } })
    .sort({ nextAttemptAt: 1 })
    .limit(limit)
    .lean();
  let retried = 0;
  for (const entry of due) {
    const claimed = await IndexingLog.updateOne({ _id: entry._id, status: "RETRYING" }, { $set: { status: "PENDING" } });
    if (!claimed.modifiedCount) continue;
    const action = entry.action as IndexingAction;
    const outcome = entry.engine === "google" ? await submitGoogle(entry.url, action) : await submitIndexNow([entry.url]);
    const attempts = (entry.attempts ?? 1) + 1;
    const retryable = !outcome.ok && (outcome.code === null || outcome.code === 429 || outcome.code >= 500) && attempts <= BACKOFF_MS.length;
    await IndexingLog.updateOne(
      { _id: entry._id },
      {
        $set: {
          status: outcome.ok ? "SUCCESS" : retryable ? "RETRYING" : "FAILED",
          attempts,
          nextAttemptAt: retryable ? new Date(Date.now() + BACKOFF_MS[attempts - 1]) : null,
          responseCode: outcome.code,
          response: outcome.response,
        },
      },
    );
    retried++;
  }
  return retried;
}
