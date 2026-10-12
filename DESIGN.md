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

Run `npm ci`, `npm run check`, and `npx wrangler deploy --dry-run`. Use a dedicated worktree and PR. The existing `Deploy storefront` GitHub workflow publishes pushes to main to the existing Worker. Never commit the Site credential.

For UI review, an external temporary harness used the public ReAI catalog snapshot and blocked non-GET requests. No production checkout was exercised.
