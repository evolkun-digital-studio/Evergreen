import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type StoredFile = { key: string; url: string };

interface StorageDriver {
  readonly name: "local" | "s3" | "imagekit";
  put(key: string, body: Buffer, contentType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

const IMMUTABLE = "public, max-age=31536000, immutable";

// --- local (development only) ------------------------------------------------------------------
// Files go to ./storage/uploads and are served by app/uploads/[...key]/route.ts. Not suitable
// for serverless hosts, whose filesystem is ephemeral.
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const localDriver: StorageDriver = {
  name: "local",
  async put(key, body) {
    const file = resolveLocal(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { key, url: `/uploads/${key}` };
  },
  async delete(key) {
    await unlink(resolveLocal(key)).catch(() => undefined);
  },
};

function resolveLocal(key: string): string {
  const file = path.resolve(LOCAL_UPLOAD_DIR, key);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) throw new Error("Invalid storage key");
  return file;
}

export async function readLocal(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveLocal(key));
  } catch {
    return null;
  }
}

// --- S3-compatible (Cloudflare R2, AWS S3, B2…) -----------------------------------------------
function s3Driver(): StorageDriver {
  const bucket = required("S3_BUCKET");
  const publicUrl = required("S3_PUBLIC_URL").replace(/\/+$/, "");
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
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: IMMUTABLE }),
      );
      return { key, url: `${publicUrl}/${key}` };
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

// --- ImageKit ----------------------------------------------------------------------------------
// The stored key is ImageKit's fileId, which its delete API needs.
function imagekitDriver(): StorageDriver {
  const privateKey = required("IMAGEKIT_PRIVATE_KEY");
  const folder = process.env.IMAGEKIT_FOLDER || "/blog";
  const auth = `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
  return {
    name: "imagekit",
    async put(key, body, contentType) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(body)], { type: contentType }), path.basename(key));
      form.append("fileName", path.basename(key));
      form.append("folder", path.posix.join(folder, path.posix.dirname(key)));
      form.append("useUniqueFileName", "false");
      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: { Authorization: auth },
        body: form,
      });
      if (!res.ok) throw new Error(`ImageKit upload failed (${res.status}): ${await res.text()}`);
      const json = (await res.json()) as { fileId: string; url: string };
      return { key: json.fileId, url: json.url };
    },
    async delete(fileId) {
      const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });
      if (!res.ok && res.status !== 404) throw new Error(`ImageKit delete failed (${res.status})`);
    },
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for STORAGE_DRIVER=${process.env.STORAGE_DRIVER}`);
  return value;
}

let driver: StorageDriver | null = null;
export function getStorage(): StorageDriver {
  if (driver) return driver;
  const name = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  driver = name === "s3" ? s3Driver() : name === "imagekit" ? imagekitDriver() : localDriver;
  return driver;
}

/** Driver that stored a given media item (it may differ from the current default). */
export function storageFor(name: string): StorageDriver {
  return name === getStorage().name ? getStorage() : name === "s3" ? s3Driver() : name === "imagekit" ? imagekitDriver() : localDriver;
}
