import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.js";

const site = {
  name: "Sample <Shop>",
  markets: [{ handle: "default", defaultLocale: "nb-NO", locales: ["nb-NO", "en"], countries: ["NO"], default: true }],
};
const store = {
  locale: "nb-NO",
  currency: "USD",
  products: [{
    id: "p1",
    handle: "lamp",
    title: "Lamp <script>",
    description: "A useful lamp.",
    images: [{ url: "https://example.com/lamp.jpg", alt: "Desk lamp" }],
    variants: [{ id: "00000000-0000-4000-8000-000000000001", price: 25, options: [{ name: "Color", value: "Blue" }] }],
  }],
  collections: [{ id: "c1", handle: "home", title: "Home", products: [{ id: "p1" }] }],
};

test("renders Site catalog without exposing the Worker credential", async (context) => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (input, options) => {
    calls.push({ url: String(input), headers: options.headers });
    return Response.json(String(input).endsWith("/site/v1/site") ? site : String(input).includes("/commerce/availability?") ? { variants: [{ variantId: store.products[0].variants[0].id, status: "AVAILABLE" }] } : store);
  });
  const env = { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" };
  const response = await worker.fetch(new Request("https://store.example/"), env);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Sample &lt;Shop&gt;/);
  assert.match(html, /Lamp &lt;script&gt;/);
  assert.doesNotMatch(html, /private-token/);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].headers.get("Authorization"), "Bearer private-token");
  assert.equal(calls[1].url, "https://app.example.test/site/v1/commerce/storefront?market=default&locale=nb-NO");

  const product = await worker.fetch(new Request("https://store.example/products/lamp"), env);
  assert.equal(product.status, 200);
  assert.match(await product.text(), /Color: Blue/);
});

test("shows setup page without making an upstream request when configuration is absent", async (context) => {
  context.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  const response = await worker.fetch(new Request("https://store.example/"), {});
  assert.equal(response.status, 503);
  assert.match(await response.text(), /under oppsett/);
});

test("renders editable information pages and linked footer without exposing credentials", async (context) => {
  context.mock.method(globalThis, "fetch", async (input) => Response.json(String(input).endsWith("/site/v1/site") ? site : String(input).includes("/commerce/availability?") ? { variants: [{ variantId: store.products[0].variants[0].id, status: "AVAILABLE" }] } : store));
  const env = { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" };
  for (const path of ["/pages/about", "/pages/contact", "/pages/shipping", "/pages/faq", "/policies/returns", "/policies/privacy", "/policies/terms"]) {
    const response = await worker.fetch(new Request(`https://store.example${path}`), env);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.match(html, /Sample &lt;Shop&gt;/);
    assert.match(html, /<footer class="site-footer">/);
    assert.doesNotMatch(html, /private-token/);
  }
  const home = await worker.fetch(new Request("https://store.example/"), env);
  const html = await home.text();
  assert.match(html, /storefront-hero\.avif/);
  assert.match(html, /href="\/pages\/about"/);
  assert.match(html, /href="\/policies\/returns"/);
});

test("creates an English merchant checkout session without exposing the Site credential", async (context) => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (input, options) => {
    calls.push({ url: String(input), options });
    if (String(input).endsWith("/site/v1/site")) return Response.json(site);
    return Response.json({ checkoutUrl: "https://modchronos.com/en/checkout?checkout=token" });
  });
  const env = { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" };
  const response = await worker.fetch(new Request("https://modchronos.com/en/checkout/start", {
    method: "POST",
    headers: { Origin: "https://modchronos.com", "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ variantId: "00000000-0000-4000-8000-000000000001", quantity: 2 }] }),
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { checkoutUrl: "https://modchronos.com/en/checkout?checkout=token" });
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /[?&]locale=en(?:&|$)/);
  assert.equal(calls[1].options.headers.get("Authorization"), "Bearer private-token");
  assert.ok(calls[1].options.headers.get("Idempotency-Key"));
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    lines: [{ variantId: "00000000-0000-4000-8000-000000000001", quantity: 2 }],
    countryCode: "NO",
    returnUrl: "https://modchronos.com/en/checkout/complete",
    merchantCheckoutUrl: "https://modchronos.com/en/checkout",
  });
});

