# S193 — Skills V1 y canon standalone

**Resultado final:** entregado en a8a024f. El parent restauró la referencia a `references/errores-conocidos.md` en chanks-1-adopcion y, con aprobación humana de ampliar el alcance (4104e03), actualizó `tests/test_mensajes_visibles.py` a las firmas V1. Suite Python: 473 tests, 1 falla preexistente de entorno (`test_personal_pi_composition`, checkouts locales ausentes; igual en el árbol base). Revisión nativa review-793ba2dde0be2662 aprobada (medium, reliability). El resto de este registro es el historial del writer.

Contrato: `radar sesion S193` (LISTO), contrastado con `product/tower/v1/instructions/project-agents.md`. Árbol inicial limpio. CodeGraph presente y actualizado; `codegraph query 'plan-naming'` localizó canon/plantilla y tests del instalador. Se leyeron las 23 skills V1 y sus referencias relevantes; ninguna lectura completa de `openspec/plan.yaml`.

## Tareas ejecutadas

- [x] Leer contrato, bloque aprobado, las 23 skills V1, canon y plantillas/README.
- [x] Capturar inventario estructural previo y verificar los problemas conocidos.
- [x] Corregir admisión, dependencias externas y conceptos V2/V3 presentados como activos.
- [x] Verificar lectura acotada vía Radar, cierre y autonomía del paquete.
- [x] Ejecutar suites autorizadas y documentar conflictos sin tocar tests.
- [x] Revisar diff final, registrar conteos posteriores y riesgos.

La ejecución de las tareas no implica aceptación ni cierre de S193: quedan los fallos documentados para el responsable.

## Cambios por archivo

Rutas relativas al repositorio; sólo se tocaron superficies autorizadas.

| Archivo | Cambio |
|---|---|
| `agent-workflows/skills/_shared/plan-naming-convention.md` | Lectura de plan acotada vía Radar; estado fresco sin admisión; Cimientos como declaraciones, no reservas; compatibilidad V1 por archivos, separada de asientos; marcadores/adquisición fuera de V1; estados cerrados intactos. |
| `agent-workflows/templates/plan-naming.md` | Mismas reglas que el canon; elimina brief obligatorio de Jornada y seats/adquisición activos. Conserva estructura, marcadores y placeholder. |
| `agent-workflows/templates/session-routing.md` | Añade lectura acotada, `radar etapa`, estado fresco y check/render tras editar. Marcadores intactos; 1743 bytes, bajo el máximo existente de 2000. |
| `agent-workflows/tools/radar/README.md` | Quick path V1 con etapa y archivar; lectura acotada; session-kickoff/revalidación sólo legacy; comandos/marcadores de despacho explícitamente V2/V3; elimina aceptación «para V1» y admisión obligatoria. |
| `agent-workflows/skills/chanks-1-adopcion/SKILL.md` | Sustituye agente-soporte por Radar/canon; deja de cargar catálogo histórico que impone doc-guard, rutas personales y reglas de este repositorio; conserva checks de aprobación/consumidores/historia; actualiza instrucciones del proyecto, no archivos personales del maintainer. |
| `agent-workflows/skills/chanks-1-autoridad/SKILL.md` | Consulta de plan por Radar, sin lectura completa; referencia al canon en lugar de agente-soporte. |
| `agent-workflows/skills/chanks-1-cierre-de-decisiones/SKILL.md` | Evidencia directa de `radar sesion <ID>`; no depende del helper externo ni de su referencia de extracción; no fallback de evidencia rechazada y sin admisión. Mantiene delta y gate humano. |
| `agent-workflows/skills/chanks-1-descubrimiento/SKILL.md` | Lectura completa se limita al código auditado; datos del plan por Radar; canon en vez de agente-soporte. |
| `agent-workflows/skills/chanks-1-feature/SKILL.md` | Especifica Radar para Zonas/estado/contratos, nunca lectura completa del plan. |
| `agent-workflows/skills/chanks-1-heredado/SKILL.md` | Partición/estado/contratos por Radar; canon en vez de agente-soporte. |
| `agent-workflows/skills/chanks-2-planificador-granular/SKILL.md` | Evidencia directa de Radar, no agente-soporte; prohíbe lectura completa y sustitución por memoria. |
| `agent-workflows/skills/chanks-3-paralelo/SKILL.md` | Relee contratos aprobados y estado fresco antes de handoff; sólo contratos elegidos, sin lectura completa ni sustituciones. Conserva non-goals V2/V3 ya correctos. |
| `agent-workflows/skills/chanks-4-puente/SKILL.md` | Handoff condicionado por estado/contrato frescos; lectura acotada; canon en vez de agente-soporte. |
| `agent-workflows/skills/chanks-5-session-doc/SKILL.md` | Radar directo; parent edita sólo la entrada exacta y valida/regenera; cierre central entrega.commit → archivar → check → render; Notion requiere opt-in explícito y nunca bloquea el cierre central. |
| `agent-workflows/skills/chanks-0-explicalo-simple/SKILL.md` | Informe Markdown/chat sin artifact-design; estado del plan por Radar, no por lectura completa ni inferencia de código. |
| `agent-workflows/skills/chanks-0-session-context-loader/SKILL.md` | Resúmenes para «qué sigue»; contrato sólo si el humano nombró/eligió Sesión; no lectura completa. |
| `agent-workflows/skills/chanks-0-mensajes-visibles/SKILL.md` | Elimina admisión y jornada.sh como responsabilidades/eventos obligatorios; Torre identifica llamada real a Radar; Chanks conserva el método y cierre. |
| `agent-workflows/skills/chanks-0-skill-composer/SKILL.md` | Contrato local mínimo de creación/auditoría, sin skill-creator/improver/registry; índice del proyecto opcional, sin registro/generador global obligatorio. |
| `agent-workflows/skills/analisis-por-tramos/SKILL.md` | Datos del plan por Radar; usa plantilla local, sin exigir ejemplar externo ni importar asientos/rutas históricas. |
| `agent-workflows/skills/skill-orchestrator/SKILL.md` | Elimina referencias a skill-creator/improver externas a V1; mantiene referencias V1/locales y control surface real. |
| `odd/tasks/s193-skills-v1-standalone.md` | Registro de tareas, evidencia, resultados y límites de aceptación. |

