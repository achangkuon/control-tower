# S180 — Investigación: ¿la dependencia directa de `@opencode-ai/sdk` es realmente necesaria?

> Informe de evidencia. **No es un índice de estado.** No autoriza reparaciones,
> borrados, upgrades, reinstalaciones ni limpiezas. Toda acción derivada de las
> recomendaciones requiere aprobación humana y su propia Sesión con alcance declarado.

## 1. Identidad del checkout

| Campo | Valor observado |
|---|---|
| HEAD | `c05e8ae617312dd0b269b8c517e11860a3c75142` |
| Rama | `frente-1/resolucion-problemas` |
| Fecha de la corrida | `2026-10-04T17:11:04-05:00` (`date -Iseconds`) |
| Estado sucio | `git status --porcelain` → ` M odd/tasks/frente-1-resolucion-problemas.md` (doc de continuidad del coordinador, pre-existente, **no tocado**) |
| `node_modules` | gitignoreado; instalado (`ls node_modules/@opencode-ai` → `plugin`, `sdk`) |

`radar`/plan quedan fuera de esta investigación: la Sesión es de análisis de fuentes, no de estado.

## 2. Fuentes examinadas y método

Todas las fuentes y el entorno se leyeron en **solo lectura**. Comandos exactos y salidas acotadas:

### 2.1 Estado de instalación

```
$ ls node_modules/@opencode-ai
plugin
sdk
$ grep -m1 '"version"' node_modules/@opencode-ai/{plugin,sdk}/package.json
plugin: "version": "1.18.13"
sdk:    "version": "1.18.13"
```

### 2.2 Referencias a los paquetes OpenCode (fuera de `node_modules` y `openspec/archive`)

```
$ rg -n '@opencode-ai/sdk|@opencode-ai/plugin' --glob '!node_modules' --glob '!openspec/archive'
```

10 archivos con coincidencia: 5 de código/manifiesto y 5 de documentación de plan/auditoría.
Restringido a código y sin `openspec`:

```
$ rg -l '@opencode-ai/sdk|@opencode-ai/plugin' --glob '!node_modules' --glob '!openspec'
files=5
package.json:12:    "@opencode-ai/plugin": "1.18.13",
package.json:13:    "@opencode-ai/sdk": "1.18.13",
bun.lock:8,9,30,32  (cierre de dependencias)
plugin/tower-spike.js:4:import { tool } from "@opencode-ai/plugin"
test/host-adapters.test.mjs:7:mock.module("@opencode-ai/plugin", () => ({ tool }))
test/plugin/tower-spike.test.mjs:157: expect(packageJson.dependencies).toMatchObject({ "@opencode-ai/plugin": "1.18.13", "@opencode-ai/sdk": "1.18.13" })
```

**Ninguna línea de código importa `@opencode-ai/sdk`.** Sus únicas apariciones fuera de `openspec/` son: la declaración en `package.json:13`, el cierre en `bun.lock:9,30,32`, y el assert de manifiesto en `test/plugin/tower-spike.test.mjs:157`.

### 2.3 Búsqueda de consumidores del SDK (cliente y tipos)

```
$ rg -n 'sdk/v2|createOpencodeClient|OpencodeClient' --glob '!node_modules'
```

**Cero coincidencias en código.** Solo coinciden documentación:
`openspec/maintenance/2026-08-05-s5-1-core-scope-investigation.md:169`, `openspec/plan.yaml:2559`, `openspec/ROADMAP.md:1601`.

### 2.4 Imports directos de `ajv` y `yaml`

```
$ rg -n "from ['\"]ajv|from ['\"]yaml" --glob '!node_modules'
```

5 archivos importan `ajv`:
`contracts/schema-registry.mjs:1`, `contracts/host-runtime/schema-registry.mjs:1`,
`jornada/execution-contract.mjs:1`, `test/contracts/schema.test.mjs:2`,
`agent-workflows/tests/test_standalone_contract.mjs:2` (todos desde `ajv/dist/2020.js`).

5 archivos importan `yaml`:
`contracts/canonicalize.mjs:2`, `contracts/validate.mjs:1`, `policy/delivery-policy.mjs:4`,
`test/install/tower-role-assets.test.mjs:5`, `product/tower/v1/test/control-tower-skill.test.mjs:3`.

### 2.5 Manifiestos y lock

```
$ rg -n --hidden -g 'package.json' -g 'bun.lock' 'opencode-ai'
```

- `package.json:12-13`: `@opencode-ai/plugin@1.18.13` y `@opencode-ai/sdk@1.18.13` como dependencias **directas**.
- `bun.lock:8-9`: ambas reproducidas como directas del workspace raíz.
- `bun.lock:30`: **`@opencode-ai/plugin` declara `"@opencode-ai/sdk": "1.18.13"` como su propia dependencia** (junto a `@ai-sdk/provider`, `effect`, `zod`).
- `bun.lock:32`: `@opencode-ai/sdk@1.18.13` resuelto (depende de `cross-spawn@7.0.6`).
- Sin manifest en `.opencode/` (solo `plugins/tower-spike.js` y `agent/support-agent.md`, verificados con `find .opencode -type f`), sin manifest en las Zonas restantes. `extensions/pi/package.json` no tiene bloque `dependencies`.

