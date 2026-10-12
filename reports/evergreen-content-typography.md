# Evergreen content and typography report

## Outcome

- Replaced the previous group/IndiaWMS positioning with Evergreen's own recycling-company content from `reference/evergreenrecycler-content.txt`.
- Set Evergreen in Sitapur as the company identity. Lucknow now appears only when IndiaWMS is being described.
- Applied one global heading scale: H1 is `clamp(34px, …, 48px)` and H2 is `clamp(28px, …, 34px)`, both at weight 600.
- Added page metadata in the 140–160 character range and updated the Organization, LocalBusiness/RecyclingCenter and service JSON-LD.
- Kept the existing `evergreenrecycler.in` domain, so no domain-level redirect is required for this replacement build.

## H1 and H2 inventory

The supplied before captures only showed the old home hero, the old home relationship section and a service-route 404. Exact old wording that was not visible there is marked as source wording or not previously captured.

| Page / role | Old text | New text | New size |
|---|---|---|---|
| Home H1 | Recovering value from what India throws away. | Authorised recycling in Uttar Pradesh | H1: 34–48 px |
| Home about H2 | One parent company and its operating brand | Recycling in Sitapur since 2021 | H2: 28–34 px |
| Home services H2 | Our Recycling Services (source) | What we recycle | H2: 28–34 px |
| Home process H2 | Our Recycling Process (source) | How a pickup works | H2: 28–34 px |
| Home compliance H2 | Our Certifications (source) | Registrations and authorisations | H2: 28–34 px |
| Home industries H2 | Industries We Serve (source) | Industries we serve | H2: 28–34 px |
| Home sustainability H2 | Building a Sustainable Future (source) | Our sustainability commitment | H2: 28–34 px |
| Shared CTA H2 | Ready to Recycle? (source) | Request a free pickup | H2: 28–34 px |
| About H1 | About Ever Green (source) | About Evergreen | H1: 34–48 px |
| About H2 | Pioneering Green Recycling in Uttar Pradesh (source) | Recycling in Sitapur since 2021 | H2: 28–34 px |
| About H2 | Not previously captured | Leadership | H2: 28–34 px |
| Services H1 | Our Recycling Services (source) | Recycling services | H1: 34–48 px |
| Service H1s | Service route showed “This page is not here” | E-waste recycling; Battery recycling; Plastic recycling; Metal recovery; Industrial scrap management; Secure disposal | H1: 34–48 px |
| Service H2s | Not previously captured | What we do; Background; How it works | H2: 28–34 px |
| Process H1 | Our Recycling Process (source) | Our recycling process | H1: 34–48 px |
| Process step H2s | Source step titles | Request pickup; Certified collection; Sorting and assessment; Processing and recovery; Certificate and report | H2: 28–34 px |
| Certifications H1 | Our Certifications (source) | Certifications and registrations | H1: 34–48 px |
| Sustainability H1 | Building a Sustainable Future (source) | Sustainability | H1: 34–48 px |
| Sustainability H2s | Our Commitment (source) | Our figures; What we do about it | H2: 28–34 px |
| Contact H1 | Ready to Recycle? (source) | Request a free pickup | H1: 34–48 px |
| Contact H2s | Not previously captured | Contact details; Pickup request form | H2: 28–34 px |
| Group companies H1 | Group Companies | Group companies | H1: 34–48 px |
| Group companies H2s | Evergreen; IndiaWMS | Evergreen; IndiaWMS | H2: 28–34 px |
| Privacy H1 | Not previously captured | Privacy policy | H1: 34–48 px |
| Privacy H2s | Not previously captured | Who we are; What we collect; How we use it; How long we keep it; Your rights | H2: 28–34 px |
| Blog listing H1 | Dynamic archive title | Dynamic archive title | H1: 34–48 px |
| Blog listing H2 | Dynamic featured-post title | Dynamic featured-post title | H2: 28–34 px |
| Blog article H1 | Dynamic article title | Dynamic article title | H1: 34–48 px |
| Blog article H2s | Dynamic/editor headings | Review verdict; Key takeaways; FAQ; Related articles; editor H2s | H2: 28–34 px |
| Not found H1 | This page is not here (about 60 px) | This page is not here | H1: 34–48 px |

