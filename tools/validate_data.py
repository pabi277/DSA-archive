#!/usr/bin/env python3
"""Validate the checked-in, clean-room catalogue using Python's standard library."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "problems.json"
EXPECTED_TOPIC_COUNTS = [83, 7, 32, 6, 32, 7, 22, 49, 14, 14, 13, 31, 32, 15, 20, 46, 53, 7, 9, 3]
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ALLOWED_HOSTS = {"takeuforward.org", "www.takeuforward.org", "leetcode.com", "www.youtube.com", "youtu.be"}


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    assert data.get("schemaVersion") == 1
    assert data.get("generatedFrom") == "one-time clean-room extraction from copy-web/index.html (phase 0)"
    topics = data.get("topics")
    assert isinstance(topics, list) and len(topics) == 20, "expected 20 ordered topics"
    counts = [sum(len(subtopic["problems"]) for subtopic in topic["subtopics"]) for topic in topics]
    assert counts == EXPECTED_TOPIC_COUNTS, f"topic row counts differ: {counts}"

    all_problems = []
    topic_ids: set[str] = set()
    subtopic_ids: set[str] = set()
    problem_ids: set[str] = set()
    for topic in topics:
        assert SLUG.fullmatch(topic["id"]) and topic["id"] not in topic_ids
        topic_ids.add(topic["id"])
        assert topic["title"].strip()
        assert isinstance(topic["order"], int)
        assert isinstance(topic["subtopics"], list) and topic["subtopics"]
        for subtopic in topic["subtopics"]:
            assert SLUG.fullmatch(subtopic["id"]) and subtopic["id"] not in subtopic_ids
            subtopic_ids.add(subtopic["id"])
            assert subtopic["title"].strip()
            assert isinstance(subtopic["problems"], list)
            for problem in subtopic["problems"]:
                assert set(problem) == {"id", "title", "order", "level", "kind", "links"}
                assert SLUG.fullmatch(problem["id"]) and problem["id"] not in problem_ids
                problem_ids.add(problem["id"])
                assert problem["title"].strip()
                assert problem["level"] in {"basic", "core", "pro", None}
                assert problem["kind"] in {"problem", "theory"}
                assert isinstance(problem["links"], dict)
                assert set(problem["links"]).issubset({"practice", "article", "video", "leetcode"})
                for url in problem["links"].values():
                    assert url.startswith("https://"), url
                    host = url.split("/", 3)[2].lower().split(":", 1)[0]
                    assert host in ALLOWED_HOSTS, f"unexpected outbound host: {host}"
                all_problems.append(problem)

    assert len(all_problems) == 495
    levels = Counter(problem["level"] for problem in all_problems)
    assert levels == Counter({"basic": 84, "core": 287, "pro": 109, None: 15}), levels
    assert sum(problem["kind"] == "problem" for problem in all_problems) == 453
    assert all(not problem["links"] or problem["kind"] in {"problem", "theory"} for problem in all_problems)

    counts_by_type: dict[str, tuple[int, int]] = {}
    for kind in ("practice", "article", "video", "leetcode"):
        urls = [problem["links"][kind] for problem in all_problems if kind in problem["links"]]
        counts_by_type[kind] = (len(urls), len(set(urls)))
    assert counts_by_type["practice"] == (453, 453)
    assert counts_by_type["article"] == (289, 286)
    assert counts_by_type["leetcode"] == (289, 273)
    assert counts_by_type["video"] == (369, 321)
    short_videos = {url for problem in all_problems for url in [problem["links"].get("video", "")] if "youtu.be/" in url}
    long_videos = {url for problem in all_problems for url in [problem["links"].get("video", "")] if "youtube.com/" in url}
    assert (len(short_videos), len(long_videos)) == (256, 65)

    print("Validated 495 rows · 20 topics")
    print("Levels: Basic 84 · Core 287 · Pro 109 · unbadged 15 (kept null)")
    print("Links (rows / unique): practice 453/453 · article 289/286 · LeetCode 289/273 · video 369/321 (256 youtu.be + 65 youtube.com)")


if __name__ == "__main__":
    main()
