const STATUS_LABELS = { next: "Up next", active: "In progress", done: "Done" };
const KIND_ORDER = ["book", "course", "video", "blog", "podcast", "paper"];
const KIND_LABELS = { book: "Books", course: "Courses", video: "Videos", blog: "Blogs", podcast: "Podcasts", paper: "Papers" };

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function statusPill(status) {
  return STATUS_LABELS[status] ? el("span", { class: "pill", "data-status": status, text: STATUS_LABELS[status] }) : null;
}

function byKind(a, b) {
  return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
}

function hostOf(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

// A favicon or thumbnail that fails to load is removed rather than shown broken.
function optionalImage(src, attrs, onFail = (img) => img.remove()) {
  if (!src) return null;
  const img = el("img", { src, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer", ...attrs });
  img.addEventListener("error", () => onFail(img), { once: true });
  return img;
}

function fallbackMedia(entry) {
  return el("div", { class: "pfallback" }, el("strong", { text: entry.kind }), el("span", { text: hostOf(entry.url) }));
}

// The card is a div, not a link, so extra links can sit inside it. The title
// link stretches over the whole card in CSS; extra links are layered above it.
function previewCard(entry, preview, { moduleTags = null, core = null, isCore = false } = {}) {
  const media = el("div", { class: "pmedia" });
  const thumb = optionalImage(preview?.image, {}, (img) => img.replaceWith(fallbackMedia(entry)));
  media.append(thumb ?? fallbackMedia(entry));

  const extras = entry.extra?.length
    ? el("div", { class: "pextra" }, entry.extra.map((link) => el("a", { href: link.url, target: "_blank", rel: "noopener", text: `${link.label} ↗` })))
    : null;

  return el("div", { class: "pcard", "data-kind": entry.kind, "data-core": String(isCore || Boolean(core)) },
    media,
    el("div", { class: "pbody" },
      el("div", { class: "ptop" },
        el("span", { class: "pkind", text: entry.kind }),
        isCore ? el("span", { class: "pbadge", text: "Core" }) : null
      ),
      el("h4", { class: "ptitle" }, el("a", { class: "plink", href: entry.url, target: "_blank", rel: "noopener", text: entry.title })),
      core ? el("p", { class: "pcore" }, el("strong", { text: core.scope }), ` · ${core.time}`) : null,
      el("p", { class: "pnote", text: entry.note || preview?.description || "" }),
      extras,
      el("div", { class: "psite" },
        optionalImage(preview?.icon, { width: "13", height: "13" }),
        el("span", { text: preview?.site || hostOf(entry.url) }),
        moduleTags ? el("span", { class: "pmods", text: moduleTags }) : null
      )
    )
  );
}

function renderMeta(meta) {
  for (const node of document.querySelectorAll("[data-bind]")) node.textContent = meta[node.dataset.bind] ?? "";
  for (const node of document.querySelectorAll("[data-bind-href]")) node.href = meta[node.dataset.bindHref] ?? "#";
}

function renderArc(arc) {
  document.getElementById("arc").append(
    ...arc.map((step) => el("li", {}, el("div", { class: "arc-step" }, el("strong", { text: step.label }), el("span", { text: step.text }))))
  );
}

function renderRoadmap(modules, toolsById) {
  document.getElementById("roadmap-list").append(
    ...modules.map((mod) =>
      el("li", {},
        el("a", { class: "tile", href: `#${mod.id}`, "data-status": mod.status },
          el("div", { class: "tile-top" },
            el("span", { class: "lvl" }, `LVL ${mod.level} `, el("span", { text: `· ${mod.months}` })),
            statusPill(mod.status)
          ),
          el("h3", { text: mod.title }),
          el("p", { text: mod.summary }),
          el("ul", { class: "tools", "aria-label": "Tools" }, mod.tools.map((id) => el("li", { text: toolsById.get(id).title })))
        )
      )
    )
  );
}

function renderModule(mod, { toolsById, library, previews }) {
  const summary = el("summary", {},
    el("span", { class: "badge", text: String(mod.level) }),
    el("h3", { class: "module-title", text: mod.title }),
    el("p", { class: "module-q", text: mod.big_question }),
    el("span", { class: "module-side" },
      statusPill(mod.status),
      el("span", { class: "module-months", text: mod.months }),
      el("span", { class: "chev", "aria-hidden": "true", text: "▾" })
    )
  );

  const toolLinks = mod.tools.map((id) => {
    const tool = toolsById.get(id);
    return el("li", {}, el("a", { href: tool.url, target: "_blank", rel: "noopener" },
      optionalImage(previews[tool.url]?.icon, { width: "14", height: "14" }), tool.title));
  });

  const libraryById = new Map(library.map((entry) => [entry.id, entry]));
  const coreIds = new Set(mod.core.map((item) => item.id));
  const coreCards = mod.core.map((item) => previewCard(libraryById.get(item.id), previews[libraryById.get(item.id).url], { core: item }));
  const deeper = library.filter((entry) => entry.modules.includes(mod.id) && !coreIds.has(entry.id)).sort(byKind);

  const body = el("div", { class: "module-body" },
    el("p", { class: "module-summary", text: mod.summary }),
    el("div", { class: "module-grid" },
      el("div", {},
        el("div", { class: "block" },
          el("h4", { text: "Game lab" }),
          el("div", { class: "lab" },
            el("h5", { text: mod.lab.title }),
            el("p", { text: mod.lab.summary }),
            el("ol", {}, mod.lab.steps.map((step) => el("li", { text: step })))
          )
        )
      ),
      el("div", {},
        el("div", { class: "block" }, el("h4", { text: "Done-check" }), el("ul", { class: "checks" }, mod.done_check.map((c) => el("li", { text: c })))),
        el("div", { class: "block" }, el("h4", { text: "Tools" }), el("ul", { class: "tools" }, toolLinks)),
        el("div", { class: "block" }, el("h4", { text: "Key concepts" }), el("ul", { class: "chips" }, mod.concepts.map((c) => el("li", { text: c }))))
      )
    ),
    el("div", { class: "block resources-block" },
      el("h4", { text: "Start here" }),
      el("div", { class: "pgrid" }, coreCards),
      deeper.length
        ? el("details", { class: "deeper" },
            el("summary", { text: `Go deeper (${deeper.length})` }),
            el("div", { class: "pgrid" }, deeper.map((entry) => previewCard(entry, previews[entry.url]))))
        : null
    )
  );

  const details = el("details", { class: "module", id: mod.id }, summary, body);
  details.addEventListener("toggle", () => {
    if (details.open) history.replaceState(null, "", `#${mod.id}`);
  });
  return details;
}

function renderModules(modules, context) {
  document.getElementById("module-list").append(...modules.map((mod) => renderModule(mod, context)));

  const toggleAll = document.getElementById("toggle-all");
  toggleAll.addEventListener("click", () => {
    const cards = [...document.querySelectorAll(".module")];
    const shouldOpen = cards.some((card) => !card.open);
    for (const card of cards) card.open = shouldOpen;
    toggleAll.textContent = shouldOpen ? "Collapse all" : "Expand all";
  });
}

function moduleTagsFor(entry, modules) {
  return modules.filter((mod) => entry.modules.includes(mod.id)).map((mod) => `M${mod.level}`).join(" · ");
}

function renderLibrary(library, modules, previews) {
  const coreIds = new Set(modules.flatMap((mod) => mod.core.map((item) => item.id)));
  const sorted = [...library].sort(byKind);
  const cards = sorted.map((entry) =>
    previewCard(entry, previews[entry.url], { moduleTags: moduleTagsFor(entry, modules), isCore: coreIds.has(entry.id) }));
  document.getElementById("library-grid").append(...cards);

  const counts = Object.fromEntries(KIND_ORDER.map((kind) => [kind, sorted.filter((entry) => entry.kind === kind).length]));
  const filters = document.getElementById("filters");
  const buttons = [["all", "All", sorted.length], ...KIND_ORDER.map((kind) => [kind, KIND_LABELS[kind], counts[kind]])]
    .filter(([, , count]) => count > 0)
    .map(([kind, label, count]) => el("button", { type: "button", "data-filter": kind, "aria-pressed": String(kind === "all") }, label, el("small", { text: String(count) })));
  const coreToggle = el("button", { type: "button", class: "core-toggle", "aria-pressed": "false" }, "Core only", el("small", { text: String(coreIds.size) }));
  filters.append(...buttons, coreToggle);

  let kindFilter = "all";
  const applyFilters = () => {
    const coreOnly = coreToggle.getAttribute("aria-pressed") === "true";
    for (const card of cards) {
      card.hidden = (kindFilter !== "all" && card.dataset.kind !== kindFilter) || (coreOnly && card.dataset.core !== "true");
    }
  };

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button === coreToggle) {
      coreToggle.setAttribute("aria-pressed", String(coreToggle.getAttribute("aria-pressed") !== "true"));
    } else {
      kindFilter = button.dataset.filter;
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
    }
    applyFilters();
  });
}

function openFromHash() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    // Instant, not smooth: smooth scrolling stalls in background tabs and is
    // pointless on a deep-link landing.
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }
}

function setupThemeToggle() {
  document.querySelector(".theme-toggle").addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (_) {
      // Storage unavailable (private mode): the toggle still works for this visit.
    }
  });
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  setupThemeToggle();
  const [data, previewFile] = await Promise.all([fetchJson("curriculum.json"), fetchJson("previews.json")]);
  const previews = previewFile.previews;
  const toolsById = new Map(data.tools.map((tool) => [tool.id, tool]));

  renderMeta(data.meta);
  renderArc(data.arc);
  renderRoadmap(data.modules, toolsById);
  renderModules(data.modules, { toolsById, library: data.library, previews });
  renderLibrary(data.library, data.modules, previews);

  // Web fonts shift layout; scroll to a deep link only once they've settled.
  await document.fonts.ready;
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
}

main().catch((error) => {
  console.error(error);
  document.querySelector("main").prepend(el("p", { class: "wrap error", text: `Couldn't load the curriculum: ${error.message}` }));
});
