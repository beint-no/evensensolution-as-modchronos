# ModChronos storefront (`beint-no/evensensolution-as-modchronos`)

Public Cloudflare Worker storefront for **ModChronos** (`https://modchronos.com`), operated by Evensensolution AS.
ReAI Site ID: `9bd71d09-ac8b-4b87-b22a-7719893327d5`.

## What lives where

- **ReAI (`https://app.reai.no`, MCP: `https://app.reai.no/mcp`)** owns products, variants, prices, stock, collections, discounts (such as `VELKOMMEN10` for 10% off), newsletter subscriptions/email flows, shipping rules, orders, and payments (Adyen: Vipps, Visa, Mastercard, American Express, Klarna, Apple Pay, Google Pay).
- **This repository** owns the website layout, styling (`public/styles.css`, `public/checkout.css`), frontend scripts (`public/store.js`, `public/checkout.js`, `public/cart-rules.js`), server rendering & edge caching (`src/worker.js`), UI copy (`src/ui-copy.js`), and editorial/policy pages (`src/about-content.js`, `src/source-pages.js`, `src/english-pages.js`, `src/brand-content.js`, `src/store-content.js`).
- **Never commit secrets or credentials.** `REAI_SITE_CREDENTIAL` lives server-side in Cloudflare and must never appear in repository files or browser JavaScript.

## Brand, copy, and trademark rules

- **Strict trademark rule:** Never include Seiko, Rolex, or any other third-party watch brand names, logos, or model names in copy, alt text, metadata, or assets. Refer to movements generically as "japanske urverk" / "Japanese movements".
- **Keep backend branding subtle:** Do not mention ReAI in customer-facing cart, product, or checkout text. Keep only the `"Drevet av ReAI"` / `"Powered by ReAI"` link to `https://reai.no` in the footer.
- **Languages:** Norwegian (`nb-NO`) is the default at `/`. English (`en`) is served at `/en` with the same NOK market, cart, pricing, and shipping rules. Keep both languages updated when editing UI copy or policy pages.

## Workflow: PR previews and automatic deploy

This repository is public and uses GitHub Actions with OIDC (no secrets stored in GitHub):

1. Create a branch from `main` and make your changes.
2. Run `npm ci` (once) and `npm run check` locally before pushing.
3. Open a Pull Request on GitHub (`beint-no/evensensolution-as-modchronos`).
4. **Automatic PR preview:** Opening or pushing to a PR automatically builds, runs `npm run check`, and publishes an isolated, read-only preview URL as a comment on the PR. Previews are removed automatically when the PR closes.
5. **Automatic production deploy:** Merging (squash merge) the PR into `main` runs `npm run check`, builds the Worker, and deploys live to `https://modchronos.com` automatically.

Keep the existing managed Worker name `reai-store-9bd71d09ac8b4b87b22a7719893327d5` and `wrangler.jsonc` bindings intact.

## Performance and caching

`src/worker.js` uses Cloudflare's Cache API (`caches.default`) with `ETag` / `If-None-Match` conditional revalidation and stale-while-revalidate (`ctx.waitUntil(...catch(...))`) for site metadata, storefront catalog, and availability batches. Preserve edge caching and security headers (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex, nofollow` on preview hosts).

## Promotions, newsletter, and merchant checkout

- Focus storefront messaging on core watch USPs (hand-assembled quality, Japanese movements, sapphire crystal, free & fast insured DDP shipping, 3-year warranty, 100-day returns, complimentary watch case) and the 10% newsletter welcome offer (`VELKOMMEN10`) rather than "3 for 2" promotions.
- `POST /newsletter/subscribe` (and `/en/newsletter/subscribe`) proxies explicit newsletter signups to ReAI (`POST /site/v1/newsletter/subscriptions`, requiring the `newsletter:subscribe` scope on `REAI_SITE_CREDENTIAL`) and shows the `VELKOMMEN10` 10% welcome code on screen.
- `public/cart-rules.js` automatically attaches one complimentary `skinnetui-med-verktoy` (SKU `47645632135362`, price `0`) per eligible watch.
- `/checkout` and `/en/checkout` collect contact, address, and delivery details on `modchronos.com` before handing off to secure payment. Never enable live checkout writes on preview or `*.workers.dev` hosts (`CHECKOUT_ENABLED=false` forces read-only preview mode).
- Avoid creating real production orders or payments when testing.

## Local commands

```sh
npm ci
npm run check
npx wrangler deploy --dry-run
```

For operators with Cloudflare Wrangler access, local deployment and previews are also available:

```sh
npm run deploy:local -- --dry-run
npm run deploy:local
npm run preview:deploy -- my-change
npm run preview:remove -- my-change
```
