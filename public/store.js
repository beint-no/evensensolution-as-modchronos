import { withWatchCase, watchCase, watchProductIds } from "/cart-rules.js";

const shopPath = (path) => `${document.body.dataset.pathPrefix || ""}${path}`;

const CART_KEY = "reai-storefront-cart-v1";
const CHECKOUT_KEY = "reai-storefront-checkout-started";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEXT = /^(?:nb|nn|no)(?:-|$)/i.test(document.documentElement.lang) ? {
  calculating: "Beregner tilbud…",
  discount: "3 for 2 · automatisk rabatt",
  cartLimit: "Handlekurven kan inneholde maksimalt 99 klokker med etui.",
  includedCase: "Inkludert gratis med klokken",
  outOfStock: "Utsolgt",
  stockLimit: (count) => `Bare ${count} kan kjøpes. Reduser antallet.`,
  added: "Lagt i handlekurven.",
  saveError: "Nettleseren kunne ikke lagre handlekurven.",
  empty: "Handlekurven er tom.",
  unavailableProduct: "Utilgjengelig produkt",
  removeToContinue: "Fjern produktet for å fortsette",
  quantity: "Antall for",
  decrease: "Reduser antall",
  increase: "Øk antall",
  remove: "Fjern",
  estimatedTotal: "Totalt",
  cartUnavailable: "Handlekurven er midlertidig utilgjengelig. Prøv igjen.",
  viewCart: "Se handlekurven",
  openingCheckout: "Åpner kassen…",
  checkout: "Gå til kassen",
  checkoutError: "Kunne ikke starte betalingen.",
  promoNeedTwo: "Legg til 2 klokker til for 3 for 2 – få den billigste klokken gratis.",
  promoNeedOne: "Nesten i mål! Legg til 1 klokke til og få den billigste gratis (3 for 2).",
  promoActive: (saved) => saved ? `3 for 2 aktivert! Du sparer ${saved} + gratis klokkeetui per klokke.` : "3 for 2 aktivert! Billigste klokke trekkes fra automatisk.",
} : {
  calculating: "Calculating offer…",
  discount: "3 for 2 · automatic offer",
  cartLimit: "At most 99 watches with cases per cart.",
  includedCase: "Included free with your watch",
  outOfStock: "Out of stock",
  stockLimit: (count) => `Only ${count} can be purchased. Reduce the quantity.`,
  added: "Added to cart.",
  saveError: "Your browser could not save the cart.",
  empty: "Your cart is empty.",
  unavailableProduct: "Unavailable product",
  removeToContinue: "Remove this item to continue",
  quantity: "Quantity for",
  decrease: "Decrease quantity",
  increase: "Increase quantity",
  remove: "Remove",
  estimatedTotal: "Total",
  cartUnavailable: "The cart is temporarily unavailable. Please try again.",
  viewCart: "View cart",
  openingCheckout: "Opening checkout…",
  checkout: "Continue to checkout",
  checkoutError: "Checkout could not be started.",
  promoNeedTwo: "Add 2 more watches for 3 for 2 – get the lowest-priced watch free.",
  promoNeedOne: "Almost there! Add 1 more watch to get the lowest-priced one free (3 for 2).",
  promoActive: (saved) => saved ? `3 for 2 applied! You save ${saved} + free watch case per watch.` : "3 for 2 applied! The lowest-priced watch is free automatically.",
};

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => UUID.test(item.variantId)
      && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99) : [];
  } catch {
    return [];
  }
}

let catalog = null;
let catalogRequest;
let cartQuote = null;
let quoteError = null;
let quoteRequest = 0;
const drawer = document.querySelector("[data-cart-drawer]");

function loadCatalog() {
  return catalogRequest ||= fetch(shopPath("/catalog.json")).then((response) => {
    if (!response.ok) throw new Error(TEXT.cartUnavailable);
    return response.json();
  }).then((value) => { catalog = value; return value; }).catch((error) => { catalogRequest = null; throw error; });
}

function saveCart(cart) {
  if (catalog) cart = withWatchCase(cart, catalog);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(totalCount);
  });
}

