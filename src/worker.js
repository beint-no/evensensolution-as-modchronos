import { ReaiSiteClient } from "../packages/reai-site-client/client.mjs";
import { brandContent } from "./brand-content.js";
import { sourcePages } from "./source-pages.js";
import { englishPages } from "./english-pages.js";
import { aboutHtml } from "./about-content.js";
import { storeContent } from "./store-content.js";
import { language, ui } from "./ui-copy.js";
import { merchantCheckout } from "./merchant-checkout.js";
import { withWatchCase, watchProductIds } from "../public/cart-rules.js";

const LIVE_HOSTNAME = "modchronos.com";

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' https: data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function descriptionHtml(item) {
  if (item.descriptionHtml) return `<div class="rich-description">${item.descriptionHtml}</div>`;
  return item.description ? `<p class="lead">${escapeHtml(item.description)}</p>` : "";
}

function imageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const moneyFormatters = new Map();

function price(value, currency, locale) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  try {
    const key = `${locale}:${currency}`;
    if (!moneyFormatters.has(key)) moneyFormatters.set(key, new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }));
    return moneyFormatters.get(key).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function productPrice(product, store) {
  const prices = (product.variants || []).map((variant) => Number(variant.price)).filter(Number.isFinite);
  if (!prices.length) return "";
  const prefix = new Set(prices).size > 1 ? ui(store.locale).from : "";
  return `${prefix}${price(Math.min(...prices), store.currency, store.locale)}`;
}

