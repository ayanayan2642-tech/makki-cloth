# Makki Cloth — Professional Kids Clothing Store

Makki Cloth v2 is a refreshed premium kidswear storefront using a forest-green, warm-ivory and champagne-gold theme, editorial-style stock photography, responsive product cards and subtle motion. It keeps the Node.js backend, JSON database, Cash on Delivery checkout, WhatsApp follow-up and admin panel.

## v5 Advanced look
- Separate pages: `#/collections`, `#/collection/Festive`, `#/product/101`, `#/favorites`
- Product page: colour swatches, size, quantity, WhatsApp order, share, related items
- 4 colour themes (switcher in header), animated flowing background, marquee, 3D card tilt
- WhatsApp: 923120025195. Facebook: set `FACEBOOK_URL` in .env (or in `public/pages.js`) and the buttons appear.
- Colour swatches use an automatic palette and do not change the demo photo.

## v3 International upgrade
- Currency switcher (PKR, USD, EUR, GBP, AED, SAR, CAD, AUD) and English/Urdu (RTL) switcher
- Country-aware checkout: email, country, postal code, discount codes (`WELCOME10`, `EID500`), live shipping quote from the server
- Order tracking, size guide, newsletter signup saved to database (`/api/admin/subscribers`), policies page
- SEO: JSON-LD, sitemap.xml, robots.txt, shareable product links (`/#product-101`)
- Security: rate limiting, timing-safe admin login, security headers
- Edit `RATES`, `SHIPPING` and `COUPONS` near the top of `server.js` (or set `CURRENCY_RATES`, `SITE_URL` in .env). Exchange rates are display estimates; orders are always recorded in PKR.
- Online card payments (e.g. Stripe) are NOT included yet: international orders are confirmed manually, then paid by payment link/bank transfer.

## Included
- Refreshed premium storefront with improved typography, spacing, color system and responsive layout
- Editorial stock photos from Unsplash used as temporary demo imagery (not Makki Cloth product photography)
- New theme overrides in `public/upgrade.css`, separated so the core stylesheet remains easier to maintain
- Kids clothing starter catalogue: Boys, Girls and Newborn; Everyday, Festive, Essentials and Sale collections
- Working **Show all products** button next to Collections; resets filters, search and sorting and scrolls to the full catalogue
- Search, collection filters, sorting, product detail modal, size selection, wishlist and shopping cart
- Customer checkout form with name, phone, city and address
- Cash on Delivery order saved in the database; WhatsApp follow-up opens after saving when a real WhatsApp number is configured
- Admin dashboard for products, prices, sizes, stock and order status
- Stock is checked and reduced when an order is saved; cancellation returns the stock

## Run in VS Code
Requirements: Node.js 18 or newer.

1. Extract this ZIP into a folder.
2. Open that folder in VS Code.
3. Choose **Terminal → New Terminal**.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open the store: `http://localhost:3000`
6. Open admin: `http://localhost:3000/admin.html`

## Local admin login
- Username: `admin`
- Password: `ChangeThisPassword123!`

Change this password and session secret before publishing. Production mode now refuses to start if the default admin password or default session secret is still being used. PowerShell example for the current terminal:

```powershell
$env:ADMIN_USERNAME="your-admin-name"
$env:ADMIN_PASSWORD="a-long-unique-password"
$env:SESSION_SECRET="put-a-long-random-secret-here"
$env:WHATSAPP_NUMBER="923XXXXXXXXX"
npm start
```

Use your real WhatsApp number in international digits-only format, for example `923001234567` (replace it with your own number). The example number is only a placeholder and must not be used for real customer orders.

## Database
The server creates `data/store.json` automatically on first start. It stores the products, inventory and orders on the same computer/server. Back it up regularly. This is a beginner-friendly starter database; a larger live shop should use a production database and persistent session storage.

## Photo note
The demo imagery is loaded from Unsplash image URLs, so the browser needs an internet connection to display it. These are inspiration/editorial images, not guaranteed to represent the exact garment, fabric, fit or available size. Use your own product photos or images you have permission to use for a real store.

## Important before going live
- Starter product names, prices, stock and images are demo/sample data. The remote Unsplash photos are editorial placeholders, not verified photos of the products for sale. Replace them with your actual Makki Cloth catalogue and exact product photos in Admin before taking real orders.
- Set the correct WhatsApp number and change default admin credentials.
- Add your actual delivery fees, delivery policy, exchange/return policy and privacy policy.
- Test sample orders and inventory before accepting real customers.
- This version supports Cash on Delivery and WhatsApp follow-up, not online card/bank payments.
- The backend needs Node.js hosting and persistent storage. Static-only GitHub Pages cannot run this backend.
