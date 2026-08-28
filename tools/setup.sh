#!/usr/bin/env bash
# setup.sh — Install and update the user-owned agent workspace on this machine.
#
#   ./tools/setup.sh                 interactive menu
#   ./tools/setup.sh --install       skills only (Tower off)
#   ./tools/setup.sh --with-tower    skills + Control Tower
#   ./tools/setup.sh --update        update whatever is already installed
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
# The menu is plain Bash on purpose. It needs no runtime beyond the shell that
# is already running it, so it works on a machine that has nothing else yet.
#
# Idempotent. Run it as often as you like.

set -uo pipefail

readonly REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TOWER_REMOTE="${TOWER_REMOTE:-https://github.com/achangkuon/control-tower.git}"
TOWER_DIR="${TOWER_DIR:-$HOME/projects/control-tower/Main}"
HOME_DIR="${SETUP_HOME:-$HOME}"

readonly BLOCK_START="<!-- SESSION-SKILL-ARCHITECTURE:MANUAL -->"
readonly BLOCK_END="<!-- /SESSION-SKILL-ARCHITECTURE:MANUAL -->"

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

if [[ -t 1 ]]; then
    C_RESET=$'\033[0m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'
    C_OK=$'\033[32m';   C_WARN=$'\033[33m'; C_BAD=$'\033[31m'; C_SEL=$'\033[36m'
else
    C_RESET=""; C_DIM=""; C_BOLD=""; C_OK=""; C_WARN=""; C_BAD=""; C_SEL=""
fi

