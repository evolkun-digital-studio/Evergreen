import { BlogIndex, blogIndexMetadata } from "@/components/blog/pages";

export const generateMetadata = () => blogIndexMetadata(1);

export default function BlogPage() {
  return <BlogIndex page={1} />;
}
