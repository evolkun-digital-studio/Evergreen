import type { UseFormReturn } from "react-hook-form";
import type { PostInput } from "@/lib/validation/post";

export type { EditorOptions } from "@/lib/posts/editor-types";
export type PostForm = UseFormReturn<PostInput>;
