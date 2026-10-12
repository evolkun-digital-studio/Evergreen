// Cache tags used by `cacheTag()` in public data readers and by `revalidateTag()`/`updateTag()`
// after admin mutations. Keep every tag here so readers and writers can't drift apart.
export const TAGS = {
  settings: "settings",
  posts: "posts",
  post: (slug: string) => `post:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  tags: "tags",
  tag: (slug: string) => `tag:${slug}`,
  authors: "authors",
  author: (slug: string) => `author:${slug}`,
  media: "media",
  redirects: "redirects",
  sitemap: "sitemap",
} as const;
