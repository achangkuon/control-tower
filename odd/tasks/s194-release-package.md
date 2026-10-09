# S194 — Release V1 con skills, instrucciones y firmas

**Resultado del writer:** implementación y validación completas; pendiente revisión y entrega del parent. `bun test product/tower/v1`: **322 pass, 1 skip, 0 fail** (323 tests, 13 archivos, 6009 expectations). No se hizo commit, push ni publicación.

## Contrato y alcance

Contrato consultado con `radar sesion S194`, nunca leyendo `openspec/plan.yaml` completo. El árbol inicial estaba limpio; las modificaciones posteriores del plan pertenecen al parent y se preservaron. CodeGraph estaba presente y se consultó antes de explorar consumidores del bundle.

Se detectaron y elevaron dos ampliaciones de alcance, aprobadas por el humano y confirmadas por Radar:

1. `adoption.mjs` y su test: la adopción trataba cualquier miembro no-Radar como archivo de control-tower.
2. `install.mjs`, su test y `test/global.test.mjs`: el instalador standalone rechazaba los nuevos prefijos y el fixture de migración asumía que todos los módulos compartían directorio.

## Paquete y confianza

| Tema | Resultado |
|---|---|
| Roster | 37 archivos de workflows: 23 skills V1 y todos sus archivos, más `_shared/plan-naming-convention.md`. Lista explícita y ordenada bytewise en `bundle.mjs`, contrastada con lista independiente en tests. |
| Exclusión | `chanks-5-session-doc/assets/project-notion-map.json` es opcional en el checkout y nunca se lee ni se empaqueta. No se excluyen otros archivos del directorio. |
| Destinos nuevos | `skills/<nombre>/...`, `skills/_shared/plan-naming-convention.md`, `instructions/{global-pointer,project-agents}.md`, `signatures/{torre-firma.mjs,chanks-etapa.sh,torre-firma.sh}`. |
| Destinos existentes | `radar/` y `skills/control-tower/` no cambian. |
| Drift | La validación rechaza archivos faltantes, archivos/directorios no listados y symlinks en cada directorio de skill V1. El canon compartido se admite por archivo, no se cierra todo `_shared/`, que sirve a otras versiones. La prueba sobre el checkout real impide drift silencioso. |
| Verificación | Membresía explícita, rutas canónicas y SHA-256 preservados; el recorrido valida, nunca descubre miembros para empaquetar. |
| Adopción | Sólo instala miembros con prefijos `radar/` y `skills/control-tower/`; ignora skills globales, instrucciones y firmas, incluso prefijos parecidos. |
| Intake standalone | Cada archivo debe coincidir exactamente con `pinned.paths`, estampado desde la membresía cerrada. Además se restringen los nuevos layouts a las 23 skills V1, el canon compartido exacto y las tres fuentes de firmas exactas; no se acepta `agent-workflows/` genéricamente. |
| Builder | `release-build.mjs` no necesitó cambios: deriva tanto el asset como los pins del instalador de `BUNDLE_MEMBERS`. Los tests prueban la membresía ampliada, exclusión y construcción determinista desde commits de fixtures limpios. |

Se leyó `agent-workflows/tools/install.py:925-1010`: la extensión pasiva Pi importa `radarDirecto` mediante una file URL al módulo `chanks/torre-firma.mjs`. S194 envía esa fuente en su ruta canónica y destino de bundle; no genera la extensión, no instala hooks ni cambia configuración. La instalación global de estos elementos corresponde a S195.

## Tamaños y límites

Medición de sólo lectura del working tree, usando `validateBundle` y tamaños de los ocho módulos runtime adicionales:

- Bundle: **64 miembros, 377755 bytes**.
- Release: **72 miembros, 477731 bytes decodificados** (bundle + ocho módulos runtime).
- Mayor miembro del bundle: **59839 bytes**.
- Se mantienen **1 MiB por miembro**, **8 MiB agregados** y **16 MiB de adquisición**. Ningún aumento de límites de bytes.
- El límite estructural de strings JSON pasó del valor fijo 400 a `RELEASE_PATHS.size * 11 + 3` (795 para 72 miembros): seis claves y cinco valores string por miembro, más las dos claves y schema del envelope. Sigue acotado por la membresía cerrada. Profundidad, duplicados, tamaños y verificación de hashes siguen protegidos por tests.

## Archivos cambiados

Todos bajo `product/tower/v1/`, salvo el registro ODD:

