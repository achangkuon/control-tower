# Feature: copiloto-skills-hooks-s241 (S239, S240, S241)

Lote aprobado por el maintainer en conversación: cerrar las 3 Sesiones restantes de V2 · Copiloto
para habilitar smoke test y release (v2.0.0 según tabla de releases).

- Radar etapa: 1 · Definir (sesiones ya definidas; ejecución de Sesiones LISTO).
- Compatibilidad Radar: S239×S240 compatible (archivos disjuntos). S241 depende de S240.
- Política de entrega: commit directo a master + push, conventional commits, TDD estricto.

## Tareas

### T1 — S239 · Skills de Etapa 1 cierran ambigüedades (LISTO)
- Archivos autorizados: agent-workflows/skills/chanks-1-cierre-de-decisiones/SKILL.md,
  chanks-1-brain-dump/SKILL.md, chanks-1-feature/SKILL.md, chanks-1-descubrimiento/SKILL.md,
  agent-workflows/tests/test_builder_flow.py
- Resultado: cada skill de Etapa 1 lista dudas abiertas y las cierra con el humano antes de
  proponer escribir en plan.yaml; reconoce la tarjeta del copiloto como disparador.
- Restricciones: ajuste mínimo de texto; sin skills nuevas; tests de contrato en verde.
- Referencia: docs/architecture/copiloto.md Tramo 2.

### T2 — S240 · La Torre instala el copiloto y lo engancha en cada mensaje (LISTO)
- Archivos autorizados: product/tower/v1/runtime-config.mjs, test/runtime-config.test.mjs,
  bundle.mjs, test/bundle.test.mjs, install.mjs, test/install.test.mjs
- Resultado: el paquete incluye el binario copiloto. Claude: hook UserPromptSubmit inyecta
  `copiloto tarjeta`. Pi: extensión generada inyecta la tarjeta en cada turno y la muestra.
  Sin copiloto instalado, nada falla: no se inyecta tarjeta.
- Restricciones: mismo modelo de confianza del instalador (sin binarios en el checkout).
  TDD con RED observado. Instalar en la máquina es decisión aparte del maintainer.
- Referencia: docs/architecture/copiloto.md §7 paso 5; runtime-config.mjs:23,100,351.
- Ampliación autorizada por el maintainer (2026-10-08, en conversación): fixtures mecánicos en
  product/tower/v1/test/bootstrap.test.mjs, release-build.test.mjs, global.test.mjs, cli.test.mjs
  (conteos por nuevos miembros del bundle, runners scoped al build de radar, clave `copiloto` en doctor).

### T3 — S241 · Adelgazar el bloque de AGENTS.md (depende de S240)
- Archivos autorizados: product/tower/v1/instructions/project-agents.md,
  product/tower/v1/test/instructions.test.mjs
- Resultado: el bloque conserva el mapa del flujo, Etapa 0 libre y reglas que protegen al
  humano; la tabla «qué skill en cada etapa» se reemplaza por «seguí la tarjeta 🧭 del copiloto».
- Restricciones: no toca las reglas que agregó S232. Test RED en instructions.test.mjs.
- Referencia: docs/architecture/copiloto.md §7 paso 6; Engram 13295.

### T4 — Smoke test (después del lote)
Recorrido de etapas 0 a 5 en sandbox con el carril candidato (docs/architecture/copiloto.md §7 paso 7).

### T5 — Release
Solo con autorización humana explícita y separada; skill `torre-release`. Meta V2 completa → salto major.

## Evidencia de entrega
- T1 (S239): commit e454033 — 4 skills Etapa 1 + test de contrato (RED observado, suite python 532 en verde)
- T2 (S240): commit d382c71 — bundle +4 fuentes Go copiloto, buildCopiloto, extensión Pi con inyección por turno; fixtures autorizados; bun test 2155 en verde
- T3 (S241): commit 09c12d5 — tabla de 13 filas → 6 líneas bajo el mismo heading (ancla del gate), regla tarjeta 🧭 + 9 skills de entrada; bun test 2158 en verde

Nota: entre d382c71 y 09c12d5 entraron 4 commits de otra sesión (fixes #146/#152/#160/#147); sin conflicto de archivos.
