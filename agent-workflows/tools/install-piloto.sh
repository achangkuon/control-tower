#!/usr/bin/env bash
# Builds piloto and installs it on PATH.
#
# piloto belongs to agent-workflows, next to radar: it reads Radar's snapshot and
# writes the pilot's switch, limits and marks in the Git common directory. This
# installer lives beside install-radar.sh for that reason — each installer owns
# only its own box.
#
#   ./install-piloto.sh            build and install
#   ./install-piloto.sh --check    diagnose only, touch nothing; it also reports a
#                                  Torre-owned destination instead of planning a build
#   ./install-piloto.sh --force    install even when the Tower owns the destination
#
# The Tower may own ~/.local/bin/piloto once its installer records that path in
# ~/.local/share/torre-control/runtime-ownership.json; this installer refuses to
# overwrite a Torre-owned destination so that manifest stays verifiable. --force
# is an explicit development escape; after using it the Tower preflight reports
# that entry as modified until the next Torre install reconciles it.
#
# Destination follows the same convention as install-radar.sh: $TORRE_BIN_DIR, else ~/.local/bin.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/piloto" && pwd)"
BIN="${TORRE_BIN_DIR:-$HOME/.local/bin}"

check_only=false
force=false
for arg in "$@"; do
    case "$arg" in
        --check) check_only=true ;;
        --force) force=true ;;
    esac
done

torre_manifest="${TORRE_OWNERSHIP_MANIFEST:-$HOME/.local/share/torre-control/runtime-ownership.json}"
torre_piloto="$HOME/.local/bin/piloto"

# Only the entries[].path strings of the Tower manifest matter here. A missing,
# unreadable, or malformed manifest means the path is not Torre-owned: no manifest,
# no Tower ownership claim. That fail-open is deliberate — the Tower is the only
# writer of that file, so its absence is the expected state on every machine that
# never ran the Torre installer.
torre_owns_piloto() {
    [[ -f "$torre_manifest" ]] || return 1
    local match candidate previous
    # The Tower writes HOME-relative paths, but the same path can be spelled with
    # a leading "./" or repeated slashes; normalize before comparing so no spelling
    # of it can slip past the guard.
    while IFS= read -r match; do
        candidate="${match#*:}"      # "path": "value"  ->  " "value""
        candidate="${candidate#*\"}" #                     ->  "value""
        candidate="${candidate%\"}"  #                     ->  "value"
        while :; do
            previous="$candidate"
            candidate="${candidate//\/\//\/}"
            candidate="${candidate#./}"
            [[ "$candidate" == "$previous" ]] && break
        done
        [[ "$candidate" == ".local/bin/piloto" ]] && return 0
    done < <(grep -oE '"path"[[:space:]]*:[[:space:]]*"[^"]*"' "$torre_manifest" 2>/dev/null)
    return 1
}

# The destination is Torre-owned only when it is exactly the path the Tower
# installs and the manifest still claims it. $TORRE_BIN_DIR elsewhere never
# enters Torre territory.
torre_owns_destination() {
    [[ "$BIN/piloto" == "$torre_piloto" ]] && torre_owns_piloto
}

ok()  { echo "  ✓ $1"; }
bad() { echo "  ✗ $1" >&2; }

echo "piloto — instalación"
echo

if ! command -v go >/dev/null 2>&1; then
    bad "go no está instalado. piloto es un módulo Go y se compila desde fuente."
    echo "    Instalalo desde https://go.dev/dl/ y volvé a correr esto."
    exit 1
fi
ok "go $(go version | awk '{print $3}')"

if $check_only; then
    if [[ -x "$BIN/piloto" ]]; then
        ok "instalado en $BIN/piloto ($("$BIN/piloto" --version 2>/dev/null || echo 'sin --version'))"
    else
        bad "no instalado en $BIN/piloto"
    fi
    command -v piloto >/dev/null 2>&1 && ok "piloto está en PATH" || bad "piloto NO está en PATH"
    # Diagnosis only: this mode never builds nor installs, so it cannot silently
    # plan the overwrite the guard below refuses.
    if torre_owns_destination && ! $force; then
        echo "  ~ $torre_piloto es propiedad de la Torre; una instalación personal no lo pisa (--force para desarrollo)"
    fi
    exit 0
fi

# Refuse to touch a Torre-owned destination, and fail before spending a build.
if torre_owns_destination && ! $force; then
    bad "piloto es propiedad de la Torre; actualizalo vía torre-control (o --force para desarrollo)"
    echo "    $torre_piloto no se tocó: la Torre conserva su manifiesto verificable."
    echo "    Con --force la Torre va a reportar esa entrada como modificada hasta su próxima instalación."
    exit 1
fi

# Build into a temporary name first: a failed build must never replace a working binary.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
(cd "$SRC" && go build -o "$tmp" .)
ok "compilado"

mkdir -p "$BIN"
install -m 0755 "$tmp" "$BIN/piloto"
ok "instalado en $BIN/piloto"

if ! command -v piloto >/dev/null 2>&1; then
    echo
    echo "  ~ $BIN no está en tu PATH. Agregá esto a tu shell:"
    echo
    echo "      export PATH=\"\$PATH:$BIN\""
    echo
    echo "    Sin eso, el orquestador y los agentes no van a encontrar piloto."
fi

echo
echo "Listo. Probalo desde cualquier repo con un plan:"
echo
echo "  piloto interruptor estado    interruptor, rondas y tope"
echo "  piloto despegar              propone los vuelos posibles y pide aprobación"
echo "  piloto informe               resumen de la corrida"
