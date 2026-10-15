import {
  Briefcase,
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/sections/PageHeader";
import { EntityBlock } from "@/components/sections/Blocks";
import { PickupForm } from "@/components/forms/PickupForm";
import { ConfirmBadge } from "@/components/Confirm";
import { PageJsonLd } from "@/components/PageJsonLd";
import { photos } from "@/content/images";
import {
  fullAddress,
  isSet,
  mailHref,
  publicPhone,
  publicWhatsapp,
  site,
  telHref,
  waHref,
} from "@/config/site";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Request a free pickup";
const description =
  "Request a pickup of e-waste, batteries, plastic or industrial scrap from anywhere in India. Plant in Sitapur, UP. Call +91 94150 46061 or +91 81159 37040.";
const crumbs = [{ name: "Contact", path: "/contact" }];

export const metadata = pageMetadata({
  title: "Contact Evergreen | Request a Pickup in India",
  description,
  path: "/contact",
  absoluteTitle: true,
});

const row = "flex gap-4 border-b border-line py-5";
const bc = site.businessContact;

export default function ContactPage() {
  return (
    <>
      <PageJsonLd
        path="/contact"
        name={title}
        description={description}
        type="ContactPage"
        crumbs={crumbs}
        image={photos.cta}
      />
      <PageHeader
        title={title}
        lead="Tell us the type of waste, the approximate quantity and the pickup location. We reply within 24 hours."
        crumbs={crumbs}
        photo={photos.cta}
      />

      <section aria-label="Contact details and form" className="section">
        <div className="container grid gap-12 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            <h2>Contact details</h2>
            <ul className="mt-4 border-t border-line">
              <li className={row}>
                <User
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Founder &amp; CEO</p>
                  <p>
                    {site.owner.honorific} {site.owner.name}
                  </p>
                  {publicPhone && (
                    <a
                      href={telHref(publicPhone)}
                      className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 tabular-nums"
                    >
                      {publicPhone}
                    </a>
                  )}
                </div>
              </li>
              <li className={row}>
                <Phone
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Alternate contact</p>
                  <a
                    href={telHref(site.alternatePhone)}
                    className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 tabular-nums"
                  >
                    {site.alternatePhone}
                  </a>
                </div>
              </li>
              <li className={row}>
                <Briefcase
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Business enquiries</p>
                  <p>
                    {bc.honorific} {bc.name}
                    {isSet(bc.title) && `, ${bc.title}`}
                  </p>
                  <a
                    href={telHref(bc.phone)}
                    className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 tabular-nums"
                  >
                    {bc.phone}
                  </a>
                  {!isSet(bc.title) && (
                    <ConfirmBadge label="title" className="ml-2" />
                  )}
                </div>
              </li>
              <li className={row}>
                <Mail
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Email</p>
                  <a
                    href={mailHref("Pickup request")}
                    className="inline-flex min-h-11 items-center break-all font-semibold text-evergreen-700"
                  >
                    {site.email}
                  </a>
                </div>
              </li>
              <li className={row}>
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Plant address</p>
                  <p>{fullAddress()}, India</p>
                  <a
                    href={site.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta inline-flex min-h-11 items-center text-evergreen-700 underline underline-offset-4"
                  >
                    Open in Google Maps
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </li>
              <li className={row}>
                <Building2
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700"
                />
                <div>
                  <p className="meta text-ink-muted">Registered office</p>
                  <p>
                    {site.registeredAddress.street},{" "}
                    {site.registeredAddress.locality},{" "}
                    {site.registeredAddress.region}{" "}
                    {site.registeredAddress.postalCode}, India
                  </p>
                </div>
              </li>
              <li className="py-5">
                <p className="meta text-ink-muted">Pickup</p>
                <p>PAN India, from your location</p>
              </li>
            </ul>
            {publicWhatsapp && (
              <a
                href={waHref(publicWhatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary mt-2"
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            )}
          </div>

          <div className="lg:col-span-7">
            <h2>Pickup request form</h2>
            <div className="mt-4">
              <PickupForm />
            </div>
          </div>
        </div>
      </section>

      <EntityBlock />
    </>
  );
}
