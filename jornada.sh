#!/usr/bin/env bash
# ============================================================
#  JORNADA - control-tower (gestor unico de inicio/fin de jornada)
#  Version bash: gemelo de jornada.ps1 para WSL / Linux / Mac.
# ============================================================
# Por defecto SOLO ACONSEJA (no toca tus ramas ni tus archivos):
#   PARTE 1 - DIAGNOSTICO    : estado del tronco + todos los worktrees.
#   PARTE 2 - PLAN DE ACCION : que hacer en cada uno, ordenado.
#
# Con flags, ademas EJECUTA lo seguro:
#   --ejecutar
#       pull --ff-only del tronco + rebase de los worktrees limpios que
#       solo estan atrasados (sin trabajo propio = sin riesgo de conflicto).
#   --reciclar <ruta-worktree> --nueva-rama <nombre> [--borrar-rama-vieja]
#       deja ese worktree en una rama nueva sacada del tronco fresco.
#
# El tronco (main/master) se autodetecta desde origin/HEAD. Forzalo con
# la variable de entorno JORNADA_TRUNK=<rama> si hiciera falta.
#
# Lo unico que corre siempre: git fetch (inofensivo). Saltealo con --sin-fetch.
#
# Ejemplos:
#   ./jornada.sh
#   ./jornada.sh --sin-fetch
#   ./jornada.sh --ejecutar
#   ./jornada.sh --reciclar /ruta/Worktrees/autonomous-continuation --nueva-rama feat/control-tower/x --borrar-rama-vieja
# ------------------------------------------------------------
set -u

# ---- Parseo de flags ----
SIN_FETCH=0; EJECUTAR=0; RECICLAR=""; NUEVA_RAMA=""; BORRAR_RAMA_VIEJA=0; MERGEAR_PR=""
while [ $# -gt 0 ]; do
    case "$1" in
        --sin-fetch)          SIN_FETCH=1 ;;
        --ejecutar)           EJECUTAR=1 ;;
        --reciclar)           RECICLAR="${2:-}"; shift ;;
        --nueva-rama)         NUEVA_RAMA="${2:-}"; shift ;;
        --borrar-rama-vieja)  BORRAR_RAMA_VIEJA=1 ;;
        --mergear-pr)         MERGEAR_PR="${2:-}"; shift ;;
        *) echo "Flag desconocido: $1"; exit 1 ;;
    esac
    shift
done

