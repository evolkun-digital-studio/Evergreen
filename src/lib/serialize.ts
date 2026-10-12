import mongoose, { type Types } from "mongoose";

/** Recursively maps a lean Mongo value to its client-safe JSON shape. */
type Serialized<T> = T extends Types.ObjectId
  ? string
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T as K extends "_id" ? "id" : K]: Serialized<T[K]> }
        : T;

/**
 * Converts ObjectIds and Dates to strings (and `_id` to `id`) so lean documents can be
 * passed from Server Components to Client Components or returned from Server Actions.
 */
export function serialize<T>(value: T): Serialized<T> {
  return convert(value) as Serialized<T>;
}

function convert(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(convert);
  if (typeof value === "object") {
    // Buffers and other exotic BSON types: fall back to their string form.
    if ((value as { _bsontype?: string })._bsontype) return String(value);
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === "__v") continue;
      out[key === "_id" ? "id" : key] = convert(v);
    }
    return out;
  }
  return value;
}
