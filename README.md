# Vurata Market

Phone-first grocery ordering for Bali: fresh fruit and vegetables, meat, frozen food and pantry staples, delivered to villas and homes. Live at https://market.vurata.com

Customers build one order, see the total worked out, and send it on WhatsApp. Behind it, staff get the same order split into one message per supplier, in Bahasa or English.

## What it does

- **One order, one delivery, one payment.** Customers never see a split basket. Items are grouped by supplier only on the staff side.
- **Weight-based pricing.** Items sold by the kilo can be ordered in 0.1 kg steps, with a per-100 g line to compare against shop labels.
- **Delivery days that follow the basket.** Supplier rest days and order cutoffs are built into the date picker, so each line shows exactly when it arrives and whether it comes chilled or frozen.
- **Hand-off options.** The order goes out as a WhatsApp message, a PDF receipt or a QR code, and customers can pay by QRIS.
- **Staff tools.** Staff sign in at `/#staff` to manage prices, delivery rules and customer orders.
- **Works offline.** Installable as a web app with a service worker.

## How it is built

A static site with no framework: the whole app is one HTML template.

- `src/template.html` is the app (markup, styles and script).
- `src/catalog_public.json` is the public product catalog.
- `python3 tools/build.py` combines the template, the catalog and the latest published sell-price ledger into `index.html`, and stamps `sw.js`.
- Hosted on GitHub Pages at the domain in `CNAME`.
- Data lives in Supabase with row level security: customers can only read the published sell-price ledger. Supplier names, contacts and cost prices are never stored in this repo.

## Build

```bash
python3 tools/build.py
```
