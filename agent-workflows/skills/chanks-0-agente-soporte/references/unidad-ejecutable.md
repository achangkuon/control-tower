# Unidades ejecutables, conflictos y capacidad

## Contexto mínimo

Registrá identidad del repo, base exacta, instrucciones, plan, vista, reservas, forge y runtime. Para cada Sesión o trabajo de planificación: objetivo, autoridad, alcance permitido/prohibido, dependencias, Cimientos, pruebas, asiento, rama y runtime.

No inventes rutas, ramas, comandos, scopes ni trabajo para completar una cantidad.

## Grafo de conflictos

Agregá una arista exclusiva cuando dos trabajos solapen rutas, comportamiento, fuente de verdad, salida generada, migración, recurso exclusivo, contrato compartido, entrega o dependencia todavía no integrada.

| Clasificación | Significado |
|---|---|
| `independent` | Pueden avanzar sin checkpoint común. |
| `parallel_with_checkpoint` | Pueden avanzar, pero uno espera evidencia nombrada antes de entregar. |
| `serial` | No pueden comenzar de forma segura a la vez. |
| `not_executable` | Falta autoridad, acceso, runtime o dependencia. |

El pronóstico de `radar status` no adquiere una reserva viva.

## Capacidad

Reportá cantidad pedida, recomendada y máxima segura. La máxima segura es el conjunto independiente actualmente ejecutable después de dependencias, reservas, runtime y worktrees. La recomendada puede ser menor por incertidumbre o costo de coordinación.

Los asientos pueden destinarse a implementar Sesiones o planificar huecos por Zona. Esta regla sólo amplía el cálculo textual: no crea dispatch, registro, acuse ni otra maquinaria.

## Brief

Cada asignación propuesta debe contener asiento, rama, runtime, alcance y dependencias. Mostrá fuentes, conflictos, reservas y confianza; obtené aprobación humana antes de transportarla. Recalculá si cambia cualquiera de esos datos.