Skills leídas que no necesitaron cambios: chanks-1-brain-dump, chanks-1-prd, chanks-1-project-kickoff, chanks-1-requirements, chanks-1-rfc, chanks-1-terreno y chanks-5-politica-de-entrega. No cambió ningún frontmatter, nombre ni trigger.

## Grep antes/después

Conteo de **líneas** coincidentes, regex case-insensitive, sobre exactamente los 23 `SKILL.md` del roster V1 y `_shared/plan-naming-convention.md`, excluyendo templates, README, referencias y este registro. Baseline leído con `git show HEAD:<ruta>`; después, los mismos archivos del working tree. Se contaron con `re.search(patrón, línea, re.I)` (equivalente a grep -Ei), no ocurrencias dentro de una línea.

| Regex | Antes | Después |
|---|---:|---:|
| `admission|admisión` | 7 | 5 |
| `reserva|reservation|acquisition` | 4 | 4 |
| `marcar` | 1 | 1 |
| `Herdr` | 1 | 1 |
| `jornada` | 2 | 1 |
| `session-kickoff` | 0 | 0 |
| `agente-soporte` | 10 | 0 |
| `despacho-herdr` | 1 | 1 |
| `unattended` | 1 | 1 |
| `coordinador-manual` | 0 | 0 |
| `Notion` | 2 | 3 |
| `Emilio` | 0 | 0 |
| `doc-guard` | 1 | 0 |
| `skill-backups` | 0 | 0 |
| `plan\.yaml` (todas las menciones) | 16 | 27 |

### Evidencia previa

Rutas de skills bajo `agent-workflows/skills/`; números de línea del HEAD inicial:

- Admisión: cierre-de-decisiones:17, planificador:35, puente:13, context-loader:48, mensajes-visibles:18/21, canon:190. El canon exigía «fresh valid Radar admission», mientras puente y planificador negaban ese paso.
- Reservas: paralelo:68; canon:49/51/152. Las líneas 49/152 trataban declaraciones/compatibilidad como reservas.
- agente-soporte: adopcion:72, autoridad:49, cierre-de-decisiones:51, descubrimiento:46, heredado:47, planificador:18/69, puente:65, session-doc:18/55.
- Herdr/despacho-herdr/unattended: paralelo:69, ya explícitamente V3; jornada: mensajes-visibles:18 (jornada.sh activa) y canon:57 (vocabulario); doc-guard: adopcion:50.
- Notion: session-doc:29/56, ya opcional; se reforzó opt-in e independencia del cierre central.
- README fuera del conteo: quick path `marcar`/`desmarcar`; «opcional hasta chanks-3-session-kickoff» y sección de revalidación; limitaciones de despacho aceptadas «para V1».
- Otros outsiders detectados: artifact-design en explicalo-simple; skill-creator/improver/registry en composer y orchestrator. Las dependencias activas se eliminaron.

