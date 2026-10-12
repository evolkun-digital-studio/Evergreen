# Evergreen photos (real)

In use (About › Leadership cards; Person JSON-LD), both 4:5 with the eyes ~37% down and matched head size:
- `irfan-ahmad.jpg`: 760×950 native crop of the 1071×1469 studio portrait sent 2026-10-10 (no upscaling; cards capped at 400px so it stays sharp at ~2×).
- `associate-director.jpg` (Ramesh Yadav): 800×1000 crop of the 1254×1254 PNG, converted to JPEG (75 KB).

This folder is for Evergreen's own photos. Until they arrive, the site uses representative stock images
from `../stock/`. Credits for those are in `../stock/CREDITS.md`.

To swap one in, put the file here. Change its import in `src/content/images.ts` and set `stock: false`.
That removes the "Representative image" caption. Keep each file at 2000 px or less on the long side.
`next/image` makes the AVIF/WebP sizes.

## Photos needed

| # | Subject | Replaces | Crop on site | Notes |
|---|---|---|---|---|
| 1 | **Plant**: the Sitapur facility from outside, with the building, yard and gate | Process strip, Process page header | 21:9 and 16:10 | Landscape, daylight, wide. Leave room top and bottom for a 21:9 crop. |
| 2 | **Sorting**: material being sorted indoors, shot over the bench or from behind | About (home and About page) | 3:2 and 16:10 | Hands and tools are fine. No recognisable faces unless the staff agree in writing. |
| 3 | **Batteries**: lead-acid or Li-ion batteries in containers or on pallets | Battery service | 4:3 and 16:10 | Labels on battery packs should not be readable. |
| 4 | **Plastic bales**: baled PET/HDPE or shredded flakes | Plastic service, stats strip | 4:3 and 21:9 | A wide shot of the bale stack works for both. |
| 5 | **Truck pickup**: your vehicle being loaded at a client site | "Request a free pickup" band | 3:2 | Hide or blur number plates and client signage. |
| 6 | **Team at work**: dismantling, weighing or loading | E-waste or Industrial scrap service | 4:3 | Wear PPE. Back or side views are best. |
| 7 | **Certificate wall**: framed UPPCB/GST/Udyam certificates, or a certificate being issued | Registrations (home), Certifications page header | 3:2 and 16:10 | Shoot at an angle so certificate numbers can't be read. |

Also useful: copper wire and other recovered metals (Metal recovery service), hard drives before and after
destruction (Secure disposal), and the rooftop or yard at the facility (Sustainability band).

## Shooting notes

- Landscape, at least 2400 px wide. Use daylight or bright, even light, and no flash.
- Leave space around the subject. The site crops to 21:9, 16:10, 3:2 and 4:3.
- No other companies' logos, branded vehicles, client names or readable number plates.
- The site applies a slight desaturation and a light green tint, so don't add filters.

## Added 2026-10-10: more photos to request

| # | Subject | Replaces |
|---|---|---|
| 8 | Lithium-ion cells or packs received at the plant | `battery-li-ion-cells.webp` (battery header, home card) |
| 9 | Lead-acid batteries stacked on pallets | `battery-lead-acid.webp` |
| 10 | Battery discharge or storage area | `battery-collection-gloved.webp` |
| 11 | Copper wire or granules recovered at the plant | `metal-copper-wire.webp`, `metal-copper-strands.webp` |
| 12 | Aluminium scrap or bales | `metal-aluminium-cans.webp` |
| 13 | Plastic sorting, shredded flakes, pellets (one per step) | `plastic-*.webp` |
| 14 | Dismantling bench (hands, no faces) | `e-waste-dismantling.webp`, `e-waste-bench.webp` |
| 15 | Yard from above or wide, with stock | `yard-bales-aerial.webp` (capacity band) |
| 16 | Weighbridge slip or certificate being filled in | `process-paperwork.webp` |
| 17 | A higher-resolution portrait of Mr. Irfan Ahmad (at least 1200 × 1500 px, same framing) | `irfan-ahmad.jpg` (the current one is a compressed WhatsApp image; fine at 200 px, too small to show larger) |
