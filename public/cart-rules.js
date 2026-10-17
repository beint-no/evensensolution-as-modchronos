export function watchCase(catalog) {
  const product = catalog.products.find((entry) => entry.handle === "skinnetui-med-verktoy");
  return product?.variants.find((variant) => variant.sku === "47645632135362" && Number(variant.price) === 0);
}

export function withWatchCase(cart, catalog) {
  const gift = watchCase(catalog);
  if (!gift) return cart;
  const lines = cart.filter((line) => line.variantId !== gift.id);
  const prices = new Map(catalog.products.flatMap((product) => product.variants.map((variant) => [variant.id, Number(variant.price)])));
  const subtotal = lines.reduce((sum, line) => sum + (prices.get(line.variantId) || 0) * line.quantity, 0);
  const quantity = catalog.currency === "NOK" && !gift.outOfStock ? (subtotal >= 5000 ? 2 : subtotal >= 2000 ? 1 : 0) : 0;
  return quantity ? [...lines, { variantId: gift.id, quantity }] : lines;
}
