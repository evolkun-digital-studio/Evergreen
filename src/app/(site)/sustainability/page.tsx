import { PageHeader } from "@/components/sections/PageHeader";
import { StatsRow } from "@/components/sections/StatsRow";
import { PageJsonLd } from "@/components/PageJsonLd";
import { Photo } from "@/components/Photo";
import { library, photos } from "@/content/images";
import { sustainability } from "@/content/company";
import { impact } from "@/content/stats";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Sustainability";
const description =
  "How Evergreen recovers material, follows UN SDG 12 and 13, is moving its Sitapur facility to renewable energy and runs awareness drives in Sitapur district.";
const crumbs = [{ name: "Sustainability", path: "/sustainability" }];

export const metadata = pageMetadata({ title: "Sustainability and Circular Economy at Evergreen", description, path: "/sustainability" });

export default function SustainabilityPage() {
  return (
    <>
      <PageJsonLd path="/sustainability" name={title} description={description} crumbs={crumbs} image={photos.sustainability} />
      <PageHeader title={title} lead={sustainability.commitment[0]} crumbs={crumbs} photo={photos.sustainability} />

      <section aria-labelledby="impact-heading" className="section">
        <div className="container">
          <h2 id="impact-heading">Our figures</h2>
          <p className="lead mt-4 max-w-2xl">{sustainability.commitment[1]}</p>
          <div className="mt-10">
            <StatsRow items={impact} />
          </div>
        </div>
      </section>

      <section aria-labelledby="initiatives-heading" className="section border-t border-line bg-paper-2">
        <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <h2 id="initiatives-heading">What we do about it</h2>
            <Photo photo={library.plasticFlakes} ratio="4/3" sizes="(min-width: 1280px) 370px, (min-width: 1024px) 30vw, 92vw" className="mt-8" />
          </div>
          <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            {sustainability.initiatives.map(i => (
              <li key={i.title}>
                <h3>{i.title}</h3>
                <p className="mt-3 text-ink/85">{i.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </>
  );
}
