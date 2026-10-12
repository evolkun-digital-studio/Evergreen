import { TagArchive, archiveParams, tagMetadata } from "@/components/blog/pages";

export const generateStaticParams = () => archiveParams("tags");

export async function generateMetadata({ params }: PageProps<"/blog/tag/[slug]">) {
  return tagMetadata((await params).slug, 1);
}

export default async function Page({ params }: PageProps<"/blog/tag/[slug]">) {
  return <TagArchive slug={(await params).slug} page={1} />;
}
