# Alignment Through Games

A learning path on how AI agents learn rules and pursue goals, and on the alignment control problem, taught through games.

**Live site:** https://nikob-dev.github.io/alignment-through-games/

## Structure

| File | Purpose |
|---|---|
| `curriculum.json` | **All content**: modules (with core picks), tools, and the resource library |
| `previews.json` | Generated link-preview metadata (thumbnail, site, favicon) for each library URL |
| `index.html`, `app.js`, `styles.css` | Static page that renders the two JSON files (no build step) |
| `scripts/check_curriculum.py` | Validates fields and id references |
| `scripts/fetch_previews.py` | Regenerates `previews.json` |

## Editing

- **Add a resource:** append to `library` with `id`, `kind` (book/course/video/blog/podcast/paper), `title`, `url`, `note`, and `modules` (e.g. `["m4"]`). Optional `extra: [{label, url}]` adds a second link (slides, code, paper).
- **Mark it core:** add `{id, scope, hours}` to that module's `core` list (1–4 items; hours is a number, summed into the module's reading total). Everything else in the module shows under "Go deeper".
- **Add a tool:** add `{id, title, url}` to `tools`, then list its id in the module's `tools`.
- **Update progress:** set a module's `status` to `planned`, `next`, `active`, or `done`.
- Then run:

```sh
python3 scripts/check_curriculum.py
python3 scripts/fetch_previews.py
```

Commit and push. GitHub Pages redeploys in about a minute.

## Preview locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly from disk won't work: browsers block `fetch()` on `file://`.
