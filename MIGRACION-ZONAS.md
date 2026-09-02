# Migración al modelo de zonas

> **Constancia de trabajo.** Este archivo es la fuente de verdad de QUÉ estamos haciendo
> y qué falta. El razonamiento completo, con dibujos, está en el documento de decisión:
> https://claude.ai/code/artifact/e92d2b38-10ad-480d-b7b2-ba9cc68283ec
>
> Última actualización: 2026-09-01 · Estado: Fases 2b y 3 implementadas y verificadas; propagación global/manual pendiente

---

## 📍 Punto de retoma

**Qué cerró:** la implementación de Fase 2b y Fase 3 en `agent-workflows` quedó completa y fue
verificada de forma independiente. La evidencia observada fue: `gofmt` sin diferencias; `go test .`
y `go test ./...` aprobados; `go vet` limpio; `go run . check -f borrador-control-tower.yaml` válido
(10 Zonas, 0 Sesiones); 23 pruebas del instalador aprobadas; y `git diff --check` limpio.

**Contrato documental aprobado:** el único dato editable es `openspec/plan.yaml` y la vista generada
es `openspec/ROADMAP.md`. No se mantienen un `STATUS.md` ni un `master-index.md` separados.

**Fuera de este cierre:** `control-tower` y `Servi-Task-U` permanecen intactos. No se propagaron los
bloques globales/manuales y este documento no afirma que las skills estén instaladas o sincronizadas.
También siguen pendientes para una integración futura con MAIN/Torre la adquisición, liberación y
recuperación stale de Cimientos en vivo, y el freeze runtime de `S7.1`.

**Qué sigue:** retomar primero los pendientes de Fase 1: actualizar los bloques globales/manuales,
propagarlos a los cuatro agentes y verificar que sobrevivan. Sólo después continúa Fase 4 según el
orden existente. No se migró todavía ningún producto real ni se completó trabajo de Fase 4 o posterior.

**Decisiones ya cerradas — no volver a preguntar:** el umbral de Cimiento es más de una Zona;
no admite escrituras concurrentes; `install/runtime-payload.mjs` es el primer carve-out;
`S5.14`, `S5.15`, `S9.3` y `S9.5` se reemplazan por `S100`–`S108`; y `S7.1` corre en Entrega
contra un candidato inmutable, sin arreglar defectos dentro de la verificación.

**Lo que aprendimos y no hay que volver a descubrir:** la regla verificable es: **si más de
una Zona necesita modificar la misma ruta exacta, es un Cimiento**, sin importar bajo qué
directorio viva.

---

## Qué estamos haciendo

Cambiar cómo se planifica el trabajo, para que varios agentes puedan trabajar en paralelo
sin que el humano tenga que sostener tres contextos a la vez.

**Tres raíces del problema:**

1. **Documentación** — un mismo hecho («¿cerró S2.3?») vive escrito a mano en seis lugares
   o más. En `control-tower` son diez. Nada los calcula desde uno.
2. **Organización** — el trabajo se corta por tamaño de entrega (un PR) y el territorio se
   agrega después, a mano, como parche. `Área` es el único freno de colisión y nadie lo valida.
3. **Flujo** — no existe un camino definido de «idea» a «plan aprobado». Para un proyecto
   vivo la única salida es SDD completo, que es la maquinaria más pesada que hay.

**El modelo nuevo, en ocho líneas:**

- **Un solo plan por producto**, sin fecha de cierre. Se agregan Sesiones para abajo, nunca planes al costado.
- **Cuatro niveles**: Zona → Sesión → Módulo → Tarea. El producto es el marco, no un nivel.
- **Zona** = una parte del producto con dueño exclusivo. Un obrero por zona.
- **Cimientos** = las rutas compartidas. No son una zona: se reservan por archivo.
- **El estado no se escribe**: se calcula de las dependencias, las decisiones abiertas y git.
- **Un archivo escrito**, el resto se genera. Support es su único autor.
- **Una sola vía de planificación** que detecta el contexto y dispara la variante.
- **SDD queda intacto**, con su escalera: la ruta más liviana que sea honesta.

---

## Decisiones cerradas

No se relitigan. Si alguna hay que reabrir, se anota acá con la razón.

