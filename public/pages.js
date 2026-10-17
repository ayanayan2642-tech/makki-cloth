/* Makki Cloth — separate pages (hash routes): collections, collection, product, favourites.
   Also: themes, Facebook link, 3D card tilt, scroll progress. Loaded after script.js + international.js. */
(() => {
  const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100064055644283"; // paste your Facebook page link here (or set FACEBOOK_URL in .env)
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PALETTE = [["Forest", "#1f5a46"], ["Navy", "#1d2f5c"], ["Blush", "#f2b8c6"], ["Sand", "#d9c3a0"], ["Sky", "#8ec5ee"], ["Coral", "#f26b5b"], ["Mustard", "#e3b341"], ["Lilac", "#b9a3e3"]];
  const U = (id, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
  const COLLECTIONS = [
    { k: "Everyday", t: "Everyday Icons", d: "Soft, easy outfits for play, school and every day in between.", img: "photo-1519238263530-99bdd11df2ea" },
    { k: "Festive", t: "Celebration Edit", d: "Eid, weddings and family moments — dressed up and ready to shine.", img: "photo-1516627145497-ae6968895b74" },
    { k: "Essentials", t: "Little Essentials", d: "Timeless basics and newborn must-haves, made for comfort.", img: "photo-1503919005314-30d93d07d823" },
    { k: "Sale", t: "Sale", d: "Favourite pieces at friendlier prices while stock lasts.", img: "photo-1521572163474-6864f9cf17ab" }
  ];
  let FB = FACEBOOK_URL, cv = { aud: "All", sort: "featured" }, pv = { color: 0, size: "", qty: 1 };
  const E = escapeHTML;
  const colorsFor = p => Array.isArray(p.colors) && p.colors.length ? p.colors.map(c => (Array.isArray(c) ? c : [c.n || c.name, c.h || c.hex])) : [0, 1, 2, 3].map(k => PALETTE[(p.id * 3 + k * 2) % 8]);
  const inColl = (p, k) => k === "Sale" ? p.oldPrice && p.oldPrice > p.price : p.category === k;
  const root = document.createElement("section"); root.id = "viewRoot"; root.className = "view-root hidden"; $("main").append(root);

  const grid = list => list.length ? `<div class="product-grid">${list.map(productCard).join("")}</div>` : `<div class="empty-state"><span>⌕</span><h3>Nothing here yet</h3><p>Try another collection.</p><a class="button button-dark" href="#/collections">Browse collections</a></div>`;
  const crumbs = (...c) => `<nav class="crumbs"><a href="#top">Home</a>${c.map(x => ` <i>/</i> ${x}`).join("")}</nav>`;

  function viewCollections() {
    document.title = "Collections — Makki Cloth";
    return `${crumbs("Collections")}<h1 class="view-title">Our <em>collections</em></h1><div class="coll-grid">${COLLECTIONS.map((c, i) => {
      const n = products.filter(p => inColl(p, c.k)).length;
      return `<a class="coll-card fx" style="animation-delay:${i * 90}ms" href="#/collection/${c.k}"><img src="${U(c.img, 1000)}" alt="" loading="lazy"><span class="coll-shade"></span><span class="coll-text"><small>${n} PIECES</small><strong>${c.t}</strong><em>${c.d}</em><b>Explore →</b></span></a>`;
    }).join("")}</div>`;
  }
  function collectionGrid(k) {
    let list = products.filter(p => inColl(p, k) && (cv.aud === "All" || p.audience === cv.aud));
    if (cv.sort === "low") list.sort((a, b) => a.price - b.price); else if (cv.sort === "high") list.sort((a, b) => b.price - a.price);
    return grid(list);
  }
  function viewCollection(k) {
    const c = COLLECTIONS.find(x => x.k === k); if (!c) return viewCollections();
    document.title = `${c.t} — Makki Cloth`;
    const auds = ["All", ...new Set(products.filter(p => inColl(p, k)).map(p => p.audience))];
    return `${crumbs(`<a href="#/collections">Collections</a>`, c.t)}<header class="coll-hero fx" style="background-image:url(${U(c.img, 1800)})"><div><p class="eyebrow light-eyebrow"><span></span> COLLECTION</p><h1>${c.t}</h1><p>${c.d}</p></div></header>
      <div class="coll-bar"><div class="chips">${auds.map(a => `<button class="chip ${a === cv.aud ? "on" : ""}" data-aud="${a}">${a}</button>`).join("")}</div>
      <select id="cvSort" aria-label="Sort"><option value="featured">Featured</option><option value="low" ${cv.sort === "low" ? "selected" : ""}>Price: low to high</option><option value="high" ${cv.sort === "high" ? "selected" : ""}>Price: high to low</option></select></div>
      <div id="cvGrid">${collectionGrid(k)}</div>`;
  }
  function viewFavorites() {
    document.title = "Favourites — Makki Cloth";
    const list = products.filter(p => wishlist.includes(p.id));
    return `${crumbs("Favourites")}<h1 class="view-title">Your <em>favourites</em> ♥</h1>${list.length ? `<div class="fav-actions"><button class="button button-green" id="favShare">Send list on WhatsApp <span>↗</span></button><button class="text-link dark-link" id="favClear">Clear all</button></div>${grid(list)}` : `<div class="empty-state"><span>♡</span><h3>No favourites yet</h3><p>Tap the heart on any outfit to save it here.</p><a class="button button-dark" href="#/collections">Start exploring</a></div>`}`;
  }
  function viewProduct(id) {
    const p = productById(id); if (!p) return `<div class="empty-state"><h3>Product not found</h3><a class="button button-dark" href="#/collections">Back to collections</a></div>`;
    document.title = `${p.name} — Makki Cloth`;
    pv = { color: 0, size: "", qty: 1 };
    const cols = colorsFor(p), sale = p.oldPrice && p.oldPrice > p.price, off = sale ? Math.round((1 - p.price / p.oldPrice) * 100) : 0, fav = wishlist.includes(p.id);
    const coll = COLLECTIONS.find(c => c.k === p.category), rel = products.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
    return `${crumbs(`<a href="#/collections">Collections</a>`, `<a href="#/collection/${E(p.category)}">${E(coll ? coll.t : p.category)}</a>`, E(p.name))}
    <div class="pp" style="--glow:${cols[0][1]}">
      <div class="pp-media fx"><div class="pp-glow"></div><img id="ppImg" src="${E(p.image)}" alt="${E(p.name)}" onerror="this.src='https://placehold.co/700x900/f1ece2/123b32?text=Makki+Cloth'">${sale ? `<span class="pp-badge">−${off}%</span>` : p.label ? `<span class="pp-badge">${E(p.label)}</span>` : ""}</div>
      <div class="pp-info fx">
        <p class="eyebrow">${E(p.audience)} · ${E(coll ? coll.t : p.category)}</p><h1>${E(p.name)}</h1>
        <div class="pp-price">${sale ? `<s>${formatPrice(p.oldPrice)}</s>` : ""}<b>${formatPrice(p.price)}</b>${sale ? `<span class="save">Save ${off}%</span>` : ""}</div>
        <p class="pp-desc">${E(p.description)}</p>
        <div class="pp-row"><strong>Colour: <span id="ppColorName">${cols[0][0]}</span></strong><div class="swatches">${cols.map((c, i) => `<button class="sw ${i ? "" : "selected"}" data-color="${i}" style="--c:${c[1]}" aria-label="${c[0]}" title="${c[0]}"></button>`).join("")}</div></div>
        <div class="pp-row"><strong>Size <a href="#" id="ppSizeGuide" class="size-guide-link">Size guide</a></strong><div class="size-options">${p.sizes.map(s => `<button class="size-option pp-size" data-size="${E(s)}">${E(s)}</button>`).join("")}</div><p class="size-error hidden" id="ppErr">Please choose a size first.</p></div>
        <div class="pp-row"><strong>Quantity</strong><div class="qty-control big"><button id="qMinus" aria-label="Less">−</button><span id="qVal">1</span><button id="qPlus" aria-label="More">+</button></div><small class="stock ${p.stock > 0 && p.stock <= 5 ? "low" : ""}">${p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Out of stock"}</small></div>
        <div class="pp-actions"><button class="button button-green" id="ppAdd" ${p.stock <= 0 ? "disabled" : ""}>Add to bag <span>↗</span></button><button class="icon-button pp-fav ${fav ? "selected" : ""}" id="ppFav" aria-label="Favourite">${fav ? "♥" : "♡"}</button></div>
        <button class="button button-wa" id="ppWa">Order this on WhatsApp <span>↗</span></button>
        <ul class="pp-perks"><li>✦ Ships worldwide · free shipping on larger orders</li><li>✦ Easy WhatsApp support for size &amp; availability</li><li>✦ Share: <a href="#" id="ppShare">copy link</a></li></ul>
      </div></div>
    ${rel.length ? `<h2 class="view-sub">You may also <em>love</em></h2>${grid(rel)}` : ""}`;
  }

  function route() {
    const m = location.hash.match(/^#\/(collections|collection|product|favorites)(?:\/([^/?]+))?/), home = $$("main > *").filter(e => e !== root);
    if (!m) {
      root.classList.add("hidden"); home.forEach(e => e.classList.remove("view-hide")); document.title = "Makki Cloth — Kids Clothing Store";
      const t = location.hash.length > 1 && !location.hash.startsWith("#/") ? $(location.hash) : null; if (t) requestAnimationFrame(() => t.scrollIntoView()); return;
    }
    home.forEach(e => e.classList.add("view-hide")); root.classList.remove("hidden");
    if (!products.length) { root.innerHTML = `<div class="empty-state"><h3>Loading…</h3></div>`; return; }
    const [, v, arg] = m;
    root.innerHTML = v === "collections" ? viewCollections() : v === "collection" ? viewCollection(decodeURIComponent(arg || "")) : v === "favorites" ? viewFavorites() : viewProduct(arg);
    root.dataset.view = v; root.dataset.arg = arg || ""; window.scrollTo(0, 0);
  }
  const rerender = () => { if (!root.classList.contains("hidden")) { const y = scrollY; route(); scrollTo(0, y); } };

  /* events inside the view root */
  root.addEventListener("click", e => {
    const t = e.target, q = t.closest("[data-quick]"), w = t.closest("[data-wish]");
    if (w) { e.preventDefault(); toggleWishlist(w.dataset.wish); return; }
    if (q) { location.hash = `#/product/${q.dataset.quick}`; return; }
    if (t.closest(".product-image-wrap") && !t.closest("button")) { const c = t.closest(".product-card"), b = $("[data-quick]", c); if (b) location.hash = `#/product/${b.dataset.quick}`; return; }
    const chip = t.closest("[data-aud]"); if (chip) { cv.aud = chip.dataset.aud; rerender(); return; }
    const p = productById(root.dataset.arg);
    const sw = t.closest(".sw");
    if (sw) { pv.color = +sw.dataset.color; const c = colorsFor(p)[pv.color]; $$(".sw", root).forEach(x => x.classList.toggle("selected", x === sw)); $("#ppColorName").textContent = c[0]; $(".pp").style.setProperty("--glow", c[1]); return; }
    const sz = t.closest(".pp-size"); if (sz) { pv.size = sz.dataset.size; $$(".pp-size", root).forEach(x => x.classList.toggle("selected", x === sz)); $("#ppErr").classList.add("hidden"); return; }
    if (t.closest("#qPlus")) { pv.qty = Math.min(10, pv.qty + 1); $("#qVal").textContent = pv.qty; return; }
    if (t.closest("#qMinus")) { pv.qty = Math.max(1, pv.qty - 1); $("#qVal").textContent = pv.qty; return; }
    if (t.closest("#ppSizeGuide")) { e.preventDefault(); $("#sizeDialog")?.showModal(); return; }
    if (t.closest("#ppFav")) { _tw(p.id); const on = wishlist.includes(p.id), b = $("#ppFav"); b.classList.toggle("selected", on); b.textContent = on ? "♥" : "♡"; return; }
    if (t.closest("#ppShare")) { e.preventDefault(); (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => showToast("Link copied"), () => showToast(location.href)); return; }
    const need = () => { if (!pv.size) { $("#ppErr").classList.remove("hidden"); return false; } return true; };
    const label = () => `${pv.size} · ${colorsFor(p)[pv.color][0]}`;
    if (t.closest("#ppAdd") && need()) {
      const key = label(), ex = cart.find(i => i.id === p.id && i.size === key); if (ex) ex.qty += pv.qty; else cart.push({ id: p.id, size: key, qty: pv.qty });
      saveState(); renderCart(); renderProducts(); updateCounts(); showToast(`${p.name} added to your bag`); openCart(); return;
    }
    if (t.closest("#ppWa") && need()) { openWhatsApp(`Assalam-o-Alaikum Makki Cloth! I'd like to order:\n${p.name}\nSize: ${pv.size} | Colour: ${colorsFor(p)[pv.color][0]} | Qty: ${pv.qty}\nPrice: ${formatPrice(p.price)} each\n${location.href}`); return; }
    if (t.closest("#favShare")) { openWhatsApp(`Assalam-o-Alaikum Makki Cloth! My favourites:\n${products.filter(x => wishlist.includes(x.id)).map(x => `• ${x.name} — ${formatPrice(x.price)}`).join("\n")}\nPlease share availability.`); return; }
    if (t.closest("#favClear")) { wishlist = []; saveState(); renderProducts(); updateCounts(); rerender(); }
  });
  root.addEventListener("change", e => { if (e.target.id === "cvSort") { cv.sort = e.target.value; $("#cvGrid").innerHTML = collectionGrid(root.dataset.arg); } });

  /* overrides so the rest of the site uses pages instead of the old popup / filters */
  window.openProduct = id => { location.hash = `#/product/${id}`; };
  window.setFilter = f => { location.hash = f === "All" ? "#shop" : `#/collection/${f}`; };
  const _tw = window.toggleWishlist; window.toggleWishlist = id => { _tw(id); rerender(); };
  const prev = window.onStoreLoaded; window.onStoreLoaded = (ps, cfg) => { prev && prev(ps, cfg); if (cfg && cfg.facebookUrl) FB = cfg.facebookUrl; setFb(); route(); };
  addEventListener("hashchange", route);
  function setFb() { $$("[data-fb]").forEach(a => { if (FB) a.href = FB; a.classList.toggle("hidden", !FB); }); }

  /* themes */
  const themes = [["royal", "#1b2a6b"], ["forest", "#173f34"], ["blush", "#b0407a"], ["sunset", "#d9541f"]];
  const setTheme = t => { document.body.dataset.theme = t; try { localStorage.setItem("makkiTheme", t); } catch {} $$(".theme-dot").forEach(d => d.classList.toggle("on", d.dataset.t === t)); };
  const dots = document.createElement("div"); dots.className = "theme-dots"; dots.setAttribute("aria-label", "Colour theme");
  dots.innerHTML = themes.map(([t, c]) => `<button class="theme-dot" data-t="${t}" style="--c:${c}" aria-label="${t} theme" title="${t}"></button>`).join("");
  dots.onclick = e => { const b = e.target.closest("[data-t]"); if (b) setTheme(b.dataset.t); };
  $(".header-actions").prepend(dots); let saved = "royal"; try { saved = localStorage.getItem("makkiTheme") || "royal"; } catch {} setTheme(saved);

  /* 3D tilt + scroll progress */
  if (matchMedia("(hover:hover)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches)
    document.addEventListener("pointermove", e => { const c = e.target.closest?.(".product-card,.coll-card,.category-card"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 8 + "deg"); c.style.setProperty("--rx", (.5 - (e.clientY - r.top) / r.height) * 8 + "deg"); });
  document.addEventListener("pointerout", e => { const c = e.target.closest?.(".product-card,.coll-card,.category-card"); if (c) { c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); } });
  addEventListener("scroll", () => { $("#scrollBar").style.width = (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100) + "%"; }, { passive: true });
  setFb(); route();
})();
