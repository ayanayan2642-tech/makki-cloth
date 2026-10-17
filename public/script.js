/* Makki Cloth storefront demo.
   Replace the demo products/photos and WhatsApp number before publishing. */
let WHATSAPP_NUMBER = "923120025195"; // Set WHATSAPP_NUMBER in .env before publishing.
const DELIVERY_THRESHOLD = 5000;
let products = [];

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
let CURRENCY = { code: "PKR", rate: 1, locale: "en-PK" };
const formatPrice = value => new Intl.NumberFormat(CURRENCY.locale, { style: "currency", currency: CURRENCY.code, maximumFractionDigits: CURRENCY.code === "PKR" ? 0 : 2 }).format(Number(value) * CURRENCY.rate);
const safeRead = (key, fallback) => { try { const value=JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
let cart = safeRead("makkiClothCart", []);
let wishlist = safeRead("makkiClothWishlist", []);
let activeFilter = "All";
let currentProduct = null;
let selectedSize = "";
let toastTimer;

function saveState(){
  try {
    localStorage.setItem("makkiClothCart", JSON.stringify(cart));
    localStorage.setItem("makkiClothWishlist", JSON.stringify(wishlist));
  } catch { /* Storefront still works for the current session if storage is unavailable. */ }
}
function showToast(message){
  const toast=$("#toast"); toast.textContent=message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function whatsappUrl(message){
  const number=WHATSAPP_NUMBER.replace(/\D/g,"");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
function openWhatsApp(message){
  if(!WHATSAPP_NUMBER || WHATSAPP_NUMBER==="923001234567"){
    showToast("Please replace the demo WhatsApp number in script.js before publishing.");
    return;
  }
  window.open(whatsappUrl(message),"_blank","noopener,noreferrer");
}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[char]));}
function productById(id){ return products.find(product=>product.id===Number(id)); }
function api(path,options={}){return fetch(path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options}).then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"The store could not complete this request.");return data;});}
function resetProducts(){activeFilter="All";$("#productSearch").value="";$("#sortSelect").value="featured";renderProducts();$("#shop").scrollIntoView({behavior:"smooth",block:"start"});}

