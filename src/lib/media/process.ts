import "server-only";
import sharp, { type Metadata } from "sharp";
import sanitizeHtml from "sanitize-html";
import { VARIANT_WIDTHS, type MediaVariants } from "./types";
import { getStorage } from "./storage";
import { slugify } from "@/lib/slug";

const ALLOWED_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
} as const;
type AllowedMime = keyof typeof ALLOWED_MIME;

export function maxUploadBytes(): number {
  return Math.max(1, Number(process.env.MEDIA_MAX_UPLOAD_MB || 10)) * 1024 * 1024;
}

export class UploadError extends Error {}

// --- SVG sanitising ----------------------------------------------------------------------------
const SVG_TAGS = [
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs",
  "lineargradient", "radialgradient", "stop", "clippath", "mask", "symbol", "use", "title", "desc", "pattern",
];
const SVG_ATTRS = [
  "viewbox", "width", "height", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "d", "points",
  "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-opacity", "stroke-dasharray", "opacity", "transform", "id", "class", "offset", "stop-color",
  "stop-opacity", "gradientunits", "gradienttransform", "clip-path", "clip-rule", "mask", "font-size",
  "font-family", "font-weight", "text-anchor", "xmlns", "preserveaspectratio", "href", "xlink:href",
  "patternunits", "version",
];

