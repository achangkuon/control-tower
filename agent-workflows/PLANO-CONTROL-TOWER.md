# Plano de zonas — control-tower

> **Prueba del modelo contra la realidad.** Fase 2 de [MIGRACION-ZONAS.md](MIGRACION-ZONAS.md).
> Dibujado a mano sobre `/home/emili/projects/control-tower/Main` el 2026-09-01.
> **Es un borrador.** Nada de control-tower fue modificado.

---

## Veredicto

**El plano cierra: se puede particionar el repo en once zonas, sin solape y sin archivos
huérfanos.** El modelo sobrevive al contacto con la realidad.

**Verificado con la herramienta, no a ojo** — `radar check -f borrador-control-tower.yaml`
sobre los **441 archivos rastreados**: cero huérfanos, cero solapes. El borrador ejecutable
vive en [`tools/radar/borrador-control-tower.yaml`](tools/radar/borrador-control-tower.yaml).

> Y el primer pase a ojo **estaba mal**: la herramienta encontró **24 archivos sin dueño**
> que yo no había visto — los tests sueltos en la raíz de `test/`, más `.doc-guard.json` y
> `.opencode/`. Es la mejor defensa del modelo: una partición dibujada por una persona
> atenta se equivoca en el 5% de los archivos, y ese 5% es exactamente donde dos agentes
> chocan al mergear.

**Pero los 13 planes no se convierten en zonas.** Sólo seis de trece mapean a un lugar del
árbol. Los otros siete son temas que cruzan el repo. La consecuencia es concreta y hay que
decidirla antes de seguir: **migrar control-tower es un re-corte, no un renombre.**

---

## La partición propuesta

Once zonas más Cimientos. Cada archivo de la raíz tiene exactamente un dueño.

| Zona | Rutas que posee |
|---|---|
| **Hosts** | `hosts/` · `adapters/` · `extensions/` · `test/hosts/` · `test/adapters/` · `test/extensions/` |
| **Entrega** | `delivery/` · `continuation/` · `test/delivery/` · `test/continuation/` |
| **Instalación** | `install/` · `install.sh` · `bin/` · `test/install/` |
| **Contratos** | `contracts/` · `schemas/` · `registry/` · `test/contracts/` |
| **Asientos** | `supervision/` · `profiles/` · `escalation/` · `support/` · `workspace/` · `test/escalation/` |
| **Jornada** | `jornada/` · `jornada.sh` · `test/jornada/` |
| **Consola** | `console/` · `test/console/` |
| **Enrolamiento** | `enroll/` · `main-store/` · `test/enroll/` |
| **Capacidades** | `capabilities/` · `plugin/` · `policy/` · `test/capabilities/` · `test/plugin/` · `test/policy/` |
| **Skills** | `skills/torre-control/` · `skills/torre-control-entregas/` · `skills/torre-control-soporte/` |
| **Documentación** | `docs/` · `README.md` · `ROADMAP.md` · `openspec/` |
| **Cimientos** | `core.mjs` · `mcp.mjs` · `package.json` · `bun.lock` · `scripts/` · `.githooks/` · `CLAUDE.md` · `AGENTS.md` · `radiografia.json` · `validate-compact-message.py` · `test/helpers/` · `test/fixtures/` · `test/provenance/` |

**La partición es exhaustiva: ningún archivo de la raíz quedó sin dueño.**

Los dos que quedaron dudosos en el primer pase se resolvieron leyéndolos, y uno estaba mal:

- **`mcp.mjs` → Cimientos.** Es el servidor MCP que usan todos los agentes (`tower_register`,
  `tower_status`) e importa `core.mjs`. Tocarlo rompe a todos sin importar la zona: pasa el
  test de una pregunta.
- **`workspace/` → Asientos**, no Enrolamiento como lo había puesto por parentesco con P3.
  Adentro tiene `seat-inventory.mjs`, `slots.mjs`, `pi-supervisor.mjs`, `checkpoint.mjs`,
  `pi-binding.mjs` y `reconciliation.mjs`: son los asientos, literalmente.

Vale registrar el error: lo ubiqué por **el plan al que pertenecía** en vez de por **lo que
hay adentro**. Es exactamente la trampa que el canon §3 previene, y caí en ella en el primer
pase. La partición se dibuja mirando archivos, no planes.

## Por qué el árbol ayudó

`control-tower` ya está partido por concern en la raíz, y `test/` **espeja los módulos uno a
uno** (`test/hosts`, `test/delivery`, `test/console`…). Eso hace que los tests viajen con su
zona en vez de ser un territorio compartido, que es el caso difícil. En un repo sin ese
espejo la partición cuesta bastante más.

---

## El hallazgo: los planes no son zonas

