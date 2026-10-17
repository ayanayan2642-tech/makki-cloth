/* Makki Cloth — international layer: currency, language (EN/UR), country-aware checkout,
   order tracking, size guide, SEO data. Loaded after script.js. */
(() => {
  const LOCALES = { PKR: "en-PK", USD: "en-US", EUR: "de-DE", GBP: "en-GB", AED: "en-AE", SAR: "en-SA", CAD: "en-CA", AUD: "en-AU" };
  const COUNTRIES = { PK: "Pakistan", AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", OM: "Oman", BH: "Bahrain", GB: "United Kingdom", IE: "Ireland", US: "United States", CA: "Canada", AU: "Australia", NZ: "New Zealand", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", BE: "Belgium", SE: "Sweden", NO: "Norway", DK: "Denmark", CH: "Switzerland", TR: "Turkey", MY: "Malaysia", SG: "Singapore", BD: "Bangladesh", ZA: "South Africa" };
  const UR = {
    ".announcement span:first-child": "چھوٹے سائز، بڑی شخصیت",
    ".announcement-right": "ہر آرڈر میں ایک چھوٹی سی خوشی",
    "#mainNav a:nth-child(1)": "تمام مصنوعات", "#mainNav a:nth-child(2)": "کلیکشنز", "#mainNav a:nth-child(3)": "ہماری کہانی", "#mainNav a:nth-child(4)": "رابطہ",
    ".hero-description": "ننھے ستاروں کے لیے روزمرہ پسندیدہ، نئے انداز اور خاص مواقع کے ملبوسات۔",
    ".hero-buttons .button-gold": "نیا کلیکشن دیکھیں",
    '[data-filter="All"]': "تمام", '[data-filter="Everyday"]': "روزمرہ", '[data-filter="Festive"]': "تہوار", '[data-filter="Essentials"]': "بنیادی", '[data-filter="Sale"]': "سیل",
    "#checkoutButton": "محفوظ چیک آؤٹ", "#continueShopping2": "خریداری جاری رکھیں", ".cart-empty h3": "آپ کا بیگ خالی ہے",
    ".footer-column:nth-child(2) strong": "دریافت کریں", ".footer-column:nth-child(3) strong": "کسٹمر کیئر",
    ".floating-whatsapp span:last-child": "مدد چاہیے؟"
  };
  const URPH = { "#productSearch": "اپنا انداز تلاش کریں…" };
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  let RATES = { PKR: 1 }, SHIP = null, quoteTimer;

  function guessCurrency() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Karachi")) return "PKR"; if (tz.includes("Dubai")) return "AED"; if (tz.includes("Riyadh")) return "SAR";
    if (tz.includes("London")) return "GBP"; if (tz.startsWith("Australia")) return "AUD"; if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver")) return "CAD";
    if (tz.startsWith("Europe")) return "EUR"; return "USD";
  }
  function setText(el, text) {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!el.dataset.en) el.dataset.en = node ? node.nodeValue : el.textContent;
    if (node) node.nodeValue = text + " "; else el.textContent = text;
  }
  function applyLang(lang) {
    store.set("makkiLang", lang);
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ur", lang === "ur");
    for (const [sel, ur] of Object.entries(UR)) $$(sel).forEach(el => {
      if (lang === "ur") setText(el, ur); else if (el.dataset.en) setText(el, el.dataset.en.trim());
    });
    for (const [sel, ur] of Object.entries(URPH)) { const el = $(sel); if (el) { el.dataset.en = el.dataset.en || el.placeholder; el.placeholder = lang === "ur" ? ur : el.dataset.en; } }
  }
  function applyCurrency(code) {
    if (!RATES[code]) code = "PKR";
    store.set("makkiCurrency", code);
    CURRENCY = { code, rate: RATES[code], locale: LOCALES[code] || "en-US" };
    renderProducts(); renderCart(); refreshQuote();
  }

  function buildToolbar() {
    const box = document.createElement("div"); box.className = "intl-switch";
    box.innerHTML = `<select id="langSelect" aria-label="Language"><option value="en">EN</option><option value="ur">اردو</option></select>
      <select id="currencySelect" aria-label="Currency">${Object.keys(RATES).map(c => `<option>${c}</option>`).join("")}</select>`;
    $(".header-actions").prepend(box);
    $("#langSelect").value = store.get("makkiLang", "en"); $("#currencySelect").value = CURRENCY.code;
    $("#langSelect").onchange = e => applyLang(e.target.value);
    $("#currencySelect").onchange = e => applyCurrency(e.target.value);
  }

  /* ---- Checkout: email, country, postal code, discount code, live shipping quote ---- */
  function buildCheckout() {
    const form = $("#checkoutForm"), addr = $('[name="address"]', form).closest("label");
    const html = `<label>Email<input name="email" type="email" autocomplete="email" maxlength="120" placeholder="you@example.com"></label>
      <label>Country<select name="country" autocomplete="country">${Object.entries(COUNTRIES).map(([c, n]) => `<option value="${c}">${n}</option>`).join("")}</select></label>`;
    addr.insertAdjacentHTML("beforebegin", html);
    addr.insertAdjacentHTML("afterend", `<label>Postal / ZIP code<input name="postal" autocomplete="postal-code" maxlength="20" placeholder="Postal code"></label>
      <label>Discount code (optional)<input name="coupon" maxlength="30" autocapitalize="characters" placeholder="e.g. WELCOME10"></label>
      <div id="quoteBox" class="quote-box" aria-live="polite"></div>`);
    form.country.value = "PK";
    $('[name="phone"]', form).placeholder = "+92 3xx xxxxxxx";
    form.country.addEventListener("change", refreshQuote);
    form.coupon.addEventListener("input", () => { clearTimeout(quoteTimer); quoteTimer = setTimeout(refreshQuote, 500); });
    $("#checkoutButton").addEventListener("click", () => { if (cart.length) { form.country.value = form.country.value || "PK"; refreshQuote(); } });
  }
  async function refreshQuote() {
    const form = $("#checkoutForm"), box = $("#quoteBox"); if (!form || !box || !cart.length) return;
    const country = form.country.value, domestic = country === (SHIP?.homeCountry || "PK");
    const btn = $("#placeOrder");
    btn.firstChild.nodeValue = domestic ? "Place COD order " : "Place order ";
    $(".checkout-intro").textContent = domestic ? "Cash on Delivery · Your order is saved and you can confirm it with us on WhatsApp." : "International order · We confirm shipping and send a secure payment link or bank details by email/WhatsApp before dispatch.";
    form.email.required = !domestic;
    try {
      const q = await api("/api/quote", { method: "POST", body: JSON.stringify({ items: cart, country, coupon: form.coupon.value }) });
      box.className = "quote-box";
      box.innerHTML = `<div><span>Subtotal</span><b>${formatPrice(q.subtotal)}</b></div>${q.discount ? `<div><span>Discount (${q.coupon})</span><b>− ${formatPrice(q.discount)}</b></div>` : ""}
        <div><span>Shipping</span><b>${q.delivery ? formatPrice(q.delivery) : "Free"}</b></div><div class="quote-total"><span>Total</span><b>${formatPrice(q.total)}</b></div>
        ${CURRENCY.code !== "PKR" ? `<small>Prices are shown in ${CURRENCY.code} as an estimate. Your order is confirmed in PKR: Rs. ${q.total.toLocaleString("en-PK")}.</small>` : ""}`;
    } catch (e) { box.className = "quote-box quote-error"; box.textContent = e.message; }
  }

  /* ---- Order tracking + size guide dialogs ---- */
  function buildDialogs() {
    document.body.insertAdjacentHTML("beforeend", `
    <dialog class="product-dialog info-dialog" id="trackDialog" aria-label="Track your order"><button class="icon-button dialog-close" data-close aria-label="Close">×</button><div class="checkout-content"><p class="eyebrow">ORDER STATUS</p><h2>Track your <em>order</em></h2>
      <form id="trackForm" class="checkout-form"><label>Order number<input name="id" inputmode="numeric" required placeholder="e.g. 1001"></label><label>Phone number used at checkout<input name="phone" required placeholder="+92 3xx xxxxxxx"></label><button class="button button-green" type="submit">Track order</button></form><div id="trackResult" class="quote-box hidden"></div></div></dialog>
    <dialog class="product-dialog info-dialog" id="sizeDialog" aria-label="Size guide"><button class="icon-button dialog-close" data-close aria-label="Close">×</button><div class="checkout-content"><p class="eyebrow">FIND THE FIT</p><h2>Size <em>guide</em></h2>
      <div class="table-scroll"><table class="size-table"><thead><tr><th>Size</th><th>Approx. height</th></tr></thead><tbody>${[["Newborn", "up to 56 cm"], ["0-3m", "56–62 cm"], ["3-6m", "62–68 cm"], ["6-9m", "68–74 cm"], ["1-2y", "80–92 cm"], ["3-4y", "98–110 cm"], ["5-6y", "110–122 cm"], ["7-8y", "122–134 cm"], ["9-10y", "134–146 cm"], ["11-12y", "146–158 cm"]].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</tbody></table></div>
      <p class="checkout-intro">Approximate guide only — fit varies by style. If your child is between sizes, we suggest the larger size. Message us on WhatsApp and we'll help.</p></div></dialog>`);
    $$("dialog[id$=Dialog] [data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
    $$(".info-dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
    $("#trackForm").addEventListener("submit", async e => {
      e.preventDefault(); const f = new FormData(e.target), out = $("#trackResult"); out.classList.remove("hidden");
      try {
        const o = await api(`/api/orders/track?id=${encodeURIComponent(f.get("id"))}&phone=${encodeURIComponent(f.get("phone"))}`);
        out.className = "quote-box"; out.innerHTML = `<div><span>Order #${o.id}</span><b>${o.status}</b></div><div><span>Placed</span><b>${new Date(o.createdAt).toLocaleDateString()}</b></div><div><span>Items</span><b>${o.items.reduce((s, i) => s + i.qty, 0)}</b></div><div class="quote-total"><span>Total</span><b>${formatPrice(o.total)}</b></div>`;
      } catch (err) { out.className = "quote-box quote-error"; out.textContent = err.message; }
    });
    const col = $(".footer-column:nth-child(3)");
    col.insertAdjacentHTML("beforeend", `<a href="#" id="trackLink">Track your order</a><a href="#" id="sizeLink">Size guide</a>`);
    $("#trackLink").onclick = e => { e.preventDefault(); $("#trackDialog").showModal(); };
    $("#sizeLink").onclick = e => { e.preventDefault(); $("#sizeDialog").showModal(); };
    $(".size-picker > div").insertAdjacentHTML("beforeend", `<a href="#" class="size-guide-link" id="sizeGuideInline">Size guide</a>`);
    $("#sizeGuideInline").onclick = e => { e.preventDefault(); $("#sizeDialog").showModal(); };
  }

  /* ---- SEO structured data + shareable product links ---- */
  window.onStoreLoaded = (products, config) => {
    let tag = $("#productLd"); if (!tag) { tag = document.createElement("script"); tag.id = "productLd"; tag.type = "application/ld+json"; document.head.append(tag); }
    tag.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": products.map(p => ({ "@type": "Product", name: p.name, image: p.image, description: p.description, sku: String(p.id), brand: { "@type": "Brand", name: "Makki Cloth" }, offers: { "@type": "Offer", priceCurrency: "PKR", price: p.price, availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } })) });
    const m = location.hash.match(/^#product-(\d+)/); if (m && !window.__deepLinked) { window.__deepLinked = true; openProduct(m[1]); }
  };
  const _open = window.openProduct;
  window.openProduct = id => { _open(id); try { history.replaceState(null, "", "#product-" + id); } catch {} };
  $("#productDialog").addEventListener("close", () => { try { history.replaceState(null, "", location.pathname); } catch {} });

  async function init() {
    try { const c = await api("/api/config"); RATES = c.rates || RATES; SHIP = c.shipping; } catch {}
    const saved = store.get("makkiCurrency", guessCurrency());
    CURRENCY = { code: RATES[saved] ? saved : "PKR", rate: RATES[saved] || 1, locale: LOCALES[saved] || "en-PK" };
    const f = document.createElement("link"); f.rel = "stylesheet"; f.href = "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&display=swap"; document.head.append(f);
    buildToolbar(); buildCheckout(); buildDialogs();
    applyLang(store.get("makkiLang", "en")); renderProducts(); renderCart();
  }
  init();
})();
