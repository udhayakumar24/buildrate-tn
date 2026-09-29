# BuildRate TN 🏗️

A mobile-style web app showing **current market prices of construction materials** and **store details** across Tamil Nadu — with full **English ⇄ தமிழ்** switching.

Built with **pure Python standard library** — zero dependencies, nothing to install.

## Run it

```bash
python3 app.py
# → http://localhost:8000
```

## What's inside

| Feature | Details |
|---|---|
| 📊 Material prices | 31 materials across 8 categories (cement, TMT steel, M-sand/P-sand, blue metal, bricks & blocks, tiles, paint, plumbing/electrical) with low–high range, state average, and change % |
| 📈 8-week trend | Auto-generated price trend chart per material |
| 🏪 Store details | 14 sample stores across Chennai, Coimbatore, Madurai, Trichy, Salem, Erode, Tirunelveli & Vellore — address, phone (tap-to-call), hours, delivery, and their per-material prices vs state average |
| 🔍 Search & filter | By material, store, city, or category — Tamil names searchable too |
| 🇮🇳 Bilingual UI | One tap switches the entire interface between English and Tamil |
| ❤️ Favourites | Save materials & stores (persists in the browser) |
| 🧮 Construction calculator | Material estimate (built-up area, quality tier, floors, wall material) + **Home Loan EMI calculator** (cost, down payment, rate, tenure → EMI, total interest, principal-vs-interest split) |
| 🏗️ Builders directory | 12 sample builders across 7 TN cities with turnkey / semi-turnkey / labour package rates (₹550–₹2,800 per sq.ft), inclusions, service areas — filter by city & package type |

## Project layout

```
buildrate-tn/
├── app.py                 # zero-dependency server (http.server) + JSON API
├── data/
│   ├── materials.json     # 31 materials: prices, brands, specs, keywords
│   ├── stores.json        # 14 stores: contact, hours, per-material prices
│   └── builders.json      # 12 builders: package rates, inclusions, service areas
└── static/
    ├── index.html         # app shell (phone-frame layout)
    ├── css/style.css      # mobile-first styling
    └── js/app.js          # hash-routed SPA, i18n, favourites
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/meta` | categories, cities, counts |
| `GET /api/materials?q=&category=` | material list (with trend history) |
| `GET /api/materials/<slug>` | detail + brands + stores selling it |
| `GET /api/stores?q=&city=` | store list |
| `GET /api/stores/<slug>` | store detail + priced material list |
| `GET /api/builders?q=&city=&type=` | builder list |
| `GET /api/builders/<slug>` | builder detail (rate, inclusions, contact) |

## Updating prices

Just edit `data/materials.json` or `data/stores.json` and refresh — files are
re-read on every API request, no restart needed. The 8-week trend charts are
synthesized server-side from `price_avg` + `change_pct`.

## ⚠️ Data disclaimer

Prices are **indicative**, compiled from public market references (Sep 2026).
Material rates change daily by city, brand, grade and load size — always confirm
with your dealer. Store listings are **sample data** for demonstration and
should be replaced with real dealer data before any production use.