try { saveCart(readCart()); } catch { /* The cart will report storage failure when used. */ }

document.querySelectorAll("[data-qty-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.closest(".qty-stepper")?.querySelector('input[type="number"]');
    if (!input) return;
    const min = Number(input.min || 1);
    const max = Number(input.max || 20);
    const current = Number(input.value || 1);
    const next = Math.min(max, Math.max(min, current + Number(button.dataset.qtyStep)));
    input.value = String(next);
  });
});

document.querySelectorAll("[data-add-to-cart]").forEach((addForm) => {
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const variantField = addForm.elements.variantId;
    const selected = variantField.selectedOptions?.[0] || variantField;
    if (addForm.querySelector('button[type="submit"]').disabled || selected?.dataset.outOfStock === "true") return;
    const variantId = variantField.value;
    const quantity = Number(addForm.elements.quantity.value);
    const message = addForm.querySelector("[data-add-message]");
    if (!UUID.test(variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return;
    try { await loadCatalog(); } catch { message.textContent = TEXT.cartUnavailable; return; }
    const cart = readCart();
    const existing = cart.find((item) => item.variantId === variantId);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, 20);
    else cart.push({ variantId, quantity });
    try {
      saveCart(cart);
      message.textContent = TEXT.added;
      const cartLink = document.createElement("a");
      cartLink.href = shopPath("/cart");
      cartLink.textContent = TEXT.viewCart;
      message.append(" ", cartLink);
      renderAll();
      drawer?.showModal();
    } catch {
      message.textContent = TEXT.cartLimit;
    }
  });
});

const cartRoots = [...document.querySelectorAll("[data-cart-items]")];
const promoBanners = [...document.querySelectorAll("[data-cart-promo]")];
const checkoutButton = document.querySelector("[data-start-checkout]");
const checkoutError = document.querySelector("[data-checkout-error]");
let stockIssues = new Map();

function formatMoney(value) {
  return new Intl.NumberFormat(catalog.locale, { style: "currency", currency: catalog.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value));
}

function updatePromoBanners(cart, quote) {
  if (!catalog || !promoBanners.length) return;
  const eligibleIds = new Set(watchProductIds(catalog));
  const eligibleVariants = new Set(
    (catalog.products || [])
      .filter((product) => eligibleIds.has(product.id))
      .flatMap((product) => (product.variants || []).map((variant) => variant.id)),
  );
  const watchCount = cart.reduce((sum, item) => sum + (eligibleVariants.has(item.variantId) ? item.quantity : 0), 0);
  for (const banner of promoBanners) {
    if (!watchCount) {
      banner.hidden = true;
      banner.textContent = "";
      banner.classList.remove("is-active");
      continue;
    }
    const remainder = watchCount % 3;
    const isActive = watchCount >= 3;
    banner.hidden = false;
    banner.classList.toggle("is-active", isActive);
    if (isActive && quote?.discount) {
      banner.textContent = TEXT.promoActive(formatMoney(quote.discount));
    } else if (isActive) {
      banner.textContent = TEXT.promoActive("");
    } else if (remainder === 2) {
      banner.textContent = TEXT.promoNeedOne;
    } else {
      banner.textContent = TEXT.promoNeedTwo;
    }
  }
}

function renderAll() {
  try { saveCart(readCart()); } catch { quoteError = TEXT.cartLimit; if (checkoutButton) checkoutButton.disabled = true; return; }
  const lines = readCart();
  const key = JSON.stringify(lines);
  const sequence = ++quoteRequest;
  quoteError = null;
  cartRoots.forEach(renderCart);
  updatePromoBanners(lines, cartQuote?.key === key ? cartQuote : null);
  if (!lines.length) { cartQuote = null; return; }
  fetch(shopPath("/cart/quote"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines }) })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) {
        stockIssues = new Map((result.stockIssues || []).map((issue) => [issue.variantId, issue]));
        throw Error(result.detail || result.error || TEXT.cartUnavailable);
      }
      return result;
    })
    .then((value) => {
      if (sequence !== quoteRequest) return;
      stockIssues.clear();
      cartQuote = { ...value, key };
      cartRoots.forEach(renderCart);
      updatePromoBanners(readCart(), cartQuote);
    })
    .catch((error) => {
      if (sequence !== quoteRequest) return;
      quoteError = error.message;
      cartRoots.forEach(renderCart);
      updatePromoBanners(readCart(), null);
    });
}

