import { withWatchCase, watchCase } from "/cart-rules.js";

const CART_KEY = "reai-storefront-cart-v1";
const CHECKOUT_KEY = "reai-storefront-checkout-started";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEXT = /^(?:nb|nn|no)(?:-|$)/i.test(document.documentElement.lang) ? {
  calculating: "Beregner tilbud…", discount: "3 for 2 · automatisk rabatt", cartLimit: "Maksimalt 99 klokker med etui per handlekurv.",
  includedCase: "Inkludert automatisk med bestillingen",
  outOfStock: "Utsolgt", stockLimit: (count) => `Bare ${count} kan kjøpes. Reduser antallet.`, added: "Lagt i handlekurven.", saveError: "Nettleseren kunne ikke lagre handlekurven.", empty: "Handlekurven er tom.",
  unavailableProduct: "Utilgjengelig produkt", removeToContinue: "Fjern produktet for å fortsette", quantity: "Antall for",
  remove: "Fjern", estimatedTotal: "Estimert totalsum", cartUnavailable: "Handlekurven er midlertidig utilgjengelig. Prøv igjen.",
  viewCart: "Se handlekurven", openingCheckout: "Åpner kassen…", checkout: "Gå til kassen", checkoutError: "Kunne ikke starte betalingen.",
} : {
  calculating: "Calculating offer…", discount: "3 for 2 · automatic offer", cartLimit: "At most 99 watches with cases per cart.",
  includedCase: "Automatically included with your order",
  outOfStock: "Out of stock", stockLimit: (count) => `Only ${count} can be purchased. Reduce the quantity.`, added: "Added to cart.", saveError: "Your browser could not save the cart.", empty: "Your cart is empty.",
  unavailableProduct: "Unavailable product", removeToContinue: "Remove this item to continue", quantity: "Quantity for",
  remove: "Remove", estimatedTotal: "Estimated total", cartUnavailable: "The cart is temporarily unavailable. Please try again.",
  viewCart: "View cart", openingCheckout: "Opening checkout…", checkout: "Continue to checkout", checkoutError: "Checkout could not be started.",
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
  return catalogRequest ||= fetch("/catalog.json").then((response) => {
    if (!response.ok) throw new Error(TEXT.cartUnavailable);
    return response.json();
  }).then((value) => { catalog = value; return value; }).catch((error) => { catalogRequest = null; throw error; });
}

function saveCart(cart) {
  if (catalog) cart = withWatchCase(cart, catalog);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
  });
}

try { saveCart(readCart()); } catch { /* The cart will report storage failure when used. */ }

