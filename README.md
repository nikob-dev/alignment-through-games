# Alignment Through Games

A 12-month learning path on how AI agents learn rules and pursue goals, and on the alignment control problem, taught through games.

**Live site:** https://nikob-dev.github.io/alignment-through-games/

## Structure

| File | Purpose |
|---|---|
| `curriculum.json` | **All content**: modules, readings, labs, done-checks, resources, progress log |
| `index.html` | Page shell |
| `app.js` | Renders `curriculum.json` (ES module, no build step) |
| `styles.css` | Theme tokens, light/dark, mobile-first layout |

## Editing

- **Update progress:** set a module's `status` to `planned`, `next`, `active`, or `done`, and add an entry to `log`.
- **Add a reading:** append `{ "kind", "title", "url", "note" }` to that module's `theory`.
- Commit and push. GitHub Pages redeploys in about a minute.

## Preview locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly from disk won't work: browsers block `fetch()` on `file://`.
