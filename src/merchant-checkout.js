import { renderCheckoutPage } from './checkout.js';
import { language, ui } from './ui-copy.js';
export async function merchantCheckout(request, env, client, market, readBody, { pathname, pathPrefix, reviewOnly, locale }) {
  const url = new URL(request.url);
  const api=pathname.match(/^\/reai\/checkout\/([a-f0-9]{32})(?:\/(delivery-options|prepare-payment|change-country|address-suggestions))?$/);
  const page=pathname==='/checkout'||pathname==='/checkout/complete';
  if(!api&&!page)return null;
  const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' https: data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
  const reply=(body,status=200)=>Response.json(body,{status,headers});
  if(reviewOnly){
    if(api)return reply({error:ui(locale).previewCheckout},403);
    if(!['GET','HEAD'].includes(request.method))return reply({error:'Method not allowed'},405);
    const state={reviewOnly:true,id:null,locale,currency:market.currency,lines:[],destinations:(market.countries.length?market.countries:['NO']).map(countryCode=>({countryCode})),customer:{countryCode:market.countries[0]||'NO'},editable:true,phase:'details',subtotal:0,total:0,vat:0,discountGross:0,discountCode:null,shippingGross:null};
    return new Response(request.method==='HEAD'?null:renderCheckoutPage(state,{pathPrefix}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
  }
  const id=api?.[1]||url.searchParams.get('checkout');
  if(!id||!/^[a-f0-9]{32}$/.test(id))return page?Response.redirect(new URL(`${pathPrefix}/cart`,url.origin),303):reply({error:'Checkout not found'},404);
  if(api && request.headers.get('Sec-Fetch-Site')==='cross-site')return reply({error:'Invalid origin'},403);
  let result;
  if(['GET','HEAD'].includes(request.method)&&!api?.[2])result=await client.checkoutDetails(id);
  else if(api?.[2]==='address-suggestions'&&request.method==='GET'){
    if(env.CHECKOUT_RATE_LIMIT && !(await env.CHECKOUT_RATE_LIMIT.limit({key:`${url.host}:${request.headers.get("CF-Connecting-IP")||"local"}`})).success)return reply({error:"Too many requests"},429);
    const query=url.searchParams.get('query')||'';if(query.length>254)return reply({error:'Invalid query'},400);
    result=await client.checkoutAddressSuggestions(id,query,url.searchParams.get('countryCode')||'NO');
  } else if(api&&['PATCH','POST'].includes(request.method)){
    if(request.headers.get('Origin')!==url.origin)return reply({error:'Invalid origin'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Expected JSON'},415);
    const body=await readBody(request);if(!body)return reply({error:'Invalid request'},400);
    if(request.method==='PATCH'&&!api[2])result=await client.updateCheckout(id,body);
    else if(request.method==='POST'&&api[2]==='delivery-options')result=await client.checkoutDeliveryOptions(id,body);
    else if(request.method==='POST'&&api[2]==='change-country')result=await client.changeCheckoutCountry(id,body,request.headers.get('Idempotency-Key')||crypto.randomUUID());
    else if(request.method==='POST'&&api[2]==='prepare-payment')result=await client.prepareCheckoutPayment(id,body);
    else return reply({error:'Method not allowed'},405);
  } else return reply({error:'Method not allowed'},405);
  if(!result.response.ok)return new Response(request.method==='HEAD'?null:result.response.body,{status:result.response.status,headers:{...headers,'Content-Type':'application/json'}});
  const details=await result.response.json();
  if(language(locale)==='en'){
    for(const option of [...(details.options || []), ...(details.shippingMethods || [])]){
      if(option.name==='Gratis frakt')option.name='Free shipping';
    }
    if(details.shippingName==='Gratis frakt')details.shippingName='Free shipping';
  }
  if(!page)return reply(details);
  return new Response(request.method==='HEAD'?null:renderCheckoutPage(details,{completed:pathname==='/checkout/complete',pathPrefix}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
