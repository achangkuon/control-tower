#!/usr/bin/env bash
# Instala la Torre de Control en esta máquina.
#
#   ./install.sh            instala o actualiza
#   ./install.sh --check    solo diagnostica, no toca nada
#
# Idempotente: correlo las veces que quieras. Hace backup de opencode.json
# antes de tocarlo y verifica que no se haya perdido nada.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
    install|diagnose|upgrade|rollback|uninstall)
        exec bun "$SRC/install/lifecycle.mjs" "$@"
        ;;
esac
if [[ "${1:-}" == "--provision-main" || "${1:-}" == "--bootstrap-admin" ]]; then
    command="${1#--}"; shift
    exec env CONTROL_TOWER_CORE="$SRC/core.mjs" "$SRC/bin/torre" "$command" "$@"
fi
OC_DIR="${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}"
OC_JSON="$OC_DIR/opencode.json"
PLUGINS="$OC_DIR/plugins"
BIN="${TORRE_BIN_DIR:-$HOME/.local/bin}"

check_only=false
[[ "${1:-}" == "--check" ]] && check_only=true

ok()   { echo "  ✓ $1"; }
bad()  { echo "  ✗ $1" >&2; }

echo "Torre de Control — instalación"
echo

# ── Requisitos ───────────────────────────────────────────────────────────────
faltan=0
for cmd in bun git jq; do
    if command -v "$cmd" >/dev/null 2>&1; then
        ok "$cmd"
    else
        bad "falta $cmd"
        faltan=1
    fi
done
# python3 solo hace falta para el validador de briefs, no para la torre.
command -v python3 >/dev/null 2>&1 && ok "python3 (validador de briefs)" \
    || echo "  ~ sin python3: el validador de briefs no va a correr"

if [[ $faltan -eq 1 ]]; then
    echo
    bad "instalá lo que falta y volvé a correr esto"
    exit 1
fi

[[ -d "$OC_DIR" ]] || { bad "no existe $OC_DIR — ¿está instalado opencode?"; exit 1; }
ok "opencode en $OC_DIR"

if $check_only; then
    echo
    echo "Estado actual:"
    [[ -f "$PLUGINS/tower-spike.js" ]] && ok "plugin instalado" || bad "plugin sin instalar"
    [[ -x "$BIN/torre" ]] && ok "comando torre instalado" || bad "comando torre sin instalar"
    jq -e '.mcp["control-tower"]' "$OC_JSON" >/dev/null 2>&1 \
        && ok "MCP registrado" || bad "MCP sin registrar"
    # El método se diagnostica acá también: un motor instalado sin skills ni radar es
    # media instalación, y el usuario no tiene por qué descubrirlo al primer commit.
    [[ -d "$HOME/.claude/skills/chanks-2-planificador-granular" ]] \
        && ok "skills instaladas" || bad "skills sin instalar"
    command -v radar >/dev/null 2>&1 \
        && ok "radar en PATH" || bad "radar sin instalar o fuera del PATH"
    exit 0
fi

echo
echo "Instalando:"

# ── Plugin (el que despierta las sesiones) ──────────────────────────────────
mkdir -p "$PLUGINS"
cp "$SRC/plugin/tower-spike.js" "$PLUGINS/tower-spike.js"
ok "plugin → $PLUGINS/tower-spike.js"

# ── Comando torre ───────────────────────────────────────────────────────────
mkdir -p "$BIN"
cp "$SRC/bin/torre" "$BIN/torre"
chmod +x "$BIN/torre"
ok "comando → $BIN/torre"
case ":$PATH:" in
    *":$BIN:"*) ;;
    *) echo "  ~ $BIN no está en tu PATH; agregalo para usar 'torre'" ;;
esac

# ── Registro del MCP ────────────────────────────────────────────────────────
# Se hace con jq sobre una copia y se verifica contra el backup antes de
# reemplazar: es la configuración global del usuario, no un archivo cualquiera.
if [[ -f "$OC_JSON" ]]; then
    backup="$OC_JSON.bak.$(date +%Y%m%d-%H%M%S)"
    cp "$OC_JSON" "$backup"
else
    echo '{}' > "$OC_JSON"
    backup=""
fi

tmp=$(mktemp)
jq --arg bun "$(command -v bun)" --arg mcp "$SRC/mcp.mjs" \
   '.mcp["control-tower"] = {"command": [$bun, $mcp], "type": "local"}' \
   "$OC_JSON" > "$tmp"

if ! jq empty "$tmp" 2>/dev/null; then
    bad "el JSON resultante es inválido; no toqué nada"
    rm -f "$tmp"
    exit 1
fi

if [[ -n "$backup" ]]; then
    # Todo lo que no sea la clave nueva tiene que seguir idéntico.
    if ! diff -q <(jq -S 'del(.mcp["control-tower"])' "$tmp") \
                 <(jq -S 'del(.mcp["control-tower"])' "$backup") >/dev/null; then
        bad "la config cambió más allá de la clave nueva; aborté. Backup: $backup"
        rm -f "$tmp"
        exit 1
    fi
fi

mv "$tmp" "$OC_JSON"
ok "MCP registrado en opencode.json${backup:+ (backup: $(basename "$backup"))}"

# ── El método: skills y radar ────────────────────────────────────────────────
# La Torre de Control como producto son tres piezas: el motor (arriba), el método
# (agent-workflows) y el dato de planificación que el método lee. El motor no depende
# del método —no tiene una sola referencia a plan.yaml ni a radar— así que cada pieza
# trae su propio instalador y este archivo sólo los compone. Ninguno pisa al otro.
echo
echo "Método (agent-workflows)"
echo

if command -v python3 >/dev/null 2>&1; then
    if python3 "$SRC/agent-workflows/tools/install.py" >/dev/null 2>&1; then
        ok "skills instaladas en los agentes"
    else
        bad "las skills no se instalaron; corré agent-workflows/tools/install.py para ver por qué"
    fi
else
    echo "  ~ sin python3: las skills no se instalan. Instalalo y corré"
    echo "    agent-workflows/tools/install.py"
fi

if command -v go >/dev/null 2>&1; then
    if "$SRC/agent-workflows/tools/install-radar.sh" >/dev/null 2>&1; then
        ok "radar instalado en ${TORRE_BIN_DIR:-$HOME/.local/bin}/radar"
    else
        bad "radar no se instaló; corré agent-workflows/tools/install-radar.sh para ver por qué"
    fi
else
    echo "  ~ sin go: radar no se instala. Sin radar no hay validación del plan"
    echo "    ni puerta pre-commit. Instalá go y corré agent-workflows/tools/install-radar.sh"
fi

cat <<'EOF'

Listo. Para usarla:

  1. Abrí una sesión de opencode en el worktree principal (el orquestador)
     y otra en cada worktree de agente.
  2. Armá el repo:      torre on
  3. Cada sesión llama tower_register una vez, con su rol.
  4. Mirá el loop:      torre log
  5. Cortá cuando quieras:  torre off

Si 'torre' no aparece, abrí una terminal nueva.
Leé README.md para entender qué hace cada pieza.
EOF
