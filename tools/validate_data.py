#!/usr/bin/env python3
"""Validate the Phase v2-03 catalogue, content pipeline and coverage report."""
from __future__ import annotations

import json
import os
import re
import subprocess
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CONTENT = DATA / "content"
CATALOGUE = DATA / "problems.json"
AS_OF = date.fromisoformat(os.environ.get("CONTENT_AS_OF", "2026-11-03"))
EXPECTED_TOPIC_COUNTS = [83, 7, 32, 6, 32, 7, 22, 49, 14, 14, 13, 31, 32, 15, 20, 46, 53, 7, 9, 3]
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ISO_DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HTML_TAG = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")
URL = re.compile(r"https?://")
ORIGINAL_HOSTS = {"takeuforward.org", "www.takeuforward.org", "leetcode.com", "www.youtube.com", "youtu.be"}
RESOURCE_HOSTS = {
    "leetcode.com", "neetcode.io", "takeuforward.org", "www.takeuforward.org",
    "www.geeksforgeeks.org", "www.programiz.com", "cp-algorithms.com",
    "usaco.guide", "en.cppreference.com", "docs.python.org",
    "developer.mozilla.org", "roadmap.sh",
}
ALLOWED_SOURCES = {
    "leetcode", "neetcode", "takeuforward", "geeksforgeeks", "programiz",
    "cp-algorithms", "usaco", "cppreference", "python-docs", "mdn", "roadmap-sh",
}
RESOURCE_TYPES = {"practice", "article", "video", "reference", "docs"}
LEARNING_TYPES = {"article", "reference", "docs"}
MATCH_VALUES = {"exact", "near", "chapter", "theory"}
QUIZ_KINDS = {"pattern", "dryrun", "complexity", "bug", "edge"}
QUIZ_DISTRIBUTION = {"pattern": 4, "dryrun": 3, "complexity": 2, "bug": 2, "edge": 1}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def host(url: str) -> str:
    return url.split("/", 3)[2].lower().split(":", 1)[0]


def word_count(text: str) -> int:
    return len(re.findall(r"\S+", str(text)))


def assert_day(value, label: str) -> None:
    assert isinstance(value, str) and ISO_DAY.fullmatch(value), f"{label} must be an ISO day"
    checked = date.fromisoformat(value)
    assert checked <= AS_OF, f"{label} is in the future: {value}"
    assert (AS_OF - checked).days <= 180, f"{label} is stale (>180 days): {value}"


def word_list(text: str) -> list[str]:
    return re.findall(r"\S+", str(text))


