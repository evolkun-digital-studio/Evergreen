import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Private storage for the Documents library. Unlike media, nothing here has a public URL:
 * files are only ever read back by the authenticated /api/documents/[id]/file route.
 *
 * - local: ./storage/private/documents (outside /public and outside the /uploads route's folder).
 * - s3:    `documents/` prefix in DOCUMENTS_S3_BUCKET (falls back to S3_BUCKET). Objects are
 *          written without a public ACL; the bucket (or at least this prefix) must not be public.
 */
type DriverName = "local" | "s3";

interface PrivateDriver {
  readonly name: DriverName;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>;
  delete(key: string): Promise<void>;
}

const PREFIX = "documents/";
const LOCAL_DIR = path.join(process.cwd(), "storage", "private");

function resolveLocal(key: string): string {
  const file = path.resolve(LOCAL_DIR, key);
  if (!file.startsWith(LOCAL_DIR + path.sep)) throw new Error("Invalid storage key");
  return file;
}

const localDriver: PrivateDriver = {
  name: "local",
  async put(key, body) {
    const file = resolveLocal(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  },
  async get(key) {
    const file = resolveLocal(key);
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return null;
    return { body: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>, size: info.size };
  },
  async delete(key) {
    await unlink(resolveLocal(key)).catch(() => undefined);
  },
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for private document storage on S3`);
  return value;
}

function s3Driver(): PrivateDriver {
  const bucket = process.env.DOCUMENTS_S3_BUCKET || required("S3_BUCKET");
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") },
  });
  return {
    name: "s3",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "private, no-store" }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!res.Body) return null;
        return { body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>, size: res.ContentLength ?? 0 };
      } catch (error) {
        if ((error as { name?: string }).name === "NoSuchKey") return null;
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

const drivers: Partial<Record<DriverName, PrivateDriver>> = {};

function driverFor(name: DriverName): PrivateDriver {
  return (drivers[name] ??= name === "s3" ? s3Driver() : localDriver);
}

/** DOCUMENTS_STORAGE_DRIVER, else s3 when media uses s3, else local. ImageKit is public-only. */
export function privateStorage(): PrivateDriver {
  const configured = (process.env.DOCUMENTS_STORAGE_DRIVER || process.env.STORAGE_DRIVER || "local").toLowerCase();
  return driverFor(configured === "s3" ? "s3" : "local");
}

/** The driver that stored a given document (it may differ from the current default). */
export function privateStorageFor(name: string): PrivateDriver {
  return driverFor(name === "s3" ? "s3" : "local");
}

export function newDocumentKey(ext: string): string {
  const month = new Date().toISOString().slice(0, 7);
  return `${PREFIX}${month}/${crypto.randomUUID()}.${ext}`;
}
