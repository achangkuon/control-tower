---
name: chanks-0-skill-composer
description: "Trigger: skill madre, parent skill, unificar skills, lazy loading, router de skills. Diseña familias de skills sin crear monolitos ni duplicar reglas."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Usá esta skill para crear una skill madre, reorganizar varias skills relacionadas o decidir si deben fusionarse, componerse o permanecer independientes.

## Hard Rules

- Antes de modificar, leé las candidatas completas. Para crear o auditar, usá este contrato local:
  frontmatter YAML con `name`, descripción de activación, licencia y metadata; activación,
  reglas duras, gates, pasos, salida y referencias locales verificables en el cuerpo.
  No dependas de skills externas al paquete V1.
- Inventariá triggers, responsabilidad, entradas, salidas, dependencias y autoridad de cada candidata.
- No fusiones skills solo porque participan del mismo flujo. La madre coordina selección, orden y gates compartidos; cada hija conserva su procedimiento especializado.
- La madre referencia y carga hijas bajo demanda. No copies en ella las reglas internas de las hijas.
- Cargá el mínimo de hijas necesario para una ruta y ejecutá una ruta por vez.
- Prohibí ciclos, doble autoridad, triggers ambiguos y rutas sin responsable.
- Conservá nombres y triggers existentes salvo que la migración haya sido aprobada explícitamente.

## Decision Gates

| Diagnóstico | Acción |
| --- | --- |
| Mismo objetivo y reglas duplicadas | Unificar en una skill canónica |
| Mismo flujo, responsabilidades distintas | Crear madre router + hijas especializadas |
| Solo comparten una regla transversal | Mantener skills y extraer una dependencia común mínima |
| Una candidata mezcla coordinación y ejecución | Extraer la coordinación a la madre |
| La madre tendría que copiar procedimientos completos | Detenerse: el diseño está creando un monolito |

## Execution Steps

1. Leé las candidatas completas y el índice del proyecto si existe; si no, inventariá sólo las
   skills candidatas por sus rutas, nombres y triggers.
2. Construí una matriz `skill → responsabilidad → trigger → entrada → salida → dependencias`.
3. Detectá duplicación, solapamiento legítimo, huecos y ciclos.
4. Elegí y justificá la topología: unificación, madre+hijas, dependencia común o sin cambio.
5. Definí en la madre: activación, tabla de ruteo, orden, gates de fallo y contrato de salida.
6. Aplicá el cambio mínimo con el contrato local; verificá frontmatter, gates y referencias sin
   duplicar reglas ni introducir dependencias fuera de V1.
7. Actualizá el índice del proyecto si existe y verificá que cada trigger tenga una sola autoridad
   primaria. No exijas un generador ni un registro global.

## Output Contract

Devolvé: matriz de responsabilidades; topología elegida; madre e hijas; rutas lazy-loaded; duplicación eliminada; ciclos o ambigüedades; archivos cambiados; estado del registro.

## References

- `../skill-orchestrator/SKILL.md` — sólo para coordinación fuera del turno/proceso.
