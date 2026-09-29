#!/usr/bin/env python3
"""
Build a single-file, fully offline version of BuildRate TN.

Output: ../BuildRate-TN.html — one self-contained HTML file (CSS, JS and all
API data embedded). Open it directly in any browser, no server needed.

Run:  python3 build_standalone.py
"""
import json
import os

import app as core  # reuse the data layer + API response builders

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(BASE), "BuildRate-TN.html")


def build():
    mdoc, sdoc = core.get_data()
    by_slug = {m["slug"]: m for m in mdoc["materials"]}
    stores = sdoc["stores"]

    # Pre-compute every API response the frontend can request
    data = {
        "/api/meta": core.api_meta(mdoc, sdoc),
        "/api/materials": core.api_materials(mdoc, sdoc, {}),
        "/api/stores": core.api_stores(mdoc, sdoc, {}),
    }
    for slug, m in by_slug.items():
        data["/api/materials/" + slug] = core.material_detail(m, stores)
    for s in stores:
        data["/api/stores/" + s["slug"]] = core.store_detail(s, by_slug)

    # '</' would terminate the <script> tag — escape it inside the JSON string
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    html = open(os.path.join(BASE, "static", "index.html"), encoding="utf-8").read()
    css = open(os.path.join(BASE, "static", "css", "style.css"), encoding="utf-8").read()
    js = open(os.path.join(BASE, "static", "js", "app.js"), encoding="utf-8").read()

    html = html.replace(
        '<link rel="stylesheet" href="/static/css/style.css">',
        "<style>\n" + css + "\n</style>",
    )
    html = html.replace(
        '<script src="/static/js/app.js"></script>',
        "<script>window.BR_DATA = " + payload + ";</script>\n<script>\n" + js + "\n</script>",
    )
    # Offline banner marker (so the standalone is identifiable)
    html = html.replace(
        "<title>BuildRate TN — Construction Material Prices</title>",
        "<title>BuildRate TN — Construction Material Prices (offline)</title>",
    )

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("Built %s (%.0f KB) — open it directly in any browser" % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    build()
