
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/sections/PageHeader";
import { RelatedLinks } from "@/components/sections/Blocks";
import { PageJsonLd } from "@/components/PageJsonLd";
import { Photo } from "@/components/Photo";
import { library, stepPhotos } from "@/content/images";
import { steps } from "@/content/company";
import { SITE_URL } from "@/lib/cms/constants";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Our recycling process";

const description =
  "How Evergreen handles retired assets in six documented stages: inspection, reverse logistics, data destruction, refurbishment, recycling and certification.";

const crumbs = [
  { name: "Our process", path: "/process" },
];

export const metadata = pageMetadata({
  title: "Our E-Waste Recycling Process in 6 Steps",
  description,
  path: "/process",
});

const howTo = {
  "@type": "HowTo",
  "@id": `${SITE_URL}/process#howto`,
  name: "How Evergreen recycles e-waste",
  description,
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.body,
    url: `${SITE_URL}/process#step-${i + 1}`,
  })),
};

export default function ProcessPage() {
  return (
    <>
      <PageJsonLd
        path="/process"
        name={title}
        description={description}
        crumbs={crumbs}
        image={library.ourProcess}
        extra={[howTo]}
      />

      <PageHeader
        title={title}
        lead="Six documented stages from on-site inspection to the certificate you file for audits."
        crumbs={crumbs}
        photo={library.ourProcess}
      />

      {/* PROCESS EXPERIENCE */}
      <section
        aria-labelledby="steps-heading"
        className="section"
      >
        <div className="container">
          <div
            className="
              grid items-start
              gap-10
              lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.55fr)]
              lg:gap-x-16
              xl:gap-x-24
            "
          >
            {/* STICKY INTRODUCTION */}
            <div className="lg:sticky lg:top-28">
              <div className="max-w-[400px]">

                

                <h2
                  id="steps-heading"
                  className="
                    max-w-[20ch]
                    text-[1.5rem]
                    font-semibold
                    leading-[1.2]
                    tracking-[-0.025em]
                    text-ink
                    sm:text-[1.875rem]
                  "
                >
                  Every stage has a purpose.
                </h2>

                <p
                  className="
                    mt-4 max-w-[36ch]
                    text-[15px]
                    leading-[1.75]
                    text-ink-muted
                    sm:text-base
                  "
                >
                  From initial inspection to final
                  certification, explore how materials
                  move through our recycling process.
                </p>

                
              </div>
            </div>

            {/* EXPANDABLE STAGE INDEX */}
            <ol
              aria-label="Recycling process stages"
              className="min-w-0 border-t border-line"
            >
              {steps.map((step, index) => {
                const number = String(index + 1).padStart(
                  2,
                  "0"
                );

                return (
                  <li
                    key={step.title}
                    className="min-w-0"
                  >
                    <details
                      id={`step-${index + 1}`}
                      name="evergreen-process"
                      open={index === 0}
                      className="
                        group scroll-mt-28
                        border-b border-line
                      "
                    >
                      {/* STAGE TRIGGER */}
                      <summary
                        className="
                          grid cursor-pointer
                          list-none items-center
                          grid-cols-[35px_minmax(0,1fr)_32px]
                          gap-x-3
                          py-5
                          outline-none
                          transition-colors duration-200
                          hover:bg-ink/[0.025]
                          focus-visible:bg-ink/[0.04]
                          sm:grid-cols-[52px_minmax(0,1fr)_36px]
                          sm:gap-x-5
                          sm:py-6
                          [&::-webkit-details-marker]:hidden
                        "
                      >
                        <span
                          className="
                            meta font-medium
                            text-ink-muted/65
                            transition-colors duration-200
                            group-open:text-copper-ink
                          "
                        >
                          {/* {number} */}
                        </span>

                        <h3
                          className="
                            min-w-0
                            text-[0.9375rem]
                            font-semibold
                            leading-snug
                            tracking-[-0.01em]
                            text-ink
                            sm:text-[1.0625rem]
                          "
                        >
                          {step.title}
                        </h3>

                        <span
                          aria-hidden="true"
                          className="
                            grid size-8
                            place-items-center
                            rounded-full
                            bg-ink/[0.045]
                            text-ink-muted
                            transition-colors duration-200
                            group-open:bg-ink
                            group-open:text-paper
                            sm:size-9
                          "
                        >
                          <Plus
                            size={17}
                            strokeWidth={1.6}
                            className="
                              transition-transform
                              duration-300
                              ease-out
                              group-open:rotate-45
                              motion-reduce:transition-none
                            "
                          />
                        </span>
                      </summary>

                      {/* EXPANDED CONTENT */}
                      <div
                        className="
                          pb-7
                          sm:pl-[4.5rem]
                          sm:pb-9
                        "
                      >
                        <p
                          className="
                            max-w-[57ch]
                            text-[15px]
                            leading-[1.75]
                            text-ink-muted
                            sm:text-base
                          "
                        >
                          {step.body}
                        </p>

                        <div
                          className="
                            mt-6 overflow-hidden
                            bg-ink/[0.035]
                          "
                        >
                          <Photo
                            photo={stepPhotos[index]}
                            ratio="4/3"
                            sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 92vw"
                            className="
                              w-full
                              max-h-[420px]
                              overflow-hidden
                              !rounded-none
                              [&_img]:h-full
                              [&_img]:w-full
                              [&_img]:object-cover
                            "
                          />
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* RELATED SERVICES */}
      <section
        aria-labelledby="process-related"
        className="section border-t border-line bg-paper-2"
      >
        <div className="container">
          <div className="mb-9">
            <p className="meta mb-3 text-copper-ink">
              Explore further
            </p>

            <h2
              id="process-related"
              className="
                text-[1.5rem]
                font-semibold
                tracking-[-0.025em]
                text-ink
                sm:text-[1.875rem]
              "
            >
              Process by material
            </h2>
          </div>

          <RelatedLinks
            links={[
              {
                href: "/services/e-waste-recycling",
                label: "E-waste recycling",
                note: "Dismantling, data destruction, recovery",
              },
              {
                href: "/services/battery-recycling",
                label: "Battery recycling",
                note: "Discharge, dismantling, black mass and lead",
              },
              {
                href: "/services/plastic-recycling",
                label: "Plastic recycling",
                note: "Sorting, shredding, washing, pelletising",
              },
              {
                href: "/epr-calculator",
                label: "EPR calculator",
                note: "Estimate your e-waste recycling target",
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