# ---- Colores (solo si la salida es una terminal) ----
if [ -t 1 ]; then
    C_RESET=$'\033[0m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_RED=$'\033[31m'; C_CYAN=$'\033[36m'; C_GRAY=$'\033[90m'; C_MAGENTA=$'\033[35m'
else
    C_RESET=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_CYAN=""; C_GRAY=""; C_MAGENTA=""
fi

# ---- WSL: convertir paths Windows (C:/...) a /mnt/c/... ----
# En Linux nativo o Git Bash los paths ya sirven; solo convertimos bajo WSL.
is_wsl() { grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; }
to_unix() {
    local p="$1"
    case "$p" in
        [A-Za-z]:*)
            if is_wsl; then
                if command -v wslpath >/dev/null 2>&1; then
                    wslpath -u "$p"
                else
                    local d; d="$(printf '%s' "${p:0:1}" | tr 'A-Z' 'a-z')"
                    echo "/mnt/$d/${p:3}"
                fi
            else
                echo "$p"
            fi ;;
        *) echo "$p" ;;
    esac
}

# ---- Helpers de git ----
git_count() { git -C "$1" rev-list --count "$2" 2>/dev/null; }
has_upstream() { git -C "$1" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; }
github_repo() {
    local url repo
    url="$(git -C "$1" remote get-url origin 2>/dev/null)" || return 1
    case "$url" in
        git@github.com:*) repo="${url#git@github.com:}" ;;
        https://github.com/*|ssh://git@github.com/*) repo="${url#*github.com/}" ;;
        *) return 1 ;;
    esac
    repo="${repo%.git}"; repo="${repo%/}"
    [[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || return 1
    printf '%s\n' "$repo"
}

# ---- Detectar el tronco (main/master) sin hardcodear ----
# Prioridad: JORNADA_TRUNK explicito -> origin/HEAD -> origin/master -> origin/main.
TRUNK=""; RTRUNK=""
detect_trunk() {
    local ref
    if [ -n "${JORNADA_TRUNK:-}" ]; then TRUNK="$JORNADA_TRUNK"
    elif ref="$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null)"; then
        TRUNK="${ref#refs/remotes/origin/}"
    elif git show-ref --verify --quiet refs/remotes/origin/master; then TRUNK="master"
    elif git show-ref --verify --quiet refs/remotes/origin/main;   then TRUNK="main"
    elif git show-ref --verify --quiet refs/heads/master;          then TRUNK="master"
    else TRUNK="main"; fi
    RTRUNK="origin/$TRUNK"
}

# Todo el trabajo de HEAD ya esta en el tronco? Primero usa patch-id local; si el
# contexto cambio durante el squash, valida el PR historico exacto en GitHub.
all_merged() {
    local path="$1" branch="$2" out repo local_head pr_data
    out="$(git -C "$path" cherry "$RTRUNK" HEAD 2>/dev/null)" || return 2
    [ -z "$out" ] && return 0
    echo "$out" | grep -q '^+' || return 0

    command -v gh >/dev/null 2>&1 || return 1
    repo="$(github_repo "$path")" || return 1
    local_head="$(git -C "$path" rev-parse HEAD 2>/dev/null)" || return 2
    pr_data="$(gh pr list --repo "$repo" --head "$branch" --base "$TRUNK" --state all \
        --json state,baseRefName,headRefName,headRepository,headRefOid \
        --limit 2 --jq '.[] | [.state,.baseRefName,.headRefName,.headRepository.nameWithOwner,.headRefOid] | @tsv' 2>/dev/null)" || return 1
    [ "$(printf '%s\n' "$pr_data" | sed '/^$/d' | wc -l | tr -d ' ')" -eq 1 ] || return 1

    local pr_state pr_base pr_head pr_repo pr_head_oid
    IFS=$'\t' read -r pr_state pr_base pr_head pr_repo pr_head_oid <<< "$pr_data"
    [ "$pr_state" = "MERGED" ] && [ "$pr_base" = "$TRUNK" ] && [ "$pr_head" = "$branch" ] && \
        [ "$pr_head_oid" = "$local_head" ] && \
        [ "$(printf '%s' "$pr_repo" | tr '[:upper:]' '[:lower:]')" = "$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')" ]
}

# ---- Descubrir los worktrees (portable, sin rutas hardcodeadas) ----
PATHS=(); BRANCHES=()
discover_worktrees() {
    PATHS=(); BRANCHES=()
    local cur_path="" cur_branch="(detached)" line raw
    raw="$(git worktree list --porcelain 2>/dev/null)" || {
        echo "${C_RED}ABORTADO: no se pudo descubrir la lista de worktrees.${C_RESET}" >&2
        return 1
    }
    while IFS= read -r line; do
        case "$line" in
            worktree\ *)
                if [ -n "$cur_path" ]; then PATHS+=("$cur_path"); BRANCHES+=("$cur_branch"); fi
                cur_path="$(to_unix "${line#worktree }")"; cur_branch="(detached)" ;;
            branch\ *)
                cur_branch="${line#branch refs/heads/}" ;;
        esac
    done <<< "$raw"
    if [ -n "$cur_path" ]; then PATHS+=("$cur_path"); BRANCHES+=("$cur_branch"); fi
}

# ---- Clasificar el estado de cada worktree ----
# Cada elemento de ESTADOS: name|path|branch|agente|sit|dirtyN|behind|unpushed|hasup
ESTADOS=()
compute_estados() {
    ESTADOS=()
    local i path branch name agente dirty dirtyN ahead behind unpushed hasup sit
    for i in "${!PATHS[@]}"; do
        path="${PATHS[$i]}"; branch="${BRANCHES[$i]}"
        name="$(basename "$path")"; agente="${name#U-}"
        dirty="$(git -C "$path" status --porcelain 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo validar el estado de '$path'.${C_RESET}"; exit 1; }
        dirtyN=0; [ -n "$dirty" ] && dirtyN="$(printf '%s\n' "$dirty" | grep -c '')"
        ahead="$(git_count "$path" "$RTRUNK..HEAD")" || { echo "${C_RED}ABORTADO: no se pudo comparar '$branch' con $RTRUNK.${C_RESET}"; exit 1; }
        behind="$(git_count "$path" "HEAD..$RTRUNK")" || { echo "${C_RED}ABORTADO: no se pudo comparar $RTRUNK con '$branch'.${C_RESET}"; exit 1; }
        if has_upstream "$path"; then
            hasup=1; unpushed="$(git_count "$path" '@{u}..HEAD')" || { echo "${C_RED}ABORTADO: no se pudo comparar '$branch' con su upstream.${C_RESET}"; exit 1; }
        else
            # Sin upstream no hay evidencia de que la rama este publicada.
            # Cuenta el trabajo propio como pendiente de primer push.
            hasup=0; unpushed="$ahead"
        fi

        if [ "$branch" = "$TRUNK" ]; then
            if [ -n "$dirty" ]; then sit="MAIN_DIRTY"
            elif [ "$behind" -gt 0 ]; then sit="MAIN_BEHIND"
            else sit="MAIN_OK"; fi
        elif [ "$branch" = "(detached)" ]; then sit="DETACHED"
        elif [ -n "$dirty" ]; then sit="DIRTY"
        elif [ "$ahead" -gt 0 ]; then
            if all_merged "$path" "$branch"; then sit="MERGED"
            else
                merged_rc=$?
                [ "$merged_rc" -ne 2 ] || { echo "${C_RED}ABORTADO: no se pudo verificar si '$branch' esta mergeada.${C_RESET}"; exit 1; }
                if [ "$unpushed" -gt 0 ]; then sit="UNPUSHED"; else sit="PENDING_PR"; fi
            fi
        elif [ "$behind" -gt 0 ]; then sit="BEHIND"
        else sit="UPTODATE"; fi

        ESTADOS+=("$name|$path|$branch|$agente|$sit|$dirtyN|$behind|$unpushed|$hasup")
    done
}

