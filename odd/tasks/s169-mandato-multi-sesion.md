# Feature: S169 — Mandato sellado multi-Sesión en chanks-4

Autoridad: Emilio 2026-09-26 (Engram 11837); reencuadre 2026-10-04 al diseño de Piloto
automático (P4, P11). Encargo completo en `openspec/plan.yaml` (S169). Zona metodo,
prioridad v2-piloto.

## Alcance
chanks-4-unattended-implementation pasa de sellar exactamente una Sesión LISTO por vez a sellar
un mandato: una lista ordenada por dependencia (un paso puede agrupar Sesiones que corren en
paralelo cuando no dependen entre sí), cada Sesión con su propio sesion_id y worker, bajo un
único expires_at para todo el mandato. El coordinador avanza sólo dentro de la lista sellada, en
el orden declarado; dispatch respetando el grafo de dependencias; ante cualquier imprevisto la
Sesión afectada se detiene y conserva, las independientes siguen y las dependientes no arrancan.
Validaciones de LISTO/base/decisión por Sesión; NOT_READY ante mandato vencido, lista vacía,
Sesiones repetidas, sin orden explícito o vencimiento por Sesión. El sello sigue sin ejecutar:
prepara un registro. El worker re-verifica su admisión fresca (chanks-3-session-kickoff).

## Tareas
- [x] T1: Preparar copia de trabajo del writer.
- [x] T2: Implementación test-first del writer (schema + skill + references).
- [x] T3: Verificación independiente del padre (tests de la skill/suite).
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `c20c971` feat(chanks-4): sello de mandato multi-Sesión ordenado por dependencia (schema v5: mandate.steps[], sesion_id+worker por Sesión, expires_at único, results por terminal); `9d6124a` test: contrato v5.
- Resolución de superficie registrada: las rutas declaradas del plan no existen; el maintainer autorizó copias reales y el writer detectó que product/tower/generic es snapshot histórico congelado (hashes en test_builder_flow.py:47-51) — se editó SOLO la copia activa v3 (skills-diferidas/v3), la histórica quedó byte-frozen (decisión del orquestador, Opción A).
- TDD: RED schema (v4 vs v5) + RED prosa observados; GREEN contrato standalone PASS; suite completa 529 tests OK (skipped=2); snapshot histórico verificado intácto.
- Revisión `review-e922983f7fb27e21` (medium, reliability) APPROVED a la primera (1 reintento mecánico de transporte), acuse quemado (49a0bbde…).
- Pendiente registrado: worker-handoff.md y dispatch-protocol.md (chanks-3, fuera de superficies) aún describen el sello en singular — seguimiento sugerido; JSON Schema no puede expresar unicidad cross-step (aplicado por prosa).