function renderCart(cartRoot) {
  const container = cartRoot.closest(".cart-drawer, .cart-page") || cartRoot.parentElement;
  const cartTotal = container.querySelector("[data-cart-total]");
  const gift = watchCase(catalog);
  const cart = readCart();
  const quote = cartQuote?.key === JSON.stringify(cart) ? cartQuote : null;
  const variants = new Map((catalog?.products || []).flatMap((product) =>
    (product.variants || []).map((variant) => [variant.id, { product, variant }])));
  cartRoot.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = TEXT.empty;
    cartRoot.append(empty);
    if (checkoutButton) checkoutButton.disabled = true;
    if (cartTotal) cartTotal.textContent = "";
    return;
  }
  for (const item of cart) {
    const found = variants.get(item.variantId);
    const isGift = item.variantId === gift?.id;
    const row = document.createElement("div");
    row.className = isGift ? "cart-row cart-row-gift" : "cart-row";
    const imageLink = document.createElement("a");
    imageLink.className = "cart-product-image";
    const productImage = found?.product.images?.[0];
    if (found) imageLink.href = shopPath(`/products/${encodeURIComponent(found.product.handle)}`);
    if (productImage?.url) {
      const image = document.createElement("img");
      image.src = productImage.renditions?.find((entry) => entry.width >= 160)?.url || productImage.url;
      image.alt = productImage.alt || found.product.title;
      image.width = 90;
      image.height = 90;
      image.loading = "lazy";
      imageLink.append(image);
    }
    const title = document.createElement(found ? "a" : "span");
    title.className = "cart-product-title";
    if (found) title.href = shopPath(`/products/${encodeURIComponent(found.product.handle)}`);
    title.textContent = found?.product.title || TEXT.unavailableProduct;
    if (found?.variant.options?.length) {
      const options = document.createElement("small");
      options.textContent = found.variant.options.map((option) => option.value).join(" / ");
      title.append(options);
    }
    if (isGift) {
      const note = document.createElement("small");
      note.className = "cart-gift-note";
      note.textContent = TEXT.includedCase;
      title.append(note);
    }
    const detail = document.createElement("span");
    detail.className = "cart-line-price price-value";
    const quoteLine = quote?.lines.find((line) => line.variantId === item.variantId);
    detail.textContent = found ? formatMoney(quoteLine?.total ?? Number(found.variant.price) * item.quantity) : TEXT.removeToContinue;
    if (quoteLine && quoteLine.total < quoteLine.subtotal) {
      const original = document.createElement("s");
      original.textContent = formatMoney(quoteLine.subtotal);
      detail.prepend(original, document.createElement("br"));
    }

    const controls = document.createElement("div");
    controls.className = "cart-controls";
    if (isGift) {
      const qtyTag = document.createElement("span");
      qtyTag.className = "cart-gift-qty";
      qtyTag.textContent = `× ${item.quantity}`;
      controls.append(qtyTag);
    } else {
      const stepper = document.createElement("div");
      stepper.className = "qty-stepper qty-stepper-sm";
      const dec = document.createElement("button");
      dec.type = "button";
      dec.textContent = "−";
      dec.setAttribute("aria-label", `${TEXT.decrease} ${found?.product.title || ""}`.trim());
      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.max = "20";
      quantity.inputMode = "numeric";
      quantity.value = String(item.quantity);
      quantity.setAttribute("aria-label", `${TEXT.quantity} ${title.textContent}`);
      const inc = document.createElement("button");
      inc.type = "button";
      inc.textContent = "+";
      inc.setAttribute("aria-label", `${TEXT.increase} ${found?.product.title || ""}`.trim());

      const applyQty = (next) => {
        if (next === 0) {
          saveCart(cart.filter((entry) => entry.variantId !== item.variantId));
        } else if (Number.isInteger(next) && next >= 1 && next <= 20) {
          item.quantity = next;
          saveCart(cart);
        }
        stockIssues.clear();
        if (checkoutError) checkoutError.hidden = true;
        renderAll();
      };
      dec.addEventListener("click", () => applyQty(item.quantity - 1));
      inc.addEventListener("click", () => applyQty(Math.min(20, item.quantity + 1)));
      quantity.addEventListener("change", () => applyQty(Number(quantity.value)));
      stepper.append(dec, quantity, inc);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "cart-remove";
      remove.textContent = TEXT.remove;
      remove.addEventListener("click", () => applyQty(0));
      controls.append(stepper, remove);
    }

    row.append(imageLink, title, detail, controls);
    const issue = stockIssues.get(item.variantId);
    if (found?.variant.outOfStock || issue) {
      const warning = document.createElement("p");
      warning.className = "cart-stock-error";
      warning.setAttribute("role", "status");
      warning.textContent = found?.variant.outOfStock || issue?.maximumQuantity === 0
        ? TEXT.outOfStock : TEXT.stockLimit(issue.maximumQuantity);
      row.append(warning);
    }
    cartRoot.append(row);
  }
  if (checkoutButton) {
    checkoutButton.disabled = !quote || Boolean(quoteError) || cart.some((item) => !variants.has(item.variantId) || variants.get(item.variantId).variant.outOfStock || stockIssues.has(item.variantId));
  }
  if (cartTotal) {
    cartTotal.replaceChildren();
    if (quote?.discount) {
      const offer = document.createElement("small");
      offer.className = "cart-offer";
      offer.textContent = `${TEXT.discount}: −${formatMoney(quote.discount)}`;
      cartTotal.append(offer);
    }
    cartTotal.append(document.createTextNode(quoteError || (quote ? `${TEXT.estimatedTotal}: ${formatMoney(quote.total)}` : TEXT.calculating)));
  }
}