# ============================================================
#  ARRANQUE
# ============================================================
if [ "$SIN_FETCH" -eq 0 ]; then
    echo "${C_GRAY}"
    echo "Fetch (refresca info del remoto; no toca tu trabajo)...${C_RESET}"
    git fetch --all --prune --quiet 2>/dev/null || { echo "${C_RED}ABORTADO: no se pudo actualizar la informacion remota.${C_RESET}"; exit 1; }
fi

detect_trunk
echo "${C_GRAY}Tronco detectado: ${TRUNK} (${RTRUNK})${C_RESET}"

discover_worktrees || exit 1
mainPath=""
for i in "${!BRANCHES[@]}"; do
    if [ "${BRANCHES[$i]}" = "$TRUNK" ]; then mainPath="${PATHS[$i]}"; break; fi
done
[ -z "$mainPath" ] && mainPath="${PATHS[0]}"

# ---- ACCION PUNTUAL: MERGEAR PR (requiere autorizacion explicita) ----
if [ -n "$MERGEAR_PR" ]; then
    echo; echo "${C_MAGENTA}========== MERGEAR PR VERIFICADO ==========${C_RESET}"
    command -v gh >/dev/null 2>&1 || { echo "${C_RED}ABORTADO: GitHub CLI (gh) no esta disponible.${C_RESET}"; exit 1; }
    MERGEAR_PR="$(to_unix "$MERGEAR_PR")"
    [ -d "$MERGEAR_PR" ] || { echo "${C_RED}ABORTADO: worktree inexistente: '$MERGEAR_PR'.${C_RESET}"; exit 1; }
    target_common="$(git -C "$MERGEAR_PR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || { echo "${C_RED}ABORTADO: el target no es un worktree Git valido.${C_RESET}"; exit 1; }
    jornada_common="$(git -C "$mainPath" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo identificar el repositorio de jornada.${C_RESET}"; exit 1; }
    [ "$(cd "$target_common" 2>/dev/null && pwd -P)" = "$(cd "$jornada_common" 2>/dev/null && pwd -P)" ] || { echo "${C_RED}ABORTADO: el worktree pertenece a otro repositorio.${C_RESET}"; exit 1; }
    merge_status="$(git -C "$MERGEAR_PR" status --porcelain 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo validar el estado del worktree.${C_RESET}"; exit 1; }
    [ -z "$merge_status" ] || { echo "${C_RED}ABORTADO: el worktree tiene cambios sin commitear.${C_RESET}"; exit 1; }
    pr_branch="$(git -C "$MERGEAR_PR" branch --show-current 2>/dev/null)"
    [ -n "$pr_branch" ] && [ "$pr_branch" != "$TRUNK" ] || { echo "${C_RED}ABORTADO: selecciona un worktree con rama de trabajo.${C_RESET}"; exit 1; }
    has_upstream "$MERGEAR_PR" || { echo "${C_RED}ABORTADO: '$pr_branch' no tiene upstream remoto.${C_RESET}"; exit 1; }
    local_ahead="$(git_count "$MERGEAR_PR" '@{u}..HEAD')" || { echo "${C_RED}ABORTADO: no se pudo validar HEAD contra upstream.${C_RESET}"; exit 1; }
    local_behind="$(git_count "$MERGEAR_PR" 'HEAD..@{u}')" || { echo "${C_RED}ABORTADO: no se pudo validar upstream contra HEAD.${C_RESET}"; exit 1; }
    [ "$local_ahead" -eq 0 ] && [ "$local_behind" -eq 0 ] || { echo "${C_RED}ABORTADO: HEAD y upstream no estan sincronizados en ambos sentidos.${C_RESET}"; exit 1; }
    repo="$(github_repo "$MERGEAR_PR")" || { echo "${C_RED}ABORTADO: origin no identifica un repositorio GitHub owner/repo valido.${C_RESET}"; exit 1; }
    remote_repo="$(gh repo view "$repo" --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo validar el repositorio GitHub '$repo'.${C_RESET}"; exit 1; }
    remote_repo_normalized="$(printf '%s' "$remote_repo" | tr '[:upper:]' '[:lower:]')"
    repo_normalized="$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')"
    [ "$remote_repo_normalized" = "$repo_normalized" ] || { echo "${C_RED}ABORTADO: el repositorio validado no coincide con origin.${C_RESET}"; exit 1; }
    local_head="$(git -C "$MERGEAR_PR" rev-parse HEAD 2>/dev/null)"
    pr_data="$(gh pr list --repo "$repo" --head "$pr_branch" --base "$TRUNK" --state open --json number,isDraft,mergeStateStatus,url,headRefOid --limit 2 --jq '.[] | [.number,.isDraft,.mergeStateStatus,.url,.headRefOid] | @tsv' 2>/dev/null)" || {
        echo "${C_RED}ABORTADO: no se pudo consultar GitHub. Revisa 'gh auth status'.${C_RESET}"; exit 1;
    }
    [ "$(printf '%s\n' "$pr_data" | sed '/^$/d' | wc -l | tr -d ' ')" -eq 1 ] || { echo "${C_RED}ABORTADO: se esperaba exactamente un PR abierto de '$pr_branch' hacia $TRUNK.${C_RESET}"; exit 1; }
    IFS=$'\t' read -r pr_number pr_draft pr_merge_state pr_url pr_head <<< "$pr_data"
    [ "$pr_draft" = "false" ] || { echo "${C_RED}ABORTADO: PR #$pr_number sigue en draft: $pr_url${C_RESET}"; exit 1; }
    [ "$pr_merge_state" = "CLEAN" ] || { echo "${C_RED}ABORTADO: PR #$pr_number no esta listo (estado: $pr_merge_state): $pr_url${C_RESET}"; exit 1; }
    [ "$pr_head" = "$local_head" ] || { echo "${C_RED}ABORTADO: el SHA remoto del PR no coincide con HEAD local.${C_RESET}"; exit 1; }
    echo "${C_CYAN}  PR #$pr_number verificado y listo: $pr_url${C_RESET}"
    if ! gh pr merge "$pr_number" --repo "$repo" --squash --match-head-commit "$local_head"; then echo "${C_RED}ABORTADO: GitHub rechazo el merge o cambio el HEAD validado.${C_RESET}"; exit 1; fi
    merged_data="$(gh pr view "$pr_number" --repo "$repo" --json state,isDraft --jq '[.state,.isDraft] | @tsv' 2>/dev/null)" || {
        echo "${C_RED}ABORTADO: no se pudo confirmar el estado final del PR #$pr_number.${C_RESET}"; exit 1;
    }
    IFS=$'\t' read -r merged_state merged_draft <<< "$merged_data"
    [ "$merged_state" = "MERGED" ] && [ "$merged_draft" = "false" ] || {
        echo "${C_RED}ABORTADO: PR #$pr_number no alcanzo el estado terminal MERGED (estado: $merged_state).${C_RESET}"; exit 1;
    }
    if ! git -C "$mainPath" fetch --all --prune --quiet; then
        echo "${C_RED}ABORTADO: el PR se mergeo, pero no se pudieron actualizar las referencias remotas.${C_RESET}"
        exit 1
    fi
    echo "${C_GREEN}  OK: PR #$pr_number mergeado. La rama queda intacta hasta reciclarla.${C_RESET}"
    compute_estados
