"""Validate curriculum.json: required fields present and every id reference resolves.

    python3 scripts/check_curriculum.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

CURRICULUM = Path(__file__).resolve().parent.parent / "curriculum.json"

STATUSES = {"planned", "next", "active", "done"}
KINDS = {"book", "course", "video", "blog", "podcast", "paper"}
MODULE_FIELDS = {"id", "level", "months", "status", "title", "summary", "big_question", "tools", "concepts", "lab", "done_check", "core"}
LIBRARY_FIELDS = {"id", "kind", "modules", "title", "url", "note"}
CORE_FIELDS = {"id", "scope", "time"}
MAX_CORE = 4


def check(data: dict) -> list[str]:
    errors: list[str] = []
    module_ids = {module["id"] for module in data["modules"]}
    library = {entry["id"]: entry for entry in data["library"]}
    tool_ids = {tool["id"] for tool in data["tools"]}

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
            if tool_id not in tool_ids:
                errors.append(f"{label}: unknown tool {tool_id!r}")
        if not 1 <= len(module["core"]) <= MAX_CORE:
            errors.append(f"{label}: needs 1-{MAX_CORE} core items, has {len(module['core'])}")
        for item in module["core"]:
            if CORE_FIELDS - item.keys() or not all(item.get(field) for field in CORE_FIELDS):
                errors.append(f"{label}: core item {item.get('id')!r} needs non-empty {sorted(CORE_FIELDS)}")
            elif label not in library.get(item["id"], {}).get("modules", []):
                errors.append(f"{label}: core item {item['id']!r} is not a library entry for this module")
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
        if not entry["modules"]:
            errors.append(f"library {label}: not assigned to any module")
        for link in entry.get("extra", []):
            if not (link.get("label") and link.get("url", "").startswith("https://")):
                errors.append(f"library {label}: extra link needs a label and an https url")

    return errors


def main() -> int:
    data = json.loads(CURRICULUM.read_text())
    errors = check(data)
    for error in errors:
        print(f"ERROR {error}", file=sys.stderr)
    if not errors:
        core = ", ".join(f"{m['id']}:{len(m['core'])}" for m in data["modules"])
        print(f"ok: {len(data['modules'])} modules, {len(data['library'])} resources, {len(data['tools'])} tools; core per module {core}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
