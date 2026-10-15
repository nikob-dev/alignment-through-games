"""Fetch link-preview metadata for every library, extra-link and tool URL into previews.json.

Run from the repo root whenever library entries change:
    python3 scripts/fetch_previews.py

The page is static, so previews are fetched once here rather than in the
browser (where CORS would block most sites).
"""

from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM = ROOT / "curriculum.json"
OUTPUT = ROOT / "previews.json"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15"
TIMEOUT_SECONDS = 20
MAX_HTML_BYTES = 600_000

# Site-wide logos that say nothing about the specific page; the page renders
# its typographic fallback card instead.
GENERIC_IMAGE_MARKERS = ("arxiv-logo", "static.arxiv.org")


class MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.icon: str | None = None
        self.title: str | None = None
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {key.lower(): value or "" for key, value in attrs}
        if tag == "meta":
            key = (attr.get("property") or attr.get("name") or "").lower()
            if key and "content" in attr and key not in self.meta:
                self.meta[key] = attr["content"].strip()
        elif tag == "link" and "icon" in attr.get("rel", "").lower() and self.icon is None:
            self.icon = attr.get("href")
        elif tag == "title" and self.title is None:
            self._in_title = True

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title = (self.title or "") + data

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False


def http_get(url: str) -> tuple[str, str]:
    """Return (final_url, body_text)."""
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en"})
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        body = response.read(MAX_HTML_BYTES)
        charset = response.headers.get_content_charset() or "utf-8"
        return response.geturl(), body.decode(charset, errors="replace")


def is_youtube(url: str) -> bool:
    return urlparse(url).netloc.removeprefix("www.") in {"youtube.com", "youtu.be"}


def youtube_preview(url: str) -> dict[str, str | None]:
    _, body = http_get(f"https://www.youtube.com/oembed?format=json&url={quote(url, safe='')}")
    data = json.loads(body)
    return {
        "title": data.get("title"),
        "description": f"Video by {data.get('author_name')}",
        "image": data.get("thumbnail_url"),
        "site": "YouTube",
        "icon": "https://www.youtube.com/favicon.ico",
    }


def page_preview(url: str) -> dict[str, str | None]:
    final_url, body = http_get(url)
    parser = MetaParser()
    parser.feed(body)
    meta = parser.meta

    image = meta.get("og:image") or meta.get("twitter:image")
    if image:
        image = urljoin(final_url, image)
        if any(marker in image for marker in GENERIC_IMAGE_MARKERS):
            image = None

    host = urlparse(final_url).netloc.removeprefix("www.")
    return {
        "title": meta.get("og:title") or meta.get("twitter:title") or (parser.title or "").strip() or None,
        "description": meta.get("og:description") or meta.get("description") or meta.get("twitter:description"),
        "image": image,
        "site": meta.get("og:site_name") or host,
        "icon": urljoin(final_url, parser.icon) if parser.icon else urljoin(final_url, "/favicon.ico"),
    }


def fetch(url: str) -> tuple[str, dict[str, str | None] | None, str | None]:
    try:
        preview = youtube_preview(url) if is_youtube(url) else page_preview(url)
        return url, preview, None
    except Exception as error:  # noqa: BLE001 - every failure is reported below
        return url, None, f"{type(error).__name__}: {error}"


def main() -> int:
    data = json.loads(CURRICULUM.read_text())
    # Extra links and tools only need a favicon, but fetching them also link-checks them.
    urls = sorted(
        {entry["url"] for entry in data["library"]}
        | {link["url"] for entry in data["library"] for link in entry.get("extra", [])}
        | {tool["url"] for tool in data["tools"]}
    )

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch, urls))

    previews = {url: preview for url, preview, _ in results if preview is not None}
    failures = [(url, error) for url, _, error in results if error is not None]

    OUTPUT.write_text(json.dumps({"fetched": date.today().isoformat(), "previews": previews}, indent=2, ensure_ascii=False) + "\n")

    with_image = sum(1 for preview in previews.values() if preview["image"])
    print(f"{len(previews)}/{len(urls)} previews written to {OUTPUT.name} ({with_image} with images, {len(previews) - with_image} fallback cards)")
    for url, error in failures:
        print(f"FAILED {url}\n       {error}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