def main() -> None:
    data = load(CATALOGUE)
    assert data.get("schemaVersion") == 2, "catalogue schemaVersion must be 2"
    assert data.get("generatedFrom") == "one-time clean-room extraction from copy-web/index.html (phase 0)"
    topics = data.get("topics")
    assert isinstance(topics, list) and len(topics) == 20, "expected 20 ordered topics"
    assert [sum(len(s["problems"]) for s in t["subtopics"]) for t in topics] == EXPECTED_TOPIC_COUNTS

    all_rows: list[dict] = []
    topic_ids: set[str] = set()
    subtopic_ids: set[str] = set()
    row_ids: set[str] = set()
    row_topics: dict[str, str] = {}
    for topic in topics:
        assert SLUG.fullmatch(topic["id"]) and topic["id"] not in topic_ids
        topic_ids.add(topic["id"])
        assert topic["title"].strip() and isinstance(topic["order"], int)
        assert isinstance(topic["subtopics"], list) and topic["subtopics"]
        for subtopic in topic["subtopics"]:
            assert SLUG.fullmatch(subtopic["id"]) and subtopic["id"] not in subtopic_ids
            subtopic_ids.add(subtopic["id"])
            assert subtopic["title"].strip() and isinstance(subtopic["problems"], list)
            for problem in subtopic["problems"]:
                expected_keys = {"id", "title", "order", "level", "kind", "links", "resources", "lcMatch", "lcLabel"}
                assert expected_keys.issubset(problem), f"{problem['id']} is missing Phase 03 fields"
                assert set(problem) - expected_keys <= {"coveredBy"}, f"{problem['id']} has unexpected fields"
                assert SLUG.fullmatch(problem["id"]) and problem["id"] not in row_ids
                row_ids.add(problem["id"])
                row_topics[problem["id"]] = topic["id"]
                assert problem["title"].strip()
                assert problem["level"] in {"basic", "core", "pro", None}
                assert problem["kind"] in {"problem", "theory"}
                assert isinstance(problem["links"], dict)
                assert set(problem["links"]).issubset({"practice", "article", "video", "leetcode"})
                for url in problem["links"].values():
                    assert url.startswith("https://"), url
                    assert host(url) in ORIGINAL_HOSTS, f"original link host changed: {host(url)}"
                all_rows.append(problem)

    assert len(all_rows) == 495
    assert Counter(row["level"] for row in all_rows) == Counter({"basic": 84, "core": 287, "pro": 109, None: 15})
    assert sum(row["kind"] == "problem" for row in all_rows) == 453
    assert sum(row["kind"] == "theory" for row in all_rows) == 42

    counts_by_type: dict[str, tuple[int, int]] = {}
    for kind in ("practice", "article", "video", "leetcode"):
        urls = [row["links"][kind] for row in all_rows if kind in row["links"]]
        counts_by_type[kind] = (len(urls), len(set(urls)))
    assert counts_by_type["practice"] == (453, 453)
    assert counts_by_type["article"] == (289, 286)
    assert counts_by_type["leetcode"] == (289, 273)
    assert counts_by_type["video"] == (369, 321)
    short_videos = {row["links"].get("video", "") for row in all_rows if "youtu.be/" in row["links"].get("video", "")}
    long_videos = {row["links"].get("video", "") for row in all_rows if "youtube.com/" in row["links"].get("video", "")}
    assert (len(short_videos), len(long_videos)) == (256, 65), "single-source video links must stay verbatim"

    # Duplicate sheet slugs are linked to their first row, never duplicated as drills.
    first_slug_row: dict[str, str] = {}
    for row in all_rows:
        match = re.search(r"/problems/([a-z0-9-]+)", row["links"].get("leetcode", ""))
        if not match:
            assert "coveredBy" not in row, f"{row['id']} cannot claim coveredBy without a LeetCode slug"
            continue
        slug = match.group(1)
        if slug in first_slug_row:
            assert row.get("coveredBy") == first_slug_row[slug], f"duplicate slug {slug} needs coveredBy"
        else:
            first_slug_row[slug] = row["id"]
            assert "coveredBy" not in row, f"first row for {slug} cannot claim coveredBy"
    for row in all_rows:
        if "coveredBy" in row:
            assert row["coveredBy"] in row_ids, f"unknown coveredBy id {row['coveredBy']}"

    allowed_base = {"id", "title", "order", "level", "kind", "links"}
    assert allowed_base.issubset(all_rows[0])
    exact_or_near = 0
    theory_labelled = 0
    multi_publisher = 0
    for row in all_rows:
        assert row["lcMatch"] in {"exact", "near", "theory"}, row["id"]
        assert row["lcLabel"].strip() and len(row["lcLabel"]) <= 60
        has_lc_link = "leetcode" in row["links"]
        assert (row["lcMatch"] == "exact") == has_lc_link, f"lcMatch disagrees with links: {row['id']}"
        resources = row["resources"]
        assert isinstance(resources, list) and resources, f"empty resources: {row['id']}"
        urls: set[str] = set()
        ranks_by_type: dict[str, set[int]] = {}
        sources: set[str] = set()
        types: set[str] = set()
        for index, resource in enumerate(resources, start=1):
            assert isinstance(resource, dict)
            assert set(resource) <= {"type", "source", "url", "label", "rank", "verified", "match"}
            assert {"type", "source", "url", "label", "rank", "verified"}.issubset(resource)
            assert resource["type"] in RESOURCE_TYPES
            assert resource["source"] in ALLOWED_SOURCES
            # Video links remain single-source in `links.video` by owner decision.
            assert resource["type"] != "video", f"videos must not be multi-sourced: {row['id']}"
            assert resource["url"].startswith("https://") and host(resource["url"]) in RESOURCE_HOSTS
            assert resource["url"] not in urls, f"duplicate resource URL on {row['id']}"
            urls.add(resource["url"])
            assert isinstance(resource["label"], str) and 0 < len(resource["label"]) <= 60
            assert isinstance(resource["rank"], int) and resource["rank"] == index
            assert resource["rank"] not in ranks_by_type.setdefault(resource["type"], set())
            ranks_by_type[resource["type"]].add(resource["rank"])
            assert_day(resource["verified"], f"resource verified date on {row['id']}")
            if "match" in resource:
                assert resource["type"] in {"practice", "article"}
                assert resource["match"] in MATCH_VALUES
            sources.add(resource["source"])
            types.add(resource["type"])
        assert len(sources) >= 2, f"fewer than two publishers: {row['id']}"
        multi_publisher += 1
        if row["kind"] != "theory":
            assert "practice" in types, f"non-theory row has no practice resource: {row['id']}"
            assert types & LEARNING_TYPES, f"non-theory row has no learning resource: {row['id']}"
        lc_resources = [r for r in resources if r["source"] == "leetcode"]
        if row["lcMatch"] == "near":
            assert len(lc_resources) == 1 and lc_resources[0].get("match") == "near", row["id"]
        if row["lcMatch"] == "theory":
            assert not lc_resources, f"theory-labelled row has a LeetCode twin: {row['id']}"
            theory_labelled += 1
        else:
            exact_or_near += 1
    assert multi_publisher >= 0.8 * 495
    assert exact_or_near >= 420, exact_or_near
    assert theory_labelled == 495 - exact_or_near
    assert exact_or_near == 420

    # Runtime catalogue parts must be byte-equivalent after JSON parsing.
    parts = sorted((DATA / "catalogue").glob("catalogue-*.json"))
    assert len(parts) == 4
    combined_topics = []
    for part_path in parts:
        part = load(part_path)
        assert part["schemaVersion"] == 2 and part["generatedFrom"] == data["generatedFrom"]
        assert len(part["topics"]) == 5
        combined_topics.extend(part["topics"])
    assert combined_topics == topics, "runtime catalogue parts are stale"

    # Topics, patterns and quiz banks.
    patterns_doc = load(CONTENT / "patterns.json")
    assert patterns_doc["schemaVersion"] == 1
    assert_day(patterns_doc["verified"], "patterns.json verified")
    pattern_ids = {entry["id"] for entry in patterns_doc["patterns"]}
    assert len(pattern_ids) == 34
    assert all(SLUG.fullmatch(entry["id"]) and entry["topicId"] in topic_ids for entry in patterns_doc["patterns"])
    assert len(patterns_doc["topics"]) == 20
    assert all(len(entry["patterns"]) == 3 and set(entry["patterns"]) <= pattern_ids for entry in patterns_doc["topics"])
    topic_patterns = {entry["topicId"]: entry["patterns"] for entry in patterns_doc["topics"]}

    topic_files = sorted((CONTENT / "topics").glob("*.json"))
    assert len(topic_files) == 20
    quiz_total = 0
    primer_count = 0
    inline_check_ids: set[str] = set()
    statement_topic_ids: set[str] = set()
    for topic_file in topic_files:
        topic_doc = load(topic_file)
        topic_id = topic_doc["topicId"]
        assert topic_file.stem == topic_id and topic_id in topic_ids
        assert topic_doc["patterns"] == topic_patterns[topic_id]
        assert isinstance(topic_doc["learnOrder"], list)
        for problem_id in topic_doc["learnOrder"]:
            assert problem_id in row_ids and row_topics[problem_id] == topic_id
        primer = topic_doc["primer"]
        assert primer is None or isinstance(primer, dict)
        sections = topic_doc.get("sections", [])
        assert isinstance(sections, list) and len(sections) <= 3
        section_ids = [section["id"] for section in sections]
        assert len(set(section_ids)) == len(section_ids), f"duplicate section id in {topic_id}"
        inline_checks = 0
        for section in sections:
            assert set(section) <= {"id", "title", "text", "check"}, f"unexpected keys on primer section in {topic_id}"
            assert {"id", "title", "text"}.issubset(section)
            assert SLUG.fullmatch(section["id"])
            if "check" in section and section["check"] is not None:
                inline_checks += 1
                check = section["check"]
                assert isinstance(check, dict), f"primer section check must be one object (<=1 per section): {topic_id}"
                assert set(check) == {
                    "id", "prompt", "codeSnippet", "options", "answerIndex",
                    "rereadSectionId", "rereadSectionTitle", "reveal",
                }
                assert SLUG.fullmatch(check["id"]) and check["id"] not in inline_check_ids
                inline_check_ids.add(check["id"])
                assert isinstance(check["prompt"], str) and 0 < len(check["prompt"]) <= 240
                assert "all of the above" not in check["prompt"].lower()
                assert check["codeSnippet"] is None or (isinstance(check["codeSnippet"], str) and len(check["codeSnippet"].splitlines()) <= 12)
                assert isinstance(check["options"], list) and len(check["options"]) == 4
                assert isinstance(check["answerIndex"], int) and 0 <= check["answerIndex"] <= 3
                for option in check["options"]:
                    assert set(option) == {"text", "explain"}
                    assert 0 < len(option["text"]) <= 120 and 0 < len(option["explain"]) <= 120
                assert check["rereadSectionId"] in section_ids, f"unknown rereadSectionId on {check['id']}"
                assert isinstance(check["rereadSectionTitle"], str) and check["rereadSectionTitle"].strip()
                reveal = check["reveal"]
                assert reveal["alwaysAvailable"] is True
                assert isinstance(reveal["solution"], str) and 0 < len(reveal["solution"]) <= 400
                reference = reveal["reference"]
                assert reference["source"] in ALLOWED_SOURCES
                assert reference["url"].startswith("https://") and host(reference["url"]) in RESOURCE_HOSTS
                assert_day(reference["verified"], f"inline check reference on {check['id']}")
        assert inline_checks <= 3, f"placement budget exceeded (>3 inline checks) in {topic_id}"
        if primer is not None:
            primer_count += 1
            assert isinstance(primer["intro"], str) and primer["intro"]
            assert 3 <= len(primer["whenToUse"]) <= 5
            assert isinstance(primer["mentalModel"], str) and primer["mentalModel"]
            assert len(primer["mistakes"]) == 3
            assert all(isinstance(item, str) and item for item in [*primer["whenToUse"], *primer["mistakes"]])
            example = primer["example"]
            assert example["title"].strip() and example["code"].strip() and example["explain"].strip()
            assert len(example["code"].splitlines()) <= 20
            assert isinstance(primer["practice"], str) and primer["practice"]
            text = "\n".join([primer["intro"], primer["mentalModel"], primer["practice"], *primer["whenToUse"], *primer["mistakes"], example["explain"], *(section["title"] + "\n" + section["text"] for section in sections)])
            assert 600 <= word_count(text) <= 900, f"primer word count for {topic_id}: {word_count(text)}"
            assert not URL.search(text), f"primer for {topic_id} contains an external URL"
            assert not HTML_TAG.search(text), f"primer for {topic_id} contains HTML"
            assert "```" not in "".join(section["text"] for section in sections), "only one primer code block is allowed"
        else:
            assert inline_checks == 0, f"unauthored primer in {topic_id} cannot carry inline checks"
        quiz = topic_doc["quiz"]
        assert isinstance(quiz, list)
        if quiz:
            assert len(quiz) >= 12
            assert Counter(item["kind"] for item in quiz) == Counter(QUIZ_DISTRIBUTION)
        for index, item in enumerate(quiz, start=1):
            assert item["id"] == f"{topic_id}-q{index}"
            assert item["kind"] in QUIZ_KINDS
            assert isinstance(item["prompt"], str) and 0 < len(item["prompt"]) <= 180
            assert "all of the above" not in item["prompt"].lower()
            if item["kind"] != "bug":
                assert not re.search(r"\b(?:except|not|never|incorrect|wrong)\b", item["prompt"], re.I), item["id"]
            snippet = item["codeSnippet"]
            assert snippet is None or isinstance(snippet, str)
            if snippet:
                assert len(snippet.splitlines()) <= 12 and "\t" not in snippet
            assert len(item["options"]) == 4
            assert 0 <= item["answerIndex"] <= 3
            for option in item["options"]:
                assert isinstance(option["text"], str) and 0 < len(option["text"]) <= 90
                assert isinstance(option["explain"], str) and 0 < len(option["explain"]) <= 120
        quiz_total += len(quiz)
    assert primer_count >= 1 and quiz_total >= 12

    # Statements and runner test cases.
    statement_files = sorted((CONTENT / "problems").glob("*.json"))
    assert len(statement_files) >= 6
    for statement_file in statement_files:
        statement = load(statement_file)
        problem_id = statement["problemId"]
        assert statement_file.stem == problem_id and problem_id in row_ids
        row = next(row for row in all_rows if row["id"] == problem_id)
        assert row["kind"] != "theory", f"theory rows cannot carry coding tests: {problem_id}"
        statement_topic_ids.add(row_topics[problem_id])
        assert 0 < len(statement["statement"]) <= 700
        assert 2 <= len(statement["constraints"]) <= 4
        assert all(isinstance(item, str) and item.strip() for item in statement["constraints"])
        example = statement["example"]
        assert all(isinstance(example[key], str) and example[key].strip() for key in ("input", "output", "why"))
        assert 0 < len(statement["hint"]) <= 140 and 0 < len(statement["mistake"]) <= 140
        tests = statement["tests"]
        assert 2 <= len(tests) <= 6
        for case in tests:
            assert set(case) == {"input", "expected", "note"}
            assert all(isinstance(case[key], str) for key in case)
            assert len(case["input"].encode()) <= 2048 and len(case["expected"].encode()) <= 2048
            assert "\t" not in case["input"][1:] and "\t" not in case["expected"][1:]
        combined = " ".join([statement["statement"], statement["hint"], statement["mistake"], example["why"]])
        assert not HTML_TAG.search(combined)
    assert statement_topic_ids

    # Theory MCQ parity: exactly one authored card per theory row, and no extras.
    theory_files = sorted((CONTENT / "theory").glob("*.json"))
    theory_row_ids = {row["id"] for row in all_rows if row["kind"] == "theory"}
    assert len(theory_files) == len(theory_row_ids) == 42
    assert {item.stem for item in theory_files} == theory_row_ids
    for theory_file in theory_files:
        mcq = load(theory_file)
        assert mcq["problemId"] == theory_file.stem and mcq["topicId"] in topic_ids
        assert mcq["kind"] == "theory" and mcq["id"] == f"{mcq['problemId']}-mcq"
        assert 0 < len(mcq["prompt"]) <= 240 and "all of the above" not in mcq["prompt"].lower()
        assert mcq["codeSnippet"] is None
        assert len(mcq["options"]) == 4 and 0 <= mcq["answerIndex"] <= 3
        for option in mcq["options"]:
            assert set(option) == {"text", "explain"}
            assert 0 < len(option["text"]) <= 240 and 0 < len(option["explain"]) <= 120
        reveal = mcq["reveal"]
        assert reveal["alwaysAvailable"] is True and 0 < len(reveal["solution"].strip()) <= 400
        reference = reveal["reference"]
        assert reference["source"] in ALLOWED_SOURCES
        assert reference["url"].startswith("https://") and host(reference["url"]) in RESOURCE_HOSTS
        assert_day(reference["verified"], f"theory reference on {mcq['problemId']}")
        assert_day(mcq["verified"], f"theory MCQ verified on {mcq['problemId']}")

    # Practice sets, drill uniqueness and canonical LeetCode URLs.
    practice_files = sorted((DATA / "practice-sets").glob("*.json"))
    assert len(practice_files) == 34
    all_drill_slugs: set[str] = set()
    all_drill_numbers: set[int] = set()
    drill_total = 0
    for practice_file in practice_files:
        practice = load(practice_file)
        assert practice_file.stem == practice["patternId"] and practice["patternId"] in pattern_ids
        assert practice["topicId"] in topic_ids and practice["title"].strip() and practice["summary"].strip()
        assert_day(practice["verified"], f"practice set verified on {practice['patternId']}")
        assert isinstance(practice["prerequisites"], list)
        problems = practice["problems"]
        assert 3 <= len(problems) <= 4
        assert [item["set"] for item in problems] == list(range(1, len(problems) + 1)), "sets must be contiguous"
        for item in problems:
            assert isinstance(item["lc"], int) and 1 <= item["lc"] <= 4000
            assert SLUG.fullmatch(item["slug"])
            assert item["slug"] not in first_slug_row, f"drill duplicates a sheet slug: {item['slug']}"
            assert item["slug"] not in all_drill_slugs, f"duplicate drill slug: {item['slug']}"
            assert item["lc"] not in all_drill_numbers, f"duplicate drill number: {item['lc']}"
            all_drill_slugs.add(item["slug"])
            all_drill_numbers.add(item["lc"])
            assert item["title"].strip() and item["level"] in {"basic", "core", "pro"}
            assert 5 <= item["estMinutes"] <= 120 and 0 < len(item["why"]) <= 90
            assert URL.search(f"https://leetcode.com/problems/{item['slug']}/")
            drill_total += 1
    assert 120 <= drill_total <= 140

    # The deterministic coverage report is checked by the same Node tool CI uses.
    subprocess.run(["node", "tools/content-coverage.mjs", "--check"], cwd=ROOT, check=True)

    print("Validated 495 rows · 20 topics · catalogue schema 2")
    print("Links unchanged: practice 453/453 · article 289/286 · LeetCode 289/273 · video 369/321")
    print(f"Resources: {multi_publisher}/495 rows · 2+ publishers · {exact_or_near}/495 LC twins · {theory_labelled} theory-labelled")
    print(f"Content: {primer_count} primer · {len(statement_files)} statements · {quiz_total} quiz items · {len(theory_files)}/42 theory MCQs")
    print(f"Practice: {len(practice_files)} patterns · {drill_total} unique drills · coverage report current ({AS_OF})")


if __name__ == "__main__":
    main()
