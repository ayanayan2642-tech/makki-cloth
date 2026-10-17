const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
const SESSION_SECRET = process.env.SESSION_SECRET || "please-change-this-session-secret-before-deploying";
if (process.env.NODE_ENV === "production" && (ADMIN_PASSWORD === "ChangeThisPassword123!" || SESSION_SECRET === "please-change-this-session-secret-before-deploying")) {
  console.error("Production startup blocked: set a unique ADMIN_PASSWORD and SESSION_SECRET in environment variables.");
  process.exit(1);
}
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");
const PUBLIC_DIR = path.join(__dirname, "public");

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": "camera=(), microphone=(), geolocation=()" });
  if (process.env.NODE_ENV === "production") res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
});
const hits = new Map();
function limit(max, windowMs) {
  return (req, res, next) => {
    const key = req.ip + req.path, now = Date.now();
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    recent.push(now); hits.set(key, recent); next();
  };
}
setInterval(() => hits.clear(), 60 * 60 * 1000).unref();
const safeEq = (a, b) => crypto.timingSafeEqual(crypto.createHash("sha256").update(String(a)).digest(), crypto.createHash("sha256").update(String(b)).digest());

// ---- International settings (all prices are stored in PKR) ----
// Exchange rates are DISPLAY estimates only. Update them regularly or set CURRENCY_RATES='{"USD":0.0036,...}'.
const RATES = Object.assign({ PKR: 1, USD: 0.0036, EUR: 0.0033, GBP: 0.0028, AED: 0.0132, SAR: 0.0135, CAD: 0.0050, AUD: 0.0055 }, JSON.parse(process.env.CURRENCY_RATES || "{}"));
const SHIPPING = { homeCountry: "PK", homeFee: 250, homeFreeOver: 5000, intlFee: 4500, intlFreeOver: 25000 };
const COUPONS = { WELCOME10: { type: "percent", value: 10, min: 2000 }, EID500: { type: "flat", value: 500, min: 4000 } };
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "makki.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));

