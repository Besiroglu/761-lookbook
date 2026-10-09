(function(root){
'use strict';
const validReview = value => ['review','favourite','hidden'].includes(value);
const aliasesFor = product => Array.isArray(product.aliases) ? product.aliases : [];
function stateFor(product,items={}){
 const saved=items[product.id]||{};
 return {review:validReview(saved.review)?saved.review:product.defaultReview,purchased:typeof saved.purchased==='boolean'?saved.purchased:product.defaultPurchased};
}
function migrate(products,current,legacy){
 const items={...((current&&current.version===1&&current.items)||{})};let migrated=0;
 for(const p of products){
  if(Object.prototype.hasOwnProperty.call(items,p.id))continue;
  for(const alias of aliasesFor(p)){
   const old=legacy[alias.store]||{};
   if(!Object.prototype.hasOwnProperty.call(old,alias.key))continue;
   if(!['yes','no'].includes(old[alias.key]))continue;
   items[p.id]={review:old[alias.key]==='yes'?'favourite':'hidden',purchased:p.defaultPurchased};migrated++;break;
  }
 }
 return {data:{version:1,items},migrated};
}
function inView(p,items,view){
 const s=stateFor(p,items);
 if(view==='hidden')return s.review==='hidden';
 if(view==='purchased')return s.purchased;
 if(s.review==='hidden')return false;
 if(view==='favourites')return s.review==='favourite';
 if(view==='review')return s.review==='review'&&!s.purchased;
 return true;
}
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function matches(p,f,items){
 if(!inView(p,items,f.view))return false;
 if(f.category&&p.category!==f.category)return false;
 if(f.group&&p.group!==f.group)return false;
 const hay=normalize([p.name,p.maker,p.category,p.group,p.search].join(' '));
 return normalize(f.q).trim().split(/\s+/).filter(Boolean).every(t=>hay.includes(t));
}
// "Most recent purchase", the Purchased view's order (owner request 8 Oct 2026: the newest purchase always first).
// A product's purchase date is its purchasedAt, else purchase.date, else the date of the spend-ledger row whose order
// number appears in its purchase record, delivery status or price line, else when it was marked purchased in this
// browser. Same-day purchases follow the ledger (a later row was bought later), then product name.
const orderTokens=s=>String(s||'').split(/[^A-Za-z0-9-]+/).filter(t=>t.length>=4&&/\d/.test(t)&&!/^(19|20)\d\d$/.test(t)).map(t=>t.toLowerCase());
function purchaseInfo(products,items,ledger){
 items=items||{};ledger=ledger||[];
 const first=new Map();ledger.forEach((e,i)=>{for(const t of orderTokens(e.order))if(!first.has(t))first.set(t,i)});
 return new Map(products.map(p=>{
  let row=-1;for(const t of orderTokens([p.purchase&&p.purchase.order,p.soonest&&p.soonest.status,p.price].join(' '))){const i=first.get(t);if(i!==undefined&&(row<0||i<row))row=i}
  const s=items[p.id]||{};
  return [p.id,{date:String(p.purchasedAt||(p.purchase&&p.purchase.date)||(row>=0&&ledger[row].date)||(s.purchased===true&&(s.purchasedAt||s.updatedAt))||''),row}];
 }));
}
function sortProducts(products,sort,{items,ledger}={}){
 const info=sort==='recent'?purchaseInfo(products,items,ledger):null, P=id=>info.get(id);
 return [...products].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='maker'?a.maker.localeCompare(b.maker)||a.name.localeCompare(b.name):sort==='recent'?(P(b.id).date.localeCompare(P(a.id).date)||P(b.id).row-P(a.id).row||a.name.localeCompare(b.name)):a.rank-b.rank||Number(b.priority)-Number(a.priority));
}
function importItems(products,payload,existing){
 const items={...existing};let count=0;
 if(payload&&payload.version===1&&payload.items&&typeof payload.items==='object'&&!Array.isArray(payload.items)){
  for(const p of products){const v=payload.items[p.id];if(!v||!validReview(v.review)||typeof v.purchased!=='boolean')continue;items[p.id]={review:v.review,purchased:v.purchased};count++;}
 }else if(payload&&typeof payload==='object'&&!Array.isArray(payload)){
  for(const p of products){const alias=aliasesFor(p).find(a=>['yes','no'].includes(payload[a.key]));if(!alias)continue;items[p.id]={...stateFor(p,items),review:payload[alias.key]==='yes'?'favourite':'hidden'};count++;}
 }
 return {items,count};
}
const api={stateFor,migrate,inView,normalize,matches,sortProducts,purchaseInfo,importItems};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BoardCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