function picture(product, className = "", image = product.images?.[0], sizes = "(max-width: 600px) 50vw, 25vw", eager = false) {
  const src = imageUrl(image?.url);
  if (!src) return `<div class="image-placeholder ${className}" aria-hidden="true"></div>`;
  const dimensions = image.width > 0 && image.height > 0 ? ` width="${Number(image.width)}" height="${Number(image.height)}"` : "";
  const renditions = (image.renditions || []).filter((item) => imageUrl(item.url) && item.width > 0);
  const responsive = renditions.length ? ` srcset="${renditions.map((item) => `${escapeHtml(imageUrl(item.url))} ${Number(item.width)}w`).join(", ")}" sizes="${sizes}"` : "";
  return `<img class="${className}" src="${escapeHtml(src)}"${dimensions}${responsive} alt="${escapeHtml(image.alt || product.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

const shopPath = (store, path) => `${store?.pathPrefix || ""}${path}`;

function card(product, store) {
  const href = shopPath(store, `/products/${encodeURIComponent(product.handle)}`);
  const t = ui(store.locale);
  const soldOut = product.variants?.length && product.variants.every((variant) => variant.outOfStock);
  return `<article class="product-card">
    <a class="product-image" href="${href}" aria-label="${escapeHtml(product.title)}">${picture(product)}${product.images?.[1] ? picture(product, "alternate-image", product.images[1]) : ""}${soldOut ? `<span class="stock-label">${t.outOfStock}</span>` : ""}</a>
    <div class="product-meta"><h3><a href="${href}">${escapeHtml(product.title)}</a></h3><span>${escapeHtml(productPrice(product, store))}</span></div>
    <a class="text-link product-discover" href="${href}">${t.viewProduct} <span aria-hidden="true">↗</span></a>
  </article>`;
}

const FEATURED_HANDLES = ["automatisk-dykkerklokke-bla", "automatisk-dykkerklokke-gronn", "dress-klokke-dato-hvit", "automatisk-sportsklokke-hvit"];

function featuredProducts(store) {
  const products = store.products || [];
  const selected = FEATURED_HANDLES.map((handle) => products.find((product) => product.handle === handle)).filter(Boolean);
  return [...selected, ...products.filter((product) => !selected.includes(product))].slice(0, 4);
}

function page(site, store, title, body, status = 200) {
  const path = (value) => shopPath(store, value);
  const t = ui(store?.locale);
  const content = brandContent[language(store?.locale)];
  const name = site?.name || "Storefront";
  const legalName = storeContent.legalName || name;
  const alternate = store?.alternate;
  const footerCollections = (store?.collections || []).slice(0, 3).map((collection) =>
    `<a href="${shopPath(store, `/collections/${encodeURIComponent(collection.handle)}`)}">${escapeHtml(collection.title)}</a>`,
  ).join("");
  const contact = storeContent.contactEmail
    ? `<a href="mailto:${escapeHtml(storeContent.contactEmail)}">${escapeHtml(storeContent.contactEmail)}</a>`
    : `<a href="${path("/pages/contact")}">${t.contact}</a>`;
  return new Response(`<!doctype html>
<html lang="${escapeHtml(store?.locale || "nb")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${t.meta} ${escapeHtml(name)}.">
  <meta name="theme-color" content="#111111">
  <title>${escapeHtml(title)} · ${escapeHtml(name)}</title>
  <link rel="icon" href="/assets/modchronos-logo.jpg" type="image/jpeg">
  <link rel="stylesheet" href="/styles.css?v=language">
</head>
<body data-path-prefix="${store?.pathPrefix || ""}">
  <a class="skip-link" href="#main">${t.skip}</a>
  <div class="announcement">${t.brandStrip}</div>
  <header class="site-header shell">
    <a class="wordmark" href="${path("/")}" aria-label="ModChronos"><img src="/assets/modchronos-logo.jpg" alt="ModChronos" width="220" height="48"></a>
    <nav class="desktop-nav" aria-label="${t.shop}"><a href="${path("/collections/all")}">${t.watches}</a><a href="${path("/collections")}">${t.collections}</a><a href="${path("/pages/about")}">${t.about}</a><a href="${path("/pages/contact")}">${t.contact}</a></nav>
    <div class="header-actions">${alternate ? `<a class="language-link" href="${alternate.href}" lang="${alternate.lang}" hreflang="${alternate.lang}" aria-label="${alternate.label}">${alternate.shortLabel}</a>` : ""}<a href="${path("/search")}" class="search-link">${t.search}</a><a class="cart-link" href="${path("/cart")}">${t.cart} (<span data-cart-count>0</span>)</a>
    <details class="mobile-menu"><summary>${t.menu}</summary><nav aria-label="${t.menu}"><a href="${path("/collections/all")}">${t.watches}</a><a href="${path("/collections")}">${t.collections}</a><a href="${path("/pages/about")}">${t.about}</a><a href="${path("/pages/contact")}">${t.contact}</a><a href="${path("/search")}">${t.search}</a></nav></details></div>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer"><div class="shell footer-grid">
    <div class="footer-brand"><a class="wordmark" href="${path("/")}"><img src="/assets/modchronos-logo.jpg" alt="ModChronos" width="220" height="48"></a><p>${escapeHtml(content.aboutIntro)}</p></div>
    <div><h2>${t.shop}</h2><a href="${path("/collections/all")}">${t.allProducts}</a><a href="${path("/collections")}">${t.collections}</a>${footerCollections}<a href="${path("/cart")}">${t.yourCart}</a></div>
    <div><h2>${t.help}</h2><a href="${path("/pages/contact")}">${t.contact}</a><a href="${path("/pages/shipping")}">${t.shipping}</a><a href="${path("/policies/returns")}">${t.returns}</a></div>
    <div><h2>${t.about}</h2><a href="${path("/pages/about")}">${t.ourStory}</a>${contact}<a href="${path("/policies/privacy")}">${t.privacy}</a><a href="${path("/policies/terms")}">${t.terms}</a></div>
  </div><div class="shell footer-bottom"><span>© ${new Date().getUTCFullYear()} ${escapeHtml(legalName)}${storeContent.organizationNumber ? ` · ${escapeHtml(storeContent.organizationNumber)}` : ""}</span><a class="powered-by" href="https://reai.no" rel="external">${t.poweredBy} ReAI</a></div></footer>
  <dialog class="cart-drawer" data-cart-drawer aria-labelledby="cart-drawer-title">
    <header><h2 id="cart-drawer-title">${t.yourCart}</h2><button type="button" data-close-cart>${t.close}</button></header>
    <div data-cart-items><p>${t.loadingCart}</p></div><p data-cart-total class="cart-total"></p>
    <a class="button" href="${path("/cart")}">${t.viewCart}</a>
    <p class="cart-note">${store?.reviewOnly ? t.previewCartNote : t.cartNote}</p>
  </dialog>
  <script src="/store.js?v=language" type="module"></script>
</body>
</html>`, { status, headers: HTML_HEADERS });
}

function home(site, store) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  const products = featuredProducts(store);
  const collections = (store.collections || []).filter((collection) => collection.products?.length);
  return page(site, store, t.homeTitle, `
    <section class="hero">
      <div class="hero-copy"><h1>${t.heroTitle}</h1><p>${t.heroDescription}</p><div class="hero-actions"><a class="button" href="${path("/collections/all")}">${t.exploreWatches} <span aria-hidden="true">↗</span></a><a class="text-link" href="${path("/pages/about")}">${t.ourStory}</a></div></div>
      <div class="hero-art"><img src="/storefront-hero.avif" alt="${t.heroAlt}" width="1600" height="1600" fetchpriority="high"></div>
    </section>
    <div class="shell value-strip">${t.brandFeatures.map((heading) => `<span>${heading}</span>`).join("")}</div>
    <section class="shell product-section" id="products"><div class="section-heading"><h2>${t.findFavorite}</h2><a class="text-link" href="${path("/collections/all")}">${t.allWatches} ↗</a></div>
      ${products.length ? `<div class="product-grid">${products.map((product) => card(product, store)).join("")}</div>` : `<p class="empty-state">${t.emptyProducts}</p>`}
    </section>
    ${collections.length ? `<section class="shell collection-section"><div class="section-heading"><h2>${t.exploreCollections}</h2><a class="text-link" href="${path("/collections")}">${t.allCollections} ↗</a></div><div class="collection-grid">${collections.slice(0, 3).map((collection) => collectionTile(collection, store)).join("")}</div></section>` : ""}
    <section class="story-band"><div class="shell story-panel"><h2>${t.storyTitle}</h2><div><p>${t.storyDescription}</p><a class="text-link" href="${path("/pages/about")}">${t.knowUs} ↗</a></div></div></section>`);
}

function collectionTile(collection, store) {
  return `<a class="collection-tile" href="${shopPath(store, `/collections/${encodeURIComponent(collection.handle)}`)}"><strong>${escapeHtml(collection.title)}</strong><span aria-hidden="true">↗</span></a>`;
}

function collectionsPage(site, store) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  const collections = store.collections || [];
  return page(site, store, t.collections, `<section class="shell inner-page"><a class="breadcrumb" href="${path("/")}">${t.backStore}</a><h1>${t.collections}</h1>
    ${collections.length ? `<div class="collection-grid">${collections.map((collection) => collectionTile(collection, store)).join("")}</div>` : `<p class="empty-state">${t.noCollections}</p>`}
    <a class="text-link browse-all-link" href="${path("/collections/all")}">${t.allProducts} ↗</a></section>`);
}

function catalogPage(site, store, url, collection = null) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  const searching = url.pathname === "/search";
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const inStock = url.searchParams.get("stock") === "available";
  const sort = ["featured", "price-asc", "price-desc", "title"].includes(url.searchParams.get("sort")) ? url.searchParams.get("sort") : "featured";
  const membership = collection ? new Set((collection.products || []).map((product) => product.id)) : null;
  let products = (store.products || []).filter((product) => !membership || membership.has(product.id));
  if (searching && query) {
    const words = query.toLocaleLowerCase(store.locale).split(/\s+/);
    products = products.filter((product) => words.every((word) => `${product.title} ${product.brand || ""} ${(product.variants || []).flatMap((variant) => (variant.options || []).map((option) => option.value)).join(" ")}`.toLocaleLowerCase(store.locale).includes(word)));
  }
  if (searching && !query) products = [];
  if (inStock) products = products.filter((product) => product.variants?.some((variant) => !variant.outOfStock));
  const minimum = (product) => Math.min(...(product.variants || []).map((variant) => Number(variant.price)).filter(Number.isFinite));
  if (sort === "price-asc") products.sort((a, b) => minimum(a) - minimum(b));
  if (sort === "price-desc") products.sort((a, b) => minimum(b) - minimum(a));
  if (sort === "title") products.sort((a, b) => a.title.localeCompare(b.title, store.locale));
  if (sort === "featured") products.sort((a, b) => (FEATURED_HANDLES.indexOf(a.handle) < 0 ? 99 : FEATURED_HANDLES.indexOf(a.handle)) - (FEATURED_HANDLES.indexOf(b.handle) < 0 ? 99 : FEATURED_HANDLES.indexOf(b.handle)));
  const title = searching ? t.search : collection?.title || t.allProducts;
  return page(site, store, title, `<section class="shell inner-page catalog-page"><a class="breadcrumb" href="${path("/")}">${t.backStore}</a><h1>${escapeHtml(title)}</h1>${collection ? descriptionHtml(collection) : ""}
    <form class="catalog-tools" method="get" action="${escapeHtml(path(url.pathname))}">
      ${searching ? `<div class="search-field"><label for="search-query">${t.searchProducts}</label><div><input id="search-query" name="q" type="search" value="${escapeHtml(query)}" maxlength="100" placeholder="${t.searchPlaceholder}"><button class="button" type="submit">${t.search}</button></div></div>` : ""}
      <div class="catalog-filters"><span role="status">${products.length} ${t.productsCount}</span><label class="stock-filter"><input type="checkbox" name="stock" value="available"${inStock ? " checked" : ""}> ${t.inStockOnly}</label><label for="sort">${t.sort}</label><select name="sort" id="sort" data-submit-on-change>${[["featured", t.featured], ["price-asc", t.priceLow], ["price-desc", t.priceHigh], ["title", t.nameSort]].map(([value, label]) => `<option value="${value}"${sort === value ? " selected" : ""}>${label}</option>`).join("")}</select><button class="filter-submit" type="submit">${t.apply}</button></div>
    </form>
    ${products.length ? `<div class="product-grid">${products.map((product) => card(product, store)).join("")}</div>` : `<p class="empty-state">${searching && !query ? t.searchPrompt : t.noResults}</p>`}
  </section>`);
}

function productPage(site, store, product) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  const variants = product.variants || [];
  const soldOut = variants.every((variant) => variant.outOfStock);
  const selected = variants.find((variant) => !variant.outOfStock) || variants[0];
  const options = variants.map((variant) => {
    const label = variant.options?.map((option) => `${option.name}: ${option.value}`).join(" · ") || t.standard;
    return `<option value="${escapeHtml(variant.id)}" data-out-of-stock="${Boolean(variant.outOfStock)}"${variant.id === selected?.id ? " selected" : ""}${variant.outOfStock ? " disabled" : ""}>${escapeHtml(label)} · ${escapeHtml(price(variant.price, store.currency, store.locale))}${variant.outOfStock ? ` · ${t.outOfStock}` : ""}</option>`;
  }).join("");
  return page(site, store, product.title, `<section class="shell inner-page">
    <a class="breadcrumb" href="${path("/collections/all")}">${t.backAllProducts}</a>
    <div class="product-detail"><div class="product-gallery"><div class="gallery-stage">${(product.images?.length ? product.images : [null]).map((image, index) => `<div class="detail-image" data-gallery-image="${index}"${index ? " hidden" : ""}>${picture(product, "", image, "(max-width: 900px) 100vw, 50vw", index === 0)}</div>`).join("")}</div>${product.images?.length > 1 ? `<div class="gallery-thumbs" aria-label="${t.productImages}">${product.images.map((image, index) => `<button type="button" data-gallery-select="${index}" aria-label="${t.image} ${index + 1}" aria-pressed="${index === 0}">${picture(product, "", image, "80px")}</button>`).join("")}</div>` : ""}</div>
      <div class="detail-copy"><span class="eyebrow">${escapeHtml(product.brand || site.name)}</span>
        <h1>${escapeHtml(product.title)}</h1><p class="detail-price">${escapeHtml(productPrice(product, store))}</p>
        ${options ? `<form data-add-to-cart><label for="variant">${t.options}</label><select id="variant" name="variantId" required${soldOut ? " disabled" : ""}>${options}</select>
          <label for="quantity">${t.quantity}</label><input id="quantity" name="quantity" type="number" min="1" max="20" value="1" required>
          <button class="button" type="submit"${soldOut ? " disabled" : ""}>${soldOut ? t.outOfStock : t.addToCart}</button><p data-add-message role="status"></p></form>` : ""}
        <div class="purchase-help"><a href="${path("/pages/shipping")}">${t.shipping} ↗</a><a href="${path("/policies/returns")}">${t.returns} ↗</a><a href="${path("/pages/contact")}">${t.productQuestion} ↗</a></div>
        <div class="product-description">${descriptionHtml(product)}</div>
      </div>
    </div>
  </section>`);
}

function cartPage(site, store) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  return page(site, store, t.cart, `<section class="shell inner-page"><a class="breadcrumb" href="${path("/collections/all")}">${t.continueShopping}</a>
    <h1>${t.yourCart}</h1><div data-cart-items><p>${t.loadingCart}</p></div><p data-cart-total class="cart-total"></p>
    <button class="button" type="button" data-start-checkout disabled>${store.reviewOnly ? t.previewCheckoutButton : t.checkout}</button>
    <p data-checkout-error role="alert" tabindex="-1" hidden></p>
    <p class="cart-note">${store.reviewOnly ? t.previewCartNote : t.cartNote}</p></section>`);
}

function informationPage(site, store, slug) {
  const path = (value) => shopPath(store, value);
  const t = ui(store.locale);
  if (slug === "/pages/about") return page(site, store, t.about, `<section class="shell editorial-page"><a class="breadcrumb" href="${path("/")}">${t.backStore}</a><h1>${t.about}</h1><div class="editorial-body">${aboutHtml[language(store.locale)].replace('href="/collections/all"', `href="${path("/collections/all")}"`)}</div></section>`);
  const original = (language(store.locale) === "en" && englishPages[slug]) || sourcePages[slug];
  if (original) return page(site, store, original.title, `<section class="shell editorial-page"><a class="breadcrumb" href="${path("/")}">${t.backStore}</a><h1>${escapeHtml(original.title)}</h1><div class="editorial-body">${original.html}</div></section>`);
  const key = {
    "/pages/about": "about", "/pages/contact": "contact", "/pages/shipping": "shipping",
    "/pages/faq": "faq", "/policies/returns": "returns", "/policies/privacy": "privacy",
    "/policies/terms": "terms",
  }[slug];
  const content = storeContent[language(store.locale)].pages[key];
  if (!content) return null;
  const contact = storeContent.contactEmail
    ? `<a href="mailto:${escapeHtml(storeContent.contactEmail)}">${escapeHtml(storeContent.contactEmail)}</a>`
    : t.fallbackContact;
  const renderText = (value) => escapeHtml(value).replaceAll("{name}", escapeHtml(site.name)).replaceAll("{contact}", contact);
  const details = [
    storeContent.legalName && `<p><strong>${t.business}:</strong> ${escapeHtml(storeContent.legalName)}</p>`,
    storeContent.organizationNumber && `<p><strong>${t.organizationNumber}:</strong> ${escapeHtml(storeContent.organizationNumber)}</p>`,
    storeContent.address && `<p><strong>${t.address}:</strong> ${escapeHtml(storeContent.address)}</p>`,
  ].filter(Boolean).join("");
  const sections = content.sections.map(([heading, body]) => `<h2>${renderText(heading)}</h2><p>${renderText(body)}</p>`).join("");
  const links = key === "contact" ? `<div class="inline-links"><a href="${path("/pages/shipping")}">${t.shipping} ↗</a><a href="${path("/policies/returns")}">${t.returns} ↗</a></div>` : "";
  return page(site, store, content.title, `<section class="shell editorial-page"><a class="breadcrumb" href="${path("/")}">${t.backStore}</a><div class="editorial-heading"><span class="eyebrow">${escapeHtml(content.eyebrow)}</span><h1>${escapeHtml(content.title)}</h1><p class="lead">${escapeHtml(content.lead)}</p></div><div class="editorial-body">${sections}${details}${links}</div></section>`);
}

async function delivery(result) {
  const { response } = await result;
  if (!response.ok) {
    const error = new Error(`Site API returned ${response.status}`);
    error.status = response.status;
    error.response = response;
    throw error;
  }
  return response.json();
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

function checkoutLines(body) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!body || !Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) return null;
  const lines = body.lines.map((line) => ({ variantId: line?.variantId, quantity: line?.quantity }));
  if (lines.some((line) => typeof line.variantId !== "string" || !uuid.test(line.variantId)
      || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) return null;
  return lines;
}

async function boundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 16_384) {
      await reader.cancel();
      return null;
    }
    raw += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(raw + decoder.decode()); } catch { return null; }
}

function routeHandle(pathname, segment) {
  const match = pathname.match(new RegExp(`^/${segment}/([^/]+)/?$`));
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const reviewOnly = env.CHECKOUT_ENABLED === "false" || url.protocol !== "https:" || url.hostname !== LIVE_HOSTNAME;
    const response = await handle(request, env, url, reviewOnly);
    const headers = new Headers(response.headers);
    if (reviewOnly) {
      headers.set("x-robots-tag", "noindex, nofollow");
    }
    if (url.protocol === "https:") {
      headers.set("strict-transport-security", "max-age=31536000");
    }
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

async function handle(request, env, url, reviewOnly) {
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST" && request.method !== "PATCH") return new Response("Method not allowed", { status: 405 });
  if (url.pathname.startsWith("/assets/") || ["/styles.css", "/store.js", "/cart-rules.js", "/checkout.js", "/checkout-preview.js", "/checkout.css", "/storefront-mark.svg", "/storefront-hero.avif"].includes(url.pathname)) return env.ASSETS.fetch(request);
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/robots.txt") {
    return new Response(`User-agent: *\nDisallow:${reviewOnly ? " /" : ""}\n`, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (env.CANONICAL_HOSTNAME && url.hostname.endsWith(".workers.dev") && url.hostname !== env.CANONICAL_HOSTNAME && ["GET", "HEAD"].includes(request.method)) {
    const destination = new URL(url.href);
    destination.hostname = env.CANONICAL_HOSTNAME;
    return Response.redirect(destination.href, 308);
  }
  const english = url.pathname === "/en" || url.pathname.startsWith("/en/");
  const pathPrefix = english ? "/en" : "";
  const route = new URL(url);
  route.pathname = "/" + route.pathname.slice(pathPrefix.length).replace(/^\/+/, "");
  const pathname = route.pathname;
  const alternate = english
    ? { href: escapeHtml(pathname + url.search), lang: "nb", label: "Norsk", shortLabel: "NO" }
    : { href: escapeHtml("/en" + pathname + url.search), lang: "en", label: "English", shortLabel: "EN" };
  const requestedLocale = english ? "en" : "nb-NO";
  const messages = ui(requestedLocale);
  if (request.method === "POST" || request.method === "PATCH") {
    if (reviewOnly && !["/cart/quote", "/checkout/start"].includes(pathname)) return json({ error: messages.previewCheckout }, 403);
    if (!["/checkout/start", "/cart/quote"].includes(pathname) && !pathname.startsWith("/reai/checkout/")) return json({ error: "Method not allowed" }, 405);
    if (request.headers.get("Origin") !== url.origin || request.headers.get("Sec-Fetch-Site") === "cross-site") return json({ error: "Invalid origin" }, 403);
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "Expected JSON" }, 415);
    if (env.CHECKOUT_RATE_LIMIT && !(await env.CHECKOUT_RATE_LIMIT.limit({key:`${url.host}:${request.headers.get("CF-Connecting-IP")||"local"}`})).success) return json({error:messages.tooManyRequests},429);
  }

  if (!env.REAI_API_BASE_URL || !env.REAI_SITE_CREDENTIAL) {
    const t = messages;
    return page(null, { locale: requestedLocale, pathPrefix, alternate }, t.comingSoon, `<section class="shell inner-page"><span class="eyebrow">${t.comingSoon}</span><h1>${t.setupHeading}</h1><p class="lead">${t.setupText}</p></section>`, 503);
  }

  try {
    const baseUrl = new URL(env.REAI_API_BASE_URL);
    if (!(["http:", "https:"].includes(baseUrl.protocol))) throw new Error("Invalid API URL");
    const client = new ReaiSiteClient({ baseUrl: baseUrl.href, token: env.REAI_SITE_CREDENTIAL });
    const site = await delivery(client.site());
    const market = site.markets?.find((entry) => entry.default) || site.markets?.[0];
    if (!market) throw new Error("No Site market configured");
    const locale = english
      ? market.locales?.find((entry) => language(entry) === "en") || market.defaultLocale
      : market.defaultLocale;
    const context = { market: market.handle, locale };
    const merchant = await merchantCheckout(request, env, client, market, boundedJson, { pathname, pathPrefix, reviewOnly, locale: requestedLocale });
    if (merchant) return merchant;
    if (["/checkout/start", "/cart/quote"].includes(pathname)) {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await boundedJson(request);
      let lines = checkoutLines(body);
      if (!lines) return json({ error: "Invalid cart" }, 400);
      if (env.WATCH_CASE_PROMOTION === "true") {
        const catalog = await delivery(client.storefront(context));
        try { lines = withWatchCase(lines, catalog); } catch (error) { return json({error:error.message === "watch_limit" ? ui(context.locale).cartLimit : ui(context.locale).caseUnavailable},400); }
        if (!lines.length) return json({ error: ui(context.locale).emptyCart }, 400);
      }
      if (pathname === "/cart/quote") {
        const quote = await client.quoteCart({lines},context);
        return new Response(quote.response.body,{status:quote.response.status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
      }
      if (reviewOnly) return json({checkoutUrl:`${url.origin}${pathPrefix}/checkout`});
      const countries = market.countries || [];
      const countryCode = countries.includes("NO") ? "NO" : countries[0];
      try {
        const session = await delivery(client.createCheckoutSession(
          { lines, countryCode, returnUrl: `${url.origin}${pathPrefix}/checkout/complete`, merchantCheckoutUrl: `${url.origin}${pathPrefix}/checkout` }, context,
          request.headers.get("Idempotency-Key") || crypto.randomUUID(),
        ));
        return json({ checkoutUrl: session.checkoutUrl });
      } catch (error) {
        if (error.response) {
          const details = await error.response.json().catch(() => ({}));
          return json({ error: details.detail || "Checkout could not be started", code: details.code, stockIssues: details.stockIssues }, error.status);
        }
        console.error("Checkout session creation failed", error);
        return json({ error: "Checkout is temporarily unavailable" }, 502);
      }
    }
    const store = await delivery(client.storefront(context));
    Object.assign(store, { locale: english ? "en" : store.locale, pathPrefix, alternate, reviewOnly });

    if (["/", "/catalog.json", "/search"].includes(pathname) || /^\/(collections|products)(\/|$)/.test(pathname)) {
      const stockProducts = pathname.startsWith("/products/")
        ? store.products.filter((product) => product.handle === routeHandle(pathname, "products")) : store.products;
      const ids = (stockProducts || []).flatMap((product) => (product.variants || []).map((variant) => variant.id));
      const availability = new Map();
      for (let start = 0; start < ids.length; start += 100) {
        const batch = await delivery(client.availabilities(ids.slice(start, start + 100), context));
        batch.variants.forEach((variant) => availability.set(variant.variantId, variant.status));
      }
      stockProducts.forEach((product) => product.variants.forEach((variant) => {
        variant.outOfStock = availability.get(variant.id) === "OUT_OF_STOCK";
      }));
    }

    if (pathname === "/catalog.json") return json({ products: store.products, currency: store.currency, locale: store.locale, watchProductIds: watchProductIds(store) });
    if (pathname === "/") return home(site, store);
    if (pathname === "/search") return catalogPage(site, store, route);
    if (/^\/collections\/?$/.test(pathname)) return collectionsPage(site, store);
    if (/^\/collections\/all\/?$/.test(pathname)) return catalogPage(site, store, route);
    const information = informationPage(site, store, pathname.replace(/\/$/, ""));
    if (information) return information;
    if (pathname === "/cart") return cartPage(site, store);
    const collectionHandle = routeHandle(pathname, "collections");
    if (collectionHandle !== null) {
      const collection = store.collections?.find((entry) => entry.handle === collectionHandle);
      if (collection) return catalogPage(site, store, route, collection);
    }
    const productHandle = routeHandle(pathname, "products");
    if (productHandle !== null) {
      const product = store.products?.find((entry) => entry.handle === productHandle);
      if (product) return productPage(site, store, product);
    }
    const t = ui(store.locale);
    return page(site, store, t.notFound, `<section class="shell inner-page"><span class="eyebrow">404</span><h1>${t.notFoundHeading}</h1><a class="button" href="${shopPath(store, "/")}">${t.backToStore}</a></section>`, 404);
  } catch (error) {
    console.error("Storefront request failed", error);
    if (["/checkout/start", "/cart/quote"].includes(pathname)) return json({ error: "Checkout is temporarily unavailable" }, 502);
    const t = messages;
    return page(null, { locale: requestedLocale, pathPrefix, alternate }, t.temporarilyUnavailable, `<section class="shell inner-page"><span class="eyebrow">${t.tryAgain}</span><h1>${t.unavailableHeading}</h1><p class="lead">${t.unavailableText}</p></section>`, 502);
  }
}
