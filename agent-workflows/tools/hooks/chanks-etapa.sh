#!/bin/sh
# Stage guidance: delegate the card to copiloto. This hook never infers a
# Session and never wires Claude settings. It only locates an installed
# copiloto, bounds its run, prints the card it returns, and stays silent on any
# doubt. copiloto itself reads Radar and the conversation focus; the previous
# stage-transition environment variable is retired and no longer exists here.
set -u
command -v python3 >/dev/null 2>&1 || exit 0
command -v git >/dev/null 2>&1 || exit 0
command -v timeout >/dev/null 2>&1 || exit 0
root=$(timeout 5 git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root" ] || exit 0
root=$(cd "$root" 2>/dev/null && pwd -P) || exit 0
copiloto=$(command -v copiloto 2>/dev/null) || exit 0
case "$copiloto" in /*) ;; *) exit 0 ;; esac
[ -f "$copiloto" ] && [ ! -L "$copiloto" ] && [ -x "$copiloto" ] || exit 0
copiloto_dir=$(cd "$(dirname "$copiloto")" 2>/dev/null && pwd -P) || exit 0
copiloto="$copiloto_dir/$(basename "$copiloto")"
case "$copiloto" in "$root"|"$root"/*) exit 0 ;; esac
# A binary from another checkout (e.g. Main while in a worker worktree) is not installed copiloto.
probe=$copiloto_dir
while :; do
    [ -e "$probe/.git" ] && exit 0
    [ "$probe" = / ] && break
    probe=$(dirname "$probe")
done
# Claude sends the prompt as JSON on stdin; its session_id names the
# conversation. Bounded and validated, never required: without it copiloto falls
# back to the last active conversation.
conversacion=""
if [ ! -t 0 ]; then
    conversacion=$(python3 -c '
import json, sys
raw = sys.stdin.buffer.read(16385)
if len(raw) > 16384:
    raise SystemExit(0)
try:
    obj = json.loads(raw.decode("utf8"))
except (ValueError, TypeError, UnicodeDecodeError):
    raise SystemExit(0)
sid = obj.get("session_id") if isinstance(obj, dict) else None
if isinstance(sid, str) and 0 < len(sid) <= 128 and all(c.isalnum() or c in "._-" for c in sid):
    sys.stdout.write(sid)
' 2>/dev/null) || conversacion=""
fi
COPILOTO_BIN="$copiloto" COPILOTO_ROOT="$root" COPILOTO_CONV="$conversacion" python3 -c '
import os, selectors, signal, subprocess, sys, time

args = [os.environ["COPILOTO_BIN"], "tarjeta", "-C", os.environ["COPILOTO_ROOT"]]
conv = os.environ.get("COPILOTO_CONV", "")
if conv:
    args[2:2] = ["--conversacion", conv]
process = None
try:
    process = subprocess.Popen(args, cwd=os.environ["COPILOTO_ROOT"], stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    chunks = []
    size = 0
    until = time.monotonic() + 10
    while True:
        remaining = until - time.monotonic()
        if remaining <= 0 or not selector.select(remaining):
            raise TimeoutError()
        chunk = os.read(process.stdout.fileno(), 4097 - size)
        if not chunk:
            break
        chunks.append(chunk)
        size += len(chunk)
        if size > 4096:
            raise ValueError("copiloto output too large")
    process.wait(timeout=max(0.001, until - time.monotonic()))
    sys.stdout.write(b"".join(chunks).decode("utf8"))
except (OSError, ValueError, TimeoutError, subprocess.SubprocessError):
    pass
finally:
    if process and process.poll() is None:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait()
' 2>/dev/null || :
exit 0
