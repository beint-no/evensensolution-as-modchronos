# ModChronos storefront design

This is the private generated store for Evensensolution AS / ModChronos. Customer-specific design changes belong here, not in the shared starter template.

## Source and content

Original source: https://modchronos.eu/, captured 2026-10-08.

- `src/brand-content.js`: verbatim homepage statements and footer identity text. The original Norwegian/English mixture is intentional; no marketing translation was invented.
- `src/about-content.js`: original `/pages/om-oss` prose, with the catalog CTA pointing to the ReAI catalog.
- `src/source-pages.js`: original shipping, returns, privacy, terms and contact information. Source URLs are recorded per page. Scripts, forms and styling were removed; copy was retained. These are source snapshots, not automatically synchronized legal pages.
- `public/assets/modchronos-logo.jpg`: original `download_41.jpg?v=1778931667`, resized through Shopify's CDN.
- `public/storefront-hero.avif`: original `03_2_d051ba3c-8b9b-4998-8976-04e62025048a.jpg?v=1780661618`, recompressed to AVIF. No generated imagery or altered logo.

The homepage rearranges original editorial copy around a Racing Panda photograph. It does not implement Shopify's watch builder, review widget, newsletter subscription or promotional pricing. Catalog titles, descriptions, prices, images, variant IDs and stock status continue to come from ReAI. No product records, discounts, payment settings or checkout logic are changed.

The source About Us and policy copy includes merchant claims and Shopify-specific legal references. They are preserved as requested; this design update does not certify them for the ReAI platform.

## Development and deployment

Run `npm ci`, `npm run check`, and `npx wrangler deploy --dry-run`. Use a dedicated worktree and PR. Local publishing deploys the existing managed Worker and its short-address alias. GitHub workflows are manual-only. Never commit the Site credential.

For UI review, an external temporary harness used the public ReAI catalog snapshot and blocked non-GET requests. No production checkout was exercised.

## October 2026 preview refresh

The revised layout takes its restrained editorial spacing and shopping hierarchy
from New Movements. The hero and logo retain the original ModChronos assets above;
Image Gen concepts were layout references only, never replacement product photos.
White, near-black, fine gray rules, square controls and a four-column desktop /
two-column mobile product grid form the shared system. The hero becomes image-first
on mobile; the native menu, forms and collection links retain keyboard access.

The homepage features four existing watch handles; all names, images, prices,
variants and stock remain ReAI-owned. Existing diver, dress/date and sports-watch
collections are enabled for this Site through its management API. Search and price/
stock filters are server-rendered GET forms over that catalog, without a second
catalog. Product thumbnails switch between the API images. The cart shows the
chosen variant and product photo and retains browser-local quantities.

Public review: https://modchronos.respiro.workers.dev. A credential-free service
binding alias preserves the managed Worker assignment and its server-side token.
The old emailed URL redirects to the short address. Local deployments publish both
Workers; Actions is manual-only. Review checkout is disabled both server-side and
in the cart, and review pages are noindex. This is not a merchant-domain cutover or
a Shopify cancellation. Policy source snapshots still require launch review.

## Watch-case cart follow-up

The bag opens in a native modal side panel after adding a product, following the
New Movements shopping flow. The free `skinnetui-med-verktoy` product and its
images, SKU and zero price come from ReAI. The original Shopify Cart Bot rules
were inspected on 17 October 2026: one case from NOK 2,000 and two from NOK 5,000.
The cart updates the included quantity after edits and removes cases below the
threshold. A separately purchased travel case is not the complimentary item.
`WATCH_CASE_PROMOTION=true` applies the same normalization to trusted checkout
requests. Zero-price delivery requires ReAI's explicit market-price support.
Review-only checkout remains disabled; this is still a demo, not a merchant launch.

## 3-for-2 and checkout follow-up

The merchant clarified that a free case belongs to each watch, including the free
watch in the 3-for-2 offer. This supersedes the earlier Shopify spend-threshold
snapshot. ReAI owns the automatic quantity promotion and eligible watch collection.
Cart lines show extended, discounted amounts and a separate saving; the total is
quoted by ReAI, not calculated as a browser-only promotion. Accessories and the
24-watch bundles are excluded. More of the source's ready-to-buy range is published.

Merchant checkout rendering and browser interactions were adapted from the New
Movements implementation, retaining ModChronos branding and policy links. Review
mode offers contact-form and order-summary previews without storing contact details
or creating orders/payments. Live-mode proxy behavior is tested against an isolated
local ReAI database. Shipping eligibility and payment remain launch checks; preview
form completion is not a validated delivery quote.
