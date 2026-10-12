import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { CopyrightYear } from "@/components/CopyrightYear";
import { footerNav } from "@/config/nav";
import { fullAddress, mailHref, publicPhone, site, telHref } from "@/config/site";

// Compact footer: 14px links with 8px gaps. Links keep a 24px hit area (WCAG 2.5.8) instead of 44px.
const linkClass = "inline-flex min-h-6 items-center text-[14px] leading-[1.5] text-white/75 transition-colors hover:text-moss-soft";
const headingClass = "mb-4 text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-copper-soft";
const iconClass = "mt-[3px] h-4 w-4 shrink-0 text-moss";

export function Footer() {
  return (
    <footer className="bg-evergreen-950 text-white">
      <div className="container pb-5 pt-10 lg:pb-6 lg:pt-14">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label={`${site.name} home`} className="inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- Brand artwork keeps its original aspect ratio */}
              <img src={site.logo} alt={site.name} width={1326} height={332} className="block h-8 w-auto max-w-[150px] object-contain" />
            </Link>
            <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.6] text-white/75">
              Authorised e-waste, battery and plastic recycling in {site.address.locality}, {site.address.region}, since{" "}
              {site.founded}. Pickup from client locations across India.
            </p>
          </div>

          <nav aria-labelledby="footer-services" className="lg:col-span-3">
            <p id="footer-services" className={headingClass}>
              Services
            </p>
            <ul className="space-y-2">
              {footerNav.services.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company" className="lg:col-span-2">
            <p id="footer-company" className={headingClass}>
              Company
            </p>
            <ul className="space-y-2">
              {footerNav.company.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className={headingClass}>Contact</p>
            <ul className="space-y-2 text-[14px] leading-[1.5] text-white/75">
              {publicPhone && (
                <li className="flex gap-2.5">
                  <Phone aria-hidden="true" className={iconClass} />
                  <a href={telHref(publicPhone)} className="inline-flex min-h-6 items-center whitespace-nowrap tabular-nums hover:text-moss-soft">
                    {publicPhone}
                  </a>
                </li>
              )}
              <li className="flex gap-2.5">
                <Mail aria-hidden="true" className={iconClass} />
                <a href={mailHref()} className="min-h-6 min-w-0 [overflow-wrap:anywhere] hover:text-moss-soft">
                  {site.email}
                </a>
              </li>
              <li className="flex gap-2.5">
                <MapPin aria-hidden="true" className={iconClass} />
                <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="min-h-6 hover:text-moss-soft">
                  {fullAddress()}
                </a>
              </li>
              <li className="pl-[26px] tabular-nums text-white/60">GSTIN {site.gstin}</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/12 pt-4 text-[13px] text-white/60 sm:flex-row sm:items-center sm:justify-between lg:mt-10">
          <p>
            © <CopyrightYear /> {site.legalName}. All rights reserved.
          </p>
          <ul className="flex gap-6">
            {footerNav.legal.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-6 items-center hover:text-moss-soft">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
