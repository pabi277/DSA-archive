#!/usr/bin/env python3
"""One-time, clean-room extraction of factual catalogue rows from copy-web/index.html.

This tool reads the STUDY-only snapshot; it is not imported by the website build.
Only topic/subtopic/problem labels, levels and outbound links are emitted.
"""
from __future__ import annotations

import html
import json
import re
import sys
from collections import OrderedDict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "copy-web" / "index.html"
DESTINATION = ROOT / "data" / "problems.json"
BASE_URL = "https://takeuforward.org/"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def slugify(value: str) -> str:
    value = value.casefold().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "item"


class CatalogueParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, set[str]]] = []
        self.categories: dict[int, str] = {}
        self.category_block_depth = 0
        self.label_capture: tuple[int, list[str]] | None = None
        self.video_links: dict[str, str] = {}
        self.row: dict | None = None
        self.cell: str | None = None
        self.anchor: dict | None = None
        self.records: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())
        self.stack.append((tag, classes))
        if tag == "section" and any("categoryBlock" in c for c in classes):
            self.category_block_depth += 1
        if tag == "span":
            depth = next((int(m.group(1)) for c in classes if (m := re.fullmatch(r".*categoryLabelDepth(\d+)", c))), None)
            if depth is None and any("categoryLabelNested" in c for c in classes):
                depth = max(1, self.category_block_depth - 1)
            if depth is not None:
                self.label_capture = (depth, [])
            elif any("problemLabel" in c for c in classes) and self.row is not None:
                self.row["capture_title"] = True
            elif any("difficultyBadge" in c for c in classes) and self.row is not None:
                self.row["capture_level"] = True
        if tag == "tr" and self.row is None and attributes.get("data-row-type"):
            row_key = attributes.get("data-sheet-row-key", "")
            source_id = row_key.rsplit("-", 1)[-1] if row_key.rsplit("-", 1)[-1].isdigit() else None
            self.row = {
                "source_id": source_id, "path": dict(self.categories), "title_parts": [], "level_parts": [],
                "links": {}, "cell": None, "capture_title": False, "capture_level": False,
            }
        elif tag == "td" and self.row is not None:
            self.cell = attributes.get("data-label")
        elif tag == "a" and self.row is not None:
            self.anchor = {"href": attributes.get("href"), "label": self.cell}
        if tag in VOID:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        # Match the nearest same-tag element; copied production HTML is well-formed,
        # but this also tolerates harmless optional/malformed closing tags.
        index = next((i for i in range(len(self.stack) - 1, -1, -1) if self.stack[i][0] == tag), None)
        classes: set[str] = set()
        if index is not None:
            classes = self.stack[index][1]
            del self.stack[index:]
        if tag == "a" and self.anchor is not None and self.row is not None:
            href, label = self.anchor["href"], self.anchor["label"]
            if href and label:
                self.row["links"].setdefault(label, []).append(href)
            self.anchor = None
        if tag == "td" and self.row is not None:
            self.cell = None
        if tag == "span" and self.row is not None:
            if any("problemLabel" in c for c in classes):
                self.row["capture_title"] = False
            if any("difficultyBadge" in c for c in classes):
                self.row["capture_level"] = False
        if tag == "section" and any("categoryBlock" in c for c in classes):
            self.category_block_depth = max(0, self.category_block_depth - 1)
        if tag == "span" and self.label_capture is not None and any(("categoryLabelDepth" in c or "categoryLabelNested" in c) for c in classes):
            depth, parts = self.label_capture
            label = " ".join("".join(parts).split())
            if label:
                self.categories[depth] = label
                for old_depth in [d for d in self.categories if d > depth]:
                    del self.categories[old_depth]
            self.label_capture = None
        if tag == "tr" and self.row is not None:
            self.records.append(self.row)
            self.row = None
            self.cell = None
            self.anchor = None

    def handle_data(self, data: str) -> None:
        if self.label_capture is not None:
            self.label_capture[1].append(data)
        if self.row is not None:
            if self.row["capture_level"]:
                self.row["level_parts"].append(data)
            elif self.row["capture_title"]:
                self.row["title_parts"].append(data)