Footer column labels are no longer H2 elements, so they use the 14 px meta style without creating false section-heading exceptions.

## Company facts updated

`src/config/site.ts` now provides the shared source of truth for:

- Brand: Evergreen
- Legal name: Ever Green E-Waste Recycling Management
- Owner: Mr. Irfan Ahmad
- Founded: 2021
- Address: Rampur Mathura, Mahmudabad, Sitapur, Uttar Pradesh 261204, India
- Phone and WhatsApp: +91 94150 46061 / `wa.me/919415046061`
- Email: evergreenewaste2021@gmail.com
- GSTIN: 09BQEPA3569F3ZV
- Area served: Uttar Pradesh
- Domain: evergreenrecycler.in
- IndiaWMS: group company in Lucknow for EPR credits and compliance; Mr. Irfan Ahmad is described as co-founder

`src/content/stats.ts` contains the published figures with `verify: true`:

- 500+ Tons recycled annually
- 150+ Corporate clients
- 98% Zero-landfill rate
- 4+ Years
- 75% Carbon footprint reduction
- 92% Material recovery rate
- 98% Zero landfill achievement
- 60% Clean energy usage

The source's conflicting `200+ clients served` and unsupported `15+ districts covered` remain recorded as unpublished and are not shown on the site.

## Lucknow corrections

- Replaced the old “parent group of IndiaWMS, Lucknow” hero eyebrow with “Sitapur, Uttar Pradesh”.
- Replaced the old Lucknow group description in the hero and home about section with Evergreen's legal company description.
- Replaced Lucknow company/address copy across About, Contact and the footer with the Sitapur address.
- Replaced stale Lucknow Organization data in shared JSON-LD and unit-test snapshots with the Sitapur address.
- Removed “near Lucknow” from home metadata.
- Replaced parent-company wording in `README.md` and `package.json`.
- Remaining Lucknow references are limited to IndiaWMS in `site.ts`, the Group Companies page and the README relationship summary.

## Owner confirmation list

- Confirm all eight published impact figures above.
- Confirm whether IndiaWMS's exact legal relationship is “group company”, “sister company” or another term.
- Confirm whether advanced hydrometallurgical processing and recovery of gold, silver and rare earth metals happen in-house. Until then, the site says those fractions are sent to authorised refiners.
- Confirm the data-destruction standard, such as NIST 800-88. Until then, the site says “data destruction with a certificate”.
- Confirm which certificate supports “Eco-certified”, or remove that capability.
- Keep `evergreenewaste2021@gmail.com` until a domain address exists; recommended replacement: `info@evergreenrecycler.in`.
- Review the general explanatory text marked in development on each service page.
- Review the privacy-policy template with a lawyer before launch.

## Verification

- Next type generation and `tsc --noEmit`: passed.
- Next.js 16.3.5 production build: passed, 68 static/partial pages generated.
- ESLint: passed; only the dependency's stale baseline-browser-data advisory was printed.
- Unit tests: 44 passed across 7 files.
- IndiaWMS duplicate-copy check: 0 overlaps of 6+ consecutive words.
- Page metadata descriptions: all public company/service pages are 140–160 characters.
- Exact `pnpm check` / `pnpm build` entry through the host pnpm shim was blocked before scripts ran because pnpm 11 could not verify/download the pinned pnpm 10.4.1 release. The same project-local commands were run directly and passed.

## Screenshots

Before: `screenshots/before-content/`

After: `screenshots/after-content/`

- `hero-1440.png`, `hero-390.png`
- `about-1440.png`, `about-390.png`
- `service-1440.png`, `service-390.png`

