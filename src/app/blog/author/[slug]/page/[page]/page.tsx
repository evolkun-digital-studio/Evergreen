import { notFound } from "next/navigation";
import { AuthorArchive, authorMetadata, parsePage, PLACEHOLDER_PAGE, archiveParams } from "@/components/blog/pages";

export const generateStaticParams = async () => (await archiveParams("authors")).map((p) => ({ ...p, page: PLACEHOLDER_PAGE[0].page }));

export async function generateMetadata({ params }: PageProps<"/blog/author/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  return authorMetadata(slug, Number.isNaN(n) ? 1 : n);
}

export default async function Page({ params }: PageProps<"/blog/author/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  if (Number.isNaN(n)) notFound();
  return <AuthorArchive slug={slug} page={n} />;
}
