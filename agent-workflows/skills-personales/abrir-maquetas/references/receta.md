# Receta completa — abrir un HTML en editor-maquetas

Caso real del 2026-10-20: abrir el dashboard de la oficina unificada del
worktree `carril-app-proveedores` de proyecto-beta.

## Archivo

```
/home/<usuario>/projects/proyecto-beta/Worktrees/carril-app-proveedores/ops/herramientas/oficina-unificada.html
```

- `<root>` = `/home/<usuario>/projects/proyecto-beta/Worktrees/carril-app-proveedores` (raíz del worktree, NO la carpeta `ops/herramientas/`)
- ruta relativa = `ops/herramientas/oficina-unificada.html`

## Pasos

1. **Verificar si ya hay server vivo:**

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4545/"
```

- `000` → no hay server, seguir al paso 2.
- `200` → hay uno vivo: identificar su carpeta y decidir según las Decision Gates de `SKILL.md`.

2. **Arrancar el server en background** (en pi: `bash_background`):

```bash
cd ~/projects/editor-maquetas && bin/maquetas \
  /home/<usuario>/projects/proyecto-beta/Worktrees/carril-app-proveedores \
  ops/herramientas/oficina-unificada.html
```

Arranca en `http://localhost:4545/` y abre solo el Windows browser (WSL).
Con ancla de sección se abre directo en esa vista.

3. **Verificar que sirve el archivo:**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:4545/?file=ops/herramientas/oficina-unificada.html"
```

Debe devolver `200`.

4. **Reportar al dueño** la URL completa:

```
http://localhost:4545/?file=ops/herramientas/oficina-unificada.html#dashboard
```

más en qué carpeta quedó el sandbox del server.

## Por qué la raíz y no la carpeta del archivo

El editor solo sirve archivos de la carpeta con la que arranca (sandbox de
seguridad, refusa symlinks que salen de ella). Si se arranca con
`ops/herramientas/` alcanza solo ese HTML; arrancando con la raíz del
worktree alcanza cualquier HTML del repo, incluidas notas y navegación
entre maquetas del mismo repo.

## Notas del dueño (flujo de revisión)

Las notas viven junto al mockup: `oficina-unificada.html` →
`oficina-unificada.notes.json`. Cuando el dueño pide aplicarlas, leer
`~/projects/editor-maquetas/AGENTS.md` y seguir ese contrato.