def canonical_url(href: str) -> str:
    return urljoin(BASE_URL, html.unescape(href))


def extract() -> dict:
    parser = CatalogueParser()
    source_html = SOURCE.read_text(encoding="utf-8", errors="replace")
    parser.feed(source_html)
    parser.close()

    # Video actions are buttons in the copied markup, not anchors. For this
    # one-time data lift only, associate the embedded record's video URL by its
    # numeric row key; no copied script or runtime dependency is carried over.
    normalized = source_html.replace('\\"', '"').replace("\\u0026", "&")
    item_start = re.compile(r'\[(\d+),(\d+),"([^"]+)","item","([^"]+)","([^"]+)"')
    starts = list(item_start.finditer(normalized))
    videos_by_source_id: dict[str, str] = {}
    video_pattern = re.compile(r'https?://(?:youtu\.be/|(?:www\.)?youtube\.com/)[^"\\]+')
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(normalized)
        video_match = video_pattern.search(normalized, match.start(), end)
        if video_match:
            videos_by_source_id.setdefault(match.group(2), html.unescape(video_match.group(0)))

    topics: OrderedDict[str, dict] = OrderedDict()
    used_ids: set[str] = set()
    for source_row in parser.records:
        title = " ".join("".join(source_row["title_parts"]).split())
        if not title:
            continue
        path = source_row["path"]
        topic_title = path.get(0)
        if not topic_title:
            continue
        subtopic_title = " / ".join(path[d] for d in sorted(path) if d >= 1) or "General"
        topic_id = slugify(topic_title)
        subtopic_id = f"{topic_id}-{slugify(subtopic_title)}"
        topic = topics.setdefault(topic_id, {"id": topic_id, "title": topic_title, "order": (len(topics) + 1) * 10, "subtopics": OrderedDict()})
        subtopic = topic["subtopics"].setdefault(subtopic_id, {"id": subtopic_id, "title": subtopic_title, "order": (len(topic["subtopics"]) + 1) * 10, "problems": []})
        links: dict[str, str] = {}
        for label, kind in (("Editorial", "practice"), ("Blog", "article"), ("LeetCode", "leetcode")):
            hrefs = source_row["links"].get(label, [])
            for href in hrefs:
                absolute = canonical_url(href)
                hostpath = absolute.lower()
                if kind == "practice" and "/practice/dsa/" not in hostpath:
                    continue
                if kind == "article" and "/blogs/" not in hostpath:
                    continue
                if kind == "leetcode" and "leetcode.com/problems/" not in hostpath:
                    continue
                links[kind] = absolute
                break
        source_id = source_row.get("source_id")
        if source_id in videos_by_source_id:
            links["video"] = videos_by_source_id[source_id]
        level_text = " ".join(source_row["level_parts"]).strip().lower()
        level = {"basic": "basic", "core": "core", "pro": "pro"}.get(level_text)
        kind = "problem" if links.get("practice") or links.get("leetcode") else "theory"
        base_id = slugify(title)
        problem_id = base_id
        suffix = 2
        while problem_id in used_ids:
            problem_id = f"{base_id}-{suffix}"
            suffix += 1
        used_ids.add(problem_id)
        subtopic["problems"].append({
            "id": problem_id,
            "title": title,
            "order": (len(subtopic["problems"]) + 1) * 10,
            "level": level,
            "kind": kind,
            "links": links,
        })
    result = {
        "schemaVersion": 1,
        "generatedFrom": "one-time clean-room extraction from copy-web/index.html (phase 0)",
        "topics": [
            {**topic, "subtopics": list(topic["subtopics"].values())}
            for topic in topics.values()
        ],
    }
    return result


if __name__ == "__main__":
    data = extract()
    count = sum(len(s["problems"]) for t in data["topics"] for s in t["subtopics"])
    if count != 495 or len(data["topics"]) != 20:
        print(f"Extraction yielded {count} rows across {len(data['topics'])} topics; expected 495 / 20", file=sys.stderr)
        raise SystemExit(1)
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {count} rows across {len(data['topics'])} topics to {DESTINATION.relative_to(ROOT)}")
