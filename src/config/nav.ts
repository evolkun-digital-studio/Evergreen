import { services } from "@/content/services";

/** `locked`: sign-in required; shown with a small lock icon. */
export type NavLink = { href: string; label: string; description?: string; locked?: boolean };

const serviceLinks: NavLink[] = services.map(s => ({ href: `/services/${s.slug}`, label: s.title }));

// Certifications, Sustainability and Group companies are reached from the footer and the About page.
// Contact is reached from the hero and footer.
export const primaryNav: (NavLink & { children?: NavLink[] })[] = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services", children: serviceLinks },
  { href: "/process", label: "Our process" },
  { href: "/documents", label: "Documents" },
];

/** Shown as the highlighted button on the right of the header (and in the mobile menu). */
export const eprNavLink: NavLink = { href: "/epr-calculator", label: "EPR Calculator" };

// Shorter labels for the footer and the Services dropdown, so each fits on one line.
const footerShort: Record<string, string> = { "Industrial scrap management": "Industrial scrap" };

/** Service links with short labels (dropdown, footer). Page titles are unchanged. */
export const shortServiceLinks: NavLink[] = serviceLinks.map(l => ({ ...l, label: footerShort[l.label] ?? l.label }));

export const footerNav = {
  services: shortServiceLinks,
  company: [
    { href: "/about", label: "About us" },
    { href: "/process", label: "Our process" },
    { href: "/certifications", label: "Certifications" },
    { href: "/sustainability", label: "Sustainability" },
    { href: "/epr-calculator", label: "EPR calculator" },
    { href: "/documents", label: "Documents" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [{ href: "/privacy-policy", label: "Privacy policy" }],
};