fi

# ---- ACCION PUNTUAL: RECICLAR ----
if [ -n "$RECICLAR" ]; then
    echo; echo "${C_MAGENTA}========== RECICLAR WORKTREE ==========${C_RESET}"
    if [ -z "$NUEVA_RAMA" ]; then
        echo "${C_RED}ABORTADO: --reciclar necesita tambien --nueva-rama <nombre>.${C_RESET}"; exit 1
    fi
    RECICLAR="$(to_unix "$RECICLAR")"
    sucio="$(git -C "$RECICLAR" status --porcelain 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo validar el estado de '$RECICLAR'.${C_RESET}"; exit 1; }
    if [ -n "$sucio" ]; then
        echo "${C_RED}ABORTADO: '$RECICLAR' tiene cambios sin commitear. Cerralos o stash primero.${C_RESET}"
        echo "$sucio"; exit 1
    fi
    rama_vieja="$(git -C "$RECICLAR" branch --show-current 2>/dev/null)"
    if ! git -C "$RECICLAR" switch -c "$NUEVA_RAMA" "$RTRUNK" --no-track; then
        echo "${C_RED}ABORTADO: no se pudo crear '$NUEVA_RAMA' (ya existe?).${C_RESET}"; exit 1
    fi
    echo "${C_GREEN}  OK: '$RECICLAR' ahora en '$NUEVA_RAMA' (desde $RTRUNK).${C_RESET}"
    if [ "$BORRAR_RAMA_VIEJA" -eq 1 ] && [ -n "$rama_vieja" ] && [ "$rama_vieja" != "$TRUNK" ] && [ "$rama_vieja" != "$NUEVA_RAMA" ]; then
        cherry="$(git -C "$mainPath" cherry "$RTRUNK" "$rama_vieja" 2>/dev/null)" || { echo "${C_RED}ABORTADO: no se pudo verificar si '$rama_vieja' esta mergeada; no se borro.${C_RESET}"; exit 1; }
        if printf '%s\n' "$cherry" | grep -q '^+'; then
            echo "${C_YELLOW}  OJO: '$rama_vieja' tiene commits que NO estan en $TRUNK. La dejo intacta.${C_RESET}"
        else
            git -C "$mainPath" branch -D "$rama_vieja" >/dev/null 2>&1 || { echo "${C_RED}ABORTADO: no se pudo borrar la rama vieja '$rama_vieja'.${C_RESET}"; exit 1; }
            echo "${C_GREEN}  OK: rama vieja '$rama_vieja' borrada (su contenido ya esta en $TRUNK).${C_RESET}"
        fi
    fi
    discover_worktrees || exit 1
