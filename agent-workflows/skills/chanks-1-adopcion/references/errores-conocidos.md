# Errores conocidos — adopción del modelo de plan

Catálogo evidenciado en la migración de Control Tower a `plan.yaml` + Zonas + Radar
(`openspec/changes/archive/2026-09-12-migrate-control-tower-plan-zones/`). Cada entrada:
error → por qué duele → qué hacer en vez → evidencia.

1. **Migrar la historia cerrada completa.** La migración full-fidelity de Control Tower
   necesitó C01–C09, 44 tareas y un `apply-progress.md` de ~607 KB, sólo para
   producir filas de trabajo ya cerrado que no aportan nada operativo.
   → Autorá sólo Sesiones abiertas/bloqueadas/diferidas (§18 paso 2); congelá el resto.
   Evidencia: `archive-report.md` ("44/44 tasks complete"); tamaño de `apply-progress.md`.

2. **Retirar una vista legacy sin migrar antes a sus consumidores.** El primer intento
   de activación (`8628319`) salió byte-perfecto y aun así se revirtió (`116ee27`)
   porque el readback encontró cinco consumidores leyendo vistas retiradas —la
   suite pasó de 1212/0 a 1198/1. Los consumidores se migraron recién después, en
   commits separados (`b50c0b3`, `969f189`, `b28022b`), y sólo entonces se reactivó
   (`d5a15d3`).
   → Inventariá cada consumidor (parsers, tests, hooks, radiografía, doc-guard) y
   cada rama/worktree que escribe a la vista, migralos en su propio commit, y recién
   después activá. Un conflicto modify/delete contra una vista retirada se resuelve
   borrando el archivo, nunca conservándolo.
   Evidencia: mensajes de commit `8628319`, `116ee27`, `969f189`.

