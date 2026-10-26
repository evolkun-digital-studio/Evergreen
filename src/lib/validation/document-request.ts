import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "@/lib/documents/constants";

export const documentRequestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  company: z.string().trim().max(120).optional().default(""),
  purpose: z.string().trim().max(1000).optional().default(""),
  categories: z.array(z.enum(DOCUMENT_CATEGORIES)).max(DOCUMENT_CATEGORIES.length).optional().default([]),
  details: z.string().trim().max(500).optional().default(""),
  documentIds: z.array(z.string().max(40)).max(50).optional().default([]),
  // Honeypot: real visitors never see this field, so any value means a bot.
  website: z.string().optional().default(""),
});

export type DocumentRequestInput = z.input<typeof documentRequestSchema>;
