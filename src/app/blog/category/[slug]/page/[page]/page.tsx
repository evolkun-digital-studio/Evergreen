import { notFound } from "next/navigation";
import { CategoryArchive, categoryMetadata, parsePage, PLACEHOLDER_PAGE, archiveParams } from "@/components/blog/pages";

export const generateStaticParams = async () => (await archiveParams("categories")).map((p) => ({ ...p, page: PLACEHOLDER_PAGE[0].page }));

export async function generateMetadata({ params }: PageProps<"/blog/category/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  return categoryMetadata(slug, Number.isNaN(n) ? 1 : n);
}

export default async function Page({ params }: PageProps<"/blog/category/[slug]/page/[page]">) {
  const { slug, page } = await params;
  const n = parsePage(page);
  if (Number.isNaN(n)) notFound();
  return <CategoryArchive slug={slug} page={n} />;
}