| # | Decisión |
|---|---|
| 1 | Un solo plan, único, sin fecha de cierre |
| 2 | Cuatro niveles: Zona → Sesión → Módulo → Tarea |
| 3 | El nivel se llama **Zona** (no «territorio», no «área» — `Área` ya significa otra cosa) |
| 4 | La Sesión es lo que entra en un PR, cortada **dentro de** una zona |
| 5 | Las zonas se cortan por dominio de negocio, ajustado por proyecto |
| 6 | Las zonas no se solapan: es una partición, y es exhaustiva |
| 7 | `Área` deja de escribirse: se deriva de la zona |
| 8 | Un obrero por Zona; `zona: cimientos` permite concurrencia sólo con reservas exactas disjuntas |
| 9 | Cruces: Cimientos → partir por Zona → Zona nueva sólo si partir destruye el resultado → revisar la partición si se repite |
| 10 | Cimiento = archivo exacto que más de una Zona necesita modificar; `cimientos.rutas` puede clasificar archivos, directorios o patrones, pero cada reserva nombra un archivo exacto |
| 11 | `plan` valida y pronostica compatibilidad; la Torre posterior adquiere/libera en runtime y MAIN coordina el orden y la entrega |
| 12 | Main sigue coordinando y Support sigue sin tocar código |
| 13 | El identificador es plano, permanente y mudo (`S23`). Nunca se renumera |
| 14 | La hoja de ruta se lee por zona y posición, no por identificador |
| 15 | El estado se calcula; nunca se escribe |
| 16 | Un solo archivo de plan, y Support es su único autor |
| 17 | La hoja de ruta generada **se guarda** en el repo |
| 18 | Los asientos de la Torre: techo puesto por el humano, cantidad real = zonas con trabajo listo |
| 19 | La herramienta se construye para durar (binario único), y después se integra a la Torre |
| 20 | SDD se queda tal cual; la ruta se **propone** al planificar y se **re-verifica** al implementar |

**Defecto resuelto en Fase 3:** `ruta.propuesta` conserva la decisión de planificación y
`ruta.revalidacion` registra la decisión de implementación sobre el HEAD exacto. La revalidación
gana y debe explicar cualquier cambio.

---

## Plan de trabajo

Dos repos: **`agent-workflows`** (canon y skills) y **`control-tower`** (banco de pruebas).
`Servi-Task-U` **no se toca** hasta que control-tower esté andando.

### Fase 1 — El canon ✅

- [x] Reescribir `skills/_shared/plan-naming-convention.md` — 440 líneas, 18 secciones
  - [x] §1 jerarquía: entra Zona, el producto pasa a ser el marco y no un nivel
  - [x] §2 nueva: un solo plan por producto
  - [x] §3 nueva: Zona definida por rutas, con las cuatro propiedades
  - [x] §4 nueva: Cimientos con reserva por archivo
  - [x] §6 desborde: el tamaño de PR pasa a regla de desborde, no criterio de corte
  - [x] §8 identificador plano, permanente y mudo
  - [x] §9 estados: se calculan, no se escriben
  - [x] §10 la hoja de ruta pasa a generada, agrupada por zona
  - [x] §11 porcentaje: por zona y en total
  - [x] §12 contrato de Sesión: `Área` derivada, entra `Cimientos`
  - [x] §13 capacidad: asientos = zonas con trabajo listo, con techo humano
  - [x] §15 nueva: rutas, y quién decide en cada momento
  - [x] §17 nueva: qué calcula la herramienta y qué juzga un humano
  - [x] §18 checklist recortado a lo que la herramienta no puede verificar
- [ ] Actualizar los bloques de `~/.claude/CLAUDE.md` («Plan Naming Standard», «Durable Session Skill Routing»)
- [ ] Propagar a los cuatro agentes y verificar que los bloques manuales sobrevivan

### Fase 2 — Probar el modelo contra la realidad

- [x] Dibujar a mano el plano de zonas de `control-tower` → [PLANO-CONTROL-TOWER.md](PLANO-CONTROL-TOWER.md)
  - [x] Verificar que la partición sea exhaustiva: ningún archivo sin dueño
  - [x] Enumerar sus cimientos
  - [x] **Veredicto: el plano cierra.** Once zonas más Cimientos, sin solape.
  - [x] **Hallazgo: los 13 planes NO son zonas.** Sólo seis mapean a un lugar del árbol.
- [x] Resolver el dueño de `mcp.mjs` (→ Cimientos) y `workspace/` (→ Asientos)
- [x] **Decidido: se reasignan sólo las 24 Sesiones abiertas.** Las 51 cerradas quedan
      archivadas como están; una Sesión cerrada es historia y no necesita zona.
- [x] Construir la herramienta → [tools/plan](tools/plan/README.md), Go, binario único
  - [x] Esquema del dato — sin campo `estado`; se declara evidencia, no estado
  - [x] Cálculo de estados desde dependencias + decisiones + evidencia de entrega
  - [x] Cálculo de las colas por zona y pronóstico de asientos compatible con Cimientos
  - [x] Validación de la partición y de las declaraciones exactas de reserva de Cimientos
  - [x] Revalidar después de Fase 2b: `gofmt` limpio; pruebas Go aprobadas; `go vet` limpio
  - [x] Cross-compila a macOS (arm64 e Intel) para el socio
  - [x] Detección de entrega leyendo Git: el commit declarado debe resolver y ser ancestro del HEAD integrado
  - [x] Render determinista desde el dato editable `openspec/plan.yaml` hacia la única vista generada `openspec/ROADMAP.md`; no hay STATUS/master-index paralelos
- [x] **Verificar la partición contra los archivos reales con la herramienta, no a ojo**
      → 441 archivos, 11 zonas + Cimientos, cero huérfanos, cero solapes
