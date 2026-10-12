import { PageHeader } from "@/components/sections/PageHeader";
import { ConfirmBadge } from "@/components/Confirm";
import { fullAddress, mailHref, site } from "@/config/site";
import { PageJsonLd } from "@/components/PageJsonLd";
import { pageMetadata } from "@/lib/seo/pages";

const title = "Privacy policy";
const description =
  "How Ever Green E-Waste Recycling Management in Sitapur collects, uses and stores details sent through this website's pickup request form and contact links.";
const crumbs = [{ name: "Privacy policy", path: "/privacy-policy" }];

export const metadata = pageMetadata({ title, description, path: "/privacy-policy" });

export default function PrivacyPage() {
  return (
    <>
      <PageJsonLd path="/privacy-policy" name={title} description={description} crumbs={crumbs} />
      <PageHeader title={title} crumbs={crumbs} />
      <section aria-label="Policy" className="section">
        <div className="container">
          <div className="max-w-3xl space-y-8 text-ink/85">
          <ConfirmBadge label="template: review with a lawyer before launch" />
          <div className="space-y-3">
            <h2>Who we are</h2>
            <p>
              This website is run by {site.legalName}, {fullAddress()}, India (GSTIN {site.gstin}).
            </p>
          </div>
          <div className="space-y-3">
            <h2>What we collect</h2>
            <p>
              When you send the pickup request form we receive your name, phone number, email address (if given),
              company name (if given), the service you chose and your message. We also record the date and the browser
              type. We do not use advertising or tracking cookies.
            </p>
          </div>
          <div className="space-y-3">
            <h2>How we use it</h2>
            <p>
              We use these details only to reply to your request, arrange a pickup and keep records of the work we do
              for you. We do not sell or share them, except with people who need them to complete your pickup.
            </p>
          </div>
          <div className="space-y-3">
            <h2>How long we keep it</h2>
            <p>We keep enquiry records for as long as we need them for the work and for our legal and tax records.</p>
          </div>
          <div className="space-y-3">
            <h2>Your rights</h2>
            <p>
              You can ask us to see, correct or delete the personal details we hold about you. Write to{" "}
              <a href={mailHref()} className="font-semibold text-evergreen-700 underline underline-offset-4">
                {site.email}
              </a>
              .
            </p>
          </div>
          </div>
        </div>
      </section>
    </>
  );
}
