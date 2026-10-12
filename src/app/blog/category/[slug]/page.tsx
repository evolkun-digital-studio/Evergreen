import { CategoryArchive, archiveParams, categoryMetadata } from "@/components/blog/pages";

export const generateStaticParams = () => archiveParams("categories");

export async function generateMetadata({ params }: PageProps<"/blog/category/[slug]">) {
  return categoryMetadata((await params).slug, 1);
}

export default async function Page({ params }: PageProps<"/blog/category/[slug]">) {
  return <CategoryArchive slug={(await params).slug} page={1} />;
}
