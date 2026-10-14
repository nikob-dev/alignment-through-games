const STATUS_LABELS = { planned: "Planned", next: "Up next", active: "In progress", done: "Done" };

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
  return el("span", { class: "pill", "data-status": status, text: STATUS_LABELS[status] ?? status });
}

function externalLink(url, text) {
  return el("a", { href: url, target: "_blank", rel: "noopener", text });
}

function renderMeta(meta) {
  for (const node of document.querySelectorAll("[data-bind]")) {
    node.textContent = meta[node.dataset.bind] ?? "";
  }
  for (const node of document.querySelectorAll("[data-bind-href]")) {
    node.href = meta[node.dataset.bindHref] ?? "#";
  }
  document.getElementById("stats").append(
    ...meta.stats.map((stat) => el("li", {}, el("strong", { text: stat.value }), el("span", { text: stat.label })))
  );
}

function renderArc(arc) {
  document.getElementById("arc").append(
    ...arc.map((step) => el("li", {}, el("h3", { text: step.label }), el("p", { text: step.text })))
  );
}

function renderMethod(method) {
  document.getElementById("method").append(
    ...method.map((card) =>
      el("div", { class: "card" },
        el("h3", { text: card.title }),
        el("ul", {}, card.points.map((point) => el("li", { text: point })))
      )
    )
  );
}

function renderRoadmap(modules) {
  document.getElementById("legend").append(...Object.keys(STATUS_LABELS).map(statusPill));
  document.getElementById("roadmap-list").append(
    ...modules.map((mod) =>
      el("li", {},
        el("a", { class: "tile", href: `#${mod.id}`, "data-status": mod.status },
          el("div", { class: "tile-top" }, el("span", { class: "lvl", text: `LVL ${mod.level}` }), statusPill(mod.status)),
          el("h3", { text: mod.title }),
          el("span", { class: "tile-meta", text: `${mod.months} · ~${mod.hours} h` })
        )
      )
    )
  );
}

function renderReading(item) {
  return el("li", {},
    el("span", { class: "kind", text: item.kind }),
    externalLink(item.url, item.title),
    item.note ? el("p", { text: item.note }) : null
  );
}

function renderModule(mod) {
  const summary = el("summary", {},
    el("span", { class: "badge", text: String(mod.level) }),
    el("h3", { class: "module-title", text: mod.title }),
    statusPill(mod.status),
    el("span", { class: "module-meta", text: `${mod.months} · ~${mod.hours} hours` }),
    el("span", { class: "chev", "aria-hidden": "true", text: "▾" }),
    el("p", { class: "big-q", text: mod.big_question })
  );

  const left = el("div", {},
    el("div", { class: "block" }, el("h4", { text: "Theory" }), el("ul", { class: "readings" }, mod.theory.map(renderReading))),
    el("div", { class: "block" }, el("h4", { text: "Key concepts" }), el("ul", { class: "chips" }, mod.concepts.map((c) => el("li", { text: c }))))
  );

  const right = el("div", {},
    el("div", { class: "block" },
      el("h4", { text: "Game lab" }),
      el("div", { class: "lab" },
        el("h5", { text: mod.lab.title }),
        el("p", { text: mod.lab.summary }),
        el("ol", {}, mod.lab.steps.map((step) => el("li", { text: step })))
      )
    ),
    el("div", { class: "block" }, el("h4", { text: "Done-check" }), el("ul", { class: "checks" }, mod.done_check.map((c) => el("li", { text: c })))),
    el("div", { class: "block" }, el("h4", { text: "Reflect" }), el("ol", { class: "questions" }, mod.reflection.map((q) => el("li", { text: q }))))
  );

  const details = el("details", { class: "module", id: mod.id }, summary, el("div", { class: "module-body" }, left, right));
  details.addEventListener("toggle", () => {
    if (details.open) history.replaceState(null, "", `#${mod.id}`);
  });
  return details;
}

function renderModules(modules) {
  document.getElementById("module-list").append(...modules.map(renderModule));

  const toggleAll = document.getElementById("toggle-all");
  toggleAll.addEventListener("click", () => {
    const cards = [...document.querySelectorAll(".module")];
    const shouldOpen = cards.some((card) => !card.open);
    for (const card of cards) card.open = shouldOpen;
    toggleAll.textContent = shouldOpen ? "Collapse all" : "Expand all";
  });
}

function renderResources(groups) {
  document.getElementById("resource-list").append(
    ...groups.map((group) =>
      el("div", { class: "card" },
        el("h3", { text: group.group }),
        el("ul", {}, group.items.map((item) => el("li", {}, externalLink(item.url, item.title))))
      )
    )
  );
}

function renderLog(entries) {
  document.getElementById("log-list").append(
    ...entries.map((entry) => el("li", {}, el("time", { datetime: entry.date, text: entry.date }), el("span", { text: entry.text })))
  );
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

async function main() {
  setupThemeToggle();
  const response = await fetch("curriculum.json");
  if (!response.ok) throw new Error(`curriculum.json: HTTP ${response.status}`);
  const data = await response.json();

  renderMeta(data.meta);
  renderArc(data.arc);
  renderMethod(data.method);
  renderRoadmap(data.modules);
  renderModules(data.modules);
  renderResources(data.resources);
  renderLog(data.log);

  // Web fonts shift layout; scroll to a deep link only once they've settled.
  await document.fonts.ready;
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
}

main().catch((error) => {
  console.error(error);
  document.querySelector("main").prepend(
    el("p", { class: "wrap error", text: `Couldn't load the curriculum: ${error.message}` })
  );
});
