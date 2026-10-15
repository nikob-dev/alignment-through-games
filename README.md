# Alignment Through Games

A learning path on how AI agents learn rules and pursue goals, and on the alignment control problem, taught through games.

**Live site:** https://nikob-dev.github.io/alignment-through-games/

## Structure

| File | Purpose |
|---|---|
| `curriculum.json` | **All content**: modules and the resource library |
| `previews.json` | Generated link-preview metadata (thumbnail, site, favicon) for each library URL |
| `index.html`, `app.js`, `styles.css` | Static page that renders the two JSON files (no build step) |
| `scripts/check_curriculum.py` | Validates fields and id references |
| `scripts/fetch_previews.py` | Regenerates `previews.json` |

## Editing

- **Add a resource:** append to `library` with `id`, `kind` (book/course/video/blog/podcast/paper/tool), `title`, `url`, `note`, and `modules` (e.g. `["m4"]`). It shows up in those module cards and in the library.
- **Add a tool to a module:** add a `kind: "tool"` library entry, then list its id in that module's `tools`.
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