test("rejects cross-origin checkout before contacting ReAI", async (context) => {
  context.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  const response = await worker.fetch(new Request("https://store.example/checkout/start", {
    method: "POST",
    headers: { Origin: "https://other.example", "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ variantId: "00000000-0000-4000-8000-000000000001", quantity: 1 }] }),
  }), { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" });
  assert.equal(response.status, 403);
});

test("sets hardened security headers, HSTS on HTTPS, and noindex on workers.dev", async () => {
  const env = {
    ASSETS: { fetch: async () => new Response("body {}", { headers: { "content-type": "text/css" } }) },
  };
  const pageResponse = await worker.fetch(new Request("https://modchronos.respiro.workers.dev/"), env);
  assert.equal(pageResponse.status, 503);
  assert.equal(pageResponse.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(pageResponse.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(pageResponse.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(pageResponse.headers.get("x-robots-tag"), "noindex, nofollow");
  const csp = pageResponse.headers.get("content-security-policy");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /img-src 'self' https: data:/);
  assert.doesNotMatch(csp, /\bhttp:/);

  const assetResponse = await worker.fetch(new Request("https://modchronos.respiro.workers.dev/styles.css"), env);
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(assetResponse.headers.get("x-robots-tag"), "noindex, nofollow");

  const localHttp = await worker.fetch(new Request("http://localhost:8787/styles.css"), env);
  assert.equal(localHttp.headers.get("strict-transport-security"), null);
  assert.equal(localHttp.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("attaches a timeout AbortSignal and logs upstream errors on failure", async (context) => {
  let receivedSignal;
  const logged = [];
  context.mock.method(console, "error", (...args) => logged.push(args));
  context.mock.method(globalThis, "fetch", async (_input, init) => {
    receivedSignal = init?.signal;
    throw new Error("upstream timeout");
  });
  const response = await worker.fetch(
    new Request("https://modchronos.respiro.workers.dev/"),
    { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" },
  );
  assert.equal(response.status, 502);
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], "Storefront request failed");
});

test("serves Disallow: / robots.txt on workers.dev and in CHECKOUT_ENABLED mode", async () => {
  const aliasGet = await worker.fetch(
    new Request("https://modchronos.respiro.workers.dev/robots.txt"),
    { CANONICAL_HOSTNAME: "modchronos.respiro.workers.dev", CHECKOUT_ENABLED: "false" },
  );
  assert.equal(aliasGet.status, 200);
  assert.equal(aliasGet.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(aliasGet.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(aliasGet.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(await aliasGet.text(), "User-agent: *\nDisallow: /\n");

  const primaryHead = await worker.fetch(
    new Request("https://reai-store-9bd71d09ac8b4b87b22a7719893327d5.respiro.workers.dev/robots.txt", { method: "HEAD" }),
    { CANONICAL_HOSTNAME: "modchronos.respiro.workers.dev", CHECKOUT_ENABLED: "false" },
  );
  assert.equal(primaryHead.status, 200);
  assert.equal(primaryHead.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(primaryHead.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(primaryHead.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(await primaryHead.text(), "");

  const reviewCustomDomain = await worker.fetch(
    new Request("https://modchronos.com/robots.txt"),
    { CHECKOUT_ENABLED: "false" },
  );
  assert.equal(reviewCustomDomain.status, 200);
  assert.equal(reviewCustomDomain.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(await reviewCustomDomain.text(), "User-agent: *\nDisallow: /\n");
});

test("keeps the English route and links the complete ReAI footer credit", async (context) => {
  context.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    if (url.pathname === "/site/v1/site") return Response.json(site);
    if (url.pathname.endsWith("/availability")) return Response.json({ variants: [] });
    assert.equal(url.searchParams.get("locale"), "en");
    return Response.json({ ...store, locale: "en" });
  });
  const env = { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" };
  const response = await worker.fetch(new Request("https://modchronos.com/en/products/lamp?variant=blue"), env);
  const html = await response.text();
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /href="\/products\/lamp\?variant=blue" lang="nb"/);
  assert.match(html, /href="\/en\/cart"/);
  assert.match(html, /href="https:\/\/reai\.no" rel="external">Powered by ReAI<\/a>/);
});

test("accepts payment returns from ReAI while keeping the checkout proxy private", async (context) => {
  const id = "a".repeat(32);
  context.mock.method(globalThis, "fetch", async (input) => {
    if (String(input).endsWith("/site/v1/site")) return Response.json(site);
    return Response.json({ id, phase: "complete", locale: "en", currency: "NOK", lines: [], destinations: [], customer: {} });
  });
  const env = { REAI_API_BASE_URL: "https://app.example.test", REAI_SITE_CREDENTIAL: "private-token" };
  const headers = { "Sec-Fetch-Site": "cross-site" };
  const response = await worker.fetch(new Request("https://modchronos.com/en/checkout/complete?checkout=" + id, { headers }), env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.match(await response.text(), /Thank you for your order/);
  const proxy = await worker.fetch(new Request("https://modchronos.com/en/reai/checkout/" + id, { headers }), env);
  assert.equal(proxy.status, 403);
});
