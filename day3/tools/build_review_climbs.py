#!/usr/bin/env python3
"""Build merged Conversation Review word-climb JSON packs (Jay merge rule)."""
from __future__ import annotations

import copy
import hashlib
import json
import random
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
QUESTIONS_PER_UNIT = 3

PACKS = [
    (
        "basic_review_u1",
        "Basic Review · Units 1–2 (A / B / C)",
        [("basic_a", (1, 2)), ("basic_b", (1, 2)), ("basic_c", (1, 2))],
    ),
    (
        "basic_review_u2",
        "Basic Review · Units 3–4 (A / B / C)",
        [("basic_a", (3, 4)), ("basic_b", (3, 4)), ("basic_c", (3, 4))],
    ),
    (
        "basic_review_u3",
        "Basic Review · Units 5–6 (A / B / C)",
        [("basic_a", (5, 6)), ("basic_b", (5, 6)), ("basic_c", (5, 6))],
    ),
    (
        "basic_review_u4",
        "Basic Review · Units 7–8 (A / B / C)",
        [("basic_a", (7, 8)), ("basic_b", (7, 8)), ("basic_c", (7, 8))],
    ),
    (
        "int2_review_u1",
        "Int 2 Review · Units 1–2 (2A / 2B / 2C)",
        [("int2a", (1, 2)), ("int2b", (1, 2)), ("int2c", (1, 2))],
    ),
    (
        "int2_review_u2",
        "Int 2 Review · Units 3–4 (2A / 2B / 2C)",
        [("int2a", (3, 4)), ("int2b", (3, 4)), ("int2c", (3, 4))],
    ),
    (
        "int2_review_u3",
        "Int 2 Review · Units 5–6 (2A / 2B / 2C)",
        [("int2a", (5, 6)), ("int2b", (5, 6)), ("int2c", (5, 6))],
    ),
    (
        "int2_review_u4",
        "Int 2 Review · Units 7–8 (2A / 2B / 2C)",
        [("int2a", (7, 8)), ("int2b", (7, 8)), ("int2c", (7, 8))],
    ),
    (
        "int3_review_u1",
        "Int 3 Review · Units 1–2 (3A / 3B / 3C)",
        [("int3a", (1, 2)), ("int3b", (1, 2)), ("int3c", (1, 2))],
    ),
    (
        "int3_review_u2",
        "Int 3 Review · Units 3–4 (3A / 3B / 3C)",
        [("int3a", (3, 4)), ("int3b", (3, 4)), ("int3c", (3, 4))],
    ),
    (
        "int3_review_u3",
        "Int 3 Review · Units 5–6 (3A / 3B / 3C)",
        [("int3a", (5, 6)), ("int3b", (5, 6)), ("int3c", (5, 6))],
    ),
    (
        "int3_review_u4",
        "Int 3 Review · Units 7–8 (3A / 3B / 3C)",
        [("int3a", (7, 8)), ("int3b", (7, 8)), ("int3c", (7, 8))],
    ),
]


def unit_id(book: str, n: int) -> str:
    if book == "basic_a" and n == 6:
        return "basic_a_u06"
    return f"{book}_u{n}"


def load_unit(uid: str) -> dict:
    path = DATA / f"{uid}.json"
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


def is_path_ref(s: str) -> bool:
    return "/" in s or s.startswith("..")


def remap_word_refs(obj, remap: dict[str, str]):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k in ("answer", "pic") and isinstance(v, str) and not is_path_ref(v):
                obj[k] = remap.get(v, v)
            elif k == "choices" and isinstance(v, list):
                obj[k] = [
                    remap.get(x, x) if isinstance(x, str) and not is_path_ref(x) else x
                    for x in v
                ]
            else:
                remap_word_refs(v, remap)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, str) and not is_path_ref(item):
                obj[i] = remap.get(item, item)
            else:
                remap_word_refs(item, remap)


def merge_words(
    merged: list[dict], global_ids: dict[str, str], unit_id_str: str, words: list[dict]
) -> dict[str, str]:
    """Return local word id -> global word id remap for this unit."""
    remap: dict[str, str] = {}
    for w in words:
        wid = w["id"]
        gid = wid
        if gid in global_ids and global_ids[gid] != unit_id_str:
            gid = f"{unit_id_str}__{wid}"
        global_ids[gid] = unit_id_str
        remap[wid] = gid
        entry = copy.deepcopy(w)
        entry["id"] = gid
        merged.append(entry)
    return remap


def build_pack(pack_id: str, title: str, books_units: list) -> dict:
    unit_ids: list[str] = []
    for book, (lo, hi) in books_units:
        for n in range(lo, hi + 1):
            unit_ids.append(unit_id(book, n))

    first = load_unit(unit_ids[0])
    out: dict = {
        "id": pack_id,
        "kind": "review",
        "title": title,
        "passPercent": 80,
        "units": unit_ids,
        "wordAudio": first["wordAudio"],
        "picDir": first["picDir"],
        "lineAudio": first["lineAudio"],
        "questions": [],
        "words": [],
        "extras": [],
    }

    for key in ("coach", "video", "voices"):
        if key in first:
            out[key] = copy.deepcopy(first[key])

    merged_words: list[dict] = []
    global_word_owner: dict[str, str] = {}
    per_unit_questions: list[tuple[str, list]] = []

    for uid in unit_ids:
        u = load_unit(uid)
        remap = merge_words(merged_words, global_word_owner, uid, u.get("words", []))
        qs = copy.deepcopy(u.get("questions", []))
        for q in qs:
            q["unit"] = uid
            remap_word_refs(q, remap)
        per_unit_questions.append((uid, qs))

    seed = int(hashlib.sha256(pack_id.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    picked: list[dict] = []
    for uid, qs in per_unit_questions:
        pool = list(qs)
        rng.shuffle(pool)
        picked.extend(pool[:QUESTIONS_PER_UNIT])

    rng.shuffle(picked)
    out["words"] = merged_words
    out["questions"] = picked
    return out


def main() -> None:
    for pack_id, title, spec in PACKS:
        pack = build_pack(pack_id, title, spec)
        out_path = DATA / f"{pack_id}.json"
        out_path.write_text(
            json.dumps(pack, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        print(f"Wrote {out_path.name}: {len(pack['questions'])} questions, {len(pack['words'])} words")


if __name__ == "__main__":
    main()