### Los seis que sí mapean

| Plan | Zona | Sesiones |
|---|---|---|
| P4 Hosts y línea exclusiva | Hosts | 13 |
| P5 Entrega y continuación | Entrega | 15 |
| P8 Release instalable | Instalación | 13 |
| P2 Contratos y registro de producto | Contratos | 9+ |
| P10 Ejecución y supervisión de Jornada | Jornada | 3 |
| P11 Interfaz de operador | Consola | 1 |

### Los siete que no

| Plan | Por qué no es una zona | Dónde cae |
|---|---|---|
| **P1 Sustrato mecánico** · 20 Sesiones | Es el plan más grande y es un **tema**, no un lugar. «Sustrato» no tiene rutas. | Se dispersa entre Enrolamiento, Capacidades, Contratos y Cimientos |
| **P12 Orden estructural del repositorio** · 9 Sesiones | Su propósito **es** mover archivos por todo el repo. Por definición no cabe en una zona. | Cimientos — y por lo tanto **serializa** |
| **P9 Asientos y reciclado seguro** · 9 Sesiones | Cruza `install/`, `hosts/` y `supervision/`. Su `S9.9` bloqueada toca `test/install/launch-worker-cli.test.mjs` y el pane split a la vez. | Asientos, pero con reservas de Cimientos y dependencia de Hosts |
| P0 Documentación canónica | Documentación, no código | Documentación |
| P7 Conformidad de release | Cruza Entrega e Instalación | A decidir |
| P3 Workspace y orquestación | Cerrado; su territorio es `workspace/` + `main-store/` | Enrolamiento |
| P6 Campañas multiproyecto | Sin Sesiones enumeradas | Sin territorio todavía |

### Qué significa

El canon dice: *«If you cannot list its paths, it is not a Zona — it is a theme, and themes
do not partition anything»*. P1 y P12 son exactamente eso, y entre los dos son **29 de las
80 Sesiones**.

Migrar no es renombrar `P4` a `Hosts`. Es **reasignar 80 Sesiones a la zona donde viven sus
archivos**, que no siempre es la que su plan sugiere.

---

## Lo que el ejercicio le confirmó al canon

1. **La regla «una zona se define por rutas, no por tema» era necesaria.** Sin ella, P1 y P12
   habrían pasado como zonas y el modelo se habría roto en el primer día de paralelo.
2. **Cimientos con reserva por archivo era necesario.** P12 es la prueba: un plan entero cuya
   materia es mover archivos compartidos. Como zona habría frenado a los diez agentes; como
   reserva frena sólo el archivo en disputa.
3. **La partición exhaustiva encuentra huecos reales.** Aparecieron dos archivos sin dueño
   obvio. Con el modelo viejo nadie los habría notado hasta un conflicto de merge.

4. **Ubicar por plan en vez de por contenido es un error fácil de cometer.** Lo cometí con
   `workspace/` en el primer pase. Es un argumento a favor de que la herramienta valide la
   partición contra el árbol, en vez de confiar en el criterio de quien la dibuja.
5. **La partición encontró trabajo que ya estaba planificado.** Once tests viven sueltos en
   la raíz de `test/` en vez de en el subdirectorio de su módulo, así que no son de ninguna
   zona y cayeron en Cimientos. Eso es exactamente el desorden que **P12 «Orden estructural
   del repositorio»** existe para arreglar: la partición lo detectó sola, sin conocer P12.

## Cobertura por zona

`plan zonas` sobre los 441 archivos rastreados:

| Zona | Archivos | % |
|---|---:|---:|
| Documentación | 206 | 46% |
| Contratos | 67 | 15% |
| Hosts | 51 | 11% |
| Cimientos | 31 | 7% |
| Asientos | 27 | 6% |
| Entrega | 16 | 3% |
| Instalación | 13 | 2% |
| Capacidades | 8 | 1% |
| Enrolamiento | 7 | 1% |
| Consola | 7 | 1% |
| Jornada | 5 | 1% |
| Skills | 3 | 0% |

Documentación se lleva casi la mitad del repo, y eso **no es una zona de trabajo real**: son
`openspec/` y `docs/`, y buena parte de eso —`master-index`, los `STATUS.md`— pasa a
generarse sola con el modelo nuevo. Después de la migración esa cifra debería desplomarse.
Vale volver a mirarla entonces: si sigue arriba del 40%, algo no se generó.

## Lo que falta antes de cerrar la Fase 2

- [x] Resolver el dueño de `mcp.mjs` y `workspace/`
- [ ] Decidir cómo se reasignan las Sesiones a zonas (ver MIGRACION-ZONAS.md)
- [ ] Verificar la partición contra los archivos reales con la herramienta, no a ojo