fi

compute_estados

# ---- EJECUTAR lo seguro ----
if [ "$EJECUTAR" -eq 1 ]; then
    echo; echo "${C_MAGENTA}========== EJECUTANDO LO SEGURO ==========${C_RESET}"
    for est in "${ESTADOS[@]}"; do
        IFS='|' read -r name path branch agente sit dirtyN behind unpushed hasup <<< "$est"
        if [ "$sit" = "MAIN_BEHIND" ]; then
            echo "${C_CYAN}  $TRUNK: pull --ff-only ...${C_RESET}"
            if git -C "$path" pull --ff-only --quiet; then echo "${C_GREEN}    OK: $TRUNK al dia.${C_RESET}"
            else echo "${C_RED}    FALLO el pull --ff-only de $TRUNK. Revisalo a mano.${C_RESET}"; fi
        elif [ "$sit" = "BEHIND" ]; then
            echo "${C_CYAN}  $name: rebase $RTRUNK ...${C_RESET}"
            if git -C "$path" rebase "$RTRUNK" --quiet 2>/dev/null; then
                echo "${C_GREEN}    OK: '$name' al dia con $TRUNK.${C_RESET}"
            else
                git -C "$path" rebase --abort 2>/dev/null
                echo "${C_RED}    CONFLICTO inesperado: aborte el rebase. Resolvelo a mano.${C_RESET}"
            fi
        fi
    done
    discover_worktrees; compute_estados
