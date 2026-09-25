#!/bin/sh
# Optional stage guidance: never infer a Session and never wire Claude settings.
set -u
command -v python3 >/dev/null 2>&1 || exit 0
command -v git >/dev/null 2>&1 || exit 0
command -v timeout >/dev/null 2>&1 || exit 0
root=$(timeout 5 git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root" ] || exit 0
root=$(cd "$root" 2>/dev/null && pwd -P) || exit 0
radar=$(command -v radar 2>/dev/null) || exit 0
case "$radar" in /*) ;; *) exit 0 ;; esac
[ -f "$radar" ] && [ ! -L "$radar" ] && [ -x "$radar" ] || exit 0
radar_dir=$(cd "$(dirname "$radar")" 2>/dev/null && pwd -P) || exit 0
radar="$radar_dir/$(basename "$radar")"
case "$radar" in "$root"|"$root"/*) exit 0 ;; esac
# A binary from another checkout (e.g. Main while in a worker worktree) is not installed Radar.
probe=$radar_dir
while :; do
    [ -e "$probe/.git" ] && exit 0
    [ "$probe" = / ] && break
    probe=$(dirname "$probe")
done
prior=${CHANKS_PREVIOUS_ETAPA_JSON-}
[ "${#prior}" -le 4096 ] || exit 0
CHANKS_RADAR="$radar" CHANKS_ROOT="$root" python3 -c '
import json, os, selectors, signal, subprocess, time

def stage(raw):
    try:
        obj = json.loads(raw)
        if obj.get("schema") != "radar.etapa/v1" or type(obj.get("etapa")) is not int or obj["etapa"] < 1:
            return None
        name = obj.get("nombre")
        if not isinstance(name, str) or not name.strip() or len(name) > 120:
            return None
        return obj["etapa"], name
    except (ValueError, TypeError, KeyError, AttributeError, UnicodeDecodeError):
        return None

process = None
try:
    process = subprocess.Popen([os.environ["CHANKS_RADAR"], "etapa", "-C", os.environ["CHANKS_ROOT"]],
                               cwd=os.environ["CHANKS_ROOT"], stdin=subprocess.DEVNULL,
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
            raise ValueError("Radar output too large")
    if process.wait(timeout=max(0.001, until - time.monotonic())) != 0:
        raise ValueError("Radar failed")
    current = stage(b"".join(chunks).decode("utf8"))
    prior = stage(os.environ.get("CHANKS_PREVIOUS_ETAPA_JSON", ""))
    if current:
        print("Radar etapa: %s · %s" % current)
        if prior and prior != current:
            print("💪 Chanks · %s · %s" % current)
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
