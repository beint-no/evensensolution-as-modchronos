# Evensensolution AS / ModChronos

Private client storefront, repository `beint-no/evensensolution-as-modchronos`.
ReAI tenant: 2254 (`evensensolution-as`). Site: `9bd71d09-ac8b-4b87-b22a-7719893327d5`.
The operator checkout lives under `~/r/customer-sites/sites/evensensolution-as-modchronos`;
read the hub's shared AGENTS.md before working in a dedicated worktree.

## Ownership and launch status

This is a Site API storefront: catalog, prices, variants, availability and checkout
belong in ReAI. Design, assets and editorial content belong in this repository.
The Worker uses REAI_API_BASE_URL and a server-side REAI_SITE_CREDENTIAL; never
expose the credential in browser code or commit real credentials.

The branded storefront is a workers.dev preview. The original merchant site is
modchronos.eu. Source snapshots, design decisions and outstanding launch review
are documented in DESIGN.md. Review preserved merchant claims and Shopify-specific
policy references before a sales launch. Do not change payment settings or publish
new promotional promises as part of a design update.

Keep the existing managed Worker `reai-store-9bd71d09ac8b4b87b22a7719893327d5` and its credentials intact.
The public review URL is https://modchronos.respiro.workers.dev. Its small `modchronos`
Worker forwards requests through a same-account service binding to the managed Worker,
so it holds no duplicate credential or storefront. The old review URL redirects to
the short URL while preserving paths and queries. Both configs deploy locally.
The GitHub rename changes source organization only.
This customized repository is the source of truth; starter updates must be
reviewed and must never overwrite the client's implementation.

## Editing and publishing

Keep the primary checkout on main. Use a dedicated worktree under ~/.r-worktrees,
open a PR, and squash merge. Run `npm ci`, `npm run check`, and
`npx wrangler deploy --dry-run`; inspect relevant desktop/mobile views for design changes.
Avoid creating production orders or payments for verification.

Production and preview publishing are local-first. Actions workflows are manual-only
while the private Actions budget is unavailable. `npm run deploy` checks and deploys
both the storefront and the short-address alias. `npm run deploy:local` does the same.
The runtime always uses https://app.reai.no, never a developer tunnel.
`REAI_REVIEW_ONLY=true` permits read-only cart quotes and a checkout form preview,
but rejects every checkout-session, delivery-selection and payment write. No review
interaction creates an order, payment, reservation or customer. The preview does
not claim to validate an address or delivery quote. Both review addresses are noindex.
Do not remove this guard or connect modchronos.com without merchant launch approval.

## Manual PR previews

PR preview Actions are manual-only. When explicitly dispatched, they create a stable
isolated Cloudflare Preview URL. Opening or updating a PR does not run Actions.
`.github/workflows/preview.yml` builds without deployment
credentials, then requests the trusted preview workflow in beint-no/reai-site-examples through signed
GitHub Actions OIDC. Cloudflare credentials stay in the central deployment repository.
The server maps this repository to its assigned Worker, verifies the current PR,
and provides only a read-only PREVIEW Site credential where catalog access is needed.
Previews are noindex and reject orders, payments and form submissions.
Manually dispatch PR previews with a PR number to backfill an already-open PR.
Register independently created repositories in the server's customer preview registry;
new repositories created through the e-commerce module are recognized automatically.

This customer repository is private at the owner’s request. Keep credentials and private data outside Git history. Preview publishing runs in the reviewed default-branch storefront-preview.yml workflow in beint-no/reai-site-examples; ReAI privately verifies the current PR and assigned Worker. Publishing credentials remain encrypted Actions secrets in the controller repository.

## Direct Cloudflare commands

These commands run from this repository and do not use GitHub Actions. Install
with npm ci first. Authenticate using npm exec --yes --package=wrangler@4.149.0
-- wrangler login, or your CLOUDFLARE_API_TOKEN. Select the account with
CLOUDFLARE_ACCOUNT_ID. Existing Worker secrets and domain configuration are retained.

```sh
npm run deploy:local -- --dry-run
npm run deploy:local
npm run preview:deploy -- design
npm run preview:remove -- design
```

Deployment and preview creation run the relevant existing checks. --dry-run builds
without publishing. Multi-site repositories require a site name; available names
are in tools/worker-sites.json. Previews use a separate local- namespace, block
writes and carry noindex. Removing one leaves automatic PR previews intact.

Catalog previews additionally need a PREVIEW Site credential with only site:read,
commerce:catalog:read and commerce:availability:read. Set
REAI_PREVIEW_CREDENTIAL_FILE to a token file outside Git, or provide
REAI_PREVIEW_CREDENTIAL in your local environment. Never use the live Site token
for a preview or commit a credential. Obtain the read-only credential through
ReAI Site credential management.

## Promotions and merchant checkout

The ReAI `watch-offer` collection owns ready-to-buy watch eligibility. The automatic
3FOR2 quantity offer is managed in ReAI: cheapest eligible units are free, repeated
for each full group of three. Zero-price cases and accessories never qualify. The
Worker adds one `skinnetui-med-verktoy` per eligible watch, including free watches,
then requests an authoritative read-only cart quote. Recompute after every cart edit;
do not implement a separate browser pricing rule. Gift-inclusive carts allow up to
99 watches, matching the Site API line limit.

`MERCHANT_CHECKOUT_PATH=/checkout` keeps contact/address/delivery in the Worker,
following the New Movements checkout/client implementation. Live sessions, revision
checks, discounts, shipping discovery and unpayable payment preparation remain ReAI
owned. Only secure summary/payment moves to ReAI. Private checkout pages and proxies
are no-store, noindex and no-referrer. Confirmation verifies completion before
subtracting purchased quantities once. Preserve review mode until merchant launch
approval; never enable payments just to verify the UI.

The public-source ready-to-buy catalog is imported from Shopify and published in
ReAI. Custom-builder products remain outside this preview until a supported builder
exists; do not imply that the original third-party customizer has been migrated.
