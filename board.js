(()=>{
'use strict';
const catalog=JSON.parse(document.getElementById('catalog').textContent), C=BoardCore, products=catalog.products, byId=new Map(products.map(p=>[p.id,p]));
const categoryMap=new Map(catalog.groups.flatMap(g=>g.categories.map(c=>[c.id,{...c,group:g.id}]))), groupMap=new Map(catalog.groups.map(g=>[g.id,g]));
const KEY='board761', legacyKeys=['src761','dining761','house761','art761'];
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={all:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',review:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',favourites:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',purchased:'<path d="M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2M8 14l3 3 5-6"/>',hidden:'<path d="m5 5 14 14M19 5 5 19"/>',photo:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
const icon=n=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+icons[n]+'</svg>';
const viewNames={all:'All products',review:'To review',favourites:'Favourites',purchased:'Purchased',hidden:'Hidden'};
let storageOK=true;
function readStorage(key){try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){storageOK=false;return {}}}
const legacy=Object.fromEntries(legacyKeys.map(k=>[k,readStorage(k)]));
const migrated=C.migrate(products,readStorage(KEY),legacy);let saved=migrated.data;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));storageOK=true}catch(e){storageOK=false}$('storage-notice').hidden=storageOK;}
if(storageOK)persist();else $('storage-notice').hidden=false;
let filters={view:'all',category:'',group:'',q:'',sort:'suggested'}, limit=30, openGroups=new Set(), toastTimer, undoAction;
function route(){
 const hash=location.hash.slice(1), params=new URLSearchParams(hash.includes('=')?hash:hash?'category='+encodeURIComponent(hash):'');
 filters={view:params.get('view') in viewNames?params.get('view'):'all',category:categoryMap.has(params.get('category'))?params.get('category'):'',group:groupMap.has(params.get('group'))?params.get('group'):'',q:params.get('q')||'',sort:['name','maker','recent'].includes(params.get('sort'))?params.get('sort'):(params.get('view')==='purchased'?'recent':'suggested')};
 if(filters.category){filters.group='';openGroups.add(categoryMap.get(filters.category).group)}if(filters.group)openGroups.add(filters.group);limit=30;
 $('search').value=filters.q;$('sort').value=filters.sort;$('mobile-view').value=filters.view;render();
}
function navigate(changes,{replace=false}={}){
 filters={...filters,...changes};if(changes.category)filters.group='';if(changes.group)filters.category='';limit=30;
 const params=new URLSearchParams();for(const [k,v]of Object.entries(filters))if(v&&!(k==='view'&&v==='all')&&!(k==='sort'&&v==='suggested'))params.set(k,v);
 const hash=params.toString();history[replace?'replaceState':'pushState'](null,'',location.pathname+location.search+(hash?'#'+hash:''));
 if(filters.category)openGroups.add(categoryMap.get(filters.category).group);if(filters.group)openGroups.add(filters.group);
 $('search').value=filters.q;$('mobile-view').value=filters.view;$('sort').value=filters.sort;render();
}
function countFor(view,group='',category=''){return products.filter(p=>C.matches(p,{...filters,view,group,category},saved.items)).length}
function navHTML(includeViews=true){
 let out=includeViews?'<p class="side-label">Your board</p><div class="view-list">'+Object.entries(viewNames).map(([id,n])=>'<button class="view-button '+(filters.view===id?'active':'')+'" data-action="view" data-value="'+id+'" aria-pressed="'+(filters.view===id)+'">'+icon(id)+'<span>'+n+'</span><span class="nav-count">'+products.filter(p=>C.inView(p,saved.items,id)).length+'</span></button>').join('')+'</div>':'';
 out+='<p class="side-label">Browse by category</p><button class="category-link '+(!filters.group&&!filters.category?'active':'')+'" data-action="category" data-value="" aria-pressed="'+(!filters.group&&!filters.category)+'">All categories<span class="nav-count">'+countFor(filters.view)+'</span></button>';
 // Room planning views have plans, not a product count.
 for(const g of catalog.groups){
  const room=g.id==='rooms';
  out+='<details class="category-group" data-group="'+g.id+'" '+(openGroups.has(g.id)?'open':'')+'><summary>'+esc(g.name)+(room?'':'<span class="nav-count">'+countFor(filters.view,g.id)+'</span>')+'</summary><div class="category-children">';
  if(!room)out+='<button class="group-all '+(filters.group===g.id?'active':'')+'" data-action="group" data-value="'+g.id+'" aria-pressed="'+(filters.group===g.id)+'">Everything in '+esc(g.name.toLowerCase())+'</button>';
  out+=g.categories.map(c=>'<button class="category-link '+(filters.category===c.id?'active':'')+'" data-action="category" data-value="'+c.id+'" aria-pressed="'+(filters.category===c.id)+'"><span>'+esc(c.name)+'</span>'+(room?'':'<span class="nav-count">'+countFor(filters.view,'',c.id)+'</span>')+'</button>').join('')+'</div></details>';
 }
 return out;
}
function title(){return filters.category?categoryMap.get(filters.category).name:filters.group?groupMap.get(filters.group).name:viewNames[filters.view]}
function cardHTML(p){
 const s=C.stateFor(p,saved.items), favourite=s.review==='favourite', hidden=s.review==='hidden';
 const badge=s.purchased?'<span class="badge purchased">Purchased</span>':p.priority&&favourite?'<span class="badge favourite">Your favourite</span>':p.new?'<span class="badge new">New</span>':favourite?'<span class="badge favourite">Favourite</span>':hidden?'<span class="badge">Hidden</span>':'';
 const image=p.image?'<button data-action="photo" data-id="'+p.id+'" aria-label="Enlarge photo: '+esc(p.name)+'"><img src="'+esc(p.image)+'" alt="'+esc(p.alt)+'" loading="lazy"></button>':'<div class="photo-placeholder">'+icon('photo')+'<span>Photo unavailable</span></div>';
 const name=p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.name)+'</a>':esc(p.name);
 return '<article class="product-card '+(favourite?'is-favourite':'')+'" data-id="'+p.id+'"><div class="photo">'+image+badge+'</div><div class="card-copy"><div class="product-category">'+esc(categoryMap.get(p.category).name)+'</div><h2>'+name+'</h2><p class="maker">'+esc(p.maker)+'</p><p class="price" title="'+esc(p.price)+'">'+esc(p.price)+'</p></div><details class="product-details"><summary>Details &amp; sources</summary><div class="detail-body">'+p.details+'<button class="purchase-action" data-action="purchase" data-id="'+p.id+'">'+(s.purchased?'Remove purchased mark':'Mark as purchased')+'</button></div></details><div class="card-actions"><button class="favourite-action '+(favourite?'is-on':'')+'" data-action="favourite" data-id="'+p.id+'" aria-label="'+(favourite?'Remove from favourites: ':'Add to favourites: ')+esc(p.name)+'" aria-pressed="'+favourite+'">'+icon('favourites')+(favourite?'Favourited':'Favourite')+'</button><button class="hide-action" data-action="'+(hidden?'restore':'hide')+'" data-id="'+p.id+'" aria-label="'+(hidden?'Restore: ':'Hide: ')+esc(p.name)+'">'+icon(hidden?'review':'hidden')+(hidden?'Restore':'Hide')+'</button></div></article>';
}
function money(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function spendHTML(){const L=catalog.ledger||[];const num=e=>typeof e.amount==='number'?e.amount:0;const total=L.reduce((s,e)=>s+num(e),0);const acd=L.filter(e=>e.channel==='ACD').reduce((s,e)=>s+num(e),0);const tbc=L.filter(e=>typeof e.amount!=='number').length;
 const marked=products.filter(p=>C.stateFor(p,saved.items).purchased).length;
 return '<div class="spend-total"><span>Spent so far</span><strong>'+money(total)+'</strong></div><div class="spend-split"><span>Bought directly <b>'+money(total-acd)+'</b></span><span>Through ACD <b>'+money(acd)+'</b></span><span>'+L.length+' orders'+(tbc?' · '+tbc+' without an amount yet':'')+'</span><span>'+marked+' board products marked purchased</span></div><p class="spend-note">'+esc((catalog.ledgerMeta||{}).note||'')+' Updated '+esc((catalog.ledgerMeta||{}).updated||'')+'.</p>'}
function ledgerHTML(){const L=[...(catalog.ledger||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const rows=L.map(e=>'<tr><td>'+esc(e.date||'')+'</td><td>'+esc(e.vendor||'')+'</td><td>'+esc(e.what||'')+(e.lines?'<details class="ledger-lines"><summary>'+e.lines.length+' items</summary><ul>'+e.lines.map(l=>'<li>'+esc(l.item)+(l.qty>1?' × '+l.qty:'')+' — '+money(l.amount)+'</li>').join('')+'</ul></details>':'')+'</td><td>'+esc(e.order||'')+'</td><td class="num">'+(typeof e.amount==='number'?esc(e.amountLabel||money(e.amount)):'<span class="tbc">TBC</span>')+'</td><td>'+esc(e.channel||'')+'</td><td>'+esc(e.status||'')+'</td></tr>').join('');
 return '<h2>Every purchase</h2><p class="ledger-intro">Everything bought for the house so far, including pieces that are not on this board, so nothing gets bought twice.</p><div class="ledger-wrap"><table><thead><tr><th>Date</th><th>Where</th><th>What</th><th>Order</th><th class="num">Amount</th><th>Via</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'}
function render(){
 const opened=[...$('product-grid').querySelectorAll('.product-details[open]')].map(d=>d.closest('[data-id]').dataset.id);
 const focus=document.activeElement;const focusKey=focus?.dataset.id, focusAction=focus?.dataset.action;
 const effSort=(filters.view==='purchased'&&filters.sort==='suggested')?'recent':filters.sort;const result=C.sortProducts(products.filter(p=>C.matches(p,filters,saved.items)),effSort);
 $('board-nav').innerHTML=navHTML();if($('category-dialog').open)$('drawer-nav').innerHTML=navHTML(false);
 $('page-title').textContent=title();document.title=title()+' · 761 University';
 $('page-description').textContent=(filters.category||filters.group)?(filters.view==='all'?'All the options and favourites, together.':viewNames[filters.view]+' in this category.'):{all:'One place for every piece, from furniture to everyday essentials.',review:'The pieces you have yet to review.',favourites:'Everything you have hearted, including the former Product ideas collection.',purchased:'Products on this board marked as purchased.',hidden:'The pieces you have set aside. Restore any you want to reconsider.'}[filters.view];
 $('result-count').textContent=result.length+' '+(result.length===1?'product':'products')+(filters.q?' matching “'+filters.q+'”':'')+(result.length>limit?' · showing '+Math.min(limit,result.length):'');
 $('clear-filters').hidden=!(filters.q||filters.category||filters.group||filters.view!=='all');
 $('latest').hidden=!!(filters.q||filters.category||filters.group||filters.view!=='all');
 const guide=filters.category&&catalog.guides[filters.category];const guideKey=filters.category||'';
 const roomView=!!guide&&categoryMap.get(filters.category)?.group==='rooms';
 $('main').classList.toggle('room-view',roomView);
 $('main').querySelector('.toolbar').hidden=roomView;
 $('main').querySelector('.results-line').hidden=roomView;
 $('mobile-view').hidden=roomView;
 if(roomView)$('page-description').textContent='Room plans, proposals and shared design notes.';
 $('category-guide').querySelector('summary').textContent=roomView?'Room plans & proposals':'Room fit & comparison notes';
 if($('category-guide').dataset.key!==guideKey){$('category-guide').open=roomView;$('category-guide').dataset.key=guideKey;}
 $('category-guide').hidden=!guide;$('guide-content').innerHTML=guide||'';if(guide&&filters.category&&(!result.length||(categoryMap.get(filters.category)||{}).group==='rooms'))$('category-guide').open=true;
 $('product-grid').hidden=roomView&&!result.length;
 $('product-grid').innerHTML=result.length?result.slice(0,limit).map(cardHTML).join(''):'<div class="empty-state"><h2>No pieces here yet.</h2><p>Try a different category, view or search.</p><button class="clear-button" data-action="clear">Show all products</button></div>';
 for(const id of opened){const card=$('product-grid').querySelector('[data-id="'+id+'"] .product-details');if(card)card.open=true;}
 {const sp=$('spend-summary'),lg=$('ledger');if(sp&&lg){const show=filters.view==='purchased'&&!filters.category&&!filters.group&&!filters.q;sp.hidden=!show;lg.hidden=!show;if(show){sp.innerHTML=spendHTML();lg.innerHTML=ledgerHTML();}}}
 $('load-more').hidden=result.length<=limit;$('load-more').textContent='Show '+Math.min(30,result.length-limit)+' more';
 $('categories-open').setAttribute('aria-label','Browse categories'+(filters.category?': '+categoryMap.get(filters.category).name:''));
 if(focusKey&&focusAction){const replacement=$('product-grid').querySelector('button[data-id="'+focusKey+'"][data-action="'+focusAction+'"]');if(replacement)replacement.focus({preventScroll:true});}
}
function toast(message,undo=false){clearTimeout(toastTimer);$('toast').innerHTML=esc(message)+(undo?' <button data-action="undo" style="margin-left:12px;background:transparent;border:0;color:inherit;text-decoration:underline">Undo</button>':'');$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,undo?8000:5000)}
function changeProduct(id,delta,message){const p=byId.get(id);if(!p)return;const previous=C.stateFor(p,saved.items);undoAction={id,previous};saved.items[id]={...previous,...delta,updatedAt:new Date().toISOString()};persist();render();toast(message,true)}
function closeCategories(){if($('category-dialog').open)$('category-dialog').close();}
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches('.category-group')){if(d.open)openGroups.add(d.dataset.group);else openGroups.delete(d.dataset.group)}},true);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const {action,value,id}=b.dataset;const p=byId.get(id),s=p&&C.stateFor(p,saved.items);
 if(action==='view'){navigate({view:value,category:'',group:'',q:''});closeCategories();}
 if(action==='category'){navigate({category:value,group:'',...(categoryMap.get(value)?.group==='rooms'?{view:'all',q:''}:{})});closeCategories();}
 if(action==='room-section')document.getElementById(value)?.scrollIntoView({behavior:'auto',block:'start'});
 if(action==='group'){navigate({group:value,category:''});closeCategories();}
 if(action==='latest-search'){navigate({category:b.dataset.category||'',group:'',view:'all',q:value,sort:'suggested'});}
 if(action==='latest'){navigate({category:value,group:'',view:'all',q:'',sort:'suggested'});}
 if(action==='clear')navigate({view:'all',category:'',group:'',q:'',sort:'suggested'});
 if(action==='favourite'&&p)changeProduct(id,{review:s.review==='favourite'?'review':'favourite'},s.review==='favourite'?'Removed from favourites.':'Added to favourites.');
 if(action==='hide'&&p)changeProduct(id,{review:'hidden'},'Moved to Hidden.');
 if(action==='restore'&&p)changeProduct(id,{review:'review'},'Restored to the board.');
 if(action==='purchase'&&p)changeProduct(id,{purchased:!s.purchased,review:s.review==='hidden'?'review':s.review},s.purchased?'Purchased mark removed.':'Marked as purchased.');
 if(action==='undo'&&undoAction){saved.items[undoAction.id]={...undoAction.previous,updatedAt:new Date().toISOString()};persist();undoAction=null;render();toast('Change undone.');}
 if(action==='photo'&&p){$('lightbox-image').src=p.imageFull||p.image;$('lightbox-image').alt=p.alt;$('lightbox-caption').textContent=p.name;$('lightbox').showModal();}
 if(action==='export')exportBackup();if(action==='import')$('import-file').click();
});
$('search').addEventListener('input',()=>navigate({q:$('search').value},{replace:true}));
$('sort').addEventListener('change',()=>navigate({sort:$('sort').value}));
$('mobile-view').addEventListener('change',()=>navigate({view:$('mobile-view').value,category:'',group:'',q:''}));
$('clear-filters').onclick=()=>navigate({view:'all',category:'',group:'',q:'',sort:'suggested'});
$('load-more').onclick=()=>{limit+=30;render()};
$('categories-open').onclick=()=>{$('drawer-nav').innerHTML=navHTML(false);$('category-dialog').showModal()};
$('categories-close').onclick=closeCategories;$('lightbox-close').onclick=()=>$('lightbox').close();
for(const id of ['category-dialog','lightbox'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close()}});
function exportBackup(){
 const items=Object.fromEntries(products.map(p=>[p.id,{...C.stateFor(p,saved.items),name:p.name}]));
 const data={version:1,exportedAt:new Date().toISOString(),items,legacySnapshots:Object.fromEntries(legacyKeys.map(k=>[k,readStorage(k)]))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='761-review-board-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Decision backup downloaded.');
}
$('import-file').onchange=async()=>{try{const file=$('import-file').files[0];if(!file)return;const payload=JSON.parse(await file.text());const result=C.importItems(products,payload,saved.items);if(!result.count)throw new Error('No matching decisions');saved.items=result.items;persist();render();toast('Restored decisions for '+result.count+' products.');}catch(e){toast('This file does not contain a valid decision backup for this board.');}finally{$('import-file').value=''}};
window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
window.addEventListener('storage',e=>{if(e.key===KEY){const next=readStorage(KEY);if(next.version===1&&next.items){saved=next;render()}}});
route();if(migrated.migrated)toast('Your saved favourites and hidden items are here.');
})();