function showCartError() {
  cartRoots.forEach((root) => { root.textContent = TEXT.cartUnavailable; });
}

if (readCart().length || document.querySelector("[data-add-to-cart]") || checkoutButton) {
  loadCatalog().then(renderAll).catch(showCartError);
}

document.querySelector(".header-actions .cart-link")?.addEventListener("click", async (event) => {
  if (!drawer || document.querySelector(".cart-page")) return;
  event.preventDefault();
  drawer.showModal();
  try { await loadCatalog(); renderAll(); } catch { showCartError(); }
});
document.querySelector("[data-close-cart]")?.addEventListener("click", () => drawer.close());
drawer?.addEventListener("click", (event) => {
  if (event.target === drawer && event.clientX < drawer.getBoundingClientRect().left) drawer.close();
});

if (checkoutButton) {
  checkoutButton.addEventListener("click", async () => {
    if (checkoutButton.disabled) return;
    checkoutButton.disabled = true;
    checkoutButton.textContent = TEXT.openingCheckout;
    checkoutError.hidden = true;
    try {
      const response = await fetch(shopPath("/checkout/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ lines: readCart() }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) {
        stockIssues = new Map((result.stockIssues || []).map((issue) => [issue.variantId, issue]));
        throw new Error(result.detail || result.error || TEXT.checkoutError);
      }
      sessionStorage.setItem(CHECKOUT_KEY, "1");
      location.assign(result.checkoutUrl);
    } catch (error) {
      checkoutError.textContent = error.message || TEXT.checkoutError;
      checkoutError.hidden = false;
      checkoutError.focus();
      checkoutButton.textContent = TEXT.checkout;
      renderAll();
    }
  });
}

document.querySelectorAll("[data-gallery-select]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-gallery-image]").forEach((image) => {
      image.hidden = image.dataset.galleryImage !== button.dataset.gallerySelect;
    });
    document.querySelectorAll("[data-gallery-select]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  });
});

document.querySelectorAll("[data-submit-on-change]").forEach((control) => {
  control.addEventListener("change", () => control.form.requestSubmit());
});
