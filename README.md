# Vurata Market

Order builder for Vurata Market (fresh, frozen and pantry delivery in Bali). Live at https://market.vurata.com

- `index.html` is generated: `python3 tools/build.py` (from `src/template.html`, `src/catalog_public.json` and the latest published customer ledger).
- Customers open the site. Staff sign in at `/#staff`.
- Data lives in Supabase (row level security: customers can only read the published sell-price ledger). Supplier names, contacts and cost prices are never stored in this repo.
