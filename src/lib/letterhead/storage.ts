import "server-only";
import { privateStorage, privateStorageFor } from "@/lib/documents/storage";

export function newLetterheadSignatureKey(ext: string): string {
  const month = new Date().toISOString().slice(0, 7);
  return `letterheads/signatures/${month}/${crypto.randomUUID()}.${ext}`;
}

export { privateStorage, privateStorageFor };
