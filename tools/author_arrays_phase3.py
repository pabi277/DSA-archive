#!/usr/bin/env python3
"""Author the first complete Phase 03 topic. All prose here is original."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPICS = ROOT / 'data/content/topics'
PROBLEMS = ROOT / 'data/content/problems'


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


primer = {
    'topicId': 'arrays',
    'patterns': ['two-pointers', 'prefix-sum', 'intervals'],
    'learnOrder': [
        'linear-search',
        'largest-element',
        'second-largest-element',
        'maximum-consecutive-ones',
        'left-rotate-array-by-one',
        'move-zeros-to-end',
    ],
    'primer': {
        'intro': (
            'An array is a row of numbered boxes. Each box holds one value, and an index tells you which box to read. '
            'The first index in this app is 0, so the fifth value has index 4. You use arrays because a program can '
            'move from one index to the next without naming every value. That small idea supports searching, counting, '
            'reordering and comparing neighbouring values. Before you write a loop, say what one index means, what one '
            'stored value means, and what must be returned. A clear sentence here prevents most array bugs. An array '
            'also has a length. A valid index is at least 0 and less than that length. Treat those two boundaries as '
            'part of the problem, not as details to remember later.'
        ),
        'whenToUse': [
            'The input gives values in a fixed order and asks about positions.',
            'The answer depends on a value you have already scanned.',
            'Two positions must be compared, swapped or kept together.',
            'A question asks for a total, maximum, minimum or count over a range.',
            'The output is another ordering of the same stored values.',
        ],
        'mentalModel': (
            'Picture a row of cards on a table. Your finger is the index. Your notebook is the extra state you keep '
            'while moving. A plain scan moves the finger one card at a time. Two pointers place one finger at each end '
            'and move the finger that cannot help the current comparison. A prefix sum writes a running total in the '
            'notebook so a later range question needs subtraction instead of another full walk. The picture stays '
            'useful because it separates three things: the cards you never change, the finger you move, and the notes '
            'you update. When an answer is wrong, inspect those three things in that order.'
        ),
        'mistakes': [
            'Off-by-one: read index `length` when the last valid index is `length - 1`; stop the loop before that read.',
            'Lost state: overwrite a best value or running total before you compare it; keep the old value first.',
            'Double counting: compare the same pair in both directions; give each pair one fixed order.',
        ],
        'example': {
            'title': 'One pass with a small notebook',
            'code': (
                'function firstPair(values, target) {\n'
                '  const seen = new Map()\n'
                '  for (let i = 0; i < values.length; i += 1) {\n'
                '    const need = target - values[i]\n'
                '    if (seen.has(need)) return [seen.get(need), i]\n'
                '    seen.set(values[i], i)\n'
                '  }\n'
                '  return [-1, -1]\n'
                '}'
            ),
            'explain': (
                'With `values = [4, 1, 7, 3, 2]` and `target = 9`, the loop reaches 7 at index 2 and writes that 7 is '
                'needed later. At index 4 the value is 2, so the earlier index 2 forms the pair `[2, 4]`. The map is '
                'the notebook. Each index is read once. The example shows a method, not a rule that every array '
                'problem needs a map.'
            ),
        },
        'practice': 'Ready? Open Practice and start with Linear Search.',
    },
    'sections': [
        {
            'id': 'read-the-shape',
            'title': 'Read the shape of the answer',
            'text': (
                'Start by naming the **return type**. Some tasks return one index. Others return a value, a count, a '
                'pair of indices or a rearranged array. Write a tiny input and the exact output beside it. Then name '
                'the first piece of state a scan needs. If the question asks for a largest value, you need a current '
                'largest. If it asks whether a value appeared earlier, you need a record of earlier values.\n\n'
                '- Keep one sentence for the input.\n'
                '- Keep one sentence for the output.\n'
                '- Keep one sentence for the state you update.\n\n'
                'This takes less than a minute. It also gives you a place to check a failing test: either the state '
                'is wrong, the update is late, or the final answer is read from the wrong place.'
            ),
            'check': {
                'id': 'arrays-check-shape',
                'prompt': 'A task asks for the index of the first target match, or -1 if absent. What state does a single scan need?',
                'codeSnippet': None,
                'options': [
                    {'text': 'A sorted copy of the array', 'explain': 'Sorting changes the original indices that the return type requires.'},
                    {'text': 'Only the current index while scanning left to right', 'explain': 'Correct — the first matching position can be returned immediately.'},
                    {'text': 'A running sum of every visited value', 'explain': 'Adding values does not tell you where the target sits.'},
                    {'text': 'A count of total matches across the array', 'explain': 'Counting every match is different from returning the first position.'},
                ],
                'answerIndex': 1,
                'rereadSectionId': 'read-the-shape',
                'rereadSectionTitle': 'Read the shape of the answer',
                'reveal': {
                    'alwaysAvailable': True,
                    'solution': 'Name the return type first: one 0-based index (or -1). Because the first match wins, a plain index scan needs no extra array or map — return `i` on the first hit, or `-1` after the loop.',
                    'reference': {
                        'source': 'programiz',
                        'url': 'https://www.programiz.com/dsa/linear-search',
                        'label': 'Reference · Programiz',
                        'verified': '2026-11-03',
                    },
                },
            },
        },
        {
            'id': 'choose-one-scan',
            'title': 'Choose one scan before adding cleverness',
            'text': (
                'A single left-to-right loop solves many first array questions. You read `values[i]`, update one '
                'notebook value, and continue. Use a second pointer only when a sorted property or a symmetric '
                'comparison tells you which side to move. Use a prefix sum only when several questions ask about '
                'ranges of the same array. The chosen shape should follow from the sentence you wrote about state.\n\n'
                'If you cannot explain why a pointer moves, do not move it yet. Write the plain scan first. After it '
                'works, ask whether two indices or a stored total removes repeated work. Beginner code is easier to '
                'trust when each loop has one job.'
            ),
            'check': {
                'id': 'arrays-check-scan',
                'prompt': 'When does a prefix-sum array earn its extra memory over a plain left-to-right scan?',
                'codeSnippet': None,
                'options': [
                    {'text': 'Whenever an array has fewer than ten items', 'explain': 'Tiny inputs are already fast with one direct loop.'},
                    {'text': 'When you only need the single largest element', 'explain': 'One maximum variable in a single scan already answers that.'},
                    {'text': 'When many queries ask for sums over different index ranges', 'explain': 'Correct — one preparation pass turns each range sum into subtraction.'},
                    {'text': 'When the array elements must be reversed in place', 'explain': 'Reversing swaps symmetric ends; running totals do not help.'},
                ],
                'answerIndex': 2,
                'rereadSectionId': 'choose-one-scan',
                'rereadSectionTitle': 'Choose one scan before adding cleverness',
                'reveal': {
                    'alwaysAvailable': True,
                    'solution': 'A plain scan is enough for one pass. Prepare prefix sums when several range-sum questions share the same unchanged array, so each query subtracts two stored totals in O(1) instead of rescanning.',
                    'reference': {
                        'source': 'usaco',
                        'url': 'https://usaco.guide/silver/prefix-sums',
                        'label': 'Reference · USACO Guide',
                        'verified': '2026-11-03',
                    },
                },
            },
        },
        {
            'id': 'check-the-boundaries',
            'title': 'Check boundaries and changing order',
            'text': (
                'Test an array with one value, an array with two values, and an array where the answer sits at the '
                'last index. Test a target that is absent. For negative numbers, test a case where a smaller value '
                'appears after a larger one. When a task reorders values, check that no value was lost before '
                'checking whether the order looks neat.\n\n'
                'A **constraint** is a promise about input size or value range. Read it as part of the algorithm '
                'choice. `n <= 20` and `n <= 100000` allow different amounts of repeated scanning. Time complexity '
                'describes how work grows with `n`; it is not a guess about one machine. Write `O(n)` for one scan, '
                'and `O(n^2)` for every pair in a nested loop. Then confirm the loop really has that shape.'
            ),
            'check': {
                'id': 'arrays-check-bounds',
                'prompt': 'An array has length 5. Which loop condition visits every valid index without reading past the end?',
                'codeSnippet': None,
                'options': [
                    {'text': 'i >= 0 and i < 5', 'explain': 'Correct — valid indices for length 5 are 0, 1, 2, 3 and 4.'},
                    {'text': 'i >= 0 and i <= 5', 'explain': 'Index 5 is one step past the last element at index 4.'},
                    {'text': 'i >= 1 and i < 5', 'explain': 'Starting at 1 skips the first element at index 0.'},
                    {'text': 'i >= 0 and i < 4', 'explain': 'Stopping before 4 misses the last element at index 4.'},
                ],
                'answerIndex': 0,
                'rereadSectionId': 'check-the-boundaries',
                'rereadSectionTitle': 'Check boundaries and changing order',
                'reveal': {
                    'alwaysAvailable': True,
                    'solution': 'With 0-based indexing, a 5-element array uses indices 0 through 4 (`length - 1`). Stopping at `i < length` visits all five boxes and never reads the invalid slot at `length`.',
                    'reference': {
                        'source': 'cp-algorithms',
                        'url': 'https://cp-algorithms.com/#arrays-bounds',
                        'label': 'Reference · CP-Algorithms',
                        'verified': '2026-11-03',
                    },
                },
            },
        },
    ],
    'quiz': [],
}


def option(text, explain):
    return {'text': text, 'explain': explain}


def quiz_item(n, kind, prompt, code, options, answer):
    return {
        'id': f'arrays-q{n}',
        'kind': kind,
        'prompt': prompt,
        'codeSnippet': code,
        'options': options,
        'answerIndex': answer,
    }


quiz = [
    quiz_item(1, 'pattern', 'A sorted array asks for two values with a fixed sum. Which approach fits best?', None, [
        option('Two pointers, one at each end', 'The sorted order tells you which endpoint to move after each sum.'),
        option('Nested loops over every pair', 'This works but ignores the sorted property and does extra work.'),
        option('A queue of all values', 'A queue does not use the ordering needed to discard one endpoint.'),
        option('Random swaps until a pair appears', 'Random changes give no reliable progress toward the target.'),
    ], 0),
    quiz_item(2, 'pattern', 'Several requests ask for the sum of values between two indices. What should you prepare?', None, [
        option('A prefix-sum array', 'Each range sum becomes one subtraction after a single preparation scan.'),
        option('A fresh nested loop per request', 'This repeats work that the prefix totals can share.'),
        option('A reversed copy of the array', 'Reversal does not make range totals cheaper.'),
        option('A stack of index pairs', 'The stack stores requests but not the totals needed to answer them.'),
    ], 0),
    quiz_item(3, 'pattern', 'You need to know whether a value appeared earlier in one scan. Which state fits?', None, [
        option('A set of seen values', 'A set answers earlier membership while the scan moves forward.'),
        option('Only the current index', 'The index alone cannot remember earlier values.'),
        option('A sorted copy of the whole array', 'Sorting changes positions and still needs a membership check.'),
        option('A count initialized to the array length', 'The length does not describe which values were visited.'),
    ], 0),
    quiz_item(4, 'pattern', 'A task gives intervals and asks how many overlap at a point. Which view helps?', None, [
        option('Sorted start and end events', 'Events let one scan maintain the active interval count.'),
        option('Independent binary searches for each interval', 'Binary search alone does not combine overlapping ranges.'),
        option('A trie built from interval titles', 'A trie stores prefixes, not numeric start and end events.'),
        option('A queue that never removes items', 'An unbounded queue cannot represent intervals that have ended.'),
    ], 0),
    quiz_item(5, 'dryrun', 'What does this code print for the shown array?', 'const a = [4, 1, 7, 3]\nlet best = a[0]\nfor (const x of a) {\n  if (x > best) best = x\n}\nconsole.log(best)', [
        option('7', 'The largest visited value is 7, so `best` ends at 7.'),
        option('4', '4 is only the starting value; the loop updates it.'),
        option('3', '3 is the last value, not the largest value.'),
        option('15', 'The code compares values; it never adds them.'),
    ], 0),
    quiz_item(6, 'dryrun', 'What is printed after this loop?', 'let count = 0\nfor (const x of [2, 0, 2, 0]) {\n  if (x === 2) count += 1\n}\nconsole.log(count)', [
        option('2', 'Exactly two values equal 2, so the counter reaches 2.'),
        option('0', 'The condition accepts 2, not 0.'),
        option('4', 'Only matching values update `count`.'),
        option('1', 'There are two matching values, not one.'),
    ], 0),
    quiz_item(7, 'dryrun', 'What does this prefix loop print?', 'const a = [3, 5, 2]\nlet sum = 0\nfor (const x of a) sum += x\nconsole.log(sum)', [
        option('10', 'The running total is 3 + 5 + 2 = 10.'),
        option('8', 'That total omits one of the three stored values.'),
        option('3', '3 is the first value; the loop continues.'),
        option('2', '2 is the last value, not the accumulated sum.'),
    ], 0),
    quiz_item(8, 'complexity', 'What is the time complexity of one loop over all n values with constant work per value?', 'for (let i = 0; i < n; i += 1) {\n  total += values[i]\n}', [
        option('O(n)', 'Each of the n values causes one constant-time update.'),
        option('O(1)', 'The work grows with n, so it is not constant.'),
        option('O(n log n)', 'No repeated halving or sorting appears in the loop.'),
        option('O(n²)', 'There is no nested loop over pairs.'),
    ], 0),
    quiz_item(9, 'complexity', 'What is the time complexity of checking every ordered pair in an n-value array?', 'for (let i = 0; i < n; i += 1) {\n  for (let j = 0; j < n; j += 1) {\n    compare(values[i], values[j])\n  }\n}', [
        option('O(n²)', 'The inner loop runs n times for each of n outer iterations.'),
        option('O(n)', 'One scan would have a single loop, not two nested loops.'),
        option('O(log n)', 'No step divides the remaining input in half.'),
        option('O(1)', 'The number of comparisons grows with n.'),
    ], 0),
    quiz_item(10, 'bug', 'What breaks this maximum search on a non-empty array?', 'let best = 0\nfor (const x of values) {\n  if (x > best) best = x\n}\nreturn best', [
        option('The start value fails when all values are negative', 'A negative maximum never exceeds 0, so `best` stays wrong.'),
        option('The loop skips the last index', 'A for-of loop visits every stored value.'),
        option('The comparison should use ===', 'Equality does not identify a larger value.'),
        option('The return statement must be inside the loop', 'Returning early would stop the scan after one value.'),
    ], 0),
    quiz_item(11, 'bug', 'What breaks this index loop?', 'for (let i = 0; i <= values.length; i += 1) {\n  total += values[i]\n}', [
        option('It reads one index past the last value', 'The last valid index is `length - 1`, not `length`.'),
        option('It starts at 1 instead of 0', 'The shown loop correctly starts at index 0.'),
        option('It never updates i', 'The third clause increments i each pass.'),
        option('It adds values in reverse order', 'Addition is commutative; order is not the boundary bug.'),
    ], 0),
    quiz_item(12, 'edge', 'Which input reveals a maximum finder that starts its answer at 0?', 'let best = 0\nfor (const x of values) {\n  if (x > best) best = x\n}', [
        option('[-6, -2, -4]', 'All values are negative; the correct maximum is -2.'),
        option('[1, 2, 3]', 'Positive values update the starting answer correctly.'),
        option('[0, 4, 2]', '4 is larger than 0, so the bug stays hidden.'),
        option('[5]', 'The single positive value updates the starting answer.'),
    ], 0),
]
primer['quiz'] = quiz

words = []
for key in ('intro', 'mentalModel', 'practice'):
    words.extend(primer['primer'][key].split())
words.extend(' '.join(primer['primer']['whenToUse']).split())
words.extend(' '.join(primer['primer']['mistakes']).split())
words.extend(primer['primer']['example']['explain'].split())
for section in primer['sections']:
    words.extend(section['text'].split())
print('primer words', len(words))
assert 600 <= len(words) <= 900
assert len(quiz) == 12
write(TOPICS / 'arrays.json', primer)

statements = [
    {
        'problemId': 'linear-search',
        'statement': 'You receive a row of integers and one target integer. Return the first position where the target appears. Positions start at 0. If the target is absent, return -1. Return only the position, not the value at that position.',
        'constraints': ['2 ≤ n ≤ 1000', '-1000 ≤ each value, target ≤ 1000', 'Values may repeat.'],
        'example': {'input': '5\n4 1 7 3 7\n7\n', 'output': '2', 'why': 'The first 7 is at index 2; the later 7 does not change the answer.'},
        'hint': 'Stop as soon as the first position matches; later matches cannot improve it.',
        'mistake': 'Returning the last matching index — keep the first position and leave the loop.',
        'tests': [
            {'input': '5\n4 1 7 3 7\n7\n', 'expected': '2', 'note': 'repeated target'},
            {'input': '4\n-6 0 5 2\n8\n', 'expected': '-1', 'note': 'absent target'},
            {'input': '3\n9 1 9\n9\n', 'expected': '0', 'note': 'target at first index'},
        ],
    },
    {
        'problemId': 'largest-element',
        'statement': 'A row contains at least two integers. Return the largest value stored in the row. Do not change the order of the values. The answer is a value from the row, not an index.',
        'constraints': ['2 ≤ n ≤ 1000', '-10000 ≤ each value ≤ 10000', 'All values may be negative.'],
        'example': {'input': '5\n-8 -3 -11 -2 -7\n', 'output': '-2', 'why': '-2 is greater than every other value in the row.'},
        'hint': 'Keep one candidate from the row and compare each later value against that candidate.',
        'mistake': 'Starting the candidate at 0 hides the answer when every stored value is negative.',
        'tests': [
            {'input': '5\n-8 -3 -11 -2 -7\n', 'expected': '-2', 'note': 'all negative'},
            {'input': '4\n3 12 6 12\n', 'expected': '12', 'note': 'repeated maximum'},
            {'input': '2\n0 -1\n', 'expected': '0', 'note': 'short row'},
        ],
    },
    {
        'problemId': 'second-largest-element',
        'statement': 'Read a row of integers and return its second largest distinct value. Equal copies count once. If the row has fewer than two distinct values, return -1. The original row stays unchanged.',
        'constraints': ['2 ≤ n ≤ 1000', '-10000 ≤ each value ≤ 10000', 'Duplicates are allowed.'],
        'example': {'input': '6\n8 3 8 10 4 10\n', 'output': '8', 'why': 'The distinct values are 3, 4, 8 and 10; 8 is second.'},
        'hint': 'Track the largest and the next distinct value you have seen, and ignore copies of either.',
        'mistake': 'Treating two copies of the maximum as two different ranks.',
        'tests': [
            {'input': '6\n8 3 8 10 4 10\n', 'expected': '8', 'note': 'duplicates near the top'},
            {'input': '4\n5 5 5 5\n', 'expected': '-1', 'note': 'one distinct value'},
            {'input': '3\n-4 -9 -1\n', 'expected': '-4', 'note': 'negative values'},
        ],
    },
    {
        'problemId': 'maximum-consecutive-ones',
        'statement': 'A row contains only 0 and 1. Find the longest unbroken run of 1 values and return its length. A 0 ends the current run. The answer is a count of positions, not a position.',
        'constraints': ['1 ≤ n ≤ 1000', 'Each value is 0 or 1', 'The row may start or end with 0.'],
        'example': {'input': '8\n1 1 0 1 1 1 0 1\n', 'output': '3', 'why': 'The middle run has three 1 values; no longer run appears.'},
        'hint': 'Keep a current run length and a best length; reset the current length when a 0 appears.',
        'mistake': 'Forgetting to compare the final run with the best after the loop ends.',
        'tests': [
            {'input': '8\n1 1 0 1 1 1 0 1\n', 'expected': '3', 'note': 'middle run wins'},
            {'input': '5\n0 0 0 0 0\n', 'expected': '0', 'note': 'no 1 values'},
            {'input': '4\n1 1 1 1\n', 'expected': '4', 'note': 'run reaches the end'},
        ],
    },
    {
        'problemId': 'left-rotate-array-by-one',
        'statement': 'A row has n integers. Produce the row formed by moving its first value to the end while preserving the order of all other values. Print the resulting n values on one line separated by spaces.',
        'constraints': ['2 ≤ n ≤ 1000', '-1000 ≤ each value ≤ 1000', 'Values may repeat.'],
        'example': {'input': '5\n6 2 9 4 1\n', 'output': '2 9 4 1 6', 'why': '6 moves to the end and the remaining order stays 2, 9, 4, 1.'},
        'hint': 'Remember the first value, shift the later values one position left, then write the saved value.',
        'mistake': 'Overwriting the first value before saving it; the last position then receives the wrong number.',
        'tests': [
            {'input': '5\n6 2 9 4 1\n', 'expected': '2 9 4 1 6', 'note': 'sample'},
            {'input': '2\n-3 8\n', 'expected': '8 -3', 'note': 'short row'},
            {'input': '4\n5 5 5 5\n', 'expected': '5 5 5 5', 'note': 'equal values'},
        ],
    },
    {
        'problemId': 'move-zeros-to-end',
        'statement': 'A row of integers contains at least one 0. Move every 0 to the end while keeping the order of all non-zero values. Print the resulting row on one line separated by spaces. The length does not change.',
        'constraints': ['1 ≤ n ≤ 1000', '-100 ≤ each value ≤ 100', 'At least one 0 is present.'],
        'example': {'input': '7\n0 4 0 1 8 0 3\n', 'output': '4 1 8 3 0 0 0', 'why': 'The non-zero values keep their order and the three zeros follow them.'},
        'hint': 'Write each non-zero value into the next output position, then fill the remaining positions with 0.',
        'mistake': 'Swapping a non-zero value with a zero and accidentally reversing two non-zero values.',
        'tests': [
            {'input': '7\n0 4 0 1 8 0 3\n', 'expected': '4 1 8 3 0 0 0', 'note': 'mixed positions'},
            {'input': '4\n0 0 0 0\n', 'expected': '0 0 0 0', 'note': 'all zeros'},
            {'input': '5\n2 -1 0 6 0\n', 'expected': '2 -1 6 0 0', 'note': 'negative value'},
        ],
    },
]
for item in statements:
    assert len(item['statement']) <= 700
    assert len(item['hint']) <= 140 and len(item['mistake']) <= 140
    assert 2 <= len(item['tests']) <= 3
    write(PROBLEMS / f"{item['problemId']}.json", item)
print('authored', len(statements), 'statements and', len(quiz), 'quiz items')
