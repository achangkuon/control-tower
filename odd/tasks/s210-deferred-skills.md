# S210 — Fuentes de skills diferidas por versión

## Contrato y autoridad

Contrato consultado con `radar sesion S210`, sin leer el plan completo. V2 es Pista (entrega ordenada por proyecto); V3 es Torre automática (tabs de trabajo prolongado, Herdr). No cambia el roster ni el bundle de la Torre V1.

El padre ejecutó los seis `git mv` antes de esta implementación. Luego autorizó:

- Ajustar únicamente rutas dentro de las fuentes movidas; conservar todo texto de comportamiento, sin symlinks de compatibilidad.
- Actualizar las referencias vivas de `AGENTS.md` (sin tocar el bloque project-workflow) y `agent-workflows/FLUJO-END-TO-END.md`.
- Ajustar en `prepare-personal-config.py` solo la búsqueda de fuentes canónicas y los bytes esperados del runtime.
- Conservar sin cambios historia ODD/OpenSpec, `docs/flujo/informe-adelgazamiento.html` y el snapshot congelado `product/tower/generic/`.

## Implementación

- `skills-diferidas/v2/`: jornada, session-kickoff, coordinador-manual y agente-soporte.
- `skills-diferidas/v3/`: despacho-herdr y unattended-implementation.
- README breve en español con propósito, motivo de diferimiento y enlace a las definiciones.
- `install.py` distingue la ubicación de la fuente de la pertenencia al roster. Las cinco skills excluidas de instalación siguen retirándose de forma reversible.
- **Excepción personal conservada:** agente-soporte permanece en `PERSONAL_SKILLS`, fuera de `TOWER_V1_SKILLS` y de `RETIRED_SKILLS`; se lee desde V2 y se instala en la carpeta central personal con el enlace Claude existente. Al copiar su SKILL.md, las referencias al puente vuelven a ser relativas a la carpeta de runtime, manteniendo el comportamiento anterior. Hermes valida esos mismos bytes mediante el resolver compartido.
- Las pruebas usan las nuevas fuentes; se conserva la lista de hashes del snapshot congelado. Se agregan regresiones para ubicación, enlaces y exclusión del bundle V1.
- La referencia externa a `sdd-apply` pertenece al runtime de Gentle AI, no a una fuente de este repositorio; no se instala ni se inventa una copia.

## Evidencia de pruebas

Strict TDD no fue activado. No se atribuye evidencia RED/GREEN.

Baseline previo al movimiento informado por el padre: Python con HOME temporal, solo la falla conocida de `test_personal_pi_composition`; Bun, 0 fallas. No se proporcionaron conteos exactos del baseline.

Validación posterior (HOME temporal en todos los casos):

- `cd agent-workflows && HOME="$H" PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests 2>&1 | tail -3`: **480 pruebas**, 1 falla conocida (`test_personal_pi_composition.GenuineCompositionTests.test_fresh_normal_startup_and_policy`), 4 omitidas, 0 errores. Exit 1 esperado por esa falla; ninguna falla nueva. Se capturó además el resumen completo porque el stdout de helpers aparece después del resumen y `tail -3` por sí solo no muestra los conteos.
- `HOME="$H" bun test agent-workflows product/tower/v1`: **910 pruebas en 24 archivos; 909 pass, 1 skip, 0 fail**, 9807 expectativas, exit 0.
- `git diff --check`: sin problemas.
- La primera ejecución Python detectó fixtures aún apuntando a la fuente anterior (479 pruebas, 2 fallas, 6 errores, 4 omitidas). Se corrigieron los fixtures; una segunda ejecución dejó solo la falla conocida. La ejecución final incluye la regresión adicional de Hermes que no depende de su intérprete YAML.
- Regresiones agregadas: ubicación exclusiva por versión, enlaces relativos de repositorio, validación positiva/negativa de bytes personales por Hermes y exclusión de fuentes diferidas del bundle V1. Sus etiquetas históricas de versión se conservan como texto de comportamiento.

Directorios HOME temporales creados y dejados para limpieza por el padre:

- `/tmp/tmp.As0nfTgX0l` — primera ejecución Python.
- `/tmp/tmp.kXpGHydjlq` — segunda ejecución Python.
- `/tmp/tmp.5wwRgXpli0` — Bun.
- `/tmp/tmp.7tMgavvUxp` — ejecución final Python.

El harness también guardó el stdout truncado de Bun en `/tmp/pi-bash-18c76e46b2b5eed6.log`; no es un directorio HOME ni un archivo del repositorio.

## Entrega

Sin stage, commit ni push por este escritor. El padre conserva la entrega Git y la actualización de `archivos` de S210. No se toca el HOME real ni `docs/architecture/piloto-automatico.md`. Los directorios HOME temporales de validación se informarán al padre para limpieza.
