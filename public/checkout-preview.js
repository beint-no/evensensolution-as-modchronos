import { withWatchCase } from '/cart-rules.js';
const shopPath = (path) => `${document.body.dataset.pathPrefix || ''}${path}`;
const state = JSON.parse(document.body.dataset.checkout);
const no = /^(nb|nn|no)/i.test(state.locale);
const t = (en, nb) => no ? nb : en;
const money = amount => new Intl.NumberFormat(state.locale, {style:'currency',currency:state.currency}).format(Number(amount));
const error = document.querySelector('[data-error]');
const form = document.querySelector('[data-details-form]');
const button = document.querySelector('[data-continue]');
const showError = message => { error.classList.remove('co-notice'); error.textContent=message; error.hidden=false; };
button.disabled=true;
try {
  const catalog = await fetch(shopPath('/catalog.json')).then(r=>{if(!r.ok)throw Error();return r.json()});
  const stored=JSON.parse(localStorage.getItem('reai-storefront-cart-v1')||'[]');
  const lines=withWatchCase(stored,catalog);
  if(!lines.length)location.replace(shopPath('/cart'));
  const response=await fetch(shopPath('/cart/quote'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lines})});
  const quote=await response.json();if(!response.ok)throw Error(quote.detail||quote.error||t('The cart could not be priced.','Handlekurven kunne ikke beregnes.'));
  const products=document.querySelector('.co-products');products.replaceChildren();
  for(const line of quote.lines){
    const product=catalog.products.find(p=>p.variants.some(v=>v.id===line.variantId));
    const row=document.createElement('article');row.className='co-product';
    const picture=document.createElement('div');picture.className='co-image';
    const img=document.createElement('img');img.src=product.images[0]?.url||'/assets/modchronos-logo.jpg';img.alt=product.title;img.width=72;img.height=84;
    const count=document.createElement('span');count.textContent=String(line.quantity);picture.append(img,count);
    const title=document.createElement('strong');title.textContent=product.title;
    const value=document.createElement('span');value.textContent=money(line.total);row.append(picture,title,value);products.append(row);
  }
  document.querySelector('[data-subtotal]').textContent=money(quote.subtotal);
  document.querySelector('[data-discount-row]').hidden=!quote.discount;
  document.querySelector('[data-discount-name]').textContent=t('Discount','Rabatt');
  document.querySelector('[data-discount-amount]').textContent=money(-quote.discount);
  document.querySelector('[data-remove-discount]').hidden=true;
  document.querySelector('[data-shipping-price]').textContent=t('Confirmed at ordering','Bekreftes ved bestilling');
  document.querySelector('[data-total]').textContent=money(quote.total);
  document.querySelector('[data-mobile-total]').textContent=money(quote.total);
  document.querySelector('[data-tax]').textContent=t('Product total before delivery.','Varesum før levering.');
  document.querySelector('[data-delivery-options]').textContent=t('Available delivery methods and pickup points are confirmed when ordering is enabled.','Tilgjengelige leveringsmåter og hentesteder bekreftes når bestilling er aktivert.');
  button.textContent=t('Test the form','Test skjemaet');button.disabled=false;
}catch(e){showError(e.message||t('Cart unavailable. Return to the cart and try again.','Handlekurven er utilgjengelig. Gå tilbake og prøv igjen.'));}
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  error.classList.add('co-notice');
  error.textContent=t('The fields are filled in. This preview does not create orders or payments.','Feltene er utfylt. Denne forhåndsvisningen oppretter ikke bestillinger eller betalinger.'); error.hidden=false;
});
document.querySelector('[data-discount-form]').hidden=true;
if(matchMedia('(max-width:760px)').matches)document.querySelector('.co-summary-mobile').open=false;