fi

# ============================================================
#  PARTE 1 - DIAGNOSTICO
# ============================================================
echo; echo "${C_CYAN}=============== PARTE 1: DIAGNOSTICO ===============${C_RESET}"
for est in "${ESTADOS[@]}"; do
    IFS='|' read -r name path branch agente sit dirtyN behind unpushed hasup <<< "$est"
    case "$sit" in
        MAIN_OK)     resumen="OK (al dia)"; color="$C_GREEN" ;;
        MAIN_BEHIND) resumen="$behind atras del remoto"; color="$C_YELLOW" ;;
        MAIN_DIRTY)  resumen="TIENE CAMBIOS (no se debe tocar)"; color="$C_RED" ;;
        DIRTY)       resumen="$dirtyN cambio(s) sin commitear"; color="$C_YELLOW" ;;
        UNPUSHED)    resumen="$unpushed commit(s) sin pushear"; color="$C_YELLOW" ;;
        PENDING_PR)  resumen="pusheado, falta mergear el PR"; color="$C_YELLOW" ;;
        MERGED)      resumen="rama ya mergeada (squash) -> reciclar"; color="$C_YELLOW" ;;
        BEHIND)      resumen="limpio, $behind atras de $TRUNK"; color="$C_YELLOW" ;;
        UPTODATE)    resumen="al dia, sin pendientes"; color="$C_GREEN" ;;
        DETACHED)    resumen="HEAD detached (sin rama)"; color="$C_RED" ;;
        *)           resumen="$sit"; color="$C_RESET" ;;
    esac
    printf "  ${C_GRAY}%-22s${C_RESET} [%s]\n" "$name" "$branch"
    printf "     ${color}-> %s${C_RESET}\n" "$resumen"
done

