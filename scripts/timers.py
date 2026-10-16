#!/usr/bin/env python3
"""One source of truth for exercise timers.

Each exercise in api/exercises.json carries a small structured `dose`. The countdown
steps (`phases`) are GENERATED from it by this script; nobody edits `phases` by hand.

  python3 scripts/timers.py --check   # fail if phases != dose, or the text disagrees with the dose
  python3 scripts/timers.py --write   # regenerate every exercise's phases from its dose
  python3 scripts/timers.py --list    # every disagreement, known or not

Dose fields (all optional except the timing ones):
  sides    "none" (default) | "each" (all of one side, switch, then the other) | "alternate"
  switch   seconds to switch sides, for sides == "each"
  hold     seconds of one hold
  rounds   how many holds (per side); with hold > 0 and rounds > 1 a step is generated per hold
  rest     seconds between holds (only with per-hold steps)
  seconds  length of the work block (per side for "each"); used when the timer is one block
  reps     number of reps the text prescribes (per side for "each"/"alternate"), checked against the text
  rep_hold seconds held inside each rep, checked against the text and used for the minimum-time check
  steps    explicit list of {label, seconds} for sequences that are not a simple pattern
  labels   [first, second] side names for alternating holds (default ["Right", "Left"])
  label    label for a single block (for sides == "each": appended to "First side — " / "Other side — ")
  text_ok  {"<number>": "why this number in the text is not a timer number"}
"""
import json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'api', 'exercises.json')
# Disagreements already known and waiting on a decision. The check fails only on problems NOT
# listed here, so a new mistake is caught while old ones are worked through. Delete a line
# once it is fixed; the check also fails if a listed problem no longer occurs (stale list).
KNOWN = os.path.join(ROOT, 'scripts', 'timer_known_issues.txt')


def generate(d):
    """The countdown steps for a dose."""
    if d.get('steps'):
        return [dict(s) for s in d['steps']]
    sides = d.get('sides', 'none')
    hold, rounds, rest = d.get('hold'), d.get('rounds', 1), d.get('rest', 0)
    a, b = d.get('labels', ['Right', 'Left'])
    if hold and rounds > 1:
        out = []
        if sides == 'alternate':
            for k in range(1, rounds + 1):
                out.append({'label': f'{a} — hold {k} of {rounds}', 'seconds': hold})
                out.append({'label': f'{b} — hold {k} of {rounds}', 'seconds': hold})
                if rest and k < rounds:
                    out.append({'label': 'Rest', 'seconds': rest})
            return out
        def one(prefix):
            seq = []
            for k in range(1, rounds + 1):
                seq.append({'label': f'{prefix}hold {k} of {rounds}', 'seconds': hold})
                if rest and k < rounds:
                    seq.append({'label': 'Rest', 'seconds': rest})
            return seq
        if sides == 'each':
            return one('First side — ') + [{'label': 'Switch sides', 'seconds': d['switch']}] + one('Other side — ')
        return one('')
    secs = d['seconds'] if 'seconds' in d else hold
    if sides == 'each':
        tail = f" — {d['label']}" if d.get('label') else ''
        return [{'label': 'First side' + tail, 'seconds': secs},
                {'label': d.get('switch_label', 'Switch sides'), 'seconds': d['switch']},
                {'label': 'Other side' + tail, 'seconds': secs}]
    return [{'label': d.get('label', 'Go'), 'seconds': secs}]


def total(d):
    return sum(p['seconds'] for p in generate(d))


NUM_WORDS = {'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'eight': 8, 'ten': 10}


def text_problems(e):
    """Ways the description disagrees with the dose. Empty list = consistent."""
    d, desc, probs = e['dose'], e['desc'], []
    ok = {int(k) for k in d.get('text_ok', {})}
    secs_in_text = [int(n) for n in re.findall(r'(\d+)\s*(?:seconds?|sec)\b', desc)]
    secs_in_text += [60 * int(n) for n in re.findall(r'(\d+)\s*minutes?', desc)]
    timer_nums = {d.get('hold'), d.get('rep_hold'), d.get('seconds'), d.get('rest')}
    timer_nums |= {s['seconds'] for s in d.get('steps', [])}
    if d.get('sides') == 'alternate' and d.get('seconds'):
        timer_nums.add(d['seconds'] // 2)
    for n in secs_in_text:
        if n not in timer_nums and n not in ok:
            probs.append(f'text says {n} seconds; the timer has no {n}-second part')
    if d.get('hold') and d['hold'] not in secs_in_text:
        probs.append(f'dose holds {d["hold"]} s but the text never says {d["hold"]} seconds')
    if d.get('reps'):
        nums = [int(n) for n in re.findall(r'\b(\d+)\b', desc)]
        nums += [v for w, v in NUM_WORDS.items() if re.search(rf'\b{w}\b', desc, re.I)]
        if d['reps'] not in nums:
            probs.append(f'dose has {d["reps"]} reps but the text never says {d["reps"]}')
        per = d.get('seconds')
        if per is not None:
            # The holds alone (or ~1 s per rep with no hold) must fit; moving time is not counted.
            need = d['reps'] * max(d.get('rep_hold', 0), 1) * (2 if d.get('sides') == 'alternate' else 1)
            if per < need:
                probs.append(f'{d["reps"]} reps need at least {need} s but the timer gives {per} s')
    return probs


def main():
    raw = open(PATH, encoding='utf-8').read()
    ex = json.loads(raw)
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    known = set()
    if os.path.exists(KNOWN):
        known = {l.rstrip('\n') for l in open(KNOWN, encoding='utf-8') if l.strip() and not l.startswith('#')}
    found, bad = [], 0
    for i, e in enumerate(ex):
        if 'dose' not in e:
            found.append(f'{e["name"]}: no dose'); continue
        gen = generate(e['dose'])
        if mode == '--write':
            e['phases'] = gen
            continue
        if e.get('phases') != gen:
            found.append(f'{e["name"]}: phases were edited by hand; run --write')
        found += [f'{e["name"]}: {p}' for p in text_problems(e)]
    if mode == '--write':
        nl = '\n' if raw.endswith('\n') else ''
        open(PATH, 'w', encoding='utf-8').write(json.dumps(ex, indent=1, ensure_ascii=False) + nl)
        print('phases regenerated from dose for', len(ex), 'exercises')
        return 0
    if mode == '--list':
        print('\n'.join(found)); return 0
    for f in found:
        if f not in known:
            print('NEW:', f); bad += 1
    for k in sorted(known - set(found)):
        print('FIXED (remove from timer_known_issues.txt):', k); bad += 1
    print(f'{len(found)} known disagreement(s) waiting on a decision' if not bad else f'{bad} problem(s)')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