- `bundle.mjs`: roster, exclusión, cierre de árboles fuente/destino y nuevos destinos.
- `bootstrap.mjs`: límite estructural derivado del número cerrado de archivos.
- `adoption.mjs`: filtro explícito de miembros project-local.
- `install.mjs`: admisión canónica de nuevos layouts, sin ampliar la autoridad de los pins.
- `test/bundle.test.mjs`: lista independiente, checkout real, drift, exclusión y tipos inseguros.
- `test/bootstrap.test.mjs`: 72 fuentes, miembros obligatorios, exclusión y hash alterado.
- `test/adoption.test.mjs`: manifest ampliado en proceso Bun aislado; assertions limitadas a instalación local.
- `test/release-build.test.mjs`: asset y pins ampliados, sin mapa personal.
- `test/install.test.mjs`: extracción exacta ampliada, siblings no pinned y rechazo de fuentes no-V1 incluso con pins de test.
- `test/global.test.mjs`: creación del directorio padre de cada módulo copiado en migración; nombre del test actualizado.
- `odd/tasks/s194-release-package.md`: este registro.

## TDD y validación

Todos los comandos de tests se ejecutaron desde `/home/<usuario>/projects/control-tower/Main`.

### RED observado

1. `bun test product/tower/v1/test/adoption.test.mjs`: **23 pass, 1 fail**. El nuevo test encontró archivos globales indebidamente instalados dentro de ambas skills locales.
2. `bun test product/tower/v1/test/bundle.test.mjs product/tower/v1/test/bootstrap.test.mjs product/tower/v1/test/release-build.test.mjs`: **32 pass, 1 skip, 10 fail**. Faltaban los nuevos miembros (22/30 en lugar de 64/72), no se rechazaban fuentes nuevas faltantes/inseguras y el destino aún sólo admitía radar/skills.
3. Tras ampliar el alcance, `bun test product/tower/v1/test/install.test.mjs product/tower/v1/test/global.test.mjs`: **50 pass, 11 fail**. La nueva regresión de extracción falló por path inválido; las dos migraciones fallaron por directorio padre ausente.

### GREEN observado

| Comando exacto | Resultado |
|---|---|
| `bun test product/tower/v1/test/adoption.test.mjs` | 24 pass, 0 fail tras el filtro, antes de ampliar el bundle. |
| `bun test product/tower/v1/test/adoption.test.mjs product/tower/v1/test/bundle.test.mjs product/tower/v1/test/bootstrap.test.mjs product/tower/v1/test/release-build.test.mjs` | 66 pass, 1 skip, 0 fail; 2683 expectations. |
| `bun test product/tower/v1/test/install.test.mjs product/tower/v1/test/global.test.mjs` | Última corrida: 62 pass, 0 fail; 724 expectations. |
| `bun test product/tower/v1` | Última corrida: **322 pass, 1 skip, 0 fail**, 323 tests en 13 archivos; 6009 expectations. |
| `git diff --check` | PASS, sin errores. |

La primera suite V1 completa produjo 309 pass, 1 skip y 10 fail; los ocho fallos del instalador y dos de fixtures de migración se elevaron antes de corregir. No se ocultaron ni se cambiaron archivos fuera del alcance aprobado.

### TRIANGULATE / REFACTOR

- Cada archivo workflow requerido se elimina individualmente en fixtures; cada skill rechaza archivos extra a nivel raíz, references y subdirectorio nuevo.
- Mapa Notion ausente o presente no entra al paquete; otro JSON adyacente sí hace fallar la validación.
- Symlinks, tipos no regulares, hashes alterados, miembros duplicados, alias de paths y límites exactos siguen probados.
- Adopción API y CLI ejecutadas en aislamiento con instalación/doctor/uninstall y preservación de instrucciones/HOME.
- Instalador standalone estampado ejecutado en proceso real con fake gh y HOME desechable; extracción ampliada comprobada byte por byte.
- Migración comprobada con y sin actualización de release, sin debilitar verificación de estado global.

## Límites de entrega y revisión

- El único skip es el cross-build Go real opcional, no activado; los builders deterministas y la prueba real de workspace malicioso sí se ejecutaron.
- No se construyó una release del checkout actual: el árbol contiene cambios sin commit y el builder exige un commit/árbol limpio. No se fabricó una entrega ni se eludió ese requisito. La construcción desde commits limpios se verifica en fixtures existentes.
- No se ejecutó instalación en máquina de un socio, ni instalación/configuración global de skills, notices o hooks (S195).
- Revisión recomendada: comparar roster contra los 23 nombres aprobados; revisar exclusión personal y cierre de árboles; confirmar filtro de adopción y pins exactos del standalone.
- Unidad de revisión/rollback propuesta: estos once archivos, con tests y registro juntos; no incluir cambios del plan del parent ni otros archivos. No se tomó acción Git terminal.
- No se registró entrega.commit ni se archivó S194. El parent conserva revisión, aceptación y entrega.
