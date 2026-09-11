#!/usr/bin/env bash
# Builds radar and installs it on PATH.
#
# radar belongs to agent-workflows, not to the Tower engine: it reads the planning data
# and never touches seats, processes, or delivery. This installer lives beside the skill
# installer for that reason — each installer owns only its own box.
#
#   ./install-radar.sh            build and install
#   ./install-radar.sh --check    diagnose only, touch nothing
#
# Destination follows the same convention as install.sh: $TORRE_BIN_DIR, else ~/.local/bin.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/radar" && pwd)"
BIN="${TORRE_BIN_DIR:-$HOME/.local/bin}"

check_only=false
[[ "${1:-}" == "--check" ]] && check_only=true

ok()  { echo "  ✓ $1"; }
bad() { echo "  ✗ $1" >&2; }

echo "radar — instalación"
echo

if ! command -v go >/dev/null 2>&1; then
    bad "go no está instalado. radar es un módulo Go y se compila desde fuente."
    echo "    Instalalo desde https://go.dev/dl/ y volvé a correr esto."
    exit 1
fi
ok "go $(go version | awk '{print $3}')"

if $check_only; then
    if [[ -x "$BIN/radar" ]]; then
        ok "instalado en $BIN/radar ($("$BIN/radar" --version 2>/dev/null || echo 'sin --version'))"
    else
        bad "no instalado en $BIN/radar"
    fi
    command -v radar >/dev/null 2>&1 && ok "radar está en PATH" || bad "radar NO está en PATH"
    exit 0
fi

# Build into a temporary name first: a failed build must never replace a working binary.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
(cd "$SRC" && go build -o "$tmp" .)
ok "compilado"

mkdir -p "$BIN"
install -m 0755 "$tmp" "$BIN/radar"
ok "instalado en $BIN/radar"

if ! command -v radar >/dev/null 2>&1; then
    echo
    echo "  ~ $BIN no está en tu PATH. Agregá esto a tu shell:"
    echo
    echo "      export PATH=\"\$PATH:$BIN\""
    echo
    echo "    Sin eso, los agentes y el hook pre-commit no van a encontrar radar."
fi

echo
echo "Listo. Probalo desde cualquier repo con un plan:"
echo
echo "  radar check     valida openspec/plan.yaml contra el repo"
echo "  radar status    estado, colas por Zona y asientos compatibles"
echo "  radar render    regenera openspec/ROADMAP.md"