- [x] Asignar las 24 Sesiones abiertas a su zona, leyendo sus `STATUS` — nunca por el plan
      al que pertenecían → [ASIGNACION-24-SESIONES.md](ASIGNACION-24-SESIONES.md)
  - [x] 17 quedan limpias en una zona · 2 no asignables (ya BLOQUEADO) · 5 cruzan
  - [x] Segunda pasada de la partición: `bin/`, `console/`, `skills/`, `README.md` pasan a
        Cimientos. Eso solo resolvió 6 de los 11 cruces.
  - [x] Partición reverificada: 10 zonas, 441 archivos, cero huérfanos, cero solapes
  - [x] Aprobar y corregir los cuatro reemplazos (`S100`–`S108`); ninguna propuesta aplicada fue renumerada
  - [x] Asignar `S7.1` a Entrega con candidato inmutable y reejecución completa ante defectos

### Fase 2b — Correcciones al canon que salieron de la prueba

- [x] Definir Cimiento por umbral: un archivo exacto modificado por más de una Zona
- [x] Distinguir clasificación (`cimientos.rutas`: archivo/directorio/patrón) de reserva (`sesiones[].cimientos`: archivo exacto)
- [x] `zona: cimientos` válida para resultados compuestos sólo por Cimientos; compatibilidad estática por archivo
- [x] Prohibir escrituras concurrentes en el contrato y dejar su enforcement runtime a Torre/MAIN
- [x] Reemplazar la regla literal de cruces por el orden: Cimientos → partir → Zona nueva → revisar corte
- [x] Implementar carve-out exacto sin ocultar solapes genuinos entre Zonas
- [x] Declarar `install/runtime-payload.mjs` como primer Cimiento bajo una ruta amplia
- [x] Agregar linaje formal `reemplaza` con referencias, dirección de archivo, aciclicidad y rewire obligatorio de dependencias activas
- [x] Corregir los reemplazos `S100`–`S108` desde autoridad viva de `control-tower`
- [x] Resolver `S7.1` en Entrega, con evidencia ligada al commit SHA y/o tree SHA del candidato inmutable y sin ownership de Autoridad
- [x] Validación separada completada: `gofmt` limpio; pruebas Go aprobadas; `go vet` limpio; partición real válida con 10 Zonas y 0 Sesiones; `git diff --check` limpio

### Fase 3 — El ciclo de trabajo diario

- [x] `planificador-granular` — corta alcance dentro de Zona validada, produce Módulos/Tareas y **propone** la ruta; envía delta a Support
- [x] `architecture-audit` — familias de dominio → superficies reales de modificación → Zonas/Cimientos; exige `plan check`
- [x] `session-kickoff` — **revalida** una vez la ruta contra HEAD/autoridad/evidencia y registra razón si cambia
- [x] `session-doc` — reúne evidencia de cierre; Support verifica integración Git y dispara el render
- [x] `agente-soporte` — dependencia mínima adelantada: único autor acotado de `openspec/plan.yaml` y regenerador de ROADMAP
- [x] `tools/plan` schema v2 — jerarquía completa, rutas separadas, entrega Git y render determinista
- [x] Normalización y verificación independientes completadas: checks Go limpios, partición real válida, 23 pruebas del instalador aprobadas y diff limpio

> Fase 3 quedó verificada. La migración de un producto real sigue pendiente y no forma parte de este cierre.

### Fase 4 — El arranque

- [ ] `project-kickoff` — pasa a ser la variante «proyecto nuevo» de la vía única
- [ ] **Crear `brain-dump`** — no existe, y está referenciada seis veces
- [ ] **Crear la skill madre de planificación** — la vía única variable

### Fase 5 — La Torre

- [x] `agente-soporte` — **límite mínimo adelantado a Fase 3 por dependencia dura**: único autor acotado del dato y renderer; sigue read-only para código
- [ ] Consumo amplio de plan-data por Support, templates y brief diario (permanece en Fase 5)
- [ ] `unattended-implementation` — Cimientos nunca corre desatendida
- [ ] `session-plan` — consume el dato en vez de leer markdown
- [ ] Runtime de reservas — MAIN/Torre registra owner, adquiere y libera cada archivo exacto, evita arranques simultáneos stale y recupera claims interrumpidos; `plan` no es este lock controller
- [ ] Freeze terminal — MAIN/Torre congela `S7.1` sobre un commit SHA y/o tree SHA, liga toda evidencia a ese identificador e invalida toda evidencia anterior si una Sesión correctiva produce otro candidato

### Fase 6 — Asientos configurables

- [ ] Techo de asientos puesto por el humano
- [ ] La Torre propone subirlo cuando sobran zonas con trabajo listo

### Fase 7 — Aplicar a todo

- [ ] Migrar `Servi-Task-U`
- [ ] Revisar las skills locales de ServiTask (`skills/arquitecto_de_datos`, `artesano_de_interfaz`, y las demás) por si leen el canon viejo

---

## Qué no se toca

- Los siete estados. El conjunto cerrado sigue igual; cambia que se calculan.
- SDD completo, y su escalera de rutas.
- PRD, RFC y REQUIREMENTS: responden preguntas distintas y no se duplican.
- Las ocho clases que siempre escalan, y la regla de que escalar no es bloquear.
- Los criterios de aceptación binarios, escritos antes del trabajo.
- `decision-register.md` de control-tower: son decisiones, no estado. Se escriben, no se calculan.
