#!/usr/bin/env python3
"""Validate a compact Torre de Control delegation message."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

MAX_WORDS = 500
REQUIRED = ("AGENTE ", "OBJETIVO", "FUENTES Y SCOPE", "COORDINACIÓN", "HECHO CUANDO")
GENERIC_TUTORIAL_MARKERS = (
    "gentle-ai review start",
    "gentle-ai review finalize",
    "git rebase origin/main",
    "git push -u",
)


def validate(text: str) -> list[str]:
    errors: list[str] = []
    words = re.findall(r"\b[\wÁÉÍÓÚÜÑáéíóúüñ-]+\b", text)
    if len(words) > MAX_WORDS:
        errors.append(f"message has {len(words)} words; maximum is {MAX_WORDS}")
    for heading in REQUIRED:
        if heading not in text:
            errors.append(f"missing required section: {heading}")
    done_count = text.count("HECHO CUANDO")
    if done_count != 1:
        errors.append("HECHO CUANDO must appear exactly once")
    else:
        done = text.split("HECHO CUANDO", 1)[1].split("EXCEPCIÓN", 1)[0]
        bullets = sum(1 for line in done.splitlines() if line.strip().startswith("- "))
        if bullets > 5:
            errors.append(f"HECHO CUANDO has {bullets} bullets; maximum is 5")
    for marker in GENERIC_TUTORIAL_MARKERS:
        if marker in text.lower():
            errors.append(f"generic harness procedure duplicated: {marker}")
    return errors


def self_test() -> None:
    valid = """AGENTE 2 — Scope\n\nOBJETIVO\nCerrar un resultado.\n\nFUENTES Y SCOPE\n- Plan: openspec/a.md\n- Permitido: apps/x\n- No tocar: apps/y\n\nCOORDINACIÓN\n- Rama: fix/a\n- Reserva: x/y\n- DB: none\n\nHECHO CUANDO\n- Test verde.\n"""
    assert not validate(valid), validate(valid)
    missing = validate("AGENTE 2 — Scope\n\nOBJETIVO\nSin estructura completa.")
    assert any("HECHO CUANDO" in error for error in missing)
    invalid = valid + "\ngentle-ai review start\n" + ("palabra " * 510)
    found = validate(invalid)
    assert any("maximum" in error for error in found)
    assert any("duplicated" in error for error in found)
    print("self-test ok")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("message", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.message:
        parser.error("message path required unless --self-test")
    text = args.message.read_text(encoding="utf-8")
    errors = validate(text)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    count = len(re.findall(r"\b[\wÁÉÍÓÚÜÑáéíóúüñ-]+\b", text))
    print(f"compact message valid: {count} words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