### 2.6 Historia de código (`git log -S`)

```
$ git log --oneline -S '@opencode-ai/sdk' -- '*.js' '*.mjs' '*.ts'
3f7f81f feat(support): enforce injected Main authority boundary
count=1
```

Un único commit de código introdujo la cadena. Su diff (`--stat`: 10 archivos) la usa en
`package.json` (+2 líneas), `bun.lock` (+66) y el assert de `test/plugin/tower-spike.test.mjs:157`;
**`plugin/tower-spike.js` no contiene la cadena** en ese commit.

```
$ git log --oneline -S '@opencode-ai/sdk' -- plugin/tower-spike.js
count=0
```

Historia completa de `plugin/tower-spike.js`: `f583df7, 3f7f81f, 428b3ed, da4e391, 3a67073, 03e5fec, 08a99af` — ninguno introduce ni retira un import del SDK.

## 3. Clasificación por dependencia

Criterio: **necesario** = hay import directo en código vigente que lo consume;
**obsoleto** = no hay ningún consumidor de código y su único efecto es sostener un assert/manifiesto;
**incierto** = falta evidencia verificable en este checkout para decidir.

| Dependencia | Clase | Prueba (archivo:línea) | Qué cambiaría la clasificación |
|---|---|---|---|
| `@opencode-ai/plugin` | **necesario** | `plugin/tower-spike.js:4` importa `{ tool }`; segundo punto de entrada `.opencode/plugins/tower-spike.js:1` re-exporta ese plugin; `test/host-adapters.test.mjs:7` lo mockea | Que el plugin dejara de importar `tool` y el entrypoint de `.opencode/` dejara de re-exportarlo. Ninguno de los dos ocurre. |
| `@opencode-ai/sdk` | **obsoleto** (como *declaración directa*) | Cero imports en el árbol (§2.2, §2.3); única referencia viva `test/plugin/tower-spike.test.mjs:157` (assert de manifiesto) + `package.json:13` + `bun.lock` | Que apareciera un import real (`@opencode-ai/sdk` o `@opencode-ai/sdk/v2/client`) en código, o que un test ejecutara comportamiento del SDK en vez de asertar su presencia en `dependencies`. Ver §4 para la distinción clave. |
| `ajv` | **necesario** | 3 consumidores de producción: `contracts/schema-registry.mjs:1`, `contracts/host-runtime/schema-registry.mjs:1`, `jornada/execution-contract.mjs:1`; más 2 de test | Que esos registros de esquema migraran a otro validador. Hoy son rutas de producción. `ajv` no aparece como dependencia transitiva del cierre OpenCode, así que su declaración directa es la única fuente. |
| `yaml` | **necesario** | 3 consumidores de producción: `contracts/canonicalize.mjs:2`, `contracts/validate.mjs:1`, `policy/delivery-policy.mjs:4`; más 2 de test | Que la canonicalización/validación de contratos y la política de entrega dejaran de parsear YAML. Nota: `effect` (cadena de `plugin`) trae `yaml@2.9.0` anidado (`bun.lock:42,90`), pero el código importa el `yaml` de raíz (`2.8.1`, `bun.lock:86`); la resolución no equivale a la del árbol anidado. |

## 4. Veredicto del SDK: declaración directa vs. paquete en uso

**Con cero imports directos, la declaración directa de `@opencode-ai/sdk` en `package.json:13` es obsoleta.**
Debe distinguirse de «el paquete no se usa»:

1. **El paquete es una dependencia real de otro paquete**, no de código de Control Tower.
   `bun.lock:30` prueba que `@opencode-ai/plugin` declara `"@opencode-ai/sdk": "1.18.13"`.
   Es decir, el SDK se instala **transitivamente** aunque la declaración directa desapareciera.
   `ls node_modules/@opencode-ai` confirma que ambos están instalados hoy; el SDK está presente en parte
   por el cierre transitivo, lo que **enmascara** la necesidad de la declaración directa.

2. **Nada en tiempo de ejecución de Control Tower importa el SDK.**
   `plugin/tower-spike.js:4` importa solo `{ tool }` de `@opencode-ai/plugin`; el `client`
   que el plugin consume llega inyectado por el host, no importado del SDK. No hay
   `import`, `import()` dinámico ni `require()` de `@opencode-ai/sdk` en el árbol (§2.2, §2.3).

