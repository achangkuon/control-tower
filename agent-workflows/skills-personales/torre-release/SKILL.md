---
name: torre-release
description: "Trigger: cambio a la Torre, release de la Torre, publicar versión de torre-control, qué más actualizar. Mapa de impacto y receta de publicación."
license: Apache-2.0
metadata:
  author: "achangkuon"
  version: "1.0"
---

## Activation Contract

Activa únicamente para el mantenedor al evaluar cambios o preparar, publicar y verificar una release de la Torre. No activa instalación ni publicación por una pregunta informativa.

## Hard Rules

- Mantén esta skill personal fuera del bundle de la Torre.
- Exige autorización humana explícita y separada para push, publicación y actualización de la máquina real. Una revisión nativa nunca autoriza entrega.
- Nunca leas `openspec/plan.yaml` entero; usa `radar sesion <ID>` y `radar check`.
- Construye sólo desde un commit limpio, confirmado y subido. Nunca muevas ni sobrescribas un tag publicado; contenido idéntico con otro tag usa promoción de procedencia.
- Antes de usar el comando de publicación del README, verifica que enumera los 11 assets; si falta alguno, corrige el README primero.
- Usa HOME descartable para pruebas y smoke; nunca el HOME real. Sólo la actualización del mantenedor expresamente autorizada opera en su máquina.
- Detente ante un gate fallido o evidencia ausente; no conviertas warnings ni omisiones en éxitos.

## Decision Gates

| Fase | Carga bajo demanda |
|---|---|
| `cambio` | Lee `references/impacto.md`. |
| `release` | Lee `references/publicar.md`. |
| Cambio que se publica ahora | Lee ambas, impacto primero. |
| Alcance o autorización ausentes | Pregunta y detente antes de escribir o entregar. |

## Execution Steps

1. Confirma raíz, rama, cambios ajenos, alcance y autorizaciones; conserva el trabajo concurrente.
2. Clasifica la fase y carga sólo su referencia.
3. Para cambios, recorre las superficies afectadas y propone actualizaciones y controles con evidencia `ruta:línea` vigente.
4. Para release, sigue las fases numeradas sin saltos; verifica cada salida antes de continuar. Aplica «Si algo falla» ante cualquier error.
5. Devuelve evidencia observada y pendientes; nunca afirmes una publicación o instalación no ejecutada.

## Output Contract

Devuelve fase, alcance, autorizaciones, mapa de impacto, archivos, controles ejecutados y resultados, derivas y pendientes. Para release, añade el contrato completo de `references/publicar.md`.

## References

- [Mapa de impacto](references/impacto.md) — sólo fase `cambio`.
- [Publicación](references/publicar.md) — sólo fase `release`.
