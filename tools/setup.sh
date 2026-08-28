#!/usr/bin/env bash
# setup.sh — Install the user-owned agent workspace on this machine.
#
#   ./tools/setup.sh                 skills only (Tower off)
#   ./tools/setup.sh --with-tower    skills + Control Tower
#   ./tools/setup.sh --check         diagnose only, mutate nothing
#   ./tools/setup.sh --dry-run       print what would change, write nothing
#
# Scope, deliberately narrow — this installer owns exactly two things:
#
#   1. the user-owned skills, from this repository
#   2. the Control Tower, from its own repository (opt-in)
#
# Gentle AI is NOT installed here. It is a separate product with its own
# binary, its own installer and its own update authority. This script only
# checks that it is present and points at its own instructions. Installing or
# updating it from here would fork its release channel and defeat `gentle-ai
# sync`.
#
# Each half keeps its own installer: skills go through `tools/install.py`, the
# Tower through its `install.sh`. This script composes them in the one order
# that is safe — least specific first — and never reimplements either.
#
# Idempotent. Run it as often as you like.

set -euo pipefail

readonly REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TOWER_REMOTE="${TOWER_REMOTE:-https://github.com/achangkuon/control-tower.git}"
TOWER_DIR="${TOWER_DIR:-$HOME/projects/control-tower/Main}"
HOME_DIR="${SETUP_HOME:-$HOME}"

# Instruction file per agent, keyed by the directory that proves the agent is
# installed. Seeding an agent that is not here would litter the machine.
readonly AGENT_KEYS=(claude pi opencode codex)
agent_marker() {
    case "$1" in
        claude)   echo ".claude" ;;
        pi)       echo ".pi" ;;
        opencode) echo ".config/opencode" ;;
        codex)    echo ".codex" ;;
    esac
}
agent_instruction() {
    case "$1" in
        claude)   echo ".claude/CLAUDE.md" ;;
        pi)       echo ".pi/agent/APPEND_SYSTEM.md" ;;
        opencode) echo ".config/opencode/AGENTS.md" ;;
        codex)    echo ".codex/AGENTS.md" ;;
    esac
}

readonly BLOCK_START="<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
readonly BLOCK_END="<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"

with_tower=false
check_only=false
dry_run=false

for arg in "$@"; do
    case "$arg" in
        --with-tower) with_tower=true ;;
        --check)      check_only=true ;;
        --dry-run)    dry_run=true ;;
        -h|--help)    sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            echo "unknown flag: $arg" >&2; exit 2 ;;
    esac
done

if $check_only && $dry_run; then
    echo "--check and --dry-run are mutually exclusive" >&2
    exit 2
fi

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m~\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ── 1 · Requirements ─────────────────────────────────────────────────────────
step "Requisitos"

missing=0
need() {
    if command -v "$1" >/dev/null 2>&1; then
        ok "$1"
    else
        bad "falta $1 — $2"
        missing=1
    fi
}

need git "instalalo con tu gestor de paquetes"
need python3 "requerido por tools/install.py"
if $with_tower; then
    need bun "la Torre corre sobre Bun — https://bun.sh"
    need jq "la Torre lo usa para editar configuración JSON"
fi

if [[ $missing -eq 1 ]]; then
    echo
    bad "instalá lo que falta y volvé a correr esto"
    exit 1
fi

# ── 2 · Gentle AI — checked, never installed ────────────────────────────────
step "Gentle AI (producto externo — no se instala desde acá)"

if command -v gentle-ai >/dev/null 2>&1; then
    ok "gentle-ai $(gentle-ai --version 2>/dev/null | head -1)"
else
    warn "gentle-ai no está instalado"
    echo "      Instalalo por su canal oficial, no desde este script:"
    echo "        brew tap gentleman-programming/tap && brew install gentle-ai"
    echo "        gentle-ai install"
    echo "      Las skills de sesión y de Torre funcionan sin él, pero las"
    echo "      genéricas (sdd-*, judgment-day, branch-pr) vienen de ahí."
fi

# ── 3 · Which agents live here ──────────────────────────────────────────────
step "Agentes detectados"

present=()
for agent in "${AGENT_KEYS[@]}"; do
    if [[ -d "$HOME_DIR/$(agent_marker "$agent")" ]]; then
        present+=("$agent")
        ok "$agent"
    else
        warn "$agent — ausente, se omite"
    fi
done

