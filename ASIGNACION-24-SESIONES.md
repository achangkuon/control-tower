# Asignación de las 24 Sesiones abiertas de control-tower

> Fase 2 de [MIGRACION-ZONAS.md](MIGRACION-ZONAS.md). Asignadas por el `Área` que cada
> Sesión declara en su `STATUS.md`, nunca por el plan del que venían.
> control-tower no fue modificado.

---

## El resultado

| Cómo cae | Primera pasada | **Segunda pasada** |
|---|---:|---:|
| Una sola zona, limpio | 7 | **17** |
| Sólo cimientos | 4 | **—** ¹ |
| Cruza dos o más zonas | 11 | **5** |
| No se puede asignar | 2 | **2** |

¹ Las cuatro de sólo cimientos ahora tienen domicilio: `zona: cimientos` (ver más abajo).

**De once cruces quedaron cinco**, y cuatro de esos cinco se resuelven partiendo la Sesión.
El quinto es un cruce real.

Lo que cambió entre pasadas no fueron las Sesiones: fue **la partición**. Yo había puesto en
zonas cosas que en realidad toca cualquier feature.

---

## Lo que estaba mal en mi primer plano

| Ruta | La tenía en | Va en | Por qué |
|---|---|---|---|
| `bin/` | Instalación | **Cimientos** | Toda feature que agrega un comando toca el entrypoint |
| `console/` | zona propia | **Cimientos** | El vocabulario del CLI crece con cada feature |
| `skills/` | zona propia | **Cimientos** | Toda feature actualiza la skill que la expone a los agentes |
| `README.md`, `ROADMAP.md` | Documentación | **Cimientos** | Los toca cualquiera |
| `openspec/changes/` | Documentación | zona **Archivo** | Es historia SDD: 160 archivos donde nadie trabaja |
| `openspec/{prd,rfc,specs,plans}`, `docs/` | Documentación | zona **Autoridad** | Los documentos de intención sí son trabajo real |

Es el mismo error que cometí con `workspace/` y por la misma razón: **agrupé por nombre en
vez de por quién lo toca.** Tres veces en un día. Es un argumento fuerte para que la regla
—«si lo toca cualquiera, es cimiento»— esté escrita y la verifique la herramienta.

**Partición verificada**: `plan check` sobre los 441 archivos rastreados — 10 zonas más
Cimientos, cero huérfanos, cero solapes.

| Zona | Archivos | % |
|---|---:|---:|
| Archivo | 160 | 36% |
| Contratos | 67 | 15% |
| Hosts | 51 | 11% |
| Cimientos | 45 | 10% |
| Autoridad | 44 | 9% |
| Asientos | 27 | 6% |
| Entrega | 16 | 3% |
| Instalación | 11 | 2% |
| Capacidades | 8 | 1% |
| Enrolamiento | 7 | 1% |
| Jornada | 5 | 1% |

---

## Las 17 que quedan limpias

| Zona | Sesiones |
|---|---|
| **Hosts** | `S1.19` · `S4.12` · `S9.9` · `S9.7` · `S9.8` · `S12.6` |
| **Instalación** | `S8.11` · `S8.12` · `S8.13` |
| **Cimientos** | `S1.20` · `S12.1` · `S12.3` · `S12.4` |
| **Asientos** | `S5.5` |
| **Entrega** | `S12.5` |
| **Enrolamiento** | `S2.9` |
| **Autoridad** | `S12.9` |

Seis zonas distintas con trabajo listo. **La Torre podría abrir seis asientos** si tuvieras
el techo puesto ahí — y con tres, elige las tres primeras de la cola.

### El ajuste que esto obliga en el canon

Cuatro Sesiones tocan **sólo** cimientos: `S1.20` (`core.mjs`), `S12.1` (`.githooks/`,
`package.json`), `S12.3` y `S12.4` (`core.mjs`, `db/`). El canon dice que Cimientos «no es
una zona» —cierto para la *propiedad*, nadie lo posee en exclusiva— pero una Sesión cuyo
trabajo **es** el sustrato compartido necesita domicilio.

> **`zona: cimientos` es válida**, y es el único lugar donde la exclusividad se aplica **por
> archivo** en vez de por zona. Dos Sesiones pueden estar en Cimientos a la vez mientras no
> reserven el mismo archivo.

Consecuencia forzada de una decisión ya tomada, no una decisión nueva. Y ya tiene su caso:
**`S12.3`, `S12.4` y `S12.5` declaran las tres `core.mjs` «en exclusiva»**. Hoy eso es una
nota en prosa que nadie verifica; con reserva por archivo la herramienta las serializa sola
sobre `core.mjs` y las deja correr en paralelo en todo lo demás.