function productCard(product,index){
  const isSale=product.oldPrice && product.oldPrice>product.price;
  const wished=wishlist.includes(product.id);
  const outOfStock=Number(product.stock)<=0;
  return `<article class="product-card" style="animation-delay:${Math.min(index*45,350)}ms">
    <div class="product-image-wrap">
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)} — product photo" loading="lazy" onerror="this.src='https://placehold.co/600x800/f1ece2/123b32?text=Makki+Cloth'">
      <span class="product-label ${isSale?"sale-label":""}">${outOfStock?"Out of stock":escapeHTML(isSale?"Sale":product.label||"MAKKI CLOTH")}</span>
      <button class="product-wish ${wished?"selected":""}" data-wish="${product.id}" aria-label="${wished?"Remove from":"Add to"} wishlist">${wished?"♥":"♡"}</button>
      <button class="quick-view" data-quick="${product.id}">QUICK VIEW +</button>
    </div>
    <div class="product-info">
      <p class="product-category">${escapeHTML(product.audience||"Kids")} · ${escapeHTML(product.category)}</p>
      <div class="product-name-row"><h3 class="product-name">${escapeHTML(product.name)}</h3><div class="product-price">${isSale?`<span class="old-price">${formatPrice(product.oldPrice)}</span>`:""}${formatPrice(product.price)}</div></div>
      <p class="product-subtitle">${escapeHTML(product.subtitle)}</p>
      <button class="quick-add" data-quick="${product.id}">${outOfStock?"VIEW DETAILS":"VIEW DETAILS &amp; SIZES +"}</button>
    </div>
  </article>`;
}
function renderProducts(){
  const query=$("#productSearch").value.trim().toLowerCase();
  let visible=products.filter(product=>{
    const matchesFilter=activeFilter==="All" || (activeFilter==="Sale" ? product.oldPrice && product.oldPrice>product.price : product.category===activeFilter);
    const matchesQuery=!query || `${product.name} ${product.category} ${product.audience} ${product.subtitle} ${product.description}`.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  const sort=$("#sortSelect").value;
  if(sort==="low") visible.sort((a,b)=>a.price-b.price);
  else if(sort==="high") visible.sort((a,b)=>b.price-a.price);
  else if(sort==="name") visible.sort((a,b)=>a.name.localeCompare(b.name));
  else visible.sort((a,b)=>a.featured-b.featured);
  $("#productGrid").innerHTML=visible.map(productCard).join("");
  $("#resultsCount").textContent=`Showing ${visible.length} ${visible.length===1?"piece":"pieces"}`;
  $("#emptyState").classList.toggle("hidden",visible.length!==0);
  $("#productGrid").classList.toggle("hidden",visible.length===0);
  $$(".filter-tab").forEach(button=>button.classList.toggle("active",button.dataset.filter===activeFilter));
}
function setFilter(filter){
  activeFilter=filter; renderProducts();
  $("#shop").scrollIntoView({behavior:"smooth",block:"start"});
}
function openProduct(id){
  const product=productById(id); if(!product)return;
  currentProduct=product; selectedSize="";
  $("#dialogImage").src=product.image; $("#dialogImage").alt=product.name+" product photo";
  $("#dialogLabel").textContent=product.label||"MAKKI CLOTH";
  $("#dialogCategory").textContent=`${product.audience||"Kids"} · ${product.category}`;
  $("#sizeHelp").textContent=Number(product.stock)>0?`${product.stock} in stock`:"Currently out of stock";
  $("#dialogAdd").disabled=Number(product.stock)<=0;
  $("#dialogName").textContent=product.name;
  $("#dialogPrice").innerHTML=product.oldPrice && product.oldPrice>product.price ? `<span class="old-price">${formatPrice(product.oldPrice)}</span> ${formatPrice(product.price)}` : formatPrice(product.price);
  $("#dialogDescription").textContent=product.description;
  $("#sizeOptions").innerHTML=product.sizes.map(size=>`<button class="size-option" data-size="${size}" aria-pressed="false">${size}</button>`).join("");
  $("#sizeError").classList.add("hidden");
  $("#dialogWish").classList.toggle("selected",wishlist.includes(product.id));
  $("#dialogWish").textContent=wishlist.includes(product.id)?"♥":"♡";
  $("#productDialog").showModal();
}
function addToCart(product,size){
  if(Number(product.stock)<=0){showToast("This item is currently out of stock.");return;}
  const existing=cart.find(item=>item.id===product.id && item.size===size);
  if(existing) existing.qty+=1; else cart.push({id:product.id,size,qty:1});
  saveState(); renderCart(); renderProducts(); updateCounts();
  showToast(`${product.name} added to your bag`);
}
function updateCounts(){
  $("#cartCount").textContent=cart.reduce((sum,item)=>sum+item.qty,0);
  $("#wishCount").textContent=wishlist.length;
}
function renderCart(){
  cart=cart.filter(item=>productById(item.id));saveState();
  const count=cart.reduce((sum,item)=>sum+item.qty,0);
  const subtotal=cart.reduce((sum,item)=>sum+(productById(item.id)?.price||0)*item.qty,0);
  $("#drawerItemCount").textContent=`(${count})`;
  $("#cartItems").innerHTML=cart.map(item=>{
    const product=productById(item.id); if(!product)return "";
    return `<div class="cart-line"><img src="${product.image}" alt="${product.name}" loading="lazy"><div><h3>${product.name}</h3><small>Size: ${item.size}</small><div class="cart-line-price">${formatPrice(product.price)}</div><div class="qty-control"><button data-qty="${item.id}|${item.size}|-1" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button data-qty="${item.id}|${item.size}|1" aria-label="Increase quantity">+</button></div></div><button class="remove-item" data-remove="${item.id}|${item.size}" aria-label="Remove ${product.name}">×</button></div>`;
  }).join("");
  $("#cartEmpty").classList.toggle("hidden",count!==0);
  $("#cartFooter").classList.toggle("hidden",count===0);
  $("#cartSubtotal").textContent=formatPrice(subtotal);
  const progress=Math.min(100,subtotal/DELIVERY_THRESHOLD*100);
  $("#deliveryProgress").style.width=`${progress}%`;
  $("#deliveryMessage").textContent=subtotal>=DELIVERY_THRESHOLD?"You've reached complimentary delivery!":`Add ${formatPrice(DELIVERY_THRESHOLD-subtotal)} more for complimentary delivery.`;
  updateCounts();
}
function toggleWishlist(id){
  id=Number(id);
  if(wishlist.includes(id)){wishlist=wishlist.filter(item=>item!==id);showToast("Removed from your wishlist");}
  else{wishlist.push(id);showToast("Saved to your wishlist");}
  saveState();renderProducts();updateCounts();
  if(currentProduct?.id===id){$("#dialogWish").classList.toggle("selected",wishlist.includes(id));$("#dialogWish").textContent=wishlist.includes(id)?"♥":"♡";}
}
function openCart(){
  $("#cartDrawer").classList.add("open");$("#cartDrawer").setAttribute("aria-hidden","false");
  $("#backdrop").classList.remove("hidden");document.body.classList.add("panel-open");
}
function closeCart(){
  $("#cartDrawer").classList.remove("open");$("#cartDrawer").setAttribute("aria-hidden","true");
  $("#backdrop").classList.add("hidden");document.body.classList.remove("panel-open");
}
function orderMessage(){
  const lines=cart.map(item=>{const product=productById(item.id);return `• ${product.name} | Size: ${item.size} | Qty: ${item.qty} | ${formatPrice(product.price*item.qty)}`;});
  const subtotal=cart.reduce((sum,item)=>sum+(productById(item.id)?.price||0)*item.qty,0);
  return `Assalam-o-Alaikum Makki Cloth! I would like to place an order:\n\n${lines.join("\n")}\n\nSubtotal: ${formatPrice(subtotal)}\nDelivery: Please confirm\n\nPlease confirm availability, delivery charges and payment details.`;
}

$("#filterTabs").addEventListener("click",event=>{const button=event.target.closest("[data-filter]");if(button)setFilter(button.dataset.filter);});
$("#productGrid").addEventListener("click",event=>{
  const quick=event.target.closest("[data-quick]");const wish=event.target.closest("[data-wish]");
  if(quick)openProduct(quick.dataset.quick);
  if(wish){event.stopPropagation();toggleWishlist(wish.dataset.wish);}
});
$("#productSearch").addEventListener("input",renderProducts);
$("#sortSelect").addEventListener("change",renderProducts);
$("#clearFilters").addEventListener("click",resetProducts);
$("#resetSearch").addEventListener("click",resetProducts);
$("#viewAllFromCollections").addEventListener("click",resetProducts);
$("#shopAllTop").addEventListener("click",resetProducts);
$("#searchToggle").addEventListener("click",()=>{$("#shop").scrollIntoView({behavior:"smooth"});setTimeout(()=>$("#productSearch").focus(),350);});
$("#cartToggle").addEventListener("click",openCart);
$("#closeCart").addEventListener("click",closeCart);
$("#backdrop").addEventListener("click",closeCart);
$("#continueShopping").addEventListener("click",closeCart);
$("#continueShopping2").addEventListener("click",closeCart);
$("#cartItems").addEventListener("click",event=>{
  const qtyButton=event.target.closest("[data-qty]");const removeButton=event.target.closest("[data-remove]");
  if(qtyButton){
    const [id,size,delta]=qtyButton.dataset.qty.split("|");const item=cart.find(entry=>entry.id===Number(id)&&entry.size===size);
    if(item){item.qty+=Number(delta);if(item.qty<=0)cart=cart.filter(entry=>entry!==item);}
    saveState();renderCart();renderProducts();
  }
  if(removeButton){const [id,size]=removeButton.dataset.remove.split("|");cart=cart.filter(item=>!(item.id===Number(id)&&item.size===size));saveState();renderCart();renderProducts();showToast("Item removed from your bag");}
});
$("#productDialog").addEventListener("click",event=>{
  if(event.target===event.currentTarget)$("#productDialog").close();
});
$("#closeProduct").addEventListener("click",()=>$("#productDialog").close());
$("#sizeOptions").addEventListener("click",event=>{
  const button=event.target.closest("[data-size]");if(!button)return;
  selectedSize=button.dataset.size;
  $$(".size-option").forEach(option=>{option.classList.toggle("selected",option===button);option.setAttribute("aria-pressed",option===button?"true":"false");});
  $("#sizeError").classList.add("hidden");
});
$("#dialogAdd").addEventListener("click",()=>{
  if(!currentProduct)return;
  if(!selectedSize){$("#sizeError").classList.remove("hidden");return;}
  addToCart(currentProduct,selectedSize);$("#productDialog").close();
});
$("#dialogWish").addEventListener("click",()=>{if(currentProduct)toggleWishlist(currentProduct.id);});
function openCheckout(){
  if(!cart.length){showToast("Your bag is empty");return;}
  const subtotal=cart.reduce((sum,item)=>sum+(productById(item.id)?.price||0)*item.qty,0);
  $("#checkoutSummary").innerHTML=cart.map(item=>{const p=productById(item.id);return `<div>${escapeHTML(p.name)} · ${escapeHTML(item.size)} × ${item.qty} — ${formatPrice(p.price*item.qty)}</div>`;}).join("")+`<div class="summary-total"><span>Order total</span><strong>${formatPrice(subtotal)}</strong></div>`;
  $("#checkoutError").classList.add("hidden");$("#checkoutDialog").showModal();
}
$("#checkoutButton").addEventListener("click",openCheckout);
$("#closeCheckout").addEventListener("click",()=>$("#checkoutDialog").close());
$("#checkoutForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!cart.length){showToast("Your bag is empty");return;}
  const form=new FormData(event.currentTarget);const customer={name:form.get("name"),phone:form.get("phone"),city:form.get("city"),address:form.get("address"),notes:form.get("notes"),email:form.get("email"),country:form.get("country"),postal:form.get("postal"),coupon:form.get("coupon")};
  const button=$("#placeOrder");button.disabled=true;button.textContent="Saving order…";$("#checkoutError").classList.add("hidden");
  try{
    const result=await api("/api/orders",{method:"POST",body:JSON.stringify({customer,items:cart,paymentMethod:"Cash on Delivery"})});const order=result.order;
    const message=`Assalam-o-Alaikum Makki Cloth! I placed COD order #${order.id}.\nName: ${order.customer.name}\nPhone: ${order.customer.phone}\nAddress: ${order.customer.address}, ${order.customer.city||""}\n${order.items.map(item=>`• ${item.name} | Size ${item.size}${item.color?" · "+item.color:""} | Qty ${item.qty} | ${formatPrice(item.lineTotal)}`).join("\n")}\nTotal: ${formatPrice(order.total)}\nPayment: ${order.paymentMethod}\nPlease confirm my order and delivery charges.`;
    cart=[];saveState();renderCart();$("#checkoutDialog").close();event.currentTarget.reset();showToast(`Order #${order.id} saved successfully.`);
    if(WHATSAPP_NUMBER&&WHATSAPP_NUMBER!=="923001234567")window.open(whatsappUrl(message),"_blank","noopener,noreferrer");else showToast(`Order #${order.id} saved. Set your real WhatsApp number in .env to open WhatsApp.`);
    await loadStore();
  }catch(error){$("#checkoutError").textContent=error.message;$("#checkoutError").classList.remove("hidden");}
  finally{button.disabled=false;button.innerHTML="Place COD order <span>↗</span>";}
});
$("#wishlistToggle").addEventListener("click",()=>{location.hash="#/favorites";});
$("#floatingWhatsApp").addEventListener("click",()=>openWhatsApp("Assalam-o-Alaikum Makki Cloth! I have a question about your collection."));
$("#footerWhatsApp").addEventListener("click",event=>{
  event.preventDefault();openWhatsApp("Assalam-o-Alaikum Makki Cloth! I would like to ask about your products.");
});
$("#newsletterForm").addEventListener("submit",async event=>{
  event.preventDefault();
  try{await api("/api/newsletter",{method:"POST",body:JSON.stringify({email:$("#newsletterEmail").value.trim()})});event.target.reset();showToast("Thank you! You're on the list.");}
  catch(error){showToast(error.message);}
});
$$(".category-card").forEach(card=>card.addEventListener("click",()=>setFilter(card.dataset.category)));
$("#menuToggle").addEventListener("click",()=>{
  const open=$("#mainNav").classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded",String(open));
});
$$(".main-nav a").forEach(link=>link.addEventListener("click",()=>{$("#mainNav").classList.remove("open");$("#menuToggle").setAttribute("aria-expanded","false");}));
$("#year").textContent=new Date().getFullYear();

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}});
},{threshold:.12});
$$(".reveal").forEach(element=>observer.observe(element));

async function loadStore(){
  try{
    const [rawProducts,config]=await Promise.all([api("/api/products"),api("/api/config")]);
    WHATSAPP_NUMBER=config.whatsappNumber||WHATSAPP_NUMBER;
    products=rawProducts.map((p,index)=>({...p,audience:p.category||"Kids",category:p.collection||"Everyday",subtitle:p.description||"Comfortable styles for little ones",featured:index+1}));
    cart=cart.filter(item=>products.some(p=>p.id===Number(item.id)));wishlist=wishlist.filter(id=>products.some(p=>p.id===Number(id)));saveState();
    renderProducts();renderCart();updateCounts();
    if(window.onStoreLoaded)window.onStoreLoaded(products,config);
  }catch(error){$("#resultsCount").textContent="Store could not connect to its backend. Start it with npm start.";showToast("Please start the Makki Cloth server first.");console.error(error);}
}
loadStore();
