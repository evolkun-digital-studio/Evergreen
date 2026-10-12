import { z } from "zod";
import { ROLES } from "@/lib/cms/constants";
import { SLUG_PATTERN } from "@/lib/slug";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optionalId = z.union([objectId, z.literal(""), z.null()]).transform((v) => v || null);
const slug = z.string().trim().max(120).regex(SLUG_PATTERN, "Lowercase letters, numbers and single hyphens only");

export const termSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug,
  description: z.string().trim().max(1000),
  seoTitle: z.string().trim().max(120),
  metaDescription: z.string().trim().max(320),
});

export const categorySchema = termSchema.extend({
  parentId: optionalId,
  ogImageId: optionalId,
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const authorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug,
  bio: z.string().trim().max(2000),
  avatarId: optionalId,
  jobTitle: z.string().trim().max(120),
  expertise: z.array(z.string().trim().min(1).max(100)).max(20),
  sameAs: z.array(z.string().trim().url("Each profile must be a full URL")).max(10),
  credentials: z.string().trim().max(500),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "At least 12 characters").max(200),
  role: z.enum(ROLES),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
  active: z.boolean(),
  authorId: optionalId,
  password: z.union([z.literal(""), z.string().min(12, "At least 12 characters").max(200)]),
});

export type AuthorInput = z.input<typeof authorSchema>;
