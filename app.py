#!/usr/bin/env python3
"""
BuildRate TN — Construction material prices & store details for Tamil Nadu.
Mobile-style web app served by a zero-dependency Python server (stdlib only).

Run:  python3 app.py        (serves on http://0.0.0.0:8000)

Data lives in data/materials.json and data/stores.json — files are re-read
on every API request, so you can edit prices and refresh without restarting.
"""
import hashlib
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")
STATIC_DIR = os.path.join(BASE, "static")
PORT = int(os.environ.get("PORT", "8000"))

CATEGORIES = [
    {"id": "cement", "name": "Cement & RMC", "name_ta": "சிமெண்ட் & RMC"},
    {"id": "steel", "name": "Steel & TMT", "name_ta": "இரும்பு & TMT"},
    {"id": "sand", "name": "Sand", "name_ta": "மணல்"},
    {"id": "aggregates", "name": "Aggregates", "name_ta": "நீலக்கல்"},
    {"id": "bricks-blocks", "name": "Bricks & Blocks", "name_ta": "செங்கல் & பிளாக்"},
    {"id": "tiles", "name": "Tiles & Stone", "name_ta": "ஓடு & கல்"},
    {"id": "paint", "name": "Paint", "name_ta": "பெயிண்ட்"},
    {"id": "plumbing", "name": "Plumbing & Electrical", "name_ta": "குழாய் & மின்"},
]

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
}


# ---------------------------------------------------------------- data layer
def _load(fname):
    with open(os.path.join(DATA_DIR, fname), encoding="utf-8") as f:
        return json.load(f)


def get_data():
    """Fresh read on every request so data edits show up live."""
    return _load("materials.json"), _load("stores.json")


def _round_like(v, ref):
    if ref >= 2000:
        return round(v / 10.0) * 10
    if ref >= 100:
        return int(round(v))
    return round(v * 2) / 2  # keep halves for cheap items (e.g. bricks)


def synth_history(slug, price_avg, change_pct, points=8):
    """Deterministic, plausible 8-week trend that ends at price_avg."""
    digest = hashlib.sha256(slug.encode("utf-8")).digest()
    start = price_avg / (1.0 + change_pct / 100.0) if change_pct else price_avg
    vals = []
    for i in range(points):
        t = i / (points - 1)
        base = start + (price_avg - start) * t
        j = int.from_bytes(digest[i * 2:i * 2 + 2], "big") / 65535.0 - 0.5
        vals.append(_round_like(base * (1.0 + j * 0.05), price_avg))
    vals[-1] = price_avg
    return vals


def material_summary(m):
    return {
        "slug": m["slug"],
        "name": m["name"],
        "name_ta": m["name_ta"],
        "category": m["category"],
        "unit": m["unit"],
        "unit_ta": m["unit_ta"],
        "price_low": m["price_low"],
        "price_high": m["price_high"],
        "price_avg": m["price_avg"],
        "change_pct": m["change_pct"],
        "updated": m.get("updated"),
        "history": synth_history(m["slug"], m["price_avg"], m["change_pct"]),
    }


def store_summary(s):
    return {
        "slug": s["slug"],
        "name": s["name"],
        "area": s["area"],
        "city": s["city"],
        "rating": s["rating"],
        "reviews": s["reviews"],
        "delivery": s["delivery"],
        "categories": s["categories"],
        "stock_count": len(s["materials"]),
    }


def store_detail(s, materials_by_slug):
    rows = []
    for slug, price in s["materials"].items():
        m = materials_by_slug.get(slug)
        if not m:
            continue
        avg = m["price_avg"]
        rows.append({
            "slug": slug,
            "name": m["name"],
            "name_ta": m["name_ta"],
            "unit": m["unit"],
            "unit_ta": m["unit_ta"],
            "price": price,
            "avg": avg,
            "delta_pct": round((price - avg) / avg * 100.0, 1) if avg else 0.0,
        })
    rows.sort(key=lambda r: r["name"])
    d = store_summary(s)
    d.update({
        "address": s["address"],
        "phone": s["phone"],
        "hours": s["hours"],
        "since": s.get("since"),
        "materials": rows,
    })
    return d


def material_detail(m, stores):
    d = material_summary(m)
    sellers = []
    for s in stores:
        price = s["materials"].get(m["slug"])
        if price is None:
            continue
        sellers.append({
            "slug": s["slug"],
            "name": s["name"],
            "area": s["area"],
            "city": s["city"],
            "rating": s["rating"],
            "phone": s["phone"],
            "price": price,
            "delta_pct": round((price - m["price_avg"]) / m["price_avg"] * 100.0, 1),
        })
    sellers.sort(key=lambda s: s["price"])
    d.update({
        "brands": m.get("brands", []),
        "specs": m.get("specs", ""),
        "uses": m.get("uses", ""),
        "note": m.get("note", ""),
        "gst_note": m.get("gst_note", ""),
        "keywords": m.get("keywords", []),
        "stores": sellers,
    })
    return d