### Coincidencias restantes y justificación

- Admisión: cierre-de-decisiones:20, planificador:37, puente:13, context-loader:50, canon:201. **Todas niegan el paso de admisión V1.**
- Reservas/adquisición: paralelo:71 (V2/Pista); canon:57 (niega live reservation), :165 (V2/V3, no V1), :202 (niega reservation step).
- `marcar`: descubrimiento:29 significa «marcar gap funcional», no el comando `radar marcar`.
- Herdr/despacho-herdr/unattended: una misma línea, paralelo:72, non-goal explícito V3 que nunca se carga.
- Jornada: canon:63 define un día de trabajo; no pide herramienta, brief ni skill.
- Notion: session-doc:31/32/61, siempre opt-in opcional; la ausencia de herramientas/configuración no bloquea plan.yaml.
- `plan.yaml`: 27 menciones: frontmatter, identidad/autoría del plan, restricciones de escritura o prohibiciones de leerlo entero. Los puntos que consumen estado remiten a Radar; el único flujo de escritura/cierre exige localizar la entrada exacta. **Ninguna instruye leer el plan entero.** El aumento proviene de explicitar esta prohibición en los lectores.
- Sin matches restantes para session-kickoff, agente-soporte, coordinador-manual, Emilio, doc-guard o skill-backups en el ámbito auditado.
- Templates y README conservan vocabulario histórico/V2/V3 sólo con exclusión explícita. El README conserva documentación técnica del comando de despacho bajo encabezado y guard «fuera del flujo V1», nunca como paso de las skills.

## Verificación estructural

Script de sólo lectura sobre el roster cerrado y el HEAD inicial:

- PASS: los 23 frontmatters son byte-for-byte iguales al HEAD inicial.
- PASS: todas las referencias explícitas `../…/SKILL.md` restantes existen y pertenecen al roster V1.
- PASS: marcadores de las dos plantillas idénticos al HEAD inicial.
- PASS: conjunto de estados cerrado conservado; no se reemplazó EN CURSO ni ningún otro estado.
- PASS: revisión manual de dependencias cargadas; la adopción ya no carga reglas personales del catálogo histórico, cierre-de-decisiones ya no carga extracción por helper externo, análisis usa plantilla local y no exige ejemplar externo.
- PASS: `git diff --check`, sin errores. El status final contiene sólo 20 archivos tracked autorizados y este ODD nuevo.

## TDD y tests

RED: not active — strict TDD was not activated; instrucciones pasivas, sin RED significativo.
GREEN: not active — validation is reported separately.
TRIANGULATE/REFACTOR: verificación de referencias/frontmatter/marcadores; consultas frescas sin reemplazar elección humana, y Notion ausente no bloquea cierre. No evidencia de ejecución driven en otra máquina: esto es verificación estructural.

Comandos desde `/home/<usuario>/projects/control-tower/Main` salvo el prefijo `cd` indicado. `PYTHONDONTWRITEBYTECODE=1` evita generar caches Python en el repo. Las suites usan fixtures desechables; no se alteraron datos reales del proyecto ni tests.

| Comando exacto | Resultado observado |
|---|---|
| `cd agent-workflows && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_paralelo.py' -q` | PASS, 14/14; primera y última ejecución. |
| `cd agent-workflows && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_mensajes_visibles.py' -q` | FAIL: 5 pass, 2 fail; assertions de texto obsoleto detalladas abajo. |
| `cd agent-workflows && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q` | Primera ejecución: 473 tests, 465 pass, 7 fail, 1 skipped. Tras conservar frases equivalentes compatibles con V1 en puente/cierre, última ejecución: **468 pass, 4 fail, 1 skipped** (473 tests, 40.454 s). |
| `cd agent-workflows && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_install.py' -q` | PASS, 180/180, 32.543 s. |
| `bun test agent-workflows` | PASS, 356/356, 0 fail, 10 archivos, 1074 expectations. |
| `bun test product/tower/v1/test/instructions.test.mjs` | PASS, 13/13, 0 fail, 138 expectations. |
| `git diff --check` | PASS, sin salida/error. |