const starterProducts = [
  { id: 101, name: "Little Explorer Cotton Set", category: "Boys", collection: "Everyday", price: 1499, oldPrice: 1799, sizes: ["3-6m","6-12m","1-2y","3-4y","5-6y"], stock: 20, label: "BESTSELLER", image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=85", description: "Soft, easy-wear cotton set for everyday adventures.", active: true },
  { id: 102, name: "Blossom Printed Outfit", category: "Girls", collection: "Everyday", price: 1699, oldPrice: null, sizes: ["1-2y","3-4y","5-6y","7-8y"], stock: 16, label: "NEW", image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=85", description: "A cheerful outfit with a comfortable fit for little days out.", active: true },
  { id: 103, name: "Mini Classic Kurta Set", category: "Boys", collection: "Festive", price: 2199, oldPrice: 2499, sizes: ["1-2y","3-4y","5-6y","7-8y","9-10y"], stock: 12, label: "FESTIVE", image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85", description: "A neat traditional-inspired look for family gatherings and celebrations.", active: true },
  { id: 104, name: "Soft Start Newborn Gift Set", category: "Newborn", collection: "Essentials", price: 2499, oldPrice: null, sizes: ["Newborn","0-3m","3-6m"], stock: 10, label: "GIFT IDEA", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85", description: "A thoughtful newborn set for welcoming a little one.", active: true },
  { id: 105, name: "Everyday Denim Duo", category: "Boys", collection: "Essentials", price: 1899, oldPrice: null, sizes: ["3-4y","5-6y","7-8y","9-10y","11-12y"], stock: 18, label: "", image: "https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=85", description: "Versatile everyday styling with easy-to-pair basics.", active: true },
  { id: 106, name: "Petal Party Dress", category: "Girls", collection: "Festive", price: 2799, oldPrice: 3199, sizes: ["1-2y","3-4y","5-6y","7-8y"], stock: 8, label: "LIMITED", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85", description: "A special-occasion look with a graceful, playful feel.", active: true },
  { id: 107, name: "Tiny Comfort Romper", category: "Newborn", collection: "Essentials", price: 999, oldPrice: null, sizes: ["Newborn","0-3m","3-6m","6-9m"], stock: 24, label: "SOFT COTTON", image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=85", description: "An easy one-piece for everyday comfort and cuddles.", active: true },
  { id: 108, name: "Weekend Colourblock Set", category: "Boys", collection: "Everyday", price: 1599, oldPrice: null, sizes: ["3-4y","5-6y","7-8y","9-10y","11-12y"], stock: 15, label: "", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85", description: "A relaxed matching set made for play and weekends.", active: true },
  { id: 109, name: "Little Star Tunic Set", category: "Girls", collection: "Essentials", price: 1799, oldPrice: 1999, sizes: ["1-2y","3-4y","5-6y","7-8y","9-10y"], stock: 14, label: "POPULAR", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85", description: "A versatile set for school holidays, outings and family visits.", active: true },
  { id: 110, name: "Little Gentleman Waistcoat Set", category: "Boys", collection: "Festive", price: 2999, oldPrice: null, sizes: ["1-2y","3-4y","5-6y","7-8y","9-10y"], stock: 7, label: "OCCASION", image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85", description: "A dressed-up look for Eid, weddings and memorable family moments.", active: true },
  { id: 111, name: "Playday Everyday Tee", category: "Boys", collection: "Sale", price: 799, oldPrice: 1099, sizes: ["3-4y","5-6y","7-8y","9-10y","11-12y"], stock: 30, label: "SALE", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", description: "A comfortable everyday tee that pairs with almost anything.", active: true },
  { id: 112, name: "Sweet Day Cotton Dress", category: "Girls", collection: "Sale", price: 1299, oldPrice: 1699, sizes: ["1-2y","3-4y","5-6y","7-8y"], stock: 11, label: "SALE", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85", description: "A light and easy dress for bright, busy days.", active: true }
];

function ensureDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ products: starterProducts, orders: [], nextProductId: 113, nextOrderId: 1001 }, null, 2));
  }
}
function readDB() {
  ensureDatabase();
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch (error) {
    console.error("Database file could not be read:", error.message);
    throw new Error("Store database is unavailable.");
  }
}
function writeDB(db) {
  const tempFile = DB_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
  fs.renameSync(tempFile, DB_FILE);
}
function publicProduct(product) {
  const { active, ...safe } = product;
  return safe;
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please log in to the admin panel." });
}
function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}
function validPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10000000;
}

app.get("/api/config", (req, res) => {
  res.json({ whatsappNumber: process.env.WHATSAPP_NUMBER || "923120025195", currency: "PKR", storeName: "Makki Cloth", rates: RATES, shipping: SHIPPING, stripe: false, facebookUrl: process.env.FACEBOOK_URL || "" });
});
app.get("/api/products", (req, res) => {
  const db = readDB();
  const products = db.products.filter(p => p.active !== false).map(publicProduct);
  res.set("Cache-Control", "no-store");
  res.json(products);
});
function priceOrder(db, items, countryRaw, couponRaw) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) return { error: "Your cart is empty or contains too many items." };
  const normalizedItems = [];
  for (const item of items) {
    const product = db.products.find(p => p.id === Number(item.id) && p.active !== false);
    const qty = Math.floor(Number(item.qty));
    const [size, colorRaw = ""] = cleanText(item.size, 60).split(" · ");
    const color = cleanText(colorRaw, 30);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20 || !product.sizes.includes(size)) return { error: "One of your cart items is no longer available. Please refresh and try again." };
    if (product.stock < qty) return { error: `${product.name} has only ${product.stock} item(s) in stock.` };
    normalizedItems.push({ id: product.id, name: product.name, size, color, qty, unitPrice: product.price, lineTotal: product.price * qty });
  }
  const subtotal = normalizedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const country = cleanText(countryRaw || SHIPPING.homeCountry, 2).toUpperCase();
  const domestic = country === SHIPPING.homeCountry;
  const code = cleanText(couponRaw, 30).toUpperCase();
  let discount = 0;
  if (code) {
    const c = COUPONS[code];
    if (!c) return { error: "This discount code is not valid." };
    if (subtotal < (c.min || 0)) return { error: `This code needs a minimum order of Rs. ${c.min}.` };
    discount = c.type === "percent" ? Math.round(subtotal * c.value / 100) : Math.min(c.value, subtotal);
  }
  const after = subtotal - discount;
  const delivery = after >= (domestic ? SHIPPING.homeFreeOver : SHIPPING.intlFreeOver) ? 0 : (domestic ? SHIPPING.homeFee : SHIPPING.intlFee);
  return { items: normalizedItems, subtotal, discount, coupon: code || null, delivery, total: after + delivery, country, domestic };
}
app.post("/api/quote", limit(120, 3600000), (req, res) => {
  const q = priceOrder(readDB(), req.body?.items, req.body?.country, req.body?.coupon);
  if (q.error) return res.status(400).json({ error: q.error });
  const { items, ...totals } = q; res.json(totals);
});
app.post("/api/orders", limit(20, 3600000), (req, res) => {
  const { customer, items, paymentMethod } = req.body || {};
  if (!customer || !cleanText(customer.name, 100) || !cleanText(customer.phone, 30) || !cleanText(customer.address, 400)) {
    return res.status(400).json({ error: "Please enter your name, phone number and delivery address." });
  }
  const db = readDB();
  const q = priceOrder(db, items, customer.country, customer.coupon);
  if (q.error) return res.status(400).json({ error: q.error });
  const email = cleanText(customer.email, 120);
  if (!q.domestic && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email address for international orders." });
  const order = {
    id: db.nextOrderId++, createdAt: new Date().toISOString(), status: "New",
    customer: { name: cleanText(customer.name, 100), phone: cleanText(customer.phone, 30), email, address: cleanText(customer.address, 400), city: cleanText(customer.city, 80), postal: cleanText(customer.postal, 20), country: q.country, notes: cleanText(customer.notes, 500) },
    paymentMethod: q.domestic ? (paymentMethod === "WhatsApp" ? "WhatsApp confirmation" : "Cash on Delivery") : "International - payment link/bank transfer after confirmation",
    items: q.items, subtotal: q.subtotal, discount: q.discount, coupon: q.coupon, delivery: q.delivery, total: q.total
  };
  for (const item of q.items) db.products.find(p => p.id === item.id).stock -= item.qty;
  db.orders.unshift(order);
  writeDB(db);
  res.status(201).json({ message: "Order saved successfully.", order });
});
app.get("/api/orders/track", limit(30, 3600000), (req, res) => {
  const order = readDB().orders.find(o => o.id === Number(req.query.id));
  const digits = s => String(s || "").replace(/\D/g, "").slice(-7);
  if (!order || digits(order.customer.phone) !== digits(req.query.phone) || digits(req.query.phone).length < 7) return res.status(404).json({ error: "We could not find an order with those details." });
  res.json({ id: order.id, status: order.status, createdAt: order.createdAt, items: order.items, total: order.total, delivery: order.delivery });
});
app.post("/api/newsletter", limit(10, 3600000), (req, res) => {
  const email = cleanText(req.body?.email, 120).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
  const db = readDB(); db.subscribers = db.subscribers || [];
  if (!db.subscribers.some(s => s.email === email)) { db.subscribers.push({ email, at: new Date().toISOString() }); writeDB(db); }
  res.json({ ok: true });
});
app.get("/api/admin/subscribers", requireAdmin, (req, res) => res.json(readDB().subscribers || []));
app.get("/robots.txt", (req, res) => res.type("text/plain").send(`User-agent: *\nDisallow: /admin.html\nDisallow: /api/\nSitemap: ${SITE_URL || req.protocol + "://" + req.get("host")}/sitemap.xml\n`));
app.get("/sitemap.xml", (req, res) => {
  const base = SITE_URL || req.protocol + "://" + req.get("host");
  const urls = [base + "/", base + "/policies.html", ...readDB().products.filter(p => p.active !== false).map(p => `${base}/#/product/${p.id}`)];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u}</loc></url>`).join("")}</urlset>`);
});