if [[ ${#present[@]} -eq 0 ]]; then
    echo
    bad "no hay ningún agente instalado; instalá al menos uno (pi, claude, opencode o codex)"
    exit 1
fi

# ── 4 · Seed the routing block ──────────────────────────────────────────────
# `tools/install.py` replaces the content of this block but refuses to invent
# the block itself: it will not guess where inside someone's instruction file
# the routing belongs. On a fresh machine the block does not exist yet, so we
# append an empty one and let the installer fill it. Existing content is never
# rewritten — only appended to, and only after a backup.
step "Bloque de ruteo"

seed_pending=0
for agent in "${present[@]}"; do
    file="$HOME_DIR/$(agent_instruction "$agent")"

    if [[ -f "$file" ]] && grep -qF "$BLOCK_START" "$file"; then
        ok "$agent — bloque ya presente"
        continue
    fi

    if $check_only; then
        bad "$agent — falta el bloque en $file"
        seed_pending=$((seed_pending + 1))
        continue
    fi
    if $dry_run; then
        warn "$agent — SE AGREGARÍA el bloque en $file"
        seed_pending=$((seed_pending + 1))
        continue
    fi

    mkdir -p "$(dirname "$file")"
    if [[ -f "$file" ]]; then
        cp "$file" "$file.bak.$(date +%Y%m%d-%H%M%S)"
    else
        : > "$file"
    fi
    printf '\n%s\n%s\n' "$BLOCK_START" "$BLOCK_END" >> "$file"
    ok "$agent — bloque agregado en $file"
done

# ── 5 · Skills ──────────────────────────────────────────────────────────────
step "Skills"

if git -C "$REPO" remote get-url origin >/dev/null 2>&1; then
    if $check_only || $dry_run; then
        warn "se omite el git pull en modo lectura"
    elif git -C "$REPO" pull --ff-only --quiet 2>/dev/null; then
        ok "repositorio actualizado"
    else
        warn "no se pudo hacer fast-forward; se instala lo que hay en el checkout"
    fi
else
    warn "este repositorio no tiene remoto; se instala el checkout local"
fi

install_flag=()
$check_only && install_flag=(--check)
$dry_run    && install_flag=(--dry-run)

if [[ $seed_pending -gt 0 ]]; then
    warn "$seed_pending archivo(s) de instrucciones todavía sin bloque"
    echo "      No se puede previsualizar la instalación de skills hasta que exista."
    echo "      Corré sin --check/--dry-run para sembrarlo e instalar."
    skip_skills=true
else
    skip_skills=false
fi

if $skip_skills; then
    :
elif python3 "$REPO/tools/install.py" "${install_flag[@]}" --home "$HOME_DIR"; then
    ok "skills en orden"
else
    status=$?
    if $check_only && [[ $status -eq 1 ]]; then
        warn "hay deriva entre el repositorio y las copias instaladas"
    else
        bad "la instalación de skills falló (exit $status)"
        exit $status
    fi
fi

# ── 6 · Control Tower — opt-in ──────────────────────────────────────────────
# The Tower is optional by design. The skills describe how work is done and
# must keep working with the Tower absent; `torre-control-entregas` detects the
# missing MCP on its own and falls back to manual copy-paste handoff.
if ! $with_tower; then
    step "Torre de Control"
    warn "omitida — corré con --with-tower para instalarla"
    echo "      Sin ella, las skills de Torre operan en handoff manual."
else
    step "Torre de Control"

    if [[ -d "$TOWER_DIR/.git" ]]; then
        if $check_only || $dry_run; then
            ok "checkout presente en $TOWER_DIR"
        elif git -C "$TOWER_DIR" pull --ff-only --quiet 2>/dev/null; then
            ok "actualizada en $TOWER_DIR"
        else
            warn "no se pudo hacer fast-forward en $TOWER_DIR; se usa el checkout actual"
        fi
    elif $check_only || $dry_run; then
        warn "SE CLONARÍA $TOWER_REMOTE en $TOWER_DIR"
    else
        mkdir -p "$(dirname "$TOWER_DIR")"
        if git clone --quiet "$TOWER_REMOTE" "$TOWER_DIR"; then
            ok "clonada en $TOWER_DIR"
        else
            bad "no se pudo clonar $TOWER_REMOTE"
            echo "      Es un repositorio privado: pedí acceso, o exportá"
            echo "      TOWER_REMOTE con una URL a la que sí llegues."
            exit 1
        fi
    fi

    if $check_only; then
        bash "$TOWER_DIR/install.sh" --check || warn "la Torre reporta instalación incompleta"
    elif $dry_run; then
        warn "SE EJECUTARÍA $TOWER_DIR/install.sh"
    else
        bash "$TOWER_DIR/install.sh"
        ok "Torre instalada"
    fi
fi

# ── 7 · Summary ─────────────────────────────────────────────────────────────
step "Listo"
echo "  Agentes:  ${present[*]}"
echo "  Skills:   $REPO"
if $with_tower; then
    echo "  Torre:    $TOWER_DIR — encendida"
else
    echo "  Torre:    no instalada — las skills de Torre usan handoff manual"
fi
echo
echo "  Reiniciá tus sesiones de agente para que recarguen las skills."
