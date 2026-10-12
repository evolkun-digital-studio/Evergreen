"use client";

import { createContext, useContext } from "react";
import type { MediaItem } from "@/lib/media/types";

/**
 * Data the synced blocks (Key Takeaways, FAQ, TOC) display inside the editor, plus the media
 * picker opener used by image blocks. Provided by the post editor around <EditorContent>.
 */
export type EditorData = {
  keyTakeaways: string[];
  faqs: { question: string; answer: string }[];
  headings: { id: string; text: string; level: number }[];
  pickMedia: () => Promise<MediaItem | null>;
  openAiSeoTab: () => void;
};

export const EditorDataContext = createContext<EditorData | null>(null);

export function useEditorData(): EditorData {
  const ctx = useContext(EditorDataContext);
  if (!ctx) throw new Error("useEditorData must be used inside EditorDataContext");
  return ctx;
}