document.querySelectorAll("[data-add-to-cart]").forEach((addForm) => {
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = addForm.elements.variantId.selectedOptions?.[0];
    if (addForm.querySelector('button[type="submit"]').disabled || selected?.dataset.outOfStock === "true") return;
    const variantId = addForm.elements.variantId.value;
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
      cartLink.href = "/cart";
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
const checkoutButton = document.querySelector("[data-start-checkout]");
const checkoutError = document.querySelector("[data-checkout-error]");
let stockIssues = new Map();

function renderAll() {
  try { saveCart(readCart()); } catch { quoteError = TEXT.cartLimit; if(checkoutButton)checkoutButton.disabled=true; return; }
  const lines=readCart(), key=JSON.stringify(lines), sequence=++quoteRequest;
  quoteError=null;
  cartRoots.forEach(renderCart);
  if(!lines.length){cartQuote=null;return;}
  fetch('/cart/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lines})})
    .then(async response=>{const result=await response.json();if(!response.ok){stockIssues=new Map((result.stockIssues||[]).map(issue=>[issue.variantId,issue]));throw Error(result.detail||result.error||TEXT.cartUnavailable)}return result;})
    .then(value=>{if(sequence!==quoteRequest)return;stockIssues.clear();cartQuote={...value,key};cartRoots.forEach(renderCart);})
    .catch(error=>{if(sequence!==quoteRequest)return;quoteError=error.message;cartRoots.forEach(renderCart);});
}

function renderCart(cartRoot) {
  const cartTotal = cartRoot.parentElement.querySelector("[data-cart-total]");
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
    cartTotal.textContent = "";
    return;
  }
  for (const item of cart) {
    const found = variants.get(item.variantId);
    const row = document.createElement("div");
    row.className = "cart-row";
    const imageLink = document.createElement("a");
    imageLink.className = "cart-product-image";
    const productImage = found?.product.images?.[0];
    if (found) imageLink.href = `/products/${encodeURIComponent(found.product.handle)}`;
    if (productImage?.url) {
      const image = document.createElement("img");
      image.src = productImage.renditions?.find((entry) => entry.width >= 160)?.url || productImage.url;
      image.alt = productImage.alt || found.product.title;
      image.width = 90; image.height = 90;
      imageLink.append(image);
    }
    const title = document.createElement(found ? "a" : "span");
    title.className = "cart-product-title";
    if (found) title.href = `/products/${encodeURIComponent(found.product.handle)}`;
    title.textContent = found?.product.title || TEXT.unavailableProduct;
    if (found?.variant.options?.length) {
      const options = document.createElement("small");
      options.textContent = found.variant.options.map((option) => option.value).join(" / ");
      title.append(options);
    }
    const detail = document.createElement("span");
    const quoteLine=quote?.lines.find(line=>line.variantId===item.variantId);
    const money=value=>new Intl.NumberFormat(catalog.locale,{style:'currency',currency:catalog.currency}).format(Number(value));
    detail.textContent = found ? money(quoteLine?.total ?? Number(found.variant.price)*item.quantity) : TEXT.removeToContinue;
    if(quoteLine && quoteLine.total < quoteLine.subtotal){const original=document.createElement('s');original.textContent=money(quoteLine.subtotal);detail.prepend(original,document.createElement('br'));}
    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "20";
    quantity.value = String(item.quantity);
    if (item.variantId === gift?.id) {
      quantity.disabled = true;
      const note = document.createElement("small");
      note.className = "cart-gift-note";
      note.textContent = TEXT.includedCase;
      title.append(note);
    }
    quantity.setAttribute("aria-label", `${TEXT.quantity} ${title.textContent}`);
    quantity.addEventListener("change", () => {
      const next = Number(quantity.value);
      if (Number.isInteger(next) && next >= 1 && next <= 20) {
        item.quantity = next;
        saveCart(cart);
        stockIssues.clear();
        if (checkoutError) checkoutError.hidden = true;
      }
      renderAll();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = TEXT.remove;
    remove.addEventListener("click", () => {
      saveCart(cart.filter((entry) => entry.variantId !== item.variantId));
      stockIssues.clear();
      if (checkoutError) checkoutError.hidden = true;
      renderAll();
    });
    row.append(imageLink, title, detail, quantity);
    if (item.variantId !== gift?.id) row.append(remove);
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
  if (checkoutButton) checkoutButton.disabled = !quote || Boolean(quoteError) || cart.some((item) => !variants.has(item.variantId) || variants.get(item.variantId).variant.outOfStock || stockIssues.has(item.variantId));
  const money=value=>new Intl.NumberFormat(catalog.locale,{style:'currency',currency:catalog.currency}).format(Number(value));
  cartTotal.replaceChildren();
  if(quote?.discount){const offer=document.createElement('small');offer.className='cart-offer';offer.textContent=`${TEXT.discount}: −${money(quote.discount)}`;cartTotal.append(offer);}
  cartTotal.append(document.createTextNode(quoteError || (quote ? `${TEXT.estimatedTotal}: ${money(quote.total)}` : TEXT.calculating)));
}

function showCartError() {
  cartRoots.forEach((root) => { root.textContent = TEXT.cartUnavailable; });
}

if (readCart().length || document.querySelector("[data-add-to-cart]") || checkoutButton) {
  loadCatalog().then(renderAll).catch(showCartError);
}

document.querySelector(".header-actions .cart-link")?.addEventListener("click", async (event) => {
  if (!drawer) return;
  event.preventDefault();
  drawer.showModal();
  try { await loadCatalog(); renderAll(); } catch { showCartError(); }
});
document.querySelector("[data-close-cart]")?.addEventListener("click", () => drawer.close());
drawer?.addEventListener("click", (event) => { if (event.target === drawer && event.clientX < drawer.getBoundingClientRect().left) drawer.close(); });

if (checkoutButton) {
  checkoutButton.addEventListener("click", async () => {
    if (checkoutButton.disabled) return;
    checkoutButton.disabled = true;
    checkoutButton.textContent = TEXT.openingCheckout;
    checkoutError.hidden = true;
    try {
      const response = await fetch("/checkout/start", {
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
    document.querySelectorAll("[data-gallery-image]").forEach((image) => { image.hidden = image.dataset.galleryImage !== button.dataset.gallerySelect; });
    document.querySelectorAll("[data-gallery-select]").forEach((item) => { item.setAttribute("aria-pressed", String(item === button)); });
  });
});

document.querySelectorAll("[data-submit-on-change]").forEach((select) => {
  select.addEventListener("change", () => select.form.requestSubmit());
});
