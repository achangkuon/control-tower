# Feature: S214 — Estados NOVEDAD y POR REVISAR en Radar con identidad de vuelo

Autoridad: Diseño de Piloto automático 2026-10-03 (P1–P14), mapa V2/V3 2026-10-04. Encargo
completo en `openspec/plan.yaml` (S214). Zona metodo, prioridad v2-piloto.

## Alcance
Radar calcula y muestra NOVEDAD (motivo: decisión delicada, no se pudo inferir, interrumpida) y
POR REVISAR (nota: limpia, o con N decisiones anotadas), junto a la identidad del vuelo dueño,
leyendo las marcas radar.piloto/v1 y el interruptor del directorio común de Git; Radar nunca las
crea ni las edita. POR REVISAR se deduce de Git (commit de la Sesión en la rama de su vuelo, no
subido). La regla de LISTO depende del interruptor (prendido: dependencia POR REVISAR destraba
dentro del límite de rondas; apagado: regla actual y LISTO sin empezar vuelve a PLANIFICADO).
Estados en snapshot JSON, sesion, faltan, avance, render y ROADMAP. EN CURSO vuelve a contarse
desde las marcas. Apagar no borra estados; sólo impide crear nuevos. NOVEDAD no destraba a nadie.

## Tareas
- [x] T1: Preparar copia de trabajo del writer (umask 022, worktree, dependencias).
- [x] T2: Implementación test-first por writer (RED observado → GREEN → gofmt/vet).
- [x] T3: Verificación independiente del padre (suite Go completa + radar check).
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `d7a2af6` feat(radar): derive NOVEDAD/POR REVISAR pilot states with switch-gated LISTO rule (12 archivos, +1148/-43).
- TDD: RED observado por grupos (A schema, B estados, C regla LISTO, D proyecciones); GREEN 343 tests + 314 subtests, gofmt/vet limpios (verificación independiente del padre).
- Revisión nativa `review-2f10b04c0a1baaf2` (review-reliability, medium): APPROVED a la primera; acuse quemado (consumed_revision 224fa71f…).
- Hallazgo informativo no bloqueante (trabajo posterior): R3-empty-partes-panics — etapa.go:209-210, SUGGESTION, "empty partes panics".
- Contrato de marcas para S215 definido en etapa.go: radar.piloto/v1 (<common>/chanks/piloto/marcas/<ID>.json) y radar.piloto.interruptor/v1 (<common>/chanks/piloto/interruptor.json).
