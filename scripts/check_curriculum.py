"""Validate curriculum.json: required fields present and every id reference resolves.

    python3 scripts/check_curriculum.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRICULUM = Path(__file__).resolve().parent.parent / "curriculum.json"

STATUSES = {"planned", "next", "active", "done"}
KINDS = {"book", "course", "video", "blog", "podcast", "paper", "tool"}
MODULE_FIELDS = {"id", "level", "months", "status", "title", "summary", "big_question", "tools", "concepts", "lab", "done_check"}
LIBRARY_FIELDS = {"id", "kind", "modules", "title", "url", "note"}


def check(data: dict) -> list[str]:
    errors: list[str] = []
    module_ids = {module["id"] for module in data["modules"]}
    library = {entry["id"]: entry for entry in data["library"]}

    if len(library) != len(data["library"]):
        errors.append("duplicate library ids")

    for module in data["modules"]:
        label = module.get("id", "?")
        if missing := MODULE_FIELDS - module.keys():
            errors.append(f"{label}: missing {sorted(missing)}")
            continue
        if module["status"] not in STATUSES:
            errors.append(f"{label}: bad status {module['status']!r}")
        for tool_id in module["tools"]:
            if library.get(tool_id, {}).get("kind") != "tool":
                errors.append(f"{label}: tool {tool_id!r} is not a library tool entry")
        if not any(label in entry["modules"] for entry in data["library"]):
            errors.append(f"{label}: no library resources")

    for entry in data["library"]:
        label = entry.get("id", "?")
        if missing := LIBRARY_FIELDS - entry.keys():
            errors.append(f"library {label}: missing {sorted(missing)}")
            continue
        if entry["kind"] not in KINDS:
            errors.append(f"library {label}: bad kind {entry['kind']!r}")
        if unknown := set(entry["modules"]) - module_ids:
            errors.append(f"library {label}: unknown modules {sorted(unknown)}")
        if entry["kind"] != "tool" and not entry["modules"]:
            errors.append(f"library {label}: not assigned to any module")

    return errors


def main() -> int:
    data = json.loads(CURRICULUM.read_text())
    errors = check(data)
    for error in errors:
        print(f"ERROR {error}", file=sys.stderr)
    if not errors:
        print(f"ok: {len(data['modules'])} modules, {len(data['library'])} library entries")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
