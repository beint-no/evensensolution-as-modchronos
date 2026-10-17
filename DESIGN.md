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
