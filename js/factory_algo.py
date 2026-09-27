"""Word Factory algorithm — Jay lock 26AUG2026.

Same as School Tests Lesson 05 `apps/l05-phone/js/factory.js`
(NEED = 2, algo: streak2). Do not invent a third system.

Student path: one screen, no menus.
Automatic A(배우기) → B(받아쓰기) → C(쓰기).
Skip buttons are tester/Jay only.
"""

from __future__ import annotations

from typing import Any

NEED = 2
ALGO = "streak2"
MODE_ORDER = ("A", "B", "C")
MODE_META = {
    "A": {"ko": "배우기", "hint": "듣고 한국어를 고르세요"},
    "B": {"ko": "받아쓰기", "hint": "듣고 영어로 쓰세요"},
    "C": {"ko": "쓰기", "hint": "한국어를 보고 영어로 쓰세요"},
}


def empty_wins() -> dict[str, dict[str, int]]:
    return {"winsA": {}, "winsB": {}, "winsC": {}}


def bucket(state: dict[str, Any], mode: str) -> dict[str, int]:
    if mode == "A":
        return state["winsA"]
    if mode == "B":
        return state["winsB"]
    return state["winsC"]


def remaining(words: list[dict], wins: dict[str, int]) -> list[dict]:
    return [w for w in words if (wins.get(w["id"]) or 0) < NEED]


def part_done(words: list[dict], wins: dict[str, int]) -> bool:
    return all((wins.get(w["id"]) or 0) >= NEED for w in words)


def next_mode(mode: str) -> str | None:
    if mode == "A":
        return "B"
    if mode == "B":
        return "C"
    return None


def start_mode(words: list[dict], state: dict[str, Any]) -> str | None:
    """Auto path. Students never pick Learn/Spell/Write or Round 1/2/3."""
    if not part_done(words, state["winsA"]):
        return "A"
    if not part_done(words, state["winsB"]):
        return "B"
    if not part_done(words, state["winsC"]):
        return "C"
    return None


def factory_progress(words: list[dict], state: dict[str, Any]) -> int:
    got = 0
    need = len(words) * NEED * 3
    for w in words:
        wid = w["id"]
        got += min(NEED, state["winsA"].get(wid) or 0)
        got += min(NEED, state["winsB"].get(wid) or 0)
        got += min(NEED, state["winsC"].get(wid) or 0)
    return round((got / need) * 100) if need else 0


def make_queue(words: list[dict], wins: dict[str, int]) -> list[dict]:
    return remaining(words, wins)[:]


def next_word(
    queue: list[dict], words: list[dict], wins: dict[str, int]
) -> tuple[list[dict], dict | None, bool]:
    queue = [w for w in queue if (wins.get(w["id"]) or 0) < NEED]
    if not queue:
        queue = remaining(words, wins)
    if not queue:
        return queue, None, True
    cur = queue.pop(0)
    return queue, cur, False


def apply_grade(
    queue: list[dict],
    words: list[dict],
    wins: dict[str, int],
    cur: dict,
    ok: bool,
) -> tuple[list[dict], dict | None, bool]:
    if ok:
        wins[cur["id"]] = (wins.get(cur["id"]) or 0) + 1
        if (wins.get(cur["id"]) or 0) < NEED:
            queue.append(cur)
    else:
        wins[cur["id"]] = 0
        queue.append(cur)
    return next_word(queue, words, wins)


def tester_skip_word(wins: dict[str, int], cur: dict) -> None:
    wins[cur["id"]] = NEED


def tester_skip_part(words: list[dict], wins: dict[str, int]) -> None:
    for w in words:
        wins[w["id"]] = NEED
