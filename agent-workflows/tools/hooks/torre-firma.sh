#!/bin/sh
# Claude PreToolUse notice ("🗼 Torre · …"): the installer copies AND registers this
# hook in ~/.claude/settings.json (PreToolUse/Bash), per decision B4 (2026-10-05).
# No tool invocation or admission decision is performed here.
command -v python3 >/dev/null 2>&1 || exit 0
python3 -c '
import json
import re
import shlex
import sys


def without_comments(command):
    # Preserve quoting and escapes while removing only unquoted, word-initial comments.
    result = []
    quote = None
    started = False
    index = 0
    while index < len(command):
        char = command[index]
        if char == "\\" and index + 1 < len(command) and quote != "\u0027":
            result.extend((char, command[index + 1]))
            started = True
            index += 2
            continue
        if quote:
            if char == quote:
                quote = None
        elif char in ("\u0027", "\""):
            quote = char
            started = True
        elif char == "#" and not started:
            while index < len(command) and command[index] != "\n":
                index += 1
            continue
        else:
            started = char not in " \t\r\n;&|"
        result.append(char)
        index += 1
    return "".join(result)


def signature(event):
    if not isinstance(event, dict):
        return None
    tool = event.get("tool_name")
    data = event.get("tool_input")
    if not isinstance(data, dict):
        return None
    if tool in ("Write", "Edit"):
        path = data.get("file_path")
        if isinstance(path, str) and re.search(r"(?:^|/)openspec/plan\.yaml$", path):
            return "🗼 Torre · plan.yaml " + tool.lower()
        return None
    if tool != "Bash" or not isinstance(data.get("command"), str):
        return None
    command = data["command"].strip()
    # An input with shell control syntax is not a witnessed child invocation.
    if without_comments(command) != command or "`" in command:
        return None
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|<>(){}\n")
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    lexer.commenters = ""
    try:
        tokens = list(lexer)
    except ValueError:
        return None
    operators = set(";&|<>(){}\n")
    if any(token and set(token) <= operators for token in tokens):
        return None
    if not tokens:
        return None
    name = tokens[0].rsplit("/", 1)[-1]
    radar_commands = {"help", "check", "archivar", "status", "sesion", "etapa", "faltan", "roadmap", "zonas", "render"}
    jornada_flags = {"--sin-fetch", "--ejecutar", "--reciclar", "--nueva-rama", "--borrar-rama-vieja", "--mergear-pr"}
    if name == "radar" and len(tokens) > 1 and tokens[1] in radar_commands:
        return "🗼 Torre · radar " + tokens[1]
    if name == "jornada.sh" and "/" in tokens[0]:
        if len(tokens) == 1:
            return "🗼 Torre · jornada.sh"
        if tokens[1] in jornada_flags:
            return "🗼 Torre · jornada.sh " + tokens[1]
    return None

try:
    # PreToolUse may contain arbitrary user input; bound the read and fail silent on malformed JSON.
    raw = sys.stdin.buffer.read(65537)
    if len(raw) <= 65536:
        result = signature(json.loads(raw))
        if result:
            print(result)
except (ValueError, TypeError, UnicodeError, OSError):
    pass
' 2>/dev/null || :
exit 0