app.post("/api/admin/login", limit(10, 15 * 60 * 1000), (req, res) => {
  const username = cleanText(req.body?.username, 100);
  const password = String(req.body?.password ?? "");
  if (!safeEq(username, ADMIN_USERNAME) || !safeEq(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  req.session.isAdmin = true;
  req.session.username = username;
  req.session.save(() => res.json({ ok: true, username }));
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/admin/me", (req, res) => {
  res.json({ loggedIn: Boolean(req.session?.isAdmin), username: req.session?.username || null });
});
app.get("/api/admin/products", requireAdmin, (req, res) => res.json(readDB().products));
app.post("/api/admin/products", requireAdmin, (req, res) => {
  const input = req.body || {};
  if (!cleanText(input.name, 120) || !validPrice(input.price) || !cleanText(input.image, 1000)) {
    return res.status(400).json({ error: "Product name, valid price and image URL are required." });
  }
  const sizes = Array.isArray(input.sizes) ? input.sizes.map(s => cleanText(s, 30)).filter(Boolean).slice(0, 20) : [];
  if (!sizes.length) return res.status(400).json({ error: "Add at least one size." });
  const db = readDB();
  const product = {
    id: db.nextProductId++, name: cleanText(input.name, 120), category: cleanText(input.category || "Boys", 40),
    collection: cleanText(input.collection || "Everyday", 40), price: Number(input.price),
    oldPrice: validPrice(input.oldPrice) && Number(input.oldPrice) > Number(input.price) ? Number(input.oldPrice) : null,
    sizes, stock: Math.max(0, Math.floor(Number(input.stock) || 0)), label: cleanText(input.label, 40),
    image: cleanText(input.image, 1000), description: cleanText(input.description, 500), active: input.active !== false
  };
  db.products.unshift(product); writeDB(db); res.status(201).json(product);
});
app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found." });
  const input = req.body || {};
  if (input.name !== undefined) product.name = cleanText(input.name, 120);
  if (input.category !== undefined) product.category = cleanText(input.category, 40);
  if (input.collection !== undefined) product.collection = cleanText(input.collection, 40);
  if (input.price !== undefined) {
    if (!validPrice(input.price)) return res.status(400).json({ error: "Price must be a valid positive amount." });
    product.price = Number(input.price);
  }
  if (input.oldPrice !== undefined) product.oldPrice = validPrice(input.oldPrice) && Number(input.oldPrice) > product.price ? Number(input.oldPrice) : null;
  if (input.sizes !== undefined && Array.isArray(input.sizes)) product.sizes = input.sizes.map(s => cleanText(s, 30)).filter(Boolean).slice(0, 20);
  if (input.stock !== undefined) product.stock = Math.max(0, Math.floor(Number(input.stock) || 0));
  if (input.label !== undefined) product.label = cleanText(input.label, 40);
  if (input.image !== undefined) product.image = cleanText(input.image, 1000);
  if (input.description !== undefined) product.description = cleanText(input.description, 500);
  if (input.active !== undefined) product.active = Boolean(input.active);
  writeDB(db); res.json(product);
});
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found." });
  product.active = false; writeDB(db); res.json({ ok: true });
});
app.get("/api/admin/orders", requireAdmin, (req, res) => res.json(readDB().orders));
app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found." });
  const allowed = ["New", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body?.status)) return res.status(400).json({ error: "Invalid order status." });
  if (req.body.status === "Cancelled" && order.status !== "Cancelled") {
    for (const item of order.items) {
      const product = db.products.find(p => p.id === item.id);
      if (product) product.stock += item.qty;
    }
  }
  order.status = req.body.status; writeDB(db); res.json(order);
});
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const db = readDB();
  res.json({
    products: db.products.filter(p => p.active !== false).length,
    orders: db.orders.length,
    newOrders: db.orders.filter(o => o.status === "New").length,
    revenue: db.orders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + o.total, 0)
  });
});

app.use(express.static(PUBLIC_DIR));
app.get("*", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

app.listen(PORT, () => {
  ensureDatabase();
  console.log(`Makki Cloth is running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
  if (ADMIN_PASSWORD === "ChangeThisPassword123!") console.warn("IMPORTANT: Change the default admin password before putting this store online.");
});
