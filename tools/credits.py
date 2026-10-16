#!/usr/bin/env python3
"""Writes photo-credits.html from src/photo_credits.json and the photos attached in src/catalog_public.json."""
import json, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cr = json.load(open(os.path.join(ROOT, 'src/photo_credits.json')))
cat = json.load(open(os.path.join(ROOT, 'src/catalog_public.json')))
by_file = {}
for it in cat:
    if it.get('img', '').startswith('photos/'): by_file.setdefault(it['img'][7:], []).append(it['n'])
e = html.escape
rows = []
for sub, c in sorted(cr.items(), key=lambda kv: kv[0]):
    if c['file'] not in by_file: continue
    names = ', '.join(dict.fromkeys(by_file[c['file']]))
    rows.append(f'<li><img loading="lazy" alt="" src="photos/{e(c["file"])}"><div><b>{e(sub.title())}</b><span>{e(c["author"] or "Unknown author")} &middot; {e(c["license"])}</span><a href="{e(c["source"])}" target="_blank" rel="noopener">Source on Wikimedia Commons</a></div></li>')
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Photo credits · Vurata Market</title><meta name="robots" content="noindex">
<style>
:root{{--bg:#EEF1F5;--surface:#fff;--ink:#16201A;--muted:#56615A;--line:#D5DAE1;--gold:#8A6A1F}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0E1411;--surface:#161D19;--ink:#E8EDE9;--muted:#9AA69F;--line:#2D3832;--gold:#C9A24B}}}}
*{{box-sizing:border-box;border-radius:3px}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px 48px}}
main{{max-width:640px;margin:0 auto}}
h1{{font-size:22px;margin:0 0 6px;letter-spacing:-.01em}} p{{color:var(--muted);margin:0 0 20px}}
ul{{list-style:none;margin:0;padding:0;display:grid;gap:8px}}
li{{display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--line);padding:8px}}
li img{{width:56px;height:56px;object-fit:cover;flex:none}} li div{{display:grid;gap:1px;min-width:0}}
li span{{color:var(--muted);font-size:13px;overflow-wrap:anywhere}} li a{{color:var(--gold);font-size:13px}}
a.back{{display:inline-block;margin-bottom:16px;color:var(--gold)}}
</style></head><body><main>
<a class="back" href="./">&larr; Back to Vurata Market</a>
<h1>Photo credits</h1>
<p>Product photos are free-licence images from Wikimedia Commons. Thank you to the photographers.</p>
<ul>{''.join(rows)}</ul>
</main></body></html>'''
open(os.path.join(ROOT, 'photo-credits.html'), 'w').write(page)
print('credits for', len(rows), 'photos')