3. **Qué se rompería exactamente si se quita la declaración directa** (hipótesis no ejecutada, solo lectura):
   - **Test:** sí falla. `test/plugin/tower-spike.test.mjs:157` asserta literalmente
     `toMatchObject({ "@opencode-ai/plugin": "1.18.13", "@opencode-ai/sdk": "1.18.13" })`
     sobre `packageJson.dependencies`. Quitar la línea directa rompe ese assert.
   - **Runtime:** no se rompe. Como `@opencode-ai/plugin` depende del SDK (`bun.lock:30`),
     la instalación sigue proveyendo `node_modules/@opencode-ai/sdk`; y, sobre todo,
     **ninguna ruta de código de Control Tower lo importa**, así que no hay resolución que falle.

   Conclusión: la declaración directa es **redundante para el runtime** y su único anclaje
   vivo es un test de manifiesto, no un consumidor funcional.

## 5. Discrepancia con el doc de mantenimiento

`openspec/maintenance/2026-08-05-s5-1-core-scope-investigation.md:165` afirma que
`@opencode-ai/plugin` y `@opencode-ai/sdk` «ambos se usan por imports directos en
`plugin/tower-spike.js`», y `:169` agrega que «el SDK sigue siendo una dependencia directa
justificada porque el código del proyecto importa `@opencode-ai/sdk/v2/client` directamente».

**Veredicto: import inexistente — nunca existió en el historial commiteado.**

Evidencia:

```
$ git log --oneline -S '@opencode-ai/sdk/v2/client' -- plugin/tower-spike.js
count=0
$ git log --oneline -S 'sdk/v2'   # todas las rutas
91e67ce docs(plan): record S5.1 core scope decision
edaa4e0 docs(planning): complete S178-S181 session contracts with technical preparation
```

Ambos commits son **solo documentación**:

- `91e67ce` (`--stat`): 1 archivo, `.../2026-08-05-s5-1-core-scope-investigation.md` (+249). Es el commit que **crea el propio doc**; la cadena aparece en su prosa, no en código.
- `edaa4e0` (`--stat`): `odd/tasks/frente-1-resolucion-problemas.md`, `openspec/ROADMAP.md`, `openspec/plan.yaml`. Sin código.

Por lo tanto el import `@opencode-ai/sdk/v2/client` **nunca apareció en un archivo `.js/.mjs/.ts`**
de este historial: no fue introducido ni retirado, simplemente la afirmación del doc no
corresponde a ningún árbol de código. La frase de `:165` sobre `plugin/tower-spike.js` es
parcialmente cierta solo para `@opencode-ai/plugin` (`:4` de hoy); es falsa para el SDK.
Se cita el **árbol observado** (`plugin/tower-spike.js:4` importa solo `{ tool }`), nunca el doc.

## 6. Limitaciones

- No se inspeccionó el contenido de `node_modules` más allá del estado de instalación y de la versión (no se leyó el código interno de `@opencode-ai/plugin`/`@opencode-ai/sdk`). La dependencia transitiva se prueba por `bun.lock:30`, no por bytes instalados.
- No se ejecutó `bun install` ni ninguna reinstalación; no se verificó empíricamente un árbol sin la declaración directa (sería mutación, fuera de alcance).
- `git log -S` detecta apariciones/desapariciones de la cadena en el historial commiteado; no cubre estados no commiteados ni ramas fuera de este checkout.
- No se buscaron consumidores indirectos por reflexión: `import()`/`require()` con nombre construido o dinámico (se grepeó las formas literales; sin coincidencias, pero un resolutor dinámico opaco queda fuera).
- No se evaluó el costo/beneficio de la limpieza ni el impacto en `bun.lock`; el informe **no autoriza** ninguna reparación.

## 7. Recomendaciones (requieren aprobación humana + Sesión propia)

Ninguna de estas acciones está autorizada por S180; se listan como insumo para una decisión.

1. **Decidir el destino de la declaración directa de `@opencode-ai/sdk`** (`package.json:13`).
   - *Opción A — mantener:* costo cero hoy, pero deja una dependencia directa sin consumidor funcional.
   - *Opción B — retirar:* exige editar el assert de `test/plugin/tower-spike.test.mjs:157` en el mismo cambio y verificar que el cierre transitivo (`bun.lock:30`) siga instalando el SDK. Requiere Sesión de implementación, no de investigación.
2. **Corregir la afirmación falsa del doc de mantenimiento** (`...core-scope-investigation.md:165,169`). Es prosa histórica; cualquier corrección necesita su propia autorización y alcance, respetando que `openspec/archive/` es histórico de solo lectura.
3. **No tocar `@opencode-ai/plugin`, `ajv` ni `yaml`** por este hallazgo: los tres tienen consumidores directos de producción (§3).

## 8. Cierre

- Escritura realizada: **solo este informe**.
- Sin instalaciones, upgrades, borrados, mutaciones de `HOME`, red ni commits.
- Los hallazgos son evidencia para decidir; no autorizan reparación.
