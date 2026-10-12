import { notFound } from "next/navigation";
import { BlogIndex, blogIndexMetadata, parsePage, PLACEHOLDER_PAGE } from "@/components/blog/pages";

export const generateStaticParams = async () => PLACEHOLDER_PAGE;

export async function generateMetadata({ params }: PageProps<"/blog/page/[page]">) {
  const page = parsePage((await params).page);
  return blogIndexMetadata(Number.isNaN(page) ? 1 : page);
}

export default async function BlogPagedPage({ params }: PageProps<"/blog/page/[page]">) {
  const page = parsePage((await params).page);
  if (Number.isNaN(page)) notFound();
  return <BlogIndex page={page} />;
}
