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

Open PRs receive a stable isolated Cloudflare Preview URL, updated on pushes
and removed on close. `.github/workflows/preview.yml` builds without deployment
credentials, then requests the trusted workflow in beint-no/reai through signed
GitHub Actions OIDC. Cloudflare credentials stay in the central deployment repository.
The server maps this repository to its assigned Worker, verifies the current PR,
and provides only a read-only PREVIEW Site credential where catalog access is needed.
Previews are noindex and reject orders, payments and form submissions.
Manually dispatch PR previews with a PR number to backfill an already-open PR.
Register independently created repositories in the server's customer preview registry;
new repositories created through the e-commerce module are recognized automatically.