# ============================================================
#  PARTE 2 - PLAN DE ACCION
# ============================================================
echo; echo "${C_CYAN}=============== PARTE 2: PLAN DE ACCION ===============${C_RESET}"
paso=0
for est in "${ESTADOS[@]}"; do
    IFS='|' read -r n path branch ag sit dirtyN behind unpushed hasup <<< "$est"
    case "$sit" in
        UPTODATE)
            paso=$((paso+1))
            echo; echo "${C_GREEN}  $paso) $n - listo para arrancar tarea nueva:${C_RESET}"
            echo "${C_GREEN}       ./jornada.sh --reciclar \"$path\" --nueva-rama feat/$ag/<tarea>${C_RESET}" ;;
        MAIN_BEHIND)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $TRUNK - actualizar la carpeta de referencia:${C_RESET}"
            echo "${C_GREEN}       git -C \"$path\" pull --ff-only${C_RESET}"
            echo "${C_GRAY}       (o corre este script con --ejecutar y lo hace solo)${C_RESET}" ;;
        MAIN_DIRTY)
            paso=$((paso+1))
            echo; echo "${C_RED}  $paso) $TRUNK - TIENE CAMBIOS y NO se debe tocar. Revisa que paso:${C_RESET}"
            echo "${C_YELLOW}       git -C \"$path\" status${C_RESET}" ;;
        DIRTY)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $n - laburo a medias ($dirtyN archivo/s). Cerralo o pausalo:${C_RESET}"
            echo "${C_GREEN}       cd \"$path\"${C_RESET}"
            echo "${C_GREEN}       git add -A && git commit -m \"tipo($ag): descripcion\"${C_RESET}"
            if [ "$hasup" -eq 1 ]; then echo "${C_GREEN}       git push && gh pr create --base $TRUNK${C_RESET}"
            else echo "${C_GREEN}       git push -u origin $branch && gh pr create --base $TRUNK${C_RESET}"; fi
            echo "${C_GRAY}       (pausar sin cerrar: git -C \"$path\" stash push -u)${C_RESET}" ;;
        UNPUSHED)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $n - $unpushed commit(s) sin pushear. Subilos:${C_RESET}"
            if [ "$hasup" -eq 1 ]; then echo "${C_GREEN}       git -C \"$path\" push${C_RESET}"
            else echo "${C_GREEN}       git -C \"$path\" push -u origin \"$branch\"${C_RESET}"; fi
            echo "${C_GRAY}       (si no hay PR: gh pr create --base $TRUNK)${C_RESET}" ;;
        PENDING_PR)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $n - pusheado, esperando merge. Revisa el PR en GitHub.${C_RESET}"
            echo "${C_GREEN}       ./jornada.sh --mergear-pr \"$path\"${C_RESET}"
            echo "${C_GRAY}       (verifica PR unico, CI/merge limpio y draft antes de mergear)${C_RESET}" ;;
        MERGED)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $n - rama ya mergeada (squash). Reciclala a una tarea nueva:${C_RESET}"
            echo "${C_GREEN}       ./jornada.sh --reciclar \"$path\" --nueva-rama feat/$ag/<tarea> --borrar-rama-vieja${C_RESET}" ;;
        BEHIND)
            paso=$((paso+1))
            echo; echo "${C_YELLOW}  $paso) $n - limpio pero $behind atras de $TRUNK:${C_RESET}"
            echo "${C_YELLOW}       git -C \"$path\" rebase $RTRUNK   (o --ejecutar lo hace solo)${C_RESET}"
            echo "${C_YELLOW}       o tarea nueva: ./jornada.sh --reciclar \"$path\" --nueva-rama feat/$ag/<tarea>${C_RESET}" ;;
        DETACHED)
            paso=$((paso+1))
            echo; echo "${C_RED}  $paso) $n - HEAD detached. Pasate a una rama:${C_RESET}"
            echo "${C_GREEN}       git -C \"$path\" switch -c feat/$ag/<tarea> $RTRUNK --no-track${C_RESET}" ;;
    esac
done
if [ "$paso" -eq 0 ]; then
    echo; echo "${C_GREEN}  Nada que hacer. Todo en orden. A trabajar.${C_RESET}"
fi

echo; echo "${C_CYAN}=====================================================${C_RESET}"
if [ "$EJECUTAR" -eq 0 ]; then
    echo "${C_GRAY}Modo asesor: los comandos los corres VOS. (--ejecutar hace lo seguro solo)${C_RESET}"
fi
