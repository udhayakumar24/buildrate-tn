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
| 🧮 Construction calculator | 3 modes: **Material estimate** (area, quality tier, floors, wall material) · **Builder rate** — enter the builder's ₹/sq.ft, pick Ground/G+1/G+2/G+3 and per-floor area → total construction cost **plus a keep-aside budget for compound wall, EB connection, borewell, water sump, septic tank, plan approval, site works + 5% contingency**, with % of construction and total project cost · **Home Loan EMI** with free-entry dp/tenure and a (month, amount) prepayment schedule, year-wise amortization |
| 🏗️ Builders directory | **32 real Chennai-area builders** (compiled from company websites, Justdial & Sulekha, Sep 2026) with package rates ₹1,550–₹2,500/sq.ft, phones, websites, inclusions + 9 sample listings in other TN cities — filter by city & package type |

## Project layout

```
buildrate-tn/
├── app.py                 # zero-dependency server (http.server) + JSON API
├── data/
│   ├── materials.json     # 31 materials: prices, brands, specs, keywords
│   ├── stores.json        # 14 stores: contact, hours, per-material prices
│   └── builders.json      # 41 builders (32 real Chennai + 9 samples): rates, contacts, inclusions
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
