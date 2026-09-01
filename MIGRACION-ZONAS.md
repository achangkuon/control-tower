# Migración al modelo de zonas

> **Constancia de trabajo.** Este archivo es la fuente de verdad de QUÉ estamos haciendo
> y qué falta. El razonamiento completo, con dibujos, está en el documento de decisión:
> https://claude.ai/code/artifact/e92d2b38-10ad-480d-b7b2-ba9cc68283ec
>
> Última actualización: 2026-09-01 · Estado: Fases 1 y 2 hechas, esperando revisión

---

## 📍 Punto de retoma

**Qué cerró:** el canon reescrito (Fase 1) y la herramienta `plan` construida y probada
(Fase 2). La partición de `control-tower` está verificada contra sus 441 archivos: 10 zonas
más Cimientos, cero huérfanos, cero solapes. Las 24 Sesiones abiertas están asignadas.

**Nada fue commiteado y `control-tower` no fue tocado.** Los cambios viven sin commitear en
`agent-workflows`: el canon modificado más cuatro archivos nuevos.

**Qué sigue, y necesita tu revisión antes de tocar nada:**

1. **Los cuatro cortes** `S100`–`S109` en [ASIGNACION-24-SESIONES.md](ASIGNACION-24-SESIONES.md).
   Son propuestas sobre estado vivo de control-tower; ninguna está aplicada.
2. **Si `S7.1` es zona nueva o corre sola** — es el único cruce real de los 24.
3. **Las tres correcciones al canon** de la Fase 2b, que salieron de probarlo contra la
   realidad. Hasta que entren, el canon dice una cosa y la prueba dice otra.

**Por qué frenamos acá:** el diseño está cerrado y probado, pero lo que sigue modifica el
plan vivo de control-tower, con una Sesión bloqueada que tiene trabajo a medio hacer
guardado. Eso se revisa despierto.

**Lo que aprendimos y no hay que volver a descubrir:** dibujar la partición a mano falla de
forma predecible. Tres veces en un día ubiqué algo por su nombre en vez de por quién lo toca
—`workspace/`, `bin/torre`, `console/` y `skills/`—. La herramienta encontró las tres. La
regla es una sola: **si lo toca cualquiera sin importar dónde viva, es un cimiento.**

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
| 8 | Un obrero por zona. Cuello de botella = señal de partir la zona |
| 9 | Trabajo que cruza zonas = zona nueva, que declara de qué zonas depende |
| 10 | Cimientos = lista de rutas declarada una vez, con **reserva por archivo** |
| 11 | La herramienta verifica las colisiones de cimientos; Main sólo desempata |
| 12 | Main sigue coordinando y Support sigue sin tocar código |
| 13 | El identificador es plano, permanente y mudo (`S23`). Nunca se renumera |
| 14 | La hoja de ruta se lee por zona y posición, no por identificador |
| 15 | El estado se calcula; nunca se escribe |
| 16 | Un solo archivo de plan, y Support es su único autor |
| 17 | La hoja de ruta generada **se guarda** en el repo |
| 18 | Los asientos de la Torre: techo puesto por el humano, cantidad real = zonas con trabajo listo |
| 19 | La herramienta se construye para durar (binario único), y después se integra a la Torre |
| 20 | SDD se queda tal cual; la ruta se **propone** al planificar y se **re-verifica** al implementar |

**Defecto encontrado que hay que arreglar:** hoy la ruta (`direct` / `design-tasks` /
`full-sdd`) se decide dos veces —`planificador-granular` la asigna y `session-kickoff` la
vuelve a elegir— y ningún lado dice cuál gana.

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
  - [x] Cálculo de las colas por zona y de los asientos
  - [x] Validación de la partición y de las reservas de cimientos
  - [x] 25 tests, `gofmt` y `go vet` limpios
  - [x] Cross-compila a macOS (arm64 e Intel) para el socio
  - [ ] Detección de entrega leyendo git directamente (hoy se declara el commit)
  - [ ] Render del master-index y del `STATUS`
- [x] **Verificar la partición contra los archivos reales con la herramienta, no a ojo**
      → 441 archivos, 11 zonas + Cimientos, cero huérfanos, cero solapes
- [x] Asignar las 24 Sesiones abiertas a su zona, leyendo sus `STATUS` — nunca por el plan
      al que pertenecían → [ASIGNACION-24-SESIONES.md](ASIGNACION-24-SESIONES.md)
  - [x] 17 quedan limpias en una zona · 2 no asignables (ya BLOQUEADO) · 5 cruzan
  - [x] Segunda pasada de la partición: `bin/`, `console/`, `skills/`, `README.md` pasan a
        Cimientos. Eso solo resolvió 6 de los 11 cruces.
  - [x] Partición reverificada: 10 zonas, 441 archivos, cero huérfanos, cero solapes
  - [ ] Aprobar los cuatro cortes propuestos (`S100`–`S109`)
  - [ ] Decidir si `S7.1` es zona nueva o corre sola

### Fase 2b — Correcciones al canon que salieron de la prueba

- [ ] `zona: cimientos` es válida: es el único lugar donde la exclusividad es por archivo
- [ ] Reemplazar la regla de §3 «lo que cruza se vuelve su propia zona» por la de cuatro
      pasos: reubicar superficie compartida → partir → zona nueva → revisar el corte
- [ ] Escribir la regla «si lo toca cualquiera sin importar dónde viva, es cimiento» —
      la violé tres veces en un día dibujando a mano

### Fase 3 — El ciclo de trabajo diario

- [ ] `planificador-granular` — corta por zona, escribe dato, **propone** la ruta
- [ ] `architecture-audit` — paso nuevo: familias de dominio → partición de zonas validada
- [ ] `session-kickoff` — **re-verifica** la ruta y registra por qué cambió
- [ ] `session-doc` — deja de escribir `STATUS.md` y master-index; dispara el render

> Después de esta fase ya se trabaja con el modelo nuevo.

### Fase 4 — El arranque

- [ ] `project-kickoff` — pasa a ser la variante «proyecto nuevo» de la vía única
- [ ] **Crear `brain-dump`** — no existe, y está referenciada seis veces
- [ ] **Crear la skill madre de planificación** — la vía única variable

### Fase 5 — La Torre

- [ ] `agente-soporte` — único autor del archivo del plan (hoy dice «Read-only. Never edit…»)
- [ ] `unattended-implementation` — Cimientos nunca corre desatendida
- [ ] `session-plan` — consume el dato en vez de leer markdown

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
