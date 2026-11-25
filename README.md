# ModChronos Storefront

Source code for [modchronos.com](https://modchronos.com) (Evensensolution AS).

## How changes go live

1. Make changes on a new branch and open a Pull Request.
2. GitHub Actions automatically runs `npm run check` and posts a live **PR preview link** in a comment on the PR.
3. Inspect the preview on desktop and mobile.
4. Merge the PR to `main` — GitHub Actions automatically deploys the update to [modchronos.com](https://modchronos.com).

## Managing products, prices, and orders

Products, descriptions, prices, stock, collections, discounts (`3FOR2`), shipping, and orders are managed in **ReAI** ([app.reai.no](https://app.reai.no)) — or directly from an AI assistant connected to the ReAI MCP server (`https://app.reai.no/mcp`).

This repository controls the storefront design, layout, copy, and static pages (`Om oss`, `Frakt`, `Retur`, `Kjøpsvilkår`, `Personvern`, `Kontakt`).

## Local verification

Requires Node.js 26+:

```sh
npm ci
npm run check
npx wrangler deploy --dry-run
```

See [AGENTS.md](./AGENTS.md) for detailed guidelines and brand rules for AI coding agents.
