#!/usr/bin/env python3
"""Builds index.html from src/template.html + src/catalog_public.json + the latest published customer ledger."""
import json, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://wjjexoyectojxdxigprz.supabase.co"
KEY = "sb_publishable__5mdSDs65F8zkTt6r3NrfA_nFfXUA0C"

def latest_ledger():
    try:
        req = urllib.request.Request(URL + "/rest/v1/ledger?id=eq.ledger&select=data", headers={"apikey": KEY})
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.load(r)
        return rows[0]["data"] if rows else {}
    except Exception as e:
        print("ledger fetch failed, using empty:", e)
        return {}

tpl = open(os.path.join(ROOT, "src/template.html")).read()
cat = open(os.path.join(ROOT, "src/catalog_public.json")).read()
led = json.dumps(latest_ledger(), ensure_ascii=False, separators=(",", ":"))
out = tpl.replace("__CATALOG__", cat).replace("__LEDGER__", led.replace("</", "<\\/"))
out = out.replace("</script></script>", "</script>")
open(os.path.join(ROOT, "index.html"), "w").write(out)
import time
open(os.path.join(ROOT, "sw.js"), "w").write(open(os.path.join(ROOT, "src/sw.js")).read().replace("__BUILD__", time.strftime("%Y%m%d%H%M%S")))
for f in ("shim.js", "vendor/supabase.js"):
    dst = os.path.join(ROOT, f); os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w").write(open(os.path.join(ROOT, "src", f)).read())
print("built index.html", len(out) // 1024, "KB")