3. **Tratar el conteo de tests como criterio de aceptación.** Al retirar tres parsers
   de Markdown y sus seis tests junto con el documento que parseaban, la suite bajó
   de 1212 a 1210 pass. El número correcto no es "1212" ni ningún otro fijo: es
   **0 fail**, con las rutas canónicas presentes.
   → No fijés un conteo de tests como gate; verificá 0 fail y presencia de rutas.
   Evidencia: `apply-progress.md:5453-5455` ("'1212 · 0' is obsolete; the criterion
   is 0 fail").

4. **Dejar desactualizados los archivos de instrucciones de los otros agentes.**
   Codex y opencode quedaron con un bloque pre-migración que se autodeclara de mayor
   precedencia que cualquier bloque gestionado o skill, así que ganaba sobre el canon
   correcto que esos mismos agentes ya tenían instalado. Además, `gentle-ai sync`
   puede sobreescribir bloques manuales de Codex sin marcadores `<!-- -->`.
   → Actualizá los cuatro archivos de agente (Claude, Codex, opencode, Pi) en la
   misma entrega que la activación, y snapshoteá los bloques manuales antes de un
   `sync`/`install`.
   Evidencia: auditoría de propagación 2026-09-10 (memoria
   `auditoria-propagacion-migracion-agentes`).

5. **Marcar acciones del responsable como checkboxes `- [ ]` en `tasks.md`.**
   `gentle-ai` 2.7.0 no entiende marcadores `sdd-owner: parent` y cuenta cada
   checkbox como trabajo de implementación pendiente, bloqueando `verify`/`archive`.
   → Registrá las acciones del responsable (revisión, aprobación, autorización de
   push, revert condicional) como un ledger de disposición fuera de la gramática de
   checkboxes: pendiente / realizado con evidencia / no aplicable / no reconstruible.
   Evidencia: `tasks.md:172-178` (P1–P4); memoria `acciones-del-responsable-sin-casillas`.

6. **Marcar `[x]` una tarea superada o nunca ejecutada para que cierre el conteo.**
   `T0.4.5.2` quedó superseded y se registró fuera de la gramática de checkboxes, no
   como `[x]`, así que el conteo final (44/44) sigue siendo honesto.
   → Nunca marques `[x]` una tarea que no se ejecutó; documentala aparte con su
   disposición real.
   Evidencia: mensaje del commit `04327ed`; `archive-report.md` ("T0.4.5.2 superseded,
   not performed").

7. **Reconstruir una aprobación después del hecho.** La autorización explícita del
   maintainer para el push de C09 no fue reconstruible en la verificación posterior;
   quedó registrada como límite de evidencia permanente, no como CRITICAL, pero no se
   pudo recuperar.
   → Registrá cada aprobación en el momento en que ocurre, con evidencia verificable.
   Nunca la firmes retroactivamente.
   Evidencia: `verify-report.md:188` (P3); `archive-report.md:142`.

8. **Confiar en el comando de Radar tal como está escrito en la documentación.**
   `go run ./agent-workflows/tools/radar ...` desde la raíz del repo falla: no hay
   `go.mod` ahí. La forma que funciona es `cd agent-workflows/tools/radar && go run .
   <cmd> -C <repo>`.
   → Corré el comando prescrito antes de asumir que funciona donde está escrito.
   Evidencia: `verify-report.md:131,198`; `HOJA-DE-RUTA.md:12-13`.

9. **Editar `ROADMAP.md` a mano, o dejarlo sin regenerar.** El canon (§10) no tiene
   excepción de adopción; el commit `692a15a` tuvo que refrescar el ROADMAP generado
   hasta S120 porque se había desincronizado.
   → Regenerá con `radar render` después de cada cambio a `plan.yaml`; nunca lo
   edites a mano.
   Evidencia: commit `692a15a` ("refresh generated roadmap through S120").

10. **Agregar un archivo nuevo en la raíz sin Zona ni Cimiento dueño.** `radar check`
    falla la partición exhaustiva si un archivo no tiene dueño declarado.
    → Declará Zona o Cimiento exacto para todo archivo nuevo en la raíz antes de
    commitear.
    Evidencia: caso `.pi/settings.json`, arreglado en `70d5d40` (memoria
    `plan-yaml-es-la-autoridad`).

11. **Superar el cupo de 400 líneas autoradas por lote de revisión sin justificarlo.**
    El commit `969f189` (migrar la radiografía a leer Radar en vez de parsear el
    índice legacy) fue de 572 líneas cambiadas; se aceptó como excepción única y
    documentada porque partirlo habría dejado un commit intermedio con la suite en
    rojo.
    → Mantené el cupo de 400 líneas; si una excepción es inevitable, documentala en
    el propio commit y en el registro de avance, y que la razón sea "partir rompe la
    suite", no comodidad.
    Evidencia: `verify-report.md:130,197`; `archive-report.md:115`.

12. **Resolver rutas de scripts de prueba contra la raíz del repo.** Al mover el
    corpus del change a `openspec/changes/archive/`, 11 tests fallaron: dos tests de
    proof buscaban `rebuild-c07-r14.sh` y `reproduce-c08.sh` con una ruta literal desde
    la raíz. Se corrigieron los tests para resolver con `import.meta.dir`, relativo al
    propio archivo; los scripts históricos no se tocaron.
    → Los scripts de proof/test resuelven rutas relativas a su propio archivo, nunca
    con literales de raíz de repo, o archivar rompe la suite.
    Evidencia: commit `04327ed`, diff de `*.test.mjs` (`join(import.meta.dir, ...)`).

13. **Un solo checkout para varios agentes en paralelo.** Iniciar una sesión desde
    `Main` para trabajar la migración, cuando esta vivía sólo en
    `Worktrees/implementer-1`, fue causa raíz de confusión sobre el estado del repo.
    → Un dueño por checkout; agentes paralelos usan worktrees separados bajo
    `Worktrees/` con su propia rama.
    Evidencia: memoria `control-tower-worktree-ownership`.

14. **Cerrar la sesión de documentación sin tocar `plan.yaml`.** En un repo migrado,
    el gate de cierre sólo se libera editando `openspec/plan.yaml` con la
    herramienta Edit/Write, o con una línea independiente que contenga sólo
    `nada que registrar`, sin comillas ni «» — nunca con `STATUS.md`, Notion,
    `mem_session_summary`, ni con un archivo escrito por `sed`/`python3`. La
    declaración entre «» fue rechazada por el gate el 2026-09-12.
    → Empujá primero, documentá después; editá con Edit/Write.
    Evidencia: `~/.claude/hooks/doc-guard.sh:197` (regex anclada al texto sin comillas);
    memoria `doc-guard-gate-mechanics`.

15. **Reabrir como defecto nuevo una advertencia de Radar ya aceptada.** Las 5
    advertencias que sobrevivieron a la verificación final ya estaban aceptadas por
    el maintainer en commits previos (`33d2ca5`, `de81b77`) y no eran atribuibles a
    este cambio.
    → Registrá la aceptación de cada advertencia junto con el commit que la aceptó,
    para que un agente futuro no la reabra como hallazgo nuevo.
    Evidencia: `verify-report.md:52` ("pre-existing and maintainer-accepted").