# ------------------------------------------------------------------ routing
def api_meta(mdoc, sdoc):
    materials = mdoc["materials"]
    counts = {}
    for m in materials:
        counts[m["category"]] = counts.get(m["category"], 0) + 1
    return {
        "updated": mdoc.get("updated"),
        "note": mdoc.get("note", ""),
        "categories": [dict(c, count=counts.get(c["id"], 0)) for c in CATEGORIES],
        "cities": sorted({s["city"] for s in sdoc["stores"]}),
        "material_count": len(materials),
        "store_count": len(sdoc["stores"]),
    }


def api_materials(mdoc, sdoc, query):
    q = (query.get("q") or [""])[0].strip().lower()
    cat = (query.get("category") or [""])[0].strip()
    out = []
    for m in mdoc["materials"]:
        if cat and m["category"] != cat:
            continue
        if q:
            hay = " ".join([
                m["name"], m["name_ta"], m["category"],
                " ".join(m.get("keywords", [])),
            ]).lower()
            if q not in hay:
                continue
        out.append(material_summary(m))
    return {"count": len(out), "materials": out}


def api_stores(mdoc, sdoc, query):
    q = (query.get("q") or [""])[0].strip().lower()
    city = (query.get("city") or [""])[0].strip()
    out = []
    for s in sdoc["stores"]:
        if city and s["city"] != city:
            continue
        if q:
            hay = " ".join([s["name"], s["area"], s["city"], " ".join(s["categories"])]).lower()
            if q not in hay:
                continue
        out.append(store_summary(s))
    return {"count": len(out), "stores": out}


class Handler(BaseHTTPRequestHandler):
    server_version = "BuildRateTN/1.0"

    # ----- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, root, relpath, fallback_404=False):
        path = os.path.realpath(os.path.join(root, relpath))
        if not path.startswith(os.path.realpath(root) + os.sep) or not os.path.isfile(path):
            if fallback_404:
                self.send_json({"error": "not found"}, 404)
            else:
                self.send_json({"error": "not found"}, 404)
            return
        ext = os.path.splitext(path)[1].lower()
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store" if ext in (".html", ".css", ".js") else "max-age=3600")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # keep logs tidy
        pass

    # ----- GET
    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        try:
            if path.startswith("/api/"):
                self.handle_api(path, parse_qs(parsed.query))
            elif path in ("/", "/index.html"):
                self.send_file(STATIC_DIR, "index.html")
            elif path.startswith("/static/"):
                self.send_file(STATIC_DIR, path[len("/static/"):])
            else:
                self.send_json({"error": "not found", "path": path}, 404)
        except BrokenPipeError:
            pass
        except Exception as exc:  # never crash the server on a bad request
            self.send_json({"error": "internal error", "detail": str(exc)}, 500)

    def handle_api(self, path, query):
        mdoc, sdoc = get_data()
        by_slug = {m["slug"]: m for m in mdoc["materials"]}
        stores = sdoc["stores"]

        if path == "/api/meta":
            self.send_json(api_meta(mdoc, sdoc))
        elif path == "/api/materials":
            self.send_json(api_materials(mdoc, sdoc, query))
        elif path.startswith("/api/materials/"):
            slug = path[len("/api/materials/"):]
            m = by_slug.get(slug)
            if not m:
                self.send_json({"error": "material not found", "slug": slug}, 404)
            else:
                self.send_json(material_detail(m, stores))
        elif path == "/api/stores":
            self.send_json(api_stores(mdoc, sdoc, query))
        elif path.startswith("/api/stores/"):
            slug = path[len("/api/stores/"):]
            s = next((x for x in stores if x["slug"] == slug), None)
            if not s:
                self.send_json({"error": "store not found", "slug": slug}, 404)
            else:
                self.send_json(store_detail(s, by_slug))
        else:
            self.send_json({"error": "unknown endpoint", "path": path}, 404)


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    mdoc, sdoc = get_data()
    print("=" * 54)
    print("  BuildRate TN — Construction material prices, Tamil Nadu")
    print(f"  http://0.0.0.0:{PORT}")
    print(f"  {len(mdoc['materials'])} materials | {len(sdoc['stores'])} stores"
          f" | updated {mdoc.get('updated')}")
    print("  Pure Python stdlib — no dependencies. Ctrl+C to stop.")
    print("=" * 54)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBye!")
        server.server_close()


if __name__ == "__main__":
    main()