/** Removes scripts, event handlers, foreignObject and external references from an SVG. */
function sanitizeSvg(svg: string): string {
  const clean = sanitizeHtml(svg, {
    allowedTags: SVG_TAGS,
    allowedAttributes: { "*": SVG_ATTRS },
    // Only same-document references (#id) survive in href / xlink:href.
    allowedSchemes: [],
    allowedSchemesAppliedToAttributes: ["href", "xlink:href"],
    allowProtocolRelative: false,
    parser: { xmlMode: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
    exclusiveFilter: (frame) =>
      (frame.attribs.href !== undefined && !frame.attribs.href.startsWith("#")) ||
      (frame.attribs["xlink:href"] !== undefined && !frame.attribs["xlink:href"].startsWith("#")),
  });
  if (!/<svg[\s>]/i.test(clean)) throw new UploadError("That SVG file couldn't be read.");
  // sanitize-html lowercases attribute names in xml mode; SVG needs viewBox camel-cased.
  return clean
    .replace(/\bviewbox=/g, "viewBox=")
    .replace(/\bpreserveaspectratio=/g, "preserveAspectRatio=")
    .replace(/\bgradientunits=/g, "gradientUnits=")
    .replace(/\bgradienttransform=/g, "gradientTransform=")
    .replace(/\bpatternunits=/g, "patternUnits=")
    .replace(/<lineargradient/g, "<linearGradient")
    .replace(/<\/lineargradient>/g, "</linearGradient>")
    .replace(/<radialgradient/g, "<radialGradient")
    .replace(/<\/radialgradient>/g, "</radialGradient>")
    .replace(/<clippath/g, "<clipPath")
    .replace(/<\/clippath>/g, "</clipPath>");
}

// --- Processing --------------------------------------------------------------------------------

type ProcessedMedia = {
  storageKey: string;
  storageDriver: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  variants: MediaVariants;
  blurDataURL: string;
};

function detectMime(buffer: Buffer, declared: string): AllowedMime | null {
  const head = buffer.subarray(0, 32);
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (head.subarray(0, 6).toString("ascii").startsWith("GIF8")) return "image/gif";
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (head.subarray(4, 12).toString("ascii").match(/^ftypavi[fs]/)) return "image/avif";
  if (declared === "image/svg+xml" || /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(buffer.subarray(0, 2048).toString("utf8"))) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * Validates an upload by its bytes (not its extension), then stores the original plus AVIF,
 * WebP and original-format variants at each responsive width no larger than the source.
 */
export async function processUpload(buffer: Buffer, originalName: string, declaredType: string): Promise<ProcessedMedia> {
  if (buffer.length > maxUploadBytes()) {
    throw new UploadError(`File is larger than ${process.env.MEDIA_MAX_UPLOAD_MB || 10} MB.`);
  }
  const mime = detectMime(buffer, declaredType);
  if (!mime) throw new UploadError("Unsupported file type. Use JPG, PNG, WebP, AVIF, GIF or SVG.");

  const storage = getStorage();
  const now = new Date();
  const base = slugify(originalName.replace(/\.[a-z0-9]+$/i, ""), { maxLength: 60 }) || "image";
  const id = crypto.randomUUID().slice(0, 8);
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const keyFor = (suffix: string, ext: string) => `${dir}/${base}-${id}${suffix}.${ext}`;

  if (mime === "image/svg+xml") {
    const svg = Buffer.from(sanitizeSvg(buffer.toString("utf8")), "utf8");
    const meta = await sharp(svg).metadata().catch(() => ({ width: 0, height: 0 }));
    const stored = await storage.put(keyFor("", "svg"), svg, mime);
    return {
      storageKey: stored.key,
      storageDriver: storage.name,
      url: stored.url,
      mimeType: mime,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      sizeBytes: svg.length,
      variants: {},
      blurDataURL: "",
    };
  }

  const animated = mime === "image/gif" || mime === "image/webp";
  const input = () => sharp(buffer, { animated, failOn: "error" }).rotate();
  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new UploadError("That image file is damaged or not a real image.");
  }
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  if (!width || !height) throw new UploadError("Couldn't read the image dimensions.");

  const original = await storage.put(keyFor("", ALLOWED_MIME[mime]), buffer, mime);
  const widths = VARIANT_WIDTHS.filter((w) => w < width);
  if (!widths.length || widths[widths.length - 1] !== width) widths.push(Math.min(width, 1920) as (typeof VARIANT_WIDTHS)[number]);
  const unique = [...new Set(widths)].sort((a, b) => a - b);

  const variants: MediaVariants = { avif: [], webp: [], original: [] };
  for (const w of unique) {
    const resized = () => input().resize({ width: w, withoutEnlargement: true });
    const [avif, webp] = await Promise.all([
      // Animated AVIF support is patchy in browsers; still images only.
      mime === "image/gif" ? null : resized().avif({ quality: 55, effort: 4 }).toBuffer(),
      resized().webp({ quality: 78 }).toBuffer(),
    ]);
    const tasks: Promise<void>[] = [];
    if (avif) {
      tasks.push(storage.put(keyFor(`-${w}`, "avif"), avif, "image/avif").then((s) => void variants.avif!.push({ width: w, ...s, size: avif.length })));
    }
    tasks.push(storage.put(keyFor(`-${w}`, "webp"), webp, "image/webp").then((s) => void variants.webp!.push({ width: w, ...s, size: webp.length })));
    if (mime !== "image/gif" && mime !== "image/avif") {
      const fmt = mime === "image/png" ? resized().png({ compressionLevel: 9 }) : mime === "image/webp" ? resized().webp({ quality: 82 }) : resized().jpeg({ quality: 80, mozjpeg: true });
      const buf = await fmt.toBuffer();
      tasks.push(
        storage.put(keyFor(`-${w}`, ALLOWED_MIME[mime]), buf, mime).then((s) => void variants.original!.push({ width: w, ...s, size: buf.length })),
      );
    }
    await Promise.all(tasks);
  }
  for (const list of Object.values(variants)) list?.sort((a, b) => a.width - b.width);

  const blur = await sharp(buffer).rotate().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    storageKey: original.key,
    storageDriver: storage.name,
    url: original.url,
    mimeType: mime,
    width,
    height,
    sizeBytes: buffer.length,
    variants,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

/** Every stored object of a media item, for deletion. */
export function allStorageKeys(media: { storageKey: string; variants: MediaVariants }): string[] {
  const keys = [media.storageKey];
  for (const list of Object.values(media.variants ?? {})) for (const v of list ?? []) keys.push(v.key);
  return keys;
}
