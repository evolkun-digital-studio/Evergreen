"use client";

import type { MediaItem } from "@/lib/media/types";

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml";

/** Uploads one file with progress (fetch has no upload progress, so XHR it is). */
export function uploadMedia(file: File, onProgress?: (fraction: number) => void): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.onload = () => {
      let body: { media?: MediaItem; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.media) resolve(body.media);
      else reject(new Error(body.error ?? `Upload failed (${xhr.status}).`));
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
