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
function sortProducts(products,sort){
 return [...products].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='maker'?a.maker.localeCompare(b.maker)||a.name.localeCompare(b.name):sort==='recent'?((b.purchasedAt||'').localeCompare(a.purchasedAt||'')||a.name.localeCompare(b.name)):a.rank-b.rank||Number(b.priority)-Number(a.priority));
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
const api={stateFor,migrate,inView,normalize,matches,sortProducts,importItems};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BoardCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
