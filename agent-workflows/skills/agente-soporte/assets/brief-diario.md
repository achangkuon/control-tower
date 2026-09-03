# Brief de Jornada

El brief deriva qué puede implementarse o planificarse hoy. No asigna, despacha, reserva ni muta estado.

## Fuentes

1. `openspec/plan.yaml` y `openspec/ROADMAP.md` generada.
2. `radar check`, `radar status` y `radar zonas`.
3. Reservas vivas y runtime disponibles, si existen.
4. Git, forge y política de entrega.

## Template

```markdown
# BRIEF — <proyecto> · <fecha>

**Base:** `<rama>@<sha>` · **Fuente:** `<ruta/comando>`

## Capacidad

| Tipo | Disponibles | Evidencia |
|---|---:|---|
| Implementar | N | <IDs y fuente> |
| Planificar | N | <Zonas/huecos y fuente> |

## Asignaciones propuestas

| Sesión/objetivo | Asiento | Rama | Runtime | Alcance | Dependencias |
|---|---|---|---|---|---|
| <ID> | <seat> | <branch> | <runtime> | <paths/resultado> | <IDs/evidencia> |

## Conflictos y Cimientos

<cruces exactos, reservas requeridas y dueño de cada desbloqueo>

## Decisiones humanas

<pregunta, consecuencia de opciones y costo de no decidir>

## Cómo verificar

- `radar check -f openspec/plan.yaml -C <repo>`
- `radar status -f openspec/plan.yaml -C <repo>`
- <comandos Git/runtime observados>
```

## Reglas de derivación

- Contá por separado trabajo implementable y huecos planificables.
- Un asiento puede planificar; no inventes dispatch, persistencia o acuse para hacerlo.
- No fabriques unidades para alcanzar una cantidad pedida.
- Separá dependencia, decisión humana, conflicto y falta de runtime.
- Cada fila debe incluir los cinco campos: asiento, rama, runtime, alcance y dependencias.
- Si fuentes o sumas contradicen, reportá la contradicción y no promedies.