ok()   { printf '  %s✓%s %s\n' "$C_OK" "$C_RESET" "$1"; }
warn() { printf '  %s~%s %s\n' "$C_WARN" "$C_RESET" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$C_BAD" "$C_RESET" "$1" >&2; }
step() { printf '\n%s%s%s\n' "$C_BOLD" "$1" "$C_RESET"; }

# ─────────────────────────────────────────────────────────────── state ──────

present_agents() {
    local agent
    for agent in "${AGENT_KEYS[@]}"; do
        [[ -d "$HOME_DIR/$(agent_marker "$agent")" ]] && printf '%s\n' "$agent"
    done
    return 0
}

blocks_missing() {
    local agent file count=0
    while read -r agent; do
        [[ -z "$agent" ]] && continue
        file="$HOME_DIR/$(agent_instruction "$agent")"
        if [[ ! -f "$file" ]] || ! grep -qF "$BLOCK_START" "$file" 2>/dev/null; then
            count=$((count + 1))
        fi
    done < <(present_agents)
    echo "$count"
}

tower_installed() {
    [[ -x "${TORRE_BIN_DIR:-$HOME/.local/bin}/torre" ]] || command -v torre >/dev/null 2>&1
}

skills_state() {
    local head count
    head="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo '?')"
    count="$(find "$REPO/skills" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"

    if [[ "$(blocks_missing)" != "0" ]]; then
        printf '%s · %s skills · %ssin instalar%s' "$head" "$count" "$C_WARN" "$C_RESET"
    elif python3 "$REPO/tools/install.py" --check --home "$HOME_DIR" >/dev/null 2>&1; then
        printf '%s · %s skills · %sal día%s' "$head" "$count" "$C_OK" "$C_RESET"
    else
        printf '%s · %s skills · %shay cambios sin aplicar%s' "$head" "$count" "$C_WARN" "$C_RESET"
    fi
}

tower_state() {
    if tower_installed; then
        printf '%sinstalada%s · %s' "$C_OK" "$C_RESET" "$TOWER_DIR"
    elif [[ -d "$TOWER_DIR/.git" ]]; then
        printf '%sdescargada, sin instalar%s' "$C_WARN" "$C_RESET"
    else
        printf '%sno instalada%s — las skills de Torre usan handoff manual' "$C_DIM" "$C_RESET"
    fi
}

gentle_state() {
    if command -v gentle-ai >/dev/null 2>&1; then
        printf '%s %s(externo — se actualiza con brew)%s' \
            "$(gentle-ai --version 2>/dev/null | head -1 | awk '{print $NF}')" "$C_DIM" "$C_RESET"
    else
        printf '%sausente%s — instalalo por su canal oficial' "$C_WARN" "$C_RESET"
    fi
}

# ────────────────────────────────────────────────────────────── actions ─────

require() {
    local missing=0 cmd hint
    while [[ $# -gt 0 ]]; do
        cmd="${1%%:*}"; hint="${1#*:}"; shift
        if command -v "$cmd" >/dev/null 2>&1; then
            ok "$cmd"
        else
            bad "falta $cmd — $hint"
            missing=1
        fi
    done
    return $missing
}

seed_blocks() {
    local mode="${1:-write}" agent file pending=0
    step "Bloque de ruteo"
    while read -r agent; do
        [[ -z "$agent" ]] && continue
        file="$HOME_DIR/$(agent_instruction "$agent")"

        if [[ -f "$file" ]] && grep -qF "$BLOCK_START" "$file" 2>/dev/null; then
            ok "$agent — bloque ya presente"
            continue
        fi
        if [[ "$mode" != "write" ]]; then
            warn "$agent — falta el bloque en $file"
            pending=$((pending + 1))
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
    done < <(present_agents)
    return 0
}

pull_repo() {
    local dir="$1" label="$2"
    if ! git -C "$dir" remote get-url origin >/dev/null 2>&1; then
        warn "$label — sin remoto; se usa el checkout local"
        return 0
    fi
    if git -C "$dir" pull --ff-only --quiet 2>/dev/null; then
        ok "$label — al día en $(git -C "$dir" rev-parse --short HEAD)"
    else
        warn "$label — no se pudo hacer fast-forward; se usa el checkout actual"
    fi
    return 0
}

install_skills() {
    local mode="${1:-write}" status
    step "Skills"
    [[ "$mode" == "write" ]] && pull_repo "$REPO" "skills"

    local flags=()
    [[ "$mode" == "check" ]]   && flags=(--check)
    [[ "$mode" == "dry-run" ]] && flags=(--dry-run)

    python3 "$REPO/tools/install.py" "${flags[@]}" --home "$HOME_DIR"
    status=$?
    if [[ $status -eq 0 ]]; then
        ok "skills en orden"
        return 0
    fi
    if [[ "$mode" == "check" && $status -eq 1 ]]; then
        warn "hay cambios en el repositorio que no están aplicados"
        return 0
    fi
    bad "la instalación de skills falló (exit $status)"
    return "$status"
}

fetch_tower() {
    if [[ -d "$TOWER_DIR/.git" ]]; then
        pull_repo "$TOWER_DIR" "Torre"
        return 0
    fi
    mkdir -p "$(dirname "$TOWER_DIR")"
    if git clone --quiet "$TOWER_REMOTE" "$TOWER_DIR"; then
        ok "Torre clonada en $TOWER_DIR"
        return 0
    fi
    bad "no se pudo clonar $TOWER_REMOTE"
    echo "      Es un repositorio privado: pedí acceso, o exportá TOWER_REMOTE"
    echo "      con una URL a la que sí llegues."
    return 1
}

install_tower() {
    local mode="${1:-write}"
    step "Torre de Control"

    require "bun:la Torre corre sobre Bun — https://bun.sh" \
            "jq:la Torre lo usa para editar configuración JSON" || return 1

    if [[ "$mode" == "check" ]]; then
        if [[ -d "$TOWER_DIR/.git" ]]; then
            bash "$TOWER_DIR/install.sh" --check || warn "la Torre reporta instalación incompleta"
        else
            warn "la Torre no está descargada en $TOWER_DIR"
        fi
        return 0
    fi
    if [[ "$mode" == "dry-run" ]]; then
        warn "SE DESCARGARÍA y ejecutaría $TOWER_DIR/install.sh"
        return 0
    fi

    fetch_tower || return 1
    bash "$TOWER_DIR/install.sh" || { bad "el instalador de la Torre falló"; return 1; }
    ok "Torre instalada"
    return 0
}

preflight() {
    step "Requisitos"
    require "git:instalalo con tu gestor de paquetes" \
            "python3:requerido por tools/install.py" || return 1

    step "Gentle AI (producto externo — no se instala desde acá)"
    if command -v gentle-ai >/dev/null 2>&1; then
        ok "gentle-ai $(gentle-ai --version 2>/dev/null | head -1 | awk '{print $NF}')"
    else
        warn "gentle-ai no está instalado"
        echo "      Instalalo por su canal oficial, no desde este script:"
        echo "        brew tap gentleman-programming/tap && brew install gentle-ai"
        echo "        gentle-ai install"
        echo "      Las skills propias funcionan sin él, pero las genéricas"
        echo "      (sdd-*, judgment-day, branch-pr) vienen de ahí."
    fi

    step "Agentes detectados"
    local found=0 agent
    for agent in "${AGENT_KEYS[@]}"; do
        if [[ -d "$HOME_DIR/$(agent_marker "$agent")" ]]; then
            ok "$agent"; found=1
        else
            warn "$agent — ausente, se omite"
        fi
    done
    if [[ $found -eq 0 ]]; then
        bad "no hay ningún agente instalado; instalá pi, claude, opencode o codex"
        return 1
    fi
    return 0
}

run_install()       { preflight && seed_blocks write && install_skills write; }
run_install_tower() { run_install && install_tower write; }
run_update_skills() { preflight && seed_blocks write && install_skills write; }
run_update_tower()  {
    if ! tower_installed && [[ ! -d "$TOWER_DIR/.git" ]]; then
        step "Torre de Control"
        bad "no está instalada — usá «Instalar skills + Torre» primero"
        return 1
    fi
    install_tower write
}
run_update() {
    preflight || return 1
    seed_blocks write
    install_skills write || return 1
    if tower_installed || [[ -d "$TOWER_DIR/.git" ]]; then
        install_tower write
    else
        step "Torre de Control"
        warn "no está instalada — nada que actualizar"
    fi
    return 0
}
run_diagnose() {
    preflight
    seed_blocks check
    install_skills check
    install_tower check
    return 0
}

# ───────────────────────────────────────────────────────────────── menu ─────

MENU_LABELS=(
    "Instalar skills                (Torre apagada)"
    "Instalar skills + Torre"
    "Actualizar skills"
    "Actualizar Torre"
    "Actualizar todo"
    "Diagnosticar"
    "Salir"
)
MENU_ACTIONS=(
    run_install
    run_install_tower
    run_update_skills
    run_update_tower
    run_update
    run_diagnose
    quit
)

draw_menu() {
    local selected="$1" i
    clear 2>/dev/null || true
    printf '\n'
    printf '  %s╭──────────────────────────────────────────────╮%s\n' "$C_SEL" "$C_RESET"
    printf '  %s│%s  %sPuesto de trabajo — skills + Torre%s          %s│%s\n' \
        "$C_SEL" "$C_RESET" "$C_BOLD" "$C_RESET" "$C_SEL" "$C_RESET"
    printf '  %s╰──────────────────────────────────────────────╯%s\n\n' "$C_SEL" "$C_RESET"

    printf '  %sEstado%s\n' "$C_BOLD" "$C_RESET"
    printf '    skills      %s\n' "$(skills_state)"
    printf '    Torre       %s\n' "$(tower_state)"
    printf '    gentle-ai   %s\n' "$(gentle_state)"
    printf '    agentes     %s\n\n' "$(present_agents | paste -sd' ' -)"

    for i in "${!MENU_LABELS[@]}"; do
        if [[ $i -eq $selected ]]; then
            printf '  %s› %s%s\n' "$C_SEL" "${MENU_LABELS[$i]}" "$C_RESET"
        else
            printf '    %s\n' "${MENU_LABELS[$i]}"
        fi
    done

    printf '\n  %s↑↓ o j/k mover · enter elegir · q salir%s\n' "$C_DIM" "$C_RESET"
}

menu() {
    local selected=0 key rest action last=$(( ${#MENU_LABELS[@]} - 1 ))
    while true; do
        draw_menu "$selected"
        IFS= read -rsn1 key || return 0
        case "$key" in
            $'\e')
                rest=""
                read -rsn2 -t 0.01 rest
                case "$rest" in
                    '[A') selected=$(( selected > 0 ? selected - 1 : last )) ;;
                    '[B') selected=$(( selected < last ? selected + 1 : 0 )) ;;
                esac
                ;;
            k) selected=$(( selected > 0 ? selected - 1 : last )) ;;
            j) selected=$(( selected < last ? selected + 1 : 0 )) ;;
            q) clear 2>/dev/null || true; return 0 ;;
            "")
                action="${MENU_ACTIONS[$selected]}"
                [[ "$action" == "quit" ]] && { clear 2>/dev/null || true; return 0; }
                clear 2>/dev/null || true
                "$action" || true
                printf '\n  %sEnter para volver al menú%s ' "$C_DIM" "$C_RESET"
                read -r _ || return 0
                ;;
        esac
    done
}

# ───────────────────────────────────────────────────────────────── entry ────

if [[ $# -eq 0 ]]; then
    if [[ -t 0 && -t 1 ]]; then
        menu
        exit 0
    fi
    echo "sin TTY: pasá un flag explícito. Ver --help" >&2
    exit 2
fi

case "$1" in
    --install)     run_install ;;
    --with-tower)  run_install_tower ;;
    --update)      run_update ;;
    --check)       run_diagnose ;;
    --dry-run)     preflight && seed_blocks check && install_skills dry-run && install_tower dry-run ;;
    -h|--help)     sed -n '2,29p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
    *)             echo "flag desconocido: $1 — ver --help" >&2; exit 2 ;;
esac
