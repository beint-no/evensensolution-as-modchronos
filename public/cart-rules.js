export function watchCase(catalog) {
  const product = catalog.products.find(entry => entry.handle === 'skinnetui-med-verktoy');
  return product?.variants.find(variant => variant.sku === '47645632135362' && Number(variant.price) === 0);
}

export function watchProductIds(catalog) {
  return catalog.watchProductIds || catalog.collections?.find(collection => collection.handle === 'watch-offer')?.products.map(product => product.id) || [];
}

export function withWatchCase(cart, catalog) {
  const gift = watchCase(catalog);
  const eligible = new Set(watchProductIds(catalog));
  const watches = new Set(catalog.products.filter(product => eligible.has(product.id)).flatMap(product => product.variants.map(variant => variant.id)));
  const lines = cart.filter(line => line.variantId !== gift?.id);
  const quantity = lines.reduce((sum, line) => sum + (watches.has(line.variantId) ? line.quantity : 0), 0);
  if (quantity > 99) throw new RangeError('watch_limit');
  if (quantity && !gift) throw new Error('case_unavailable');
  return quantity ? [...lines, {variantId:gift.id,quantity}] : lines;
}
