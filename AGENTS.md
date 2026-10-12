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

Keep the existing Worker `reai-store-9bd71d09ac8b4b87b22a7719893327d5`, its routes
and credentials intact. The GitHub rename changes source organization only.
This customized repository is the source of truth; starter updates must be
reviewed and must never overwrite the client's implementation.

## Editing and publishing

Keep the primary checkout on main. Use a dedicated worktree under ~/.r-worktrees,
open a PR, and squash merge. Run `npm ci`, `npm run check`, and
`npx wrangler deploy --dry-run`; inspect relevant desktop/mobile views for design changes.
Avoid creating production orders or payments for verification.

The Deploy storefront workflow publishes runtime changes merged to main and
supports manual dispatch. Documentation-only commits do not deploy. With authorized
Cloudflare credentials, `npm run deploy` is the local fallback when Actions is unavailable.

## Automatic PR previews

Open same-repository PRs get a stable Cloudflare Preview URL, refreshed on each push
and removed on close. `.github/workflows/preview.yml` builds without credentials,
then deploys with reviewed default-branch tooling in `.github/preview/preview.mjs`.
The preview is noindex and read-only: orders, payments and form submissions are disabled.
GitHub secrets: CLOUDFLARE_PREVIEW_API_TOKEN and CLOUDFLARE_PREVIEW_ACCOUNT_ID;
commerce sites also need REAI_PREVIEW_CREDENTIAL with only Site, catalog and availability reads.
Manually dispatch PR previews with a PR number to backfill an already-open PR.
Production publishing and domain approval follow the existing site instructions.
