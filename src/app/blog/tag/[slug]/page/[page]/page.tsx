import { notFound } from "next/navigation";
import { TagArchive, tagMetadata, parsePage, PLACEHOLDER_PAGE, archiveParams } from "@/components/blog/pages";

export const generateStaticParams = async () => (await archiveParams("tags")).map((p) => ({ ...p, page: PLACEHOLDER_PAGE[0].page }));

export async function generateMetadata({ params }: PageProps<"/blog/tag/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  return tagMetadata(slug, Number.isNaN(n) ? 1 : n);
}

export default async function Page({ params }: PageProps<"/blog/tag/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  if (Number.isNaN(n)) notFound();
  return <TagArchive slug={slug} page={n} />;
}
