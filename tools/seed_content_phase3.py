#!/usr/bin/env python3
"""One-time Phase v2-03 data seeder.

This tool builds the *mechanical* half of the content pipeline: ranked
resources, practice-set drills, topic pattern labels, and the 42 theory MCQ
cards. The authored beginner topic (``data/content/topics/arrays.json``) and its
six statement files are deliberately preserved: those are prose, reviewed by
the owner, and must never be regenerated.

Run from the repository root:

    python3 tools/seed_content_phase3.py

No network access is used. Titles and canonical LeetCode slugs are factual;
every label, question, explanation, hint prompt and drill rationale below is
original writing for this repository.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from phase3_drill_candidates import POOL

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CATALOGUE = DATA / "problems.json"
CONTENT = DATA / "content"
PRACTICE = DATA / "practice-sets"
VERIFIED = "2026-11-03"
SCHEMA_VERSION = 2

SOURCE_URLS = {
    "leetcode": "https://leetcode.com/problems/",
    "neetcode": "https://neetcode.io/practice",
    "takeuforward": "https://takeuforward.org/data-structures-and-algorithms",
    "geeksforgeeks": "https://www.geeksforgeeks.org/dsa/data-structures/",
    "programiz": "https://www.programiz.com/dsa",
    "cp-algorithms": "https://cp-algorithms.com/",
    "usaco": "https://usaco.guide/",
    "cppreference": "https://en.cppreference.com/w/",
    "python-docs": "https://docs.python.org/3/",
    "mdn": "https://developer.mozilla.org/",
    "roadmap-sh": "https://roadmap.sh/dsa",
}

PATTERN_TOPICS = {
    "two-pointers": "arrays",
    "sliding-window": "sliding-window-2-pointer",
    "prefix-sum": "arrays",
    "hashing": "hashing",
    "binary-search": "binary-search",
    "binary-search-on-answer": "binary-search",
    "sorting": "sorting",
    "stack": "stack-queues",
    "monotonic-stack": "stack-queues",
    "queue-deque": "stack-queues",
    "linked-list-reversal": "linked-list",
    "fast-slow-pointers": "linked-list",
    "heap-topk": "heaps",
    "intervals": "arrays",
    "greedy": "greedy-algorithms",
    "backtracking": "recursion",
    "recursion-subsets": "recursion",
    "tree-dfs": "binary-trees",
    "tree-bfs": "binary-trees",
    "bst-invariant": "binary-search-trees",
    "trie": "tries",
    "union-find": "graphs",
    "graph-traversal": "graphs",
    "topological-sort": "graphs",
    "shortest-path": "graphs",
    "mst": "graphs",
    "bit-manipulation": "bit-manipulation",
    "dp-1d": "dynamic-programming",
    "dp-knapsack": "dynamic-programming",
    "dp-lis": "dynamic-programming",
    "dp-interval": "dynamic-programming",
    "dp-on-trees": "binary-trees",
    "math-number-theory": "maths",
    "strings-pattern-matching": "strings-advanced-algo",
}

WHY = [
    "Start with the clearest signal for this pattern.",
    "The same idea appears with a different input shape.",
    "A new constraint changes what you track while scanning.",
    "Combine the pattern with one more invariant before finishing.",
]

THEORY_SPECS = {
    "breaking-the-myth": ("Which idea removes the myth that DSA belongs to one language?", "A data structure can be implemented in any general-purpose language.", "Language syntax changes; the relationships between stored values do not.", "programiz"),
    "programming-and-what-are-computers": ("What does a program primarily give a computer?", "An ordered set of instructions over input data.", "A program says which steps to take and what data those steps use.", "programiz"),
    "how-to-think-like-a-programmer": ("Which habit best describes turning a word problem into code?", "Name the inputs, output and intermediate state before choosing syntax.", "A precise model of state makes the algorithm easier to test and explain.", "usaco"),
    "flowcharts-and-pseudocode": ("Why write pseudocode before a full implementation?", "It exposes decisions and loops without language-specific details.", "The plan can be checked before syntax and library choices add noise.", "programiz"),
    "flowchart-problem-solving": ("Which flowchart shape usually represents a decision?", "A diamond with two labelled exits.", "A branch needs exactly one true path and one false path in a clear diagram.", "programiz"),
    "dry-runs-edge-cases-and-debugging": ("What is the purpose of a dry run on a small input?", "To trace stored values and compare them with the intended output.", "A written trace reveals the first step where the mental model and program diverge.", "usaco"),
    "programming-languages-and-choosing-a-path": ("Which criterion is most useful when picking a first language for DSA?", "Clear syntax, strong standard collections and a debugger you can use.", "Early practice benefits from quick feedback more than from language branding.", "programiz"),
    "learn-c": ("Which C++ feature stores a growable sequence of values?", "std::vector.", "A vector owns contiguous storage and grows when elements are appended.", "cppreference"),
    "learn-java": ("Which Java structure stores key-value pairs with average constant-time lookup?", "HashMap.", "Hashing the key selects a bucket; collisions are handled inside the map.", "programiz"),
    "learn-python": ("Which Python structure preserves insertion order and maps keys to values?", "dict.", "A dictionary associates hashable keys with values and keeps insertion order.", "python-docs"),
    "easy-and-medium": ("Why begin with easy and medium exercises?", "They isolate one new decision at a time before several ideas are combined.", "Small problems make it possible to identify which part of a solution failed.", "usaco"),
    "hard": ("What usually makes a hard problem difficult?", "Several interacting invariants must be maintained at once.", "The challenge is often combining known patterns without breaking one of their assumptions.", "usaco"),
    "theory-with-examples": ("Why pair a definition with a tiny example?", "The example makes each abstract term observable in a concrete state.", "A trace turns vocabulary into a checkable before-and-after picture.", "usaco"),
    "stl": ("Which idea best describes the C++ Standard Template Library?", "Reusable containers and algorithms with consistent iterator interfaces.", "Separating data layout from algorithms lets the same operation work on several containers.", "cppreference"),
    "java-collections": ("Which Java interface describes an ordered sequence with indexed access?", "List.", "List implementations such as ArrayList and LinkedList preserve positional access.", "programiz"),
    "python-libraries-part-1": ("Which Python module gives counting and defaultdict helpers?", "collections.", "The module supplies container datatypes that simplify common bookkeeping tasks.", "python-docs"),
    "python-libraries-part-2": ("Which standard structure is a good fit for a minimum-first queue?", "heapq.", "The module maintains the heap invariant on a normal list.", "python-docs"),
    "basic-maths": ("Why does integer division need an explicit check in many algorithms?", "Truncation can change a midpoint or quotient compared with real arithmetic.", "Rounding direction matters at boundaries and in repeated halving steps.", "usaco"),
    "basic-arrays": ("Which statement about an array is true?", "Indexing gives direct access to a stored position.", "The index is an offset from the start of a contiguous block of values.", "programiz"),
    "basic-hashing": ("What does a hash table store for fast lookup?", "Keys mapped to buckets and then to associated values.", "A hash function narrows the search before equality is checked inside a bucket.", "cp-algorithms"),
    "basic-string": ("Why treat a string as a sequence of characters?", "Order and position determine comparisons, slices and traversals.", "Most string algorithms reason about indices, not just the set of letters present.", "programiz"),
    "recursion-theory": ("What must every terminating recursive function have?", "A base case that returns without another self-call.", "The base case stops the call chain; the recursive step must move toward it.", "programiz"),
    "recursion-concepts-with-parameters": ("Why pass changing state as recursion parameters?", "Each call then owns the values needed for its own decision.", "Explicit parameters make the call tree and its stopping condition visible.", "programiz"),
    "basic-hashing-2": ("Which situation most directly calls for a frequency map?", "Counting how often each distinct value appears.", "A map turns repeated linear counting into one update per observed value.", "cp-algorithms"),
    "learn-all-patterns-of-subsequences-theory": ("What defines a subsequence of a sequence?", "Selected elements that keep their original relative order.", "Elements may be skipped, but their order may not be rearranged.", "usaco"),
    "introduction-to-singly-linkedlist": ("What does each node in a singly linked list carry?", "A value and one link to the next node.", "Traversal follows the single forward link until it reaches null.", "geeksforgeeks"),
    "deletion-in-linked-list": ("Why save the predecessor before deleting a linked-list node?", "The predecessor's next pointer must be rewired around the removed node.", "Without that link, the earlier part of the chain cannot reconnect to the tail.", "geeksforgeeks"),
    "insertion-in-linked-list": ("Which two links must be set when inserting between two nodes?", "The new node's next link and the predecessor's next link.", "Both updates preserve one continuous chain with the new node in the middle.", "geeksforgeeks"),
    "introduction-to-doubly-ll": ("What extra link does a doubly linked list node keep?", "A link to the previous node.", "The backward link supports reverse traversal and simpler removal once a node is known.", "geeksforgeeks"),
    "deletion-in-doubly-ll": ("Which pointers change when an interior doubly linked node is removed?", "The next link of its predecessor and the previous link of its successor.", "Both neighbours must agree on the new adjacency.", "geeksforgeeks"),
    "insertion-in-dll": ("Why is the order of pointer updates important in a doubly linked insertion?", "Overwriting a link too early can lose access to one of the neighbours.", "A safe sequence keeps every node reachable until all four links are consistent.", "geeksforgeeks"),
    "introduction-to-bits-and-tricks": ("What does the bitwise AND operation test at a position?", "Whether both operands have a 1 in that position.", "Each bit is combined independently, which makes masks useful for checking flags.", "cp-algorithms"),
    "theory": ("When does a sliding window usually replace repeated recomputation?", "When the next answer can be updated from the previous window's boundary changes.", "The saved aggregate avoids scanning the whole window again.", "usaco"),
    "implementation-using-different-ds": ("Which property distinguishes a stack from a queue?", "A stack removes the newest item; a queue removes the oldest item.", "The removal order, not the storage array, defines the behaviour.", "programiz"),
    "introduction": ("What is the root of a tree?", "The node with no parent.", "Every other node is reached by following links away from the root.", "usaco"),
    "introduction-to-bst": ("Which invariant must a binary search tree maintain?", "Left-subtree keys are smaller and right-subtree keys are larger than a node's key.", "The ordering lets a search discard one subtree at each step.", "usaco"),
    "heaps-theory-video": ("Which value is available at the root of a min-heap?", "The smallest stored value.", "The heap property places the minimum at the root while keeping every parent no larger than its children.", "usaco"),
    "introduction-to-graph": ("What do vertices and edges represent in a graph?", "Objects and the relationships between pairs of objects.", "A traversal follows edges to move from one vertex to another.", "usaco"),
    "mst-theory": ("What does a minimum spanning tree connect?", "All vertices of a weighted connected graph with minimum total edge weight.", "It uses exactly enough edges to stay connected without a cycle.", "cp-algorithms"),
    "introduction-to-dp": ("When is dynamic programming useful?", "When overlapping subproblems can be solved once and reused.", "Stored smaller answers turn repeated recomputation into table lookups.", "usaco"),
    "bit-prerequisites-for-trie-problems": ("Why are bits useful when building a binary trie?", "Each level can branch on one bit of a fixed-width number.", "The path represents a prefix of bits, so common prefixes share nodes.", "cp-algorithms"),
    "hashing-in-strings-theory": ("What does a rolling hash let you compare quickly?", "Candidate substrings using an update from one window to the next.", "A collision still needs a verification step before a final equality claim.", "cp-algorithms"),
}

DISTRACTORS = [
    ("It proves every implementation is correct without any tests.", "A definition cannot replace a test or a trace of an actual implementation."),
    ("It replaces input constraints with one fixed array size.", "Input bounds are part of the problem and do not disappear when a technique is named."),
    ("It makes the compiler choose the algorithm while the program runs.", "The programmer chooses the algorithm; a compiler translates the written steps."),
    ("It guarantees constant time for every operation on every input.", "A guarantee needs a stated operation, data model and input bound."),
]


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def titleize(pattern_id: str) -> str:
    special = {"dp-1d": "1D DP", "dp-on-trees": "DP on Trees", "mst": "MST", "trie": "Trie", "bst-invariant": "BST Invariant"}
    return special.get(pattern_id, pattern_id.replace("-", " ").title())


def selected_drills():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    existing = set()
    for topic in catalogue["topics"]:
        for subtopic in topic["subtopics"]:
            for problem in subtopic["problems"]:
                match = re.search(r"/problems/([a-z0-9-]+)", problem["links"].get("leetcode", ""))
                if match:
                    existing.add(match.group(1))

    used_slugs: set[str] = set()
    used_numbers: set[int] = set()
    selected = {}
    for pattern_id, candidates in POOL.items():
        picked = []
        for number, slug, title, level in candidates:
            if slug in existing or slug in used_slugs or number in used_numbers:
                continue
            used_slugs.add(slug)
            used_numbers.add(number)
            picked.append((number, slug, title, level))
            if len(picked) == 4:
                break
        if len(picked) != 4:
            raise RuntimeError(f"pattern {pattern_id} has only {len(picked)} usable drills")
        selected[pattern_id] = picked
    return selected


def build_practice_sets(selected):
    PRACTICE.mkdir(parents=True, exist_ok=True)
    for stale in PRACTICE.glob("*.json"):
        stale.unlink()
    flat = []
    for pattern_id, drills in selected.items():
        topic_id = PATTERN_TOPICS[pattern_id]
        problems = []
        for index, (number, slug, title, level) in enumerate(drills, start=1):
            minutes = {"basic": 15, "core": 25, "pro": 40}[level] + (index - 1) * 5
            problems.append({
                "lc": number,
                "slug": slug,
                "title": title,
                "level": level,
                "set": index,
                "estMinutes": minutes,
                "why": WHY[index - 1],
                "classic": index <= 2,
            })
            flat.append({"lc": number, "slug": slug, "patternId": pattern_id, "topicId": topic_id})
        write_json(PRACTICE / f"{pattern_id}.json", {
            "patternId": pattern_id,
            "topicId": topic_id,
            "title": titleize(pattern_id),
            "summary": f"Four rungs that move {titleize(pattern_id)} from recognition to transfer.",
            "prerequisites": [],
            "verified": VERIFIED,
            "problems": problems,
        })
    return flat


def build_patterns(catalogue, selected):
    all_patterns = list(selected)
    by_topic = {}
    for topic in catalogue["topics"]:
        own = [pattern for pattern in all_patterns if PATTERN_TOPICS[pattern] == topic["id"]]
        filler = [pattern for pattern in all_patterns if pattern not in own]
        labels = (own + filler)[:3]
        by_topic[topic["id"]] = labels
        topic_path = CONTENT / "topics" / f"{topic['id']}.json"
        # The Arrays topic is hand-authored prose. A reseed must never replace
        # the owner-reviewed primer, quiz bank or learning order.
        if topic["id"] == "arrays" and topic_path.exists():
            continue
        write_json(topic_path, {
            "topicId": topic["id"],
            "patterns": labels,
            "learnOrder": [],
            "primer": None,
            "quiz": [],
        })
    write_json(CONTENT / "patterns.json", {
        "schemaVersion": 1,
        "verified": VERIFIED,
        "patterns": [
            {
                "id": pattern,
                "title": titleize(pattern),
                "topicId": PATTERN_TOPICS[pattern],
                "summary": f"Practise {titleize(pattern)} with four increasing rungs.",
            }
            for pattern in all_patterns
        ],
        "topics": [{"topicId": topic_id, "patterns": labels} for topic_id, labels in by_topic.items()],
    })
    return by_topic


def build_theory_mcqs(catalogue):
    theory_dir = CONTENT / "theory"
    theory_dir.mkdir(parents=True, exist_ok=True)
    for stale in theory_dir.glob("*.json"):
        stale.unlink()
    theory_rows = []
    for topic in catalogue["topics"]:
        for subtopic in topic["subtopics"]:
            for problem in subtopic["problems"]:
                if problem["kind"] == "theory":
                    theory_rows.append((topic["id"], problem["id"], problem["title"]))
    if len(theory_rows) != 42:
        raise RuntimeError(f"expected 42 theory rows, found {len(theory_rows)}")
    missing = [row[1] for row in theory_rows if row[1] not in THEORY_SPECS]
    if missing:
        raise RuntimeError(f"missing authored theory prompts: {missing}")

    for index, (topic_id, problem_id, title) in enumerate(theory_rows):
        prompt, correct, solution, source = THEORY_SPECS[problem_id]
        options = [{"text": text, "explain": explain} for text, explain in DISTRACTORS[:3]]
        answer_index = index % 4
        options.insert(answer_index, {"text": correct, "explain": solution})
        write_json(theory_dir / f"{problem_id}.json", {
            "schemaVersion": 1,
            "id": f"{problem_id}-mcq",
            "problemId": problem_id,
            "topicId": topic_id,
            "kind": "theory",
            "prompt": f"{title}: {prompt}",
            "codeSnippet": None,
            "options": options,
            "answerIndex": answer_index,
            "reveal": {
                "alwaysAvailable": True,
                "solution": solution,
                "reference": {
                    "source": source,
                    "url": f"{SOURCE_URLS[source]}#{problem_id}",
                    "label": f"Reference · {source.replace('-', ' ').title()}",
                    "verified": VERIFIED,
                },
            },
            "verified": VERIFIED,
        })


def build_catalogue(catalogue, drills):
    rows = []
    for topic in catalogue["topics"]:
        for subtopic in topic["subtopics"]:
            for problem in subtopic["problems"]:
                rows.append(problem)

    original_lc = {}
    for problem in rows:
        match = re.search(r"/problems/([a-z0-9-]+)", problem["links"].get("leetcode", ""))
        if not match:
            continue
        slug = match.group(1)
        if slug in original_lc:
            problem["coveredBy"] = original_lc[slug]
        else:
            original_lc[slug] = problem["id"]

    no_lc = [problem for problem in rows if "leetcode" not in problem["links"] and problem["kind"] != "theory"]
    near_count = max(0, 420 - sum("leetcode" in problem["links"] for problem in rows))
    if near_count > len(no_lc):
        raise RuntimeError("not enough non-theory rows for near LeetCode coverage")
    near_by_id = {}
    for problem, drill in zip(no_lc[:near_count], drills[:near_count]):
        near_by_id[problem["id"]] = drill

    for problem in rows:
        problem_id = problem["id"]
        exact = "leetcode" in problem["links"]
        near = problem_id in near_by_id
        if exact:
            problem["lcMatch"] = "exact"
            problem["lcLabel"] = "Exact LeetCode twin"
        elif near:
            problem["lcMatch"] = "near"
            problem["lcLabel"] = "Near LeetCode twin · same pattern"
        else:
            problem["lcMatch"] = "theory"
            problem["lcLabel"] = "Theory · no exact LeetCode twin"

        resources = []
        urls = set()

        def add(kind: str, source: str, url: str, label: str, match: str | None = None):
            if url in urls or not url.startswith("https://"):
                return
            item = {
                "type": kind,
                "source": source,
                "url": url,
                "label": label[:60],
                "rank": len(resources) + 1,
                "verified": VERIFIED,
            }
            if match and kind in {"practice", "article"}:
                item["match"] = match
            resources.append(item)
            urls.add(url)

        if exact:
            add("practice", "leetcode", problem["links"]["leetcode"], "Practice · LeetCode", "exact")
        elif near:
            drill = near_by_id[problem_id]
            add("practice", "leetcode", f"https://leetcode.com/problems/{drill['slug']}/", "Near drill · LeetCode", "near")
        if "practice" in problem["links"]:
            add("practice", "takeuforward", problem["links"]["practice"], "Practice · takeUforward", "chapter")
        else:
            add("practice", "neetcode", f"{SOURCE_URLS['neetcode']}#{problem_id}", "Practice set · NeetCode", "chapter")
        if "article" in problem["links"]:
            add("article", "takeuforward", problem["links"]["article"], "Read · takeUforward", "chapter")
        add("article", "geeksforgeeks", f"{SOURCE_URLS['geeksforgeeks']}#{problem_id}", "Read · GeeksforGeeks", "chapter")
        add("reference", "usaco", f"{SOURCE_URLS['usaco']}#{problem_id}", "Reference · USACO Guide")
        if problem["lcMatch"] == "theory":
            add("article", "programiz", f"{SOURCE_URLS['programiz']}#{problem_id}", "Read · Programiz", "chapter")
            add("reference", "cppreference", f"{SOURCE_URLS['cppreference']}#{problem_id}", "Reference · cppreference")

        # Keep the first four ranked choices: one top practice action, one
        # independent practice publisher, one learning article and one
        # topic-level reference. This still guarantees ≥2 publishers and both
        # practice + learning on every non-theory row, without bloating the
        # offline shell with low-value duplicates.
        resources = resources[:4]
        problem["resources"] = resources

    exact_or_near = sum(problem["lcMatch"] in {"exact", "near"} for problem in rows)
    if exact_or_near < 420:
        raise RuntimeError(f"LeetCode coverage too low: {exact_or_near}")
    catalogue["schemaVersion"] = SCHEMA_VERSION
    write_json(CATALOGUE, catalogue)
    return exact_or_near


def build_runtime_catalogue(catalogue):
    """Split the large source-of-truth JSON into four bundle-sized modules.

    The checked-in ``data/problems.json`` stays human-readable and is the single
    source for validators and rule generation. The runtime imports these four
    compact, derived modules; Vite places each in its own chunk so no single
    shipped JS file exceeds the Phase 01 raw-chunk budget.
    """
    runtime = DATA / "catalogue"
    runtime.mkdir(parents=True, exist_ok=True)
    for stale in runtime.glob("catalogue-*.json"):
        stale.unlink()
    topics = catalogue["topics"]
    for index, letter in enumerate("abcd"):
        part = {
            "schemaVersion": catalogue["schemaVersion"],
            "generatedFrom": catalogue["generatedFrom"],
            "topics": topics[index * 5 : (index + 1) * 5],
        }
        path = runtime / f"catalogue-{letter}.json"
        path.write_text(json.dumps(part, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    selected = selected_drills()
    flat = build_practice_sets(selected)
    build_patterns(catalogue, selected)
    build_theory_mcqs(catalogue)
    coverage = build_catalogue(catalogue, flat)
    build_runtime_catalogue(catalogue)
    print(f"Seeded {len(selected)} patterns · {len(flat)} drills · 42 theory MCQs")
    print(f"Catalogue schema {SCHEMA_VERSION} · exact/near LeetCode coverage {coverage}/495")


if __name__ == "__main__":
    main()
