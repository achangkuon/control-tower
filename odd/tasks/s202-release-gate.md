# S202 — Puerta estructural de instrucciones en la release

## Contrato y alcance

Contrato leído con `radar sesion S202`. La release debe rechazar plantillas desactualizadas: un par válido de marcadores y un placeholder por plantilla; referencias a skills del roster publicado y cobertura de entradas de etapa; comandos presentes en uso y switch de Radar y cobertura obligatoria; sin términos V2/V3/personales prohibidos. Todos los problemas deben informarse en español.

Superficies: `product/tower/v1/release-build.mjs`, sus pruebas, `test/instructions.test.mjs` y este registro. Se compartirá una función pura desde el constructor ya publicado; no se necesita un módulo ni cambios de membresía.

## Diseño y prueba primero

El constructor verifica los blobs del commit solicitado, sin ejecutar código del commit. Las pruebas usan repositorios fixture y texto de plantillas real copiado allí; nunca modifican las plantillas del proyecto. La puerta debe ejecutarse antes de cualquier salida o compilación TUI. Se conserva la admisión de tamaño, árbol cerrado y bootstrap existente.

## Evidencia observada

Todas las corridas usaron `HOME=$(mktemp -d) bun test product/tower/v1` desde la raíz de Main:

| Paso | Pass | Fail | Skip | Resultado |
|---|---:|---:|---:|---|
| RED inicial | 399 | 42 | 1 | Los fixtures inválidos llegaban al builder TUI (`must not build TUI`) o producían salida; CLI devolvía 0. |
| GREEN inicial | 441 | 0 | 1 | La puerta rechaza antes de escribir o compilar y comparte los chequeos con las 13 pruebas de instrucciones. |
| TRIANGULATE / RED adicional | 457 | 1 | 1 | Un nombre simple de skill (`unknown`, sin guiones) en la tabla de carga escapaba al extractor. Las ocho entradas de etapa restantes y siete comandos restantes ya rechazaban correctamente sus omisiones. |
| GREEN final | 458 | 0 | 1 | 459 tests / 14 archivos, 7584 assertions, 74.57 s. El extractor también valida nombres simples en la tabla de carga. |

El skip preexistente es `optional real tiny Go cross-build`, integración opt-in. No hay fallas pendientes. Se agregaron 60 pruebas: 56 rechazos parametrizados y cuatro casos de aceptación, diagnóstico agregado, diagnóstico exacto y selección de commit.

`git diff --check` pasó. El roster sigue teniendo 91 miembros; no se agregó módulo ni se modificaron bootstrap/install/bundle. Las pruebas de límites conservan exactamente 8 MiB ajustando el padding para admitir entradas estructurales válidas. Los archivos reales de plantillas no se modificaron.

## Ejemplo exacto comprobado por test

```text
No se pudo construir la release de Tower: Las instrucciones de la release no están al día:
- global-pointer.md: debe tener exactamente un placeholder {{TOWER_VERSION}} (la versión se completa al instalar desde el tag).
```

Los errores de instrucciones enumeran todos los problemas, sin el truncado de una línea usado por otros errores del constructor. El orden es estable: plantillas/reglas fijas y referencias únicas ordenadas bytewise.

## Límites y revisión

Chequeo estructural, no juicio semántico del texto. El roster se lee como el array literal `workflowNames` de `bundle.mjs`; Radar desde `const uso` y `switch comando` en `main.go`, sin importar/evaluar código del commit. Cambiar esas convenciones exige actualizar el parser; un formato no reconocido se rechaza explícitamente. Las referencias de skills siguen las convenciones del bloque: nombres Chanks, nombres inline kebab-case y nombres simples en la tabla de carga.

La puerta corre después de admitir árbol y tamaños y antes de serializar, validar por bootstrap, compilar TUI o escribir cualquier asset. La prueba de selección de commit admite el commit válido anterior aunque HEAD tenga instrucciones obsoletas, y rechaza HEAD.

No se hizo commit, push ni publicación del repositorio de trabajo. Sólo los repositorios fixture temporales de las pruebas usan commits locales como ya hacía la suite.
