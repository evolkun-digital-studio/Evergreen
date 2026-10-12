// Client-safe CMS constants shared by models, zod schemas, the admin UI and the public blog.

import { SITE_ORIGIN } from "@/config/site";

/** Public origin (no trailing slash): NEXT_PUBLIC_SITE_URL, else the confirmed domain in site.ts. */
export const SITE_URL = SITE_ORIGIN;

export const ROLES = ["ADMIN", "EDITOR", "AUTHOR"] as const;
export type Role = (typeof ROLES)[number];

export const POST_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const CONTENT_TYPES = [
  "Guide",
  "HowTo",
  "Listicle",
  "News",
  "Review",
  "ProductReview",
  "CaseStudy",
  "Opinion",
  "Glossary",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_INTENTS = ["Informational", "Commercial", "Transactional", "Navigational"] as const;
type ContentIntent = (typeof CONTENT_INTENTS)[number];

export const TWITTER_CARDS = ["summary", "summary_large_image"] as const;

export const LINK_TYPES = ["internal", "external", "image"] as const;

export const INDEXING_ENGINES = ["indexnow", "google"] as const;
export const INDEXING_ACTIONS = ["URL_UPDATED", "URL_DELETED"] as const;
export const INDEXING_STATUSES = ["PENDING", "SUCCESS", "FAILED", "RETRYING"] as const;

export const REDIRECT_CODES = [301, 302] as const;

/** Schema.org types offered for entity fields (about / mentions / mainEntity). */
export const ENTITY_TYPES = [
  "Thing",
  "Organization",
  "GovernmentOrganization",
  "Person",
  "Place",
  "Legislation",
  "Product",
  "Event",
  "CreativeWork",
  "DefinedTerm",
] as const;

export const AI_SUMMARY_MAX = 300;
export const AI_SUMMARY_MIN = 200;
export const REVISION_LIMIT = 50;

export const DEFAULT_AI_CONTEXT = {
  targetCountry: "IN",
  targetLanguage: "en-IN",
  targetAudience: "Producers, Importers & Brand Owners (PIBOs), compliance & sustainability managers",
  contentType: "Guide" as ContentType,
  contentIntent: "Informational" as ContentIntent,
};

/** Admin permissions per role. Authors only touch their own drafts and cannot publish. */
export const can = {
  publish: (role: Role) => role === "ADMIN" || role === "EDITOR",
  editAnyPost: (role: Role) => role === "ADMIN" || role === "EDITOR",
  manageTaxonomy: (role: Role) => role === "ADMIN" || role === "EDITOR",
  manageMedia: () => true,
  manageAuthors: (role: Role) => role === "ADMIN" || role === "EDITOR",
  manageSeoTools: (role: Role) => role === "ADMIN" || role === "EDITOR",
  manageSettings: (role: Role) => role === "ADMIN",
  manageUsers: (role: Role) => role === "ADMIN",
};