## Las 2 que no se pueden asignar

| Sesión | Lo que dice su `Área` |
|---|---|
| `S2.10` menú central | `OWNER SIN RESOLVER — renderer/handler del menú central no localizado` |
| `S9.2` reciclado de asientos | `PENDIENTE DE ENUMERAR` |

Ninguna sabe qué archivos toca, así que ninguna recibe zona. **Y las dos ya figuran 🔴
BLOQUEADO** en control-tower: el modelo nuevo llega a la misma conclusión por un camino más
corto. Una Sesión que no sabe qué toca no se puede programar, y no hace falta leer una nota
para saberlo.

---

## Las 4 que hay que partir

Decidiste partirlas. Acá está la propuesta, con un patrón que vale la pena ver.

### `S5.14` política de entrega

| Nueva | Resultado | Zona | Depende de |
|---|---|---|---|
| `S100` | el esquema de política de entrega | Contratos | — |
| `S101` | el módulo que la aplica | Capacidades | `S100` |
| `S102` | integrarla en la base de continuación | Entrega | `S101` |

### `S5.15` derivación de continuación

| Nueva | Resultado | Zona | Depende de |
|---|---|---|---|
| `S103` | registrar el esquema de snapshot | Contratos | — |
| `S104` | la derivación | Entrega | `S103` |
| `S105` | llevarla al payload de runtime | Instalación | `S104` |

### `S9.3` caché de dependencias

| Nueva | Resultado | Zona | Depende de |
|---|---|---|---|
| `S106` | los dos esquemas: fingerprint y receipt | Contratos | — |
| `S107` | el caché de dependencias | Asientos | `S106` |

### `S9.5` materializador de asientos Herdr

| Nueva | Resultado | Zona | Depende de |
|---|---|---|---|
| `S108` | la topología Herdr | Hosts | — |
| `S109` | el materializador de asientos | Asientos | `S108` |

### El patrón

Las cuatro se parten igual: **primero el contrato, después lo que lo usa.** No es
casualidad. Cruzaban porque cada una hacía dos cosas —*definir* un contrato y *usarlo*— y
esas dos cosas viven en lugares distintos por diseño.

Partirlas no es sólo para que entren en una zona: **hace que el contrato sea una entrega
revisable por sí sola**, que es lo que el canon §6 y `work-unit-commits` ya querían.

### Sobre los identificadores

Las nuevas arrancan en `S100` para que se vea de un vistazo cuáles nacieron después de la
migración. Cada una declara `reemplaza: S5.14` — el linaje es un campo, no parte del
identificador, por la misma razón por la que el dueño tampoco lo es.

Las cuatro originales pasan a 📚 ARCHIVADO. **No se renumera nada** de lo existente.

## La que cruza de verdad

`S7.1` conformidad de release declara `openspec/plans/**`, `test/**` entero, `hosts/**`,
`escalation/**` y `continuation/**`. Es una pasada sobre todo el repo y no hay corte que la
achique sin romper lo que hace.

**Es una zona nueva**, o corre sola con todo lo demás parado. Es exactamente el caso del
ascensor.

---

## Lo que esto le corrige al canon

El canon §3 dice: *«Work that crosses Zonas becomes its own Zona»*. Aplicado literal a las
once de la primera pasada daría once zonas nuevas, que es absurdo. La regla estaba escrita
pensando en un cruce **permanente** —el ascensor— y no en una Sesión suelta.

Regla propuesta, **en este orden**:

1. **Reubicar la superficie compartida.** Si cruza por un archivo que toca todo el mundo,
   ese archivo es un cimiento y la Sesión nunca cruzaba. *Resolvió 6 de 11.*
2. **Partir la Sesión**, una por zona. Casi siempre sale «contrato primero, uso después», y
   da entregas más chicas. *Resolvió 4 de 11.*
3. **Zona nueva**, sólo cuando el resultado no significa nada partido. *Resolvió 1 de 11.*
4. **Si el patrón se repite en muchas Sesiones, las zonas están mal cortadas** — no las
   Sesiones. Once de veinticuatro fue la señal que disparó el paso 1.

## Pendiente

- [ ] Aprobar la partición de segunda pasada
- [ ] Aprobar los cuatro cortes (`S100`–`S109`)
- [ ] Escribir en el canon que `zona: cimientos` es válida
- [ ] Escribir en el canon la regla de cuatro pasos para el cruce
- [ ] Decidir si `S7.1` es zona nueva o corre sola