No se ejecutó suite Go: no se tocó Go. El archivo JS `test_standalone_contract.mjs` no tiene nombre descubierto por `bun test`; su contrato es unattended/V3, fuera del cambio. No se afirma haberlo ejecutado.

### Fallos finales: assertions verbatim

1. `agent-workflows/tests/test_builder_flow.py:675`, `StageSkillBoundaryTests.test_adoption_reads_known_errors_on_demand_and_names_every_runtime`:

```python
self.assertIn("cuando aparezca", skill)
```

Salida: `AssertionError: 'cuando aparezca' not found in …` (el resto de la salida imprime el SKILL completo). Esa frase pertenecía al loader del catálogo histórico que instruye doc-guard/rutas personales. La misma prueba contiene `self.assertIn("todos los runtimes", skill)`, no alcanzada en esta corrida; se sustituyó el mandato personal por instrucciones del proyecto. No se reintrodujeron reglas personales para satisfacer el test.

2. `agent-workflows/tests/test_mensajes_visibles.py:87`, `MensajesVisiblesTests.test_skill_keeps_chanks_torre_and_gentle_ai_actions_separate`:

```python
self.assertIn(phrase, self.skill)
```

Valor exacto fallido de `phrase`:

```text
method, planning, admission, shared-file coordination, evidence consumption, and documentation closure
```

Salida: `AssertionError: 'method, planning, admission, shared-file coordination, evidence consumption, and documentation closure' not found in …`. La misma tabla también exige `radar, jornada.sh, or openspec/plan.yaml` y `regardless of the Tower switch`, no alcanzadas: reglas ajenas al paquete V1 aprobado.

3. `agent-workflows/tests/test_mensajes_visibles.py:72`, `MensajesVisiblesTests.test_skill_returns_a_suggestion_or_a_nonblocking_no_message_result`:

```python
self.assertIn("never blocks admission or planning", self.skill)
```

Salida: `AssertionError: 'never blocks admission or planning' not found in …`. Se mantiene el carácter no bloqueante, pero aplicado a planificación/handoff elegido por el humano, sin admisión inexistente.

4. `agent-workflows/tests/test_personal_pi_composition.py:94`, `GenuineCompositionTests.test_fresh_normal_startup_and_policy`:

```python
self.assertTrue(PI_SOURCE.is_dir() and QUIET_SOURCE.is_dir())
```

Salida literal: `AssertionError: False is not true`. Requiere checkouts hermanos pi-v2/gentle-pi (u overrides); falla antes de probar los textos modificados. Es una dependencia de entorno personal no incluida en el paquete V1. No se instalaron dependencias ni se buscó contenido personal para repararlo. La suite también reporta un test skipped por binario SDD nativo no disponible.

### Fallos iniciales resueltos sin cambiar tests

La primera suite completa también falló por frases equivalentes interrumpidas por wrapping o reformuladas innecesariamente: `Only the responsible parent writes openspec/plan.yaml` (con backticks), `only when the project uses Notion and local policy permits it`, y `exact authorized files`. Se conservaron sus textos existentes manteniendo lectura acotada, opt-in y Radar fresco; en la corrida final estos tres tests pasan.

## Límites y revisión pendiente

- No queda una decisión de producto abierta dentro del cambio: V1 no admite ni reserva, usa Radar fresco y deja a Gentle AI implementación/review/entrega.
- El responsable debe revisar los tres tests de texto obsoleto y la dependencia local de Pi antes de declarar la suite Python verde. Tests fuera de las superficies autorizadas; no se cambiaron ni se ocultaron fallos.
- Las referencias históricas/opt-in fuera de los SKILL editables se conservaron en disco. Ya no son dependencias activas del flujo core; Notion sólo se carga con autorización explícita del proyecto.
- No se verificó una instalación driven en máquina del socio ni se corrió instalador real. La suite del instalador (180 tests) y las comprobaciones estructurales sí pasan.
- No se registró entrega.commit, no se archivó S193 y no se cambió el plan. El padre conserva revisión y acciones terminales Git.
