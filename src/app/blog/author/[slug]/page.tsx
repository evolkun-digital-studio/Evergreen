import { AuthorArchive, archiveParams, authorMetadata } from "@/components/blog/pages";

export const generateStaticParams = () => archiveParams("authors");

export async function generateMetadata({ params }: PageProps<"/blog/author/[slug]">) {
  return authorMetadata((await params).slug, 1);
}

export default async function Page({ params }: PageProps<"/blog/author/[slug]">) {
  return <AuthorArchive slug={(await params).slug} page={1} />;
}
