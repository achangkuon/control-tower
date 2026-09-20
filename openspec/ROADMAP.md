<!-- GENERADO por `radar render` desde openspec/plan.yaml. NO EDITAR A MANO. -->
# Hoja de ruta — control-tower

## 📍 Punto de retoma
- Cierres registrados: S1.11, S1.12, S1.13, S1.14, S1.15, S1.16, S1.17, S1.18, S1.20, S10.1, S10.2, S10.3, S100, S11.1, S110, S111, S112, S113, S116, S118, S12.1, S12.2, S12.8, S120, S124, S125, S126, S127, S128, S130, S131, S132, S134, S135, S136, S137, S138, S139, S140, S141, S142, S145, S2.8, S3.1, S3.2, S3.3, S3.4, S4.1, S4.10, S4.11, S4.13, S4.14, S4.2, S4.3, S4.5, S4.6, S4.7, S4.9, S5.1, S5.10, S5.11, S5.12, S5.13, S5.14, S5.15, S5.2, S5.3, S5.4, S5.5, S5.6, S5.7, S5.8, S5.9, S8.14, S9.1, S9.3, S9.4, S9.5, S9.6, S9.9.
- Prioridad activa: Método V1 · Controles prioritarios.
- Próximo trabajo ejecutable: Método #3 → S143 — Motor procedural Chanks verificable: los siete controles consumen autoridad y evidencia y permiten o bloquean transiciones sin ejecutar sus efectos..
- Decisión pendiente: S1.19 — Which exact test files will own the Pi-first integration regression?.

## Estado y próximo trabajo
- Método #3 → S143 — Motor procedural Chanks verificable: los siete controles consumen autoridad y evidencia y permiten o bloquean transiciones sin ejecutar sus efectos.

## Avance
- **Total:** 67% (80/119 S)
- 16 Sesión(es) con territorio pendiente o Encargo incompleto cuentan sólo en el avance total y no están asignadas a una Zona.
- **Archivo:** — (sin Sesiones enumeradas)
- **Asientos:** 100% (1/1 S)
- **Autoridad:** 50% (1/2 S)
- **Capacidades:** 0% (0/1 S)
- **cimientos:** 57% (4/7 S)
- **Contratos:** 33% (1/3 S)
- **Enrolamiento:** 0% (0/1 S)
- **Entrega:** 0% (0/1 S)
- **Hosts:** 60% (3/5 S)
- **Instalación:** 0% (0/3 S)
- **Jornada:** — (sin Sesiones enumeradas)
- **Método:** 71% (20/28 S)
- **Producto Torre:** 0% (0/1 S)

## Zonas y colas
### Archivo (archivo)
- Sin Sesiones abiertas.

### Asientos (asientos)
- Sin Sesiones abiertas.

### Autoridad (autoridad)
- Sin Sesiones abiertas.

### Capacidades (capacidades)
1. **S101** · 🔴 BLOQUEADO · prioridad Torre V3 · Resolución de política: prepare&#95;through opaco y horizon&#95;ceiling salen de la política resuelta

### cimientos (cimientos)
1. **S12.6** · 📋 PLANIFICADO · prioridad Torre V3 · La raíz se ordena después de la descomposición de core.mjs y el README se reconcilia con esa estructura.
2. **S148** · 📋 PLANIFICADO · prioridad Torre V2 · Handoffs y despacho Tower-owned · Raíz de Ejecución estable en SQLite con revisión, estado e historial ligados a handoffs existentes

### Contratos (contratos)
- Sin Sesiones abiertas.

### Enrolamiento (enrolamiento)
- Sin Sesiones abiertas.

### Entrega (entrega)
1. **S7.1** · 📋 PLANIFICADO · prioridad Torre V2 · Handoffs y despacho Tower-owned · Ejecutar un piloto terminal Pi-first contra un único candidato inmutable de control-tower y el contrato host-neutral en un HOME/runtime aislado, preservando OpenCode como conformidad diferida.

### Hosts (hosts)
- Sin Sesiones abiertas.

### Instalación (instalacion)
1. **S8.12** · 📋 PLANIFICADO · prioridad Torre V1 · Release instalable · Packaging del bundle Torre V1: una membresía versionada contiene exactamente los bytes Tower-owned del semáforo —binario, contrato host-neutral, adapter Pi, perfiles y skills Torre— y no instala, activa, reescribe configuración global ni ejecuta rollback.
2. **S8.13** · 📋 PLANIFICADO · prioridad Torre V1 · Release instalable · Instalador, preflight, activación y rollback del bundle Torre V1 ejercitados sólo en un HOME/runtime aislado

### Jornada (jornada)
- Sin Sesiones abiertas.

### Método (metodo)
1. **S115** · 📋 PLANIFICADO · prioridad Torre V3 · Radar exige el tipo de autoridad: una Sesión sin tipo declarado falla cerrado, y la compuerta del Tramo 1 queda cerrada.
2. **S123** · 📋 PLANIFICADO · prioridad Torre V3 · Al cerrar una Sesión, si una Zona quedó con menos de 2 Sesiones LISTO, Main le pide a Support que prepare el horizonte sin preguntar y después le presenta el resultado al humano.
3. **S143** · 🟢 LISTO · prioridad Método V1 · Controles prioritarios · Motor procedural Chanks verificable: los siete controles consumen autoridad y evidencia y permiten o bloquean transiciones sin ejecutar sus efectos.
4. **S144** · 📋 PLANIFICADO · prioridad Método V1 · Controles prioritarios · Controles Chanks efectivos en Pi con Torre apagada: el núcleo S143 gobierna los efectos del flujo manual y demuestra el recorrido autorizado completo en un entorno aislado.
5. **S146** · 📋 PLANIFICADO · prioridad Método V1 · Controles prioritarios · El método manual coordina intervenciones de Cimientos y paralelo por archivos con controles efectivos en Pi: Main coordina, workers y Gentle AI implementan y verifican, con Torre apagada.

### Producto Torre (producto-torre)
1. **S119** · 📋 PLANIFICADO · prioridad Torre V2 · Handoffs y despacho Tower-owned · La Torre declara su propia skill de runtime de Herdr: activa sólo ante un pedido explícito de Herdr, y todo despacho, ON/OFF, topología y ciclo de vida de asiento sigue enrutando por &#96;torre-control&#96; → &#96;torre asiento&#96;.

## Bloqueos
- **S1.19:** Which exact test files will own the Pi-first integration regression?
- **S2.10:** ¿Qué repositorio y path poseen el renderer/handler del menú central que debe ofrecer enrollment y cómo invoca la CLI canónica sin duplicar lógica?
- **S4.12:** contaminación semántica declarada por otra Sesión
- **S9.2:** Which exact concrete repository-relative paths comprise the S9.2 Area, and which single Zone owns each path without crossing into Cimientos or another Zone?
- **S9.7:** contaminación semántica declarada por otra Sesión
- **S9.8:** contaminación semántica declarada por otra Sesión
- **S9.10:** ¿Se autoriza una nueva corrección tras cuatro CRITICAL y presupuesto agotado?
- **S12.3:** ¿Debe S12.3 permanecer en el estacionamiento migratorio provisional autorizado, sin territorio ni ejecución?
- **S12.4:** ¿Puede formalizarse toda S12.4 con territorio, ruta, Cimientos y reservas ejecutables sin resolver ni reemplazar el hold histórico de M12.4.2?
- **S12.5:** ¿Qué Módulos y Tareas preservan la superficie operativa actual de continuation sin cambiar cuerpos ni comportamiento?
- **S12.7:** ¿Qué Módulos, Tareas, Zonas y puentes temporales migran las 26 carpetas sin retirar rutas de raíz antes de probar consumidores y payloads?
- **S12.9:** ¿Qué valor lleva source&#95;commit en una revisión autoral?
- **S101:** contaminación semántica declarada por otra Sesión
- **S107:** contaminación semántica declarada por otra Sesión
- **S108:** contaminación semántica declarada por otra Sesión
- **S121:** contaminación semántica declarada por otra Sesión
- **S149:** contaminación semántica declarada por otra Sesión

## Rutas
- **S1.20:** propuesta direct (decision 104 and Engram observation 10008); revalidada direct sobre 89b75cccbee3a3fffe371e776a68f9a62c7912fe con evidencia The read-only Tower-mode contract remained fully specified after rebasing onto current master; upstream S100 changed disjoint schema/test paths, while S1.20 preserved its verified bytes and stayed limited to core.mjs and test/lifecycle.test.mjs..
- **S5.5:** propuesta design-tasks (maintainer rebase 2026-08-17 and decision 78); revalidada design-tasks sobre 6c9b869acf952ac2b2e7d01d619e63e41ee81732 con evidencia El bloque canónico de S5.5 permanece byte-idéntico tras las entregas prioritarias de planificación; no hay solapamientos con sus nueve rutas ni cambios en sus dependencias importadas. La causalidad baseline de los dos fallos del gate pre-push quedó probada en archivos prístinos y el candidato conserva sus verificaciones focused y SDD..
- **S9.9:** propuesta direct (master e6b7e673f671e6bba30f9a600bf0333a1cd90af2 Plan 9 y autorización acotada del maintainer para la corrección C07.); pendiente de revalidación en kickoff.
- **S12.1:** propuesta direct (Ruta histórica S12.1; su reanudación queda condicionada al cierre de S12.8 y no la autoriza esta importación.) · prioridad Método V1; revalidada direct sobre a9a3d4ac932620b5f1deea7aa51dd9e5816fadaa con evidencia S12.8 está COMPLETO y el contrato binario sigue acotado a package.json y .githooks/pre-push. La integración preserva el gate Radar vigente, ejecuta la suite sobre el SHA exacto y limpio enviado a master, y deja la radiografía como informe no bloqueante..
- **S100:** propuesta direct (Maintainer decision, this session, 2026-09-06: the schema-level contract is fully specified, has no remaining open product decision, and needs no design phase.); revalidada direct sobre 1043d5efae487c61ae9b3e4af33cddcfe85ad38b con evidencia S100 remained a binary schema-only change after rebasing onto current master; the only upstream delta changed AGENTS.md, while the implementation diff and verified bytes remained limited to the two declared M100.1 paths..
- **S110:** propuesta direct (El resultado es binariamente verificable —el host Pi descubre o no descubre las tres skills— y no queda ninguna elección de diseño abierta: el mapeo de superficies está cerrado y verificado contra el árbol en f78216c.); revalidada direct sobre f78216cfec642cfe7cc5c32c87fa8cdf2da9108b con evidencia Árbol limpio en f78216c y .pi/settings.json declarando las tres skills; el test RED falló nombrando las tres antes de tocar nada..
- **S111:** propuesta direct (El contrato de entrada es exacto y está publicado, el mecanismo de consumo ya existe en ledger.go, y la única elección restante —qué hacer ante un status ilegible— es derivable del precedente del propio archivo.); revalidada direct sobre 638a3f78cff475215cd1cc86cd37b8a3dcc09be5 con evidencia Salida real de gentle-ai sdd-status --json bajo 2.7.0, con schemaName, schemaVersion, nextRecommended y dependencies verificados campo por campo antes de escribir código..
- **S112:** propuesta design-tasks (El producto está decidido —tres tipos, dos verificables, migración por Zona con exigencia al final— pero falta descubrimiento técnico acotado: la forma exacta de cada tipo en el esquema y cómo se prueba una cita a una decisión numerada dentro del registro archivado. Eso es diseño de contrato, no de comportamiento.); revalidada design-tasks sobre 4f4e2925befd92f7939b8459915499f5196909f3 con evidencia El descubrimiento encontró dos copias byte-idénticas del registro con md5 541a4eda, ninguna declarada autoridad por AGENTS.md, y dos formatos de escritura de decisiones más rangos. Las dos preguntas quedaron resueltas antes del primer Módulo..
- **S116:** propuesta direct (El tipo de cita ya existe y está entregado en S112; esto lo repite en una lista y reporta cuál falló. No queda ninguna elección de diseño abierta: la decisión de producto está tomada y el canon §18 cierra la alternativa.); revalidada direct sobre 8e42897bf4b7c4b0a3c12fd9cd88b21ada7d6cb0 con evidencia Autoridad y validarAutoridad abiertos en el árbol: plan.go:141-181 declara el struct y su UnmarshalYAML de escalar o mapa, check.go:891-925 verifica una cita sola. Ningún archivo fuera de plan.go, check.go y authority&#95;test.go lee Tipo, Ref, ID, Loc, Tipada ni Declarada, así que el radio del cambio es exactamente el Área declarada y no queda decisión de diseño abierta..
- **S113:** propuesta direct (Las dos reglas están escritas en el canon, la infraestructura de evidencia y ancestría ya existe, y la única elección restante —cuándo medir— es derivable del contrato de HEAD inmutable que la propia herramienta ya aplica.); revalidada design-tasks sobre 271a32a63a0f6ae554a2690448535bbc6ead7692 con evidencia Las 6 Sesiones archivadas del plan vigente —S4.9, S5.14, S5.15, S9.3, S9.4, S9.5— no tienen ninguna evidencia de entrega. Cuatro están reemplazadas desde references.future&#95;successors (S102 a S108) y dos, S4.9 y S9.4, se retienen como evidencia histórica sin entrega ni reemplazo: la autoridad de S9.4 lo dice textual.; razón: La ruta propuesta daba por sentado que archivar implica haber entregado, y el árbol real prueba que hay tres caminos de archivo, no uno. Decidir cuál de los tres debe declararse y cuál puede inferirse es diseño de contrato, no implementación mecánica: el criterio propuesto habría marcado las 6 archivadas del plan vigente, dos de ellas legítimas..
- **S118:** propuesta direct (El mecanismo, la implementación de referencia y los archivos quedaron fijados por Audit D; no hay diseño sin resolver. &#96;chanks-3-session-kickoff&#96; la revalida una vez contra el código de la Zona.); revalidada direct sobre 832ac9d2e32f6c0047b4c73ddb814f4cf2a1f802 con evidencia Audit D §§1-2 and the real entrypoint in extensions/pi/tower-session-router.ts confirm that Pi already loads the extension and the renderer is added through registerTool/renderCall/renderResult without an unresolved product-design choice; the current master delta is disjoint from S118's three product paths..
- **S120:** propuesta full-sdd (La nueva entrada de antecedentes y la reutilización de verificación definen un contrato compartido todavía no resuelto. Esta ruta se propone para diseñar S120, no obliga a usar full-sdd en las futuras Sesiones direct o design-tasks. No se inicia SDD al registrar el plan.) · prioridad Método V1; pendiente de revalidación en kickoff.
- **S124:** propuesta direct (Comando, contenido de la salida, falla cerrada y texto de la skill quedan fijados en esta propuesta; resta implementación mecánica con pruebas y ninguna elección de diseño abierta.); revalidada direct sobre bbfaa216f33a09aa8d304f89dae2d90808501885 con evidencia Load (plan.go:282), CheckAt (check.go:29) y SesionPorID (plan.go:318) existen y status ya falla cerrado (main.go), así que el comando sólo reutiliza ese patrón. Las huellas SHA256 que T124.2.2 pedía actualizar protegen product/tower/generic y no las skills activas; quedaron intactas..
- **S125:** propuesta direct (Fuente de evidencia, formato del trailer, salida y reglas de las skills quedan fijados en esta propuesta; no queda diseño abierto.); revalidada direct sobre ef792c1f9bcd811d06d42496cd301a9c0340cf82 con evidencia radar no leía trailers (ningún git log en tools/radar) y S124 dejó cmdSesion y validarAt listos para extender; el aviso vive en cmdCheck y la variante escribirSesionConAvance evita tocar check.go, plan.go y sesion&#95;test.go. Las huellas SHA256 que T125.2.2 pedía actualizar protegen product/tower/generic y quedaron intactas..
- **S126:** propuesta direct (Disparador, pasos del despacho, layout, dueño de la entrega, los seis chequeos y el orden del retiro quedan fijados por las decisiones aprobadas; resta implementación mecánica con pruebas del Método.); revalidada direct sobre 5b2b754e0bd24e6f73f8d706af3a72414a59c8b0 con evidencia herdr tab close existe en la CLI instalada y el instalador ya registra skills por CHANKS&#95;SKILLS. La plantilla de ruteo prohíbe Tower, MAIN y Support por test, así que las líneas nombran la Torre. Hallazgo: git branch -d rechaza una rama integrada sólo por cherry-pick o rebase; retiro.md la conserva y la reporta, sin forzar..
- **S127:** propuesta full-sdd (La Sesión cambia contratos compartidos —canon, forma del plan y radar.snapshot/v1— y, hasta que S120 esté entregada, es la única ruta cuya verificación nativa llega al cierre. No se inicia SDD al registrar el plan.); pendiente de revalidación en kickoff.
- **S128:** propuesta direct (El contrato está determinado —reconocer el trailer por el prefijo de una Sesión con ruta efectiva full-sdd— y los archivos son conocidos; no queda decisión de diseño abierta.) · prioridad Método V1; revalidada direct sobre 956d4c367771ef008d536868c6f38aba15fa789c con evidencia agent-workflows/tools/radar/avance.go todavía limita los trailers conocidos a los Módulos declarados en el plan y agent-workflows/tools/radar/main.go sólo presenta avance con un total planificado; S127 sigue siendo una Sesión full-sdd sin Módulos declarados y sus tres trailers producen avisos en radar check. El contrato, las pruebas y las tres rutas de M128.1 siguen determinados sobre este HEAD..
- **S130:** propuesta direct (Las tres reglas están decididas y el cambio se limita a una skill y su prueba; no queda decisión de diseño abierta.) · prioridad Método V1; pendiente de revalidación en kickoff.
- **S131:** propuesta direct (El lifecycle, la fuente del pool, el lock atómico, la reserva all-or-nothing, la preparación condicional y el retiro persistente están decididos; el cambio se concentra en una skill, su referencia de retiro y su prueba contractual.) · prioridad Método V1; revalidada direct sobre 00745a3a3d867ed432f63a98a93ea0a2828bf2b5 con evidencia Sobre master limpio, agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md:12-24 y 53-60 conserva el lifecycle efímero y despacho parcial de S126: todavía faltan pool declarado por AGENTS.md, lock atómico común, reserva all-or-nothing, worker libre/limpio fuera de Main, rama/agente nuevos, preparación condicional y rollback acotado. agent-workflows/skills/chanks-3-despacho-herdr/references/retiro.md:3-25 aún cierra tab, elimina worktree/rama y no comparte el lock ni confirma readback. agent-workflows/tests/test&#95;despacho&#95;herdr.py:52-56,145-149,216-227 fija ese modelo temporal y omite las regresiones decididas. El contrato aprobado determina todo el reemplazo dentro de esos tres paths, por lo que la ruta sigue direct; la ejecución es serial y no adquiere el lock runtime porque modifica su contrato sin despachar ni retirar workers..
- **S132:** propuesta direct (Las reglas, los dos archivos, el fallback de Radar, la topología persistente y la frontera de autoridad del issue-resolver están decididos y son verificables sin diseño abierto.) · prioridad Método V1; revalidada direct sobre 5e39a7ef272d8fd15407608f5566139064d38e8b con evidencia Git: master limpio en 5e39a7ef272d8fd15407608f5566139064d38e8b; radar sesion S132 -C .: LISTO, S12.1 COMPLETO y M132.1 primer Módulo pendiente; Área reabierta: AGENTS.md y test/pre-push-plan-gate.test.mjs. El fallback temporal de Radar con -f absoluto, la topología persistente, la preparación por ausencia o drift, el intake de fricción y la frontera del issue-resolver siguen determinados..
- **S134:** propuesta direct (Las frases, las superficies y los archivos están identificados y el cálculo de capacidad no cambia; no queda decisión de diseño abierta.) · prioridad Método V1; pendiente de revalidación en kickoff.
- **S135:** propuesta direct (Las cuatro decisiones están tomadas, las superficies y archivos están identificados y el cambio en Radar es una regla acotada; no queda decisión de diseño abierta.) · prioridad Método V1; pendiente de revalidación en kickoff.
- **S136:** propuesta direct (El destino, el formulario de referencia, los controles obligatorios, la ruta exacta y los primeros reportes están determinados; no queda una decisión técnica abierta.) · prioridad Método V1; revalidada direct sobre b97b41cde3ebab70cade2c8201a59d1ea876af2c con evidencia El formulario de referencia de gentle-pi, las etiquetas existentes, el permiso ADMIN, la ausencia inicial 404 y el contrato de S136 fijaron una única ruta y un único archivo; la verificación independiente pasó sin ampliar el alcance..
- **S137:** propuesta direct (El runtime admitido, la separación Herdr/Intercom, las operaciones permitidas, los rechazos, la ruta de decisiones y el límite pre-V1 están resueltos y se verifican en una skill, su routing instalado y pruebas contractuales.) · prioridad Método V1; revalidada direct sobre 87f80ba6320eaf98618cf7e51b8bc3d8948da7dc con evidencia El dispatcher actual acepta cualquier agent kind y en su paso 6 espera cada agente; el routing instalado repite el despacho Herdr sin contrato de transporte. Las tres rutas declaradas contienen toda la corrección: pruebas textuales RED, skill Pi-only con Intercom fire-and-forget y proyección del mismo límite en las instrucciones instaladas. No requiere diseño técnico ni toca el lifecycle de pool reservado a S131..
- **S138:** propuesta direct (El contrato del issue &#35;134, las tres rutas y las aserciones textuales están determinados; no queda diseño técnico ni cambio de ownership de rutas pendiente.) · prioridad Método V1; revalidada direct sobre f61894b0614b8a4eda6d4374c19ceb57ed805e4e con evidencia Sobre master limpio, agent-workflows/skills/chanks-4-puente/SKILL.md:21,37-38 exige verify, review y trailer por Módulo pero no declara una única candidata de Sesión ni separa Tareas de commits/review; agent-workflows/tests/test&#95;builder&#95;flow.py:111-120 fija trailers y commits por Módulo sin cubrir Tareas, alcance de review ni excepción humana. S130 quedó archivada y S135 conserva ownership de rutas. El delta está completamente determinado en estas dos rutas, por lo que direct sigue siendo la ruta proporcional..
- **S139:** propuesta direct (El formato, los enums, la conducta stale, la compatibilidad y las pruebas negativas están determinados; no queda una decisión técnica abierta.) · prioridad Método V1; revalidada direct sobre 5043970caba49a8a91f68f80187f51358d0791df con evidencia partition.go origina los cinco avisos desde reglas sin uso; plan.go mantiene rutas como strings para diez consumidores y más de cincuenta fixtures, por lo que un parser union inline que proyecta a strings minimiza el cambio sin duplicar ownership..
- **S140:** propuesta direct (S139 define el único formato admitido y las cinco declaraciones exactas ya están identificadas; la activación es una migración mecánica del plan.) · prioridad Método V1; revalidada direct sobre 1458037f74069127d782e6088a184aa377c1493b con evidencia El parser entregado carga formas escalares e inline sin cambiar ownership; las cinco rutas observadas siguen ausentes en HEAD y corresponden exactamente a los dos enums cerrados de S139..
- **S141:** propuesta direct (Radar ya expone HEAD, prioridad, estados, colas y asientos; el cambio sólo conecta esos datos en contratos y regresiones Chanks con conducta completamente determinada.) · prioridad Método V1; revalidada direct sobre 168a47e528c174868c4487537a5b9319efbdc28c con evidencia El bypass persiste: session-routing contiene prosa advisory, kickoff consulta sólo &#96;radar sesion&#96;, cierre de decisiones lee plan.yaml directamente y las pruebas de instalación verifican palabras aisladas en vez de la ruta negativa. Support ya posee la frontera Radar reutilizable..
- **S142:** propuesta direct (Las decisiones de artefacto, ubicación, aprobación, runtime, eventos, ownership, reconstrucción y migración están cerradas; las dependencias entregadas fijan las interfaces que la skill sólo referencia.) · prioridad Método V1; revalidada direct sobre 1e88aa1d82758ad182085d491561fcbe2a8d3e2d con evidencia S131 entrega pool persistente; S137 separa Herdr/Intercom y retorna tras send; S141 instala admisión Radar; chanks-4-puente conserva verify/RDD/commits en implementers y chanks-7-session-doc conserva cierre. Falta únicamente el router stateless entre esos límites..

## Detalle de Sesiones
### S1.19 — Regresión integral Pi-first
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S1.18
  - Recursos: up to five isolated Pi clients and ephemeral test brokers
  - Importación legacy: openspec/plans/plan-1/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Regresión integral Pi-first
  - Resultado y comportamiento: The launch-to-attach-to-observe-to-stop chain passes with one and five clients. The prolonged unattended run passes. Broker crash under traffic proves reconnection and idempotent recovery without promising in-flight messages. More than five clients remains outside the initial claim until measured and the change stays within the planned scope.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: Which exact test files will own the Pi-first integration regression?
      - Evidencia: The immutable S1.19 Area names test/integration/pi-first/&#42;&#42; and test/host-adapters.test.mjs, but the candidate base contains no tracked exact file beneath the integration glob; Radar rejects patterns and directories, and the committed partition rejects unused rules.
      - Checkpoint: before S1.19 RED and the first Module
      - Alcanza: primer-modulo
      - Opción: Prove the exact Pi-first integration test paths before implementation. → S1.19 remains blocked without target territory until exact paths are proven.
      - Opción: Expand Radar to accept pattern territory. → This would expand Radar beyond the approved compatibility contract and is rejected.
      - Opción: Invent or omit an exact integration file. → This would fabricate or discard planned territory evidence and is rejected.
      - Opción: Remove or archive S1.19. → This would discard an approved target Session and is rejected.
  - Referencias: Autoridad original: decision 104, Engram observation 10008, approved Pi-first capacity contract, and Emilio's C05.2M territory-pending resolution. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S1.19. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S2.9 — Enrollment público canónico por CLI
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: enrolamiento · enroll/, main-store/, test/enroll/, test/main-store.test.mjs
  - Archivos autorizados: bin/torre, enroll/index.mjs, test/console/cli.test.mjs, test/enroll/enroll.test.mjs
  - Depende de: —
  - Recursos: registro central de proyectos y lock/escritura atómica ya propiedad de enrollProject, sin activación Tower ni lifecycle de hosts
  - Importación legacy: openspec/plans/plan-2/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Enrollment público canónico por CLI
  - Resultado y comportamiento: torre enroll --repo &lt;ruta&gt; invoca el enrollProject existente y devuelve identidad/revisión del proyecto registrado sin duplicar su lógica. Repetir enrollment idéntico converge según el contrato existente; conflicto o layout inseguro falla cerrado antes de escribir. torre on --repo &lt;ruta&gt; activa sólo proyectos ya registrados; uno no registrado no crea registro ni ACTIVE y explica el comando torre enroll. torre enroll no activa la Torre, no inicia procesos y no muta worktrees. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · api-publica; contrato-visible-del-producto; seguridad-y-permisos]: What is the canonical public enrollment operation and its boundary with Tower activation?
      - Resolución: Public canonical operation is torre enroll --repo &lt;path&gt; calling existing enrollProject; torre on --repo remains activation-only and rejects unregistered projects with enrollment guidance.
      - Autoridad: decision 104, Engram observation 10008, and delivered S8.3 contract
      - Falsificador: The CLI duplicates or bypasses enrollment authority, torre on registers or creates ACTIVE for an unregistered project, or enrollment activates Tower, starts processes, or mutates worktrees.
      - Contaminaba: S9.7
      - Descartada: Implicit enrollment through torre on. → Activation must fail closed for an unregistered project and guide the user to explicit enrollment.
      - Descartada: Duplicate enrollment implementation in the CLI. → Delivered S8.3 enrollProject already owns identity, validation, preflight, and persistence.
      - Descartada: Absence of an explicit public enrollment command. → The approved visible product contract explicitly requires torre enroll --repo &lt;path&gt;.
    - Decisión estructurada [derivable · ]: How are CLI arguments translated to the existing request?
      - Criterio: The CLI does not duplicate validation, identity, preflight, or persistence of enrollProject; any second implementation falsifies the derivation.
      - Autoridad: immutable S2.9 STATUS line 46 and delivered enrollProject S8.3 contract
      - Evidencia: Delivered enrollProject contract, S8.3 evidence, and immutable S2.9 criteria.
      - Checkpoint: before T2.9.1.2
      - Opción: Parse --repo and call the existing enrollProject request unchanged. → One existing authority continues to own identity, validation, preflight, and persistence.
  - Referencias: Autoridad original: decision 104, Engram observation 10008, and delivered S8.3 contract. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S2.9. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S2.10 — Enrollment desde el menú central
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S2.9
  - Recursos: menú central y registro de proyectos; serial con S2.9 por la operación canónica de enrollment
  - Importación legacy: openspec/plans/plan-2/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Enrollment desde el menú central
  - Resultado y comportamiento: El owner y los paths reales del menú quedan probados antes de editar. El menú ofrece enrollment y delega a la operación canónica torre enroll --repo &lt;ruta&gt; sin reimplementar validación o persistencia. Éxito, conflicto y layout inseguro se presentan con resultado coherente con la CLI; enrollment no activa la Torre. El diff toca sólo el Área real aprobado después de resolver el checkpoint.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: ¿Qué repositorio y path poseen el renderer/handler del menú central que debe ofrecer enrollment y cómo invoca la CLI canónica sin duplicar lógica?
      - Evidencia: El screenshot aprobado existe, pero el renderer no fue localizado en este checkout.
      - Checkpoint: antes de RED y antes de nombrar cualquier path
      - Alcanza: primer-modulo
      - Opción: Ubicar el owner real y agregar allí una entrada que llame torre enroll. → Mantiene la UX híbrida aprobada.
      - Opción: Declarar que el menú vive fuera del producto y registrar su repositorio. → Cambia ownership, no el contrato.
      - Opción: No hacer nada. → Deja incompleta la UX pública aprobada.
  - Referencias: Autoridad original: decision 104 and Engram 10008. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S2.10. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S4.4 — Recuperación lógica same-host con raíz sucesora
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: hosts · hosts/, adapters/, extensions/, plugin/, test/hosts/, test/adapters/, test/extensions/, test/plugin/, test/host-adapters.test.mjs, scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs
  - Archivos autorizados: hosts/epoch-enforcement.mjs, test/hosts/epoch-enforcement.test.mjs, hosts/recovery.mjs, test/hosts/recovery.test.mjs
  - Depende de: S4.3, S4.7
  - Recursos: binding Main-owned de backend/proceso/raíz, host&#95;epoch, lineage del predecesor y checkpoint durable; sin DB, migraciones ni token de entrega
  - Importación legacy: openspec/plans/plan-4/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Recuperación lógica same-host con raíz sucesora
  - Resultado y comportamiento: Si backend y raíz siguen vivos, perder Herdr/TUI sólo vuelve a adjuntar la vista al mismo root y conserva host&#95;epoch Recovery por muerte exige stop proof canónico, mismo host/worktree/checkpoint y lineage del predecesor terminal; cualquier drift falla CT&#95;RECOVERY&#95;UNSAFE sin iniciar nada Main incrementa host&#95;epoch, crea backend aislado y raíz primaria nuevos mediante el owner de S4.5, persiste un root&#95;session&#95;id distinto y abre automáticamente la nueva TUI adjunta El brief respeta el orden de autoridad declarado; Engram no sustituye Git/OpenSpec/checkpoint y Notion no participa Todo claim, mensaje o efecto del epoch previo devuelve CT&#95;ASSIGNMENT&#95;STALE; el root anterior nunca se reutiliza ni resucita No se reconstruye memoria de proceso/subagentes, no se relocaliza multi-host y el diff queda dentro del Área
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · dependencias-o-evidencia-contradictorias; contrato-visible-del-producto]: ¿recovery&#95;epoch y host&#95;epoch son contadores distintos o el mismo contador?
      - Resolución: recovery&#95;epoch y host&#95;epoch son el mismo contador; el plan se alinea a host&#95;epoch, sin crear un segundo registro, ampliar el Área ni dar alcance nuevo a S4.4.
      - Autoridad: decisión 45 del maintainer, 2026-08-19
      - Falsificador: Aparece un recovery&#95;epoch con dueño y persistencia propios, o algún criterio de S4.4 deja de satisfacerse al nombrar host&#95;epoch.
      - Contaminaba: S4.4, S7.1
      - Descartada: Mantener dos contadores separados. → Obliga a persistir el segundo en el binding Main-owned fuera del Área de S4.4 y requiere una ampliación no autorizada.
    - Decisión estructurada [derivable · ]: ¿Qué identidad territorial y prueba permiten recuperación?
      - Criterio: Sólo el mismo host WSL, worktree y checkpoint con stop proof positivo permiten recuperación; iniciar desde otro host o worktree falsifica la derivación.
      - Autoridad: REQUIREMENTS §14.4
      - Evidencia: REQUIREMENTS §14.4 exige prueba de salida, inspección de worktree/Git/efectos y preservación de dirty state antes de incrementar host&#95;epoch.
      - Checkpoint: antes de M4.4.1
      - Opción: Exigir mismo host WSL, worktree, checkpoint y stop proof positivo. → Toda contradicción o identidad distinta falla cerrada antes de iniciar sucesores.
    - Decisión estructurada [derivable · ]: ¿Cómo se tratan efectos emitidos por un epoch anterior?
      - Criterio: Todo efecto de un epoch distinto devuelve CT&#95;ASSIGNMENT&#95;STALE; si un efecto viejo persiste, la derivación queda falsificada.
      - Autoridad: CT-V1-08 y S4.1
      - Evidencia: El fence inmutable de S4.1 y REQUIREMENTS §14.4 paso 9 prohíben reutilizar autoridad del epoch anterior.
      - Checkpoint: antes de M4.4.1
      - Opción: Rechazar todo claim, mensaje o efecto del epoch previo. → El sucesor no hereda autoridad ni efectos activos del predecesor.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; seguridad-y-permisos; dependencias-o-evidencia-contradictorias]: ¿Se reconecta una raíz viva o se crea una raíz sucesora tras muerte probada?
      - Resolución: La pérdida sólo de vista reconecta opencode attach a la misma raíz viva sin cambiar host&#95;epoch; la muerte probada de backend y raíz marca el predecesor terminal o stale, incrementa host&#95;epoch y crea backend, raíz y TUI sucesores nuevos en el mismo worktree y checkpoint. El mismo root&#95;session&#95;id no se resucita; no se recuperan subagentes ni memoria in-flight y el contexto se reconstruye desde autoridad durable.
      - Autoridad: decisión 40 del maintainer, 2026-08-18, Engram 9044, alineada por decisión 45
      - Falsificador: La pérdida sólo de vista cambia host&#95;epoch o raíz; una muerte no probada crea sucesores; se reutiliza root&#95;session&#95;id; se recupera memoria in-flight; o el sucesor cambia de host, worktree o checkpoint.
      - Contaminaba: M4.4.2, S4.4, S7.1
      - Descartada: Resucitar la misma raíz y root&#95;session&#95;id. → Rompe la lineage y permite reutilizar identidad del predecesor.
      - Descartada: Recuperar subagentes o memoria in-flight. → Esa memoria es volátil y no forma parte de la autoridad durable.
      - Descartada: Relocalizar la recuperación a otro host o worktree. → S4.4 está limitada a recuperación lógica same-host sobre el mismo worktree y checkpoint.
  - Referencias: Autoridad original: decisiones 37-40, decisión 45, Engram 9040/9044 y REQUIREMENTS §14.4. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S4.4. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Contraste aprobado Engram 11293 con docs/architecture/torre-motor-determinista.md, sección 14: root&#95;session&#95;id y host&#95;epoch identifican al host y no son la raíz de Ejecución Tower. Se conservan decisiones, recursos, resultado y dependencias; no se traslada esa autoridad por confusión de identidades.

### S4.8 — Probar la CLI real OpenCode 1.18.23 contra backend, raíz, brief, vista y plugin/SDK 1.18.13; sólo con la matriz completa verde alinear juntos plugin y SDK a 1.18.23
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: hosts · hosts/, adapters/, extensions/, plugin/, test/hosts/, test/adapters/, test/extensions/, test/plugin/, test/host-adapters.test.mjs, scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs
  - Archivos autorizados: scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs, test/plugin/tower-spike.test.mjs, package.json, bun.lock
  - Depende de: S4.7
  - Recursos: CLI 1.18.23 exacta, subprocess/puerto/HOME temporal aislados, lock/cache Bun
  - Importación legacy: openspec/plans/plan-4/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Probar la CLI real OpenCode 1.18.23 contra backend, raíz, brief, vista y plugin/SDK 1.18.13; sólo con la matriz completa verde alinear juntos plugin y SDK a 1.18.23
  - Resultado y comportamiento: Binario real con versión y digest, aislamiento y cleanup; serve/auth/announcement, /doc parentless, root create/read, brief async exacto y helper attach autenticado pasan. Plugin y SDK 1.18.13 prueban registro, child parentID, prompt, promptAsync y shapes event/status. Antes de verde ambos pins siguen 1.18.13; después ambos quedan 1.18.23, o sin cambio alguno en rojo. El pin por bytes y los paths fuera del Área permanecen intactos.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · dependencias-o-evidencia-contradictorias; seguridad-y-permisos]: ¿Cuándo se retiran el pin Herdr y el drift entre OpenCode CLI, plugin y SDK?
      - Resolución: Herdr 0.8.0 se conserva hasta S4.6, que retira pin y custodia sin adoptar 0.8.2; OpenCode CLI 1.18.23 y plugin/SDK 1.18.13 se conservan hasta la matriz real de S4.8 y sólo se alinean juntos si toda la matriz pasa.
      - Autoridad: decisión 68 del maintainer del 2026-08-25
      - Falsificador: Se adopta Herdr 0.8.2 antes de la prueba guardada, se alinean paquetes por número o mocks, o una matriz fallida deja drift.
      - Contaminaba: S4.6, S4.8, S4.9
      - Descartada: Alinear por número de versión o evidencia simulada. → No prueba compatibilidad del runtime real ni conserva rollback seguro.
    - Decisión estructurada [derivable · ]: ¿Qué evidencia vuelve verde la matriz real de S4.8?
      - Criterio: Todos los contratos reales usados por S4.8 pasan juntos; --version, mocks o un subconjunto no vuelven verde la matriz.
      - Autoridad: decisión 68 y contrato WIP preservado de S4.8
      - Evidencia: El contrato WIP preservado enumera los contratos reales de binario, aislamiento, backend, raíz, brief, vista, plugin y SDK que deben pasar juntos.
      - Checkpoint: antes de alinear los pins
      - Falsificador: La matriz se declara verde usando sólo --version, mocks o un subconjunto de los contratos enumerados.
      - Opción: Exigir todos los contratos reales usados por S4.8. → La alineación ocurre sólo con evidencia completa del runtime real.
  - Referencias: Autoridad original: decisión 68 y contrato WIP preservado de S4.8. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S4.8. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S4.12 — Recuperación mínima de Pi
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S9.4, S1.18
  - Recursos: árbol de procesos Tower-owned, checkpoint durable, lineage Pi
  - Importación legacy: openspec/plans/plan-4/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Recuperación mínima de Pi
  - Resultado y comportamiento: El core admite las transiciones mecánicas de recuperación ligadas a la Ejecución persistida; el adapter Pi ejecuta y atestigua terminación del árbol, quiescencia y creación del sucesor. No decide lifecycle ni trata el transporte como prueba del efecto. Muerte probada termina todo el árbol y prueba quiescencia antes de crear el sucesor, con ID nuevo e impredecible, --fork y lineage explícito. El contexto de implementación conserva sus fuentes durables y la continuidad técnica de Gentle AI; la Ejecución no reemplaza Git, OpenSpec ni Engram. Ningún mensaje volátil es autoridad. El replay desde estado durable es idempotente. La recuperación no reconstruye memoria OpenCode ni toca fuera del Área exacta.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; operaciones-irreversibles; seguridad-y-permisos; dependencias-o-evidencia-contradictorias]: ¿Qué recuperación mínima conserva Pi después de la muerte probada de la raíz?
      - Resolución: La Torre contiene y termina el árbol completo de procesos, prueba quiescencia y arranca un sucesor con ID nuevo e impredecible, --fork y lineage explícito. La continuidad proviene de OpenSpec, Engram y el checkpoint durables; no reconstruye briefs ordenados, epochs ni estado en memoria de OpenCode.
      - Autoridad: decisión 81 del maintainer del 2026-08-27
      - Falsificador: La Torre crea el sucesor sin prueba de muerte y quiescencia, deja vivo un descendiente, reutiliza el ID previo, omite --fork o lineage, o trata memoria de proceso como continuidad durable.
      - Contaminaba: S4.4, S7.1
      - Descartada: Portar completa la decisión 40. → Trasladaría al adapter Pi el acoplamiento y la reconstrucción propios de OpenCode.
      - Descartada: Reinicio sólo manual. → Dejaría a la Torre sin recuperación del host que ahora va primero.
      - Descartada: Dejarlo indefinido. → Permitiría reutilizar un ID terminal o bifurcar sobre un worktree aún activo.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; operaciones-irreversibles; migraciones-o-perdida-de-datos; dependencias-o-evidencia-contradictorias]: ¿Cómo se recuperan los mensajes en vuelo tras una caída del broker Pi?
      - Resolución: Se conserva el mailbox actual, volátil y en memoria. Los mensajes en vuelo perdidos se recuperan repitiendo comandos idempotentes desde el estado durable de Torre, OpenSpec, Engram y checkpoint; no se construye mensajería durable ahora.
      - Autoridad: decisión 87 del maintainer del 2026-08-27
      - Falsificador: Una recuperación depende de un mensaje en memoria, un comando repetido produce un efecto no idempotente, se toma socket&#95;delivered como prueba de aplicación o se declara el mailbox durable.
      - Contaminaba: S4.4, S7.1
      - Descartada: Persistir el mailbox. → Duplicaría el estado durable y agregaría replay, orden y recuperación que la forma mínima no necesita.
      - Descartada: Tratar socket&#95;delivered como recepción. → No es prueba producer-owned.
      - Descartada: Dejar la semántica de pérdida indefinida. → Permitiría asumir continuidad de mensajes que el broker no garantiza.
  - Referencias: Autoridad original: decisiones 81 y 87 del maintainer del 2026-08-27. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S4.12. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 7, 10 y 14. Preparación incompleta: falta delimitar el contrato de recuperación core-adapter, su cobertura de API y la huella final; se conservan los archivos conocidos sin permiso de expansión. S147/S148 no cubren por sí solas esa interfaz ni habilitan esta implementación.

### S7.1 — Ejecutar un piloto terminal Pi-first contra un único candidato inmutable de control-tower y el contrato host-neutral en un HOME/runtime aislado, preservando OpenCode como conformidad diferida.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: entrega · delivery/, continuation/, test/delivery/, test/continuation/
  - Solo lectura: sí (sin archivos autorizados para modificar).
  - Depende de: S1.19, S4.12, S8.13, S5.5
  - Recursos: candidato inmutable, entorno Pi aislado
  - Importación legacy: openspec/plans/plan-7/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Ejecutar un piloto terminal Pi-first contra un único candidato inmutable de control-tower y el contrato host-neutral en un HOME/runtime aislado, preservando OpenCode como conformidad diferida.
  - Resultado y comportamiento: Un único candidate&#95;revision inmutable identifica la corrida completa. Toda evidencia se traza al contrato host-neutral y a ese candidato. La cadena Pi y la recuperación mínima pasan. La instalación, el rollback y el preflight completos pasan en un HOME/runtime aislado, sin instalar ni activar en globals reales. La corrida larga, el crash del broker bajo tráfico y cinco clientes producen evidencia. No se afirma soporte por encima de cinco clientes. Secuencia futura obligatoria: prueba aislada -&gt; publicación de una release V1 probada -&gt; autorización humana explícita posterior -&gt; distribución global real; una V1 meramente probada no basta y esta gate no autoriza publicar ni distribuir ahora. S5.3 se trata como dependencia satisfecha y no se modifica ningún path fuera del Área declarada.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. La Sesión es sólo de lectura: no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [resuelta · dependencias-o-evidencia-contradictorias]: ¿Sobre qué repositorio se corre el piloto cuando un gate no está cubierto?
      - Resolución: El piloto se corre sobre control-tower mismo contra un único candidato final.
      - Autoridad: Decisión 32 del maintainer del 2026-08-14.
      - Falsificador: Se emite una declaración de conformidad sin evidencia de piloto sobre control-tower.
      - Contaminaba: declaracion-de-release
      - Descartada: Declarar conformidad sin cubrir el gate. → Afirmaría algo que no se midió.
      - Descartada: Agregar otro piloto. → Expandiría el alcance de la Sesión.
    - Decisión estructurada [resuelta · contrato-visible-del-producto]: ¿Qué resultado rojo del piloto bloquea la release?
      - Resolución: Bloquea sólo un rojo vivo sobre un requisito de Gates A-G; los rojos de capacidades deliberadamente diferidas no bloquean.
      - Autoridad: Decisión 33 del maintainer del 2026-08-14.
      - Falsificador: Se emite una declaración con un rojo vivo sobre Gates A-G o se bloquea por un rojo de alcance diferido.
      - Contaminaba: declaracion-de-primera-version
      - Descartada: Todo rojo bloquea. → F7 failover y F8 campañas multiproyecto fueron retirados deliberadamente del alcance.
      - Descartada: Ningún rojo bloquea. → Convertiría el gate en documentación sin fuerza.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; dependencias-o-evidencia-contradictorias]: ¿Qué host y candidato gobiernan la conformidad terminal de S7.1?
      - Resolución: S7.1 corre una sola vez contra el candidato final Pi-first inmutable de control-tower y el contrato host-neutral; OpenCode queda diferido mientras esté parqueado.
      - Autoridad: Decisión 85 del maintainer del 2026-08-27.
      - Falsificador: La release usa más de un candidato, evidencia mutable o de otro host, omite el contrato neutral, ignora un rojo de Gates A-G o exige conformidad OpenCode mientras siga diferido.
      - Contaminaba: S7.1, declaracion-de-release
      - Descartada: Gate dual-host. → Haría depender la primera release de un host deliberadamente parqueado.
      - Descartada: Reutilizar evidencia de un host para otro. → La prueba no sería atribuible al runtime liberado.
      - Descartada: Conservar S7.1 sólo para OpenCode. → Mediría un candidato distinto del Pi-first que se pretende declarar.
  - Referencias: Autoridad original: Decisiones 32, 33 y 85 del maintainer; reconciliación Pi-first vigente en openspec/plans/plan-7/STATUS.md líneas 69-79; asignación Entrega aprobada en agent-workflows/ASIGNACION-24-SESIONES.md líneas 161-174. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S7.1. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S8.12 — Packaging del bundle Torre V1: una membresía versionada contiene exactamente los bytes Tower-owned del semáforo —binario, contrato host-neutral, adapter Pi, perfiles y skills Torre— y no instala, activa, reescribe configuración global ni ejecuta rollback.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: instalacion · install/, test/install/
  - Archivos autorizados: scripts/payload-closure.mjs, install/runtime-payload.mjs, test/install/payload-closure.test.mjs, test/install/runtime-payload.test.mjs, test/install/tower-role-assets.test.mjs
  - Depende de: S8.10, S8.14, S149
  - Recursos: contrato RUNTIME&#95;PAYLOAD&#95;FILES, bytes fuente Tower-owned editables de product/tower/profiles/{main,support,implementer}.md consumidos sin modificarlos, bytes fuente Tower-owned editables de product/tower/skills/torre-control/SKILL.md consumidos sin modificar, bytes fuente Tower-owned editables de product/tower/skills/torre-control-entregas/SKILL.md consumidos sin modificar, bytes fuente Tower-owned editables de product/tower/skills/torre-control-soporte/SKILL.md consumidos sin modificar, bytes originales inmutables de product/tower/generic/&#42;&#42; preservados como evidencia de producto, no como raíz de instrucciones activa, bytes fuente Tower-owned de adapters/pi/&#42;&#42; consumidos sin modificarlos, bytes fuente Tower-owned de extensions/pi/&#42;&#42; consumidos sin modificarlos
  - Importación legacy: openspec/plans/plan-8/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Packaging del bundle Torre V1: una membresía versionada contiene exactamente los bytes Tower-owned del semáforo y no instala, activa, reescribe configuración global ni ejecuta rollback. El bundle empaqueta el producto que S149 compila; no empaqueta handoffs, continuation ni despacho Tower-owned, que pertenecen a torre-v2.
  - Resultado y comportamiento: El bundle contiene exactamente la membresía runtime/engine derivada de RUNTIME&#95;PAYLOAD&#95;FILES, el binario del semáforo producido por S149, el contrato host-neutral retenido, adapters/pi/&#42;&#42;, extensions/pi/&#42;&#42; y los perfiles/skills Tower editables bajo product/tower/; excluye configuración Pi/Intercom, skills genéricas Gentle AI y el snapshot inmutable product/tower/generic/, sin relocalizar el engine completo. La membresía enumera el binario por su ruta y su huella exacta, no por el árbol fuente que lo produjo. Un bundle que incluya bytes de continuation, de despacho Tower-owned o de una operación MCP fuera del contrato tower&#95;&#42; falla cerrado. Los tres perfiles y sus skills se materializan desde el bundle sin modificar sus fuentes canónicas editables bajo product/tower/. Faltante, extra, symlink, provenance divergente o incoherencia interceptor/torre-control falla cerrado. Declaración, derivación y guardia observan un único conjunto exacto y determinista. La Sesión sólo empaqueta: no instala, activa, reescribe configuración global ni ejecuta rollback. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; seguridad-y-permisos]: ¿Qué incluye y excluye el bundle Tower?
      - Resolución: El bundle incluye runtime, contrato neutral, adapter Pi y el set local de perfiles/skills Tower canónicos; excluye Planner permanente, configuración Pi/Intercom y skills genéricas Gentle AI.
      - Autoridad: Decisiones 88, 95 y 100.
      - Falsificador: El bundle omite un byte Tower-owned enumerado o incluye Planner permanente, configuración Pi/Intercom o una skill genérica Gentle AI.
      - Contaminaba: S8.12, S8.13
      - Descartada: Incluir Planner permanente, configuración Pi/Intercom o skills genéricas Gentle AI. → Esos bytes no pertenecen al set local Tower-owned autorizado.
      - Descartada: Omitir runtime, contrato neutral, adapter Pi o perfiles y skills Tower canónicos. → El bundle dejaría de representar la membresía aprobada.
    - Decisión estructurada [resuelta · contrato-visible-del-producto]: ¿Qué contrato de routing viaja como bytes Tower-owned en el bundle V1?
      - Resolución: Viajan el route padre torre-control y sus triggers registrados, coherentes con el contrato tower&#95;&#42; del semáforo. La política fire-and-forget de S9.8 NO viaja en el bundle V1: el despacho pasa a torre-v2 y el camino vigente es la skill manual chanks-3-despacho-herdr con la Torre apagada. El bundle no conserva rutas públicas alternativas.
      - Autoridad: Alcance V1 aprobado por Emilio el 2026-09-18 (Engram 11327), que acota la Decisión 104 y Engram 10008 a lo que no depende del despacho Tower-owned; la Decisión 104 conserva su autoridad íntegra dentro de torre-v2.
      - Falsificador: El bundle conserva una ruta pública alternativa, omite un trigger registrado, o transporta la política de despacho de S9.8 pese a que S9.8 pertenece a torre-v2.
      - Contaminaba: S8.12, S8.13
      - Descartada: Conservar rutas públicas alternativas. → Rompería la autoridad única de torre-control.
      - Descartada: Transportar la política fire-and-forget de S9.8 en el bundle V1. → Ataría el release del semáforo a la topología Herdr, que es justamente lo que el corte del 2026-09-18 separa.
    - Decisión estructurada [derivable · ]: ¿Cómo se ordena y deriva internamente la membresía?
      - Criterio: Una sola composición produce declaración y guardia; faltante, extra, symlink o bytes divergentes falla cerrado.
      - Autoridad: Decisiones 88, 95 y 100; Engram 9921.
      - Evidencia: El contrato vigente enumerado de S8.12 en openspec/plans/plan-8/STATUS.md líneas 998-1031 exige una sola composición para declaración y guardia.
      - Checkpoint: S8.12 RED.
      - Opción: Derivar declaración y guardia desde una sola composición. → Faltante, extra, symlink o bytes divergentes falla cerrado; dos enumeraciones distintas falsifican la derivación.
  - Referencias: Autoridad original: Decisiones 88, 95, 100 y 104; Engram 9921 y 10008; contrato vigente enumerado de S8.12 aprobado por decisión 10315 del maintainer y citado en openspec/plans/plan-8/STATUS.md líneas 998-1031. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S8.12. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Contraste aprobado Engram 11293 con docs/architecture/torre-motor-determinista.md, secciones 14 y 16: el resultado de bundle se conserva. Una futura membresía engine/harness/adapters requiere evidencia concreta de bytes y versiones; esta referencia no cambia el inventario ni amplía archivos o dependencias.

### S8.13 — Instalador, preflight, activación y rollback del bundle Torre V1 ejercitados sólo en un HOME/runtime aislado
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: instalacion · install/, test/install/
  - Archivos autorizados: install/lifecycle.mjs, install/active-pointer.mjs, install/runtime-payload.mjs, bin/torre, test/install/lifecycle.test.mjs, test/install/entrypoint-resolution.test.mjs, test/install/runtime-payload.test.mjs, test/install/launch-worker-cli.test.mjs
  - Depende de: S8.12
  - Recursos: puntero activo y destino de extensión Pi aislados, backups y rollback del bundle Tower aislado, preflight de host externo aislado; prohibidos globals reales
  - Importación legacy: openspec/plans/plan-8/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Instalador, preflight, activación y rollback del bundle Torre V1 ejercitados sólo en un HOME/runtime aislado. El bundle instalado es el de S8.12: semáforo, contrato host-neutral, adapter Pi, perfiles y skills Torre. El instalador no instala, activa ni diagnostica handoffs, continuation ni despacho Tower-owned, que pertenecen a torre-v2.
  - Resultado y comportamiento: torre-control --update selecciona el lifecycle atómico versionado; no ejecuta el camino legado divergente. El shim symlink se reemplaza atómicamente; ningún cp sigue su target owner-read-only. El diagnóstico prueba revisión activa y coherencia exacta entre plugin, MCP y runtime/engine; una mezcla falla cerrado. Ningún chequeo de sólo existencia/ejecutabilidad/key puede devolver un falso positivo saludable. Instalación limpia en el HOME/runtime aislado activa el bundle completo y una capacidad ausente, rota o ambigua, un fallo de carga o cualquier preflight incompatible falla con error local tipado antes de mutar, sin route genérico ni global real. Rollback restaura runtime, interceptor, perfiles y skills Tower juntos dentro del destino aislado; no escribe configuración/skills externas, globals reales ni toca fuera de Área. La extensión Pi del destino aislado se carga realmente y el fingerprint cerrado prueba factory de un argumento, pi.on("input"), campos y source requeridos de InputEvent, continue&#124;transform&#124;handled, notificación local, enrolamiento, bytes/provenance de torre-control e inventario/orden revisados de transforms antes de quedar activa en la prueba; un mismatch deja cero activación parcial y ninguna versión acepta o rechaza por sí sola. El diff toca sólo Área; no modifica Pi core, pi-intercom, skills genéricas, worktrees, evidencia estacionada ni globals reales.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · operaciones-irreversibles; seguridad-y-permisos; contrato-visible-del-producto]: ¿Qué instala Tower en el destino aislado y qué recuperación parcial se admite?
      - Resolución: Tower instala sólo el bundle Tower-owned en el HOME/runtime aislado, valida compatibilidad y rechaza upgrade --shim como recuperación parcial.
      - Autoridad: Decisiones 88, 100 y 102.
      - Falsificador: La instalación incluye bytes ajenos al bundle Tower-owned o acepta upgrade --shim como recuperación parcial.
      - Contaminaba: S8.13, S7.1
      - Descartada: Recuperar parcialmente con upgrade --shim. → Mantendría una instalación incoherente.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; operaciones-irreversibles; seguridad-y-permisos]: ¿Qué preflight permite activar la instalación aislada?
      - Resolución: La instalación aislada habilita el interceptor sólo si enrolamiento, carga real de extensión, fingerprint cerrado Pi, bytes/provenance de torre-control e inventario/orden de transforms pasan; fallo o ambigüedad bloquea antes de mutar y rollback restaura la unidad coherente.
      - Autoridad: Engram 9921 y 9963.
      - Falsificador: Una capacidad ausente, rota o ambigua, un fallo de carga o una decisión basada sólo en versión activa total o parcialmente la instalación.
      - Contaminaba: S8.13, S7.1
      - Descartada: Aceptar compatibilidad sólo por versión o existencia. → No prueba conducta ni coherencia del runtime instalado.
      - Descartada: Activar parcialmente y reparar después. → Viola atomicidad y deja un estado global incoherente.
    - Decisión estructurada [derivable · ]: ¿Cómo se ordenan internamente probe, preflight, activación y diagnóstico?
      - Criterio: Toda carga y validación conductual ocurre antes de la primera mutación y cualquier fallo deja el estado previo byte-idéntico.
      - Autoridad: Decisiones 88, 100 y 102; Engram 9921, 9956 rev2 y 9963.
      - Evidencia: El contrato vigente exige validar conducta antes de la primera mutación y preservar el estado previo ante fallo.
      - Checkpoint: S8.13 RED.
      - Opción: Ejecutar toda carga y validación conductual antes de la primera mutación. → Cualquier fallo deja el estado previo byte-idéntico; activación parcial, diagnóstico existence-only o decisión sólo por versión falsifican la derivación.
    - Decisión estructurada [resuelta · operaciones-irreversibles; seguridad-y-permisos; contrato-visible-del-producto]: ¿Dónde se ejercita el instalador antes de V1 y quién puede autorizar globals reales?
      - Resolución: Secuencia futura obligatoria: prueba aislada de instalador, preflight, activación y rollback contra product/tower/ -&gt; publicación de una release V1 probada -&gt; autorización humana explícita posterior -&gt; distribución global real. Una V1 meramente probada no basta; esta gate no autoriza publicar ni distribuir ahora, y ningún commit de Sesión concede distribución.
      - Autoridad: Engram 10782: aprobación posterior del maintainer de la frontera producto/Torre y de esta secuencia; interpreta el alcance sin reatribuir las decisiones históricas 88, 100 y 102.
      - Falsificador: Una prueba escribe o activa un global real, una distribución ocurre sin prueba aislada, release V1 publicada y probada, y autorización humana posterior en ese orden, o un commit de Sesión se toma como autorización.
      - Contaminaba: S8.13, S7.1
      - Descartada: Ejercitar o activar directamente globals reales. → Mezcla prueba con distribución y omite la autorización humana explícita posterior.
      - Descartada: Tratar un commit de Sesión como autorización de distribución. → La entrega de código no es autoridad para activar ni distribuir.
  - Referencias: Autoridad original: Contrato propietario de la Sesión y autoridades aprobadas del lifecycle versionado; decisiones 88, 100 y 102; Engram 9921, 9956 rev2 y 9963; alcance interpretativo supersedido por Engram 10782, que registra la aprobación posterior del maintainer para la frontera producto/Torre. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S8.13. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Contraste aprobado Engram 11293 con docs/architecture/torre-motor-determinista.md, secciones 14 y 17: se conserva la instalación aislada; la futura unidad engine/contratos/harness deberá demostrar compatibilidad y rollback con evidencia. No se aprueba aquí formato, conversión de datos, activación ni nuevo miembro del payload.

### S9.2 — Main no puede reciclar un asiento ocupado; la ocupación es legible y el reciclado toma un lock exclusivo que falla cerrado si el asiento está tomado o si otro Main lo está mutando.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S9.1
  - Recursos: lock exclusivo de mutación de asiento, estado de ocupación
  - Importación legacy: openspec/plans/plan-9/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Main no puede reciclar un asiento ocupado; la ocupación es legible y el reciclado toma un lock exclusivo que falla cerrado si el asiento está tomado o si otro Main lo está mutando.
  - Resultado y comportamiento:
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [resuelta · expansion-de-alcance; contrato-visible-del-producto]: ¿Qué frontera de comportamiento conserva S9.2 tras recortar la antigua S9.1?
      - Resolución: Se conserva sólo el riesgo real de una carrera entre el maintainer y Main; S9.2 impide que Main recicle un asiento ocupado, sin la seguridad de descriptores, doble observación canónica, matrices de precedencia, arreglos argv exactos, documentación adicional ni apagado del reciclador manual descartados por la decisión 62.
      - Autoridad: Decisión 62 del maintainer del 2026-08-21.
      - Falsificador: S9.2 entrega seguridad de descriptores, doble observación canónica o documentos de gobernanza, o apaga jornada.sh --reciclar.
      - Descartada: Conservar la antigua S9.1 completa. → Era sobreingeniería para reemplazar un reciclador manual que ya funciona con sus salvaguardas.
      - Descartada: Apagar el reciclador manual mediante un interlock one-way. → La decisión 50 ya había reabierto ese Módulo por apagar una herramienta en uso.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: Which exact concrete repository-relative paths comprise the S9.2 Area, and which single Zone owns each path without crossing into Cimientos or another Zone?
      - Evidencia: The immutable source says Área PENDIENTE DE ENUMERAR, and the committed mapping has no stable Module/Task IDs or exact paths; decision 62 fixes only the occupied-seat interlock behavioral boundary and does not establish territory.
      - Checkpoint: Before deriving acceptance criteria, Modules, Tasks, or scheduling.
      - Alcanza: criterios
      - Opción: Enumerate the exact paths from read-only code and partition evidence, then obtain later explicit maintainer approval. → S9.2 remains blocked until that approval; afterward ordinary territory and decomposition may be derived without crossing a Zone boundary.
      - Opción: Keep S9.2 blocked with no execution authority. → No criteria, Module, Task, schedule, ownership, seat, or capacity may be derived or assigned.
      - Opción: Retire S9.2 scope. → The occupied-seat interlock is lost and recycle or concurrent Main mutation remains without this planned fail-closed protection.
  - Referencias: Autoridad original: Decisión 62 para la frontera de comportamiento y decisión 10325 del maintainer para conservar S9.2 bloqueada por territorio pendiente. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S9.2. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S9.7 — Route padre registrado y triggers públicos exactos
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S1.20, S2.9, S9.6
  - Recursos: cadena global pi.on("input"), probe tipado de modo y resolución canónica de proyecto enrolado; sin Herdr, DB mutable ni procesos
  - Importación legacy: openspec/plans/plan-9/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Route padre registrado y triggers públicos exactos
  - Resultado y comportamiento: En un proyecto registrado, cada una de las cuatro frases exactas, con o sin Sesión/topic, alcanza el mismo parent route torre-control; ninguna otra frase se acepta. El route consulta el probe compartido y selecciona ON u OFF sin pedir al usuario que declare el modo; INDETERMINATE falla cerrado y no llega al modelo. Un proyecto no registrado continúa sin captura y explica enrollment sólo cuando el usuario invoca explícitamente la superficie Tower correspondiente. OFF usa peers vivos aprobados y skills sin fabricar garantías Tower. En ON, el route es un adaptador delgado del core: solicita la transición admitida y materializa su paquete ligado; no reconstruye lifecycle, binding, persistencia ni retry desde prompts o transcripts. El core conserva la autoridad mecánica de esas transiciones sin elegir trabajo ni sustituir la aprobación humana. El contrato viejo de S9.6 queda como historia cerrada y no se reabre ni recibe crédito nuevo. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; api-publica]: ¿Cuál es el route padre y qué triggers públicos acepta?
      - Resolución: Un único parent route torre-control detecta ON/OFF/INDETERMINATE y acepta exactamente, para proyectos registrados, “empezamos la jornada”, “prepará el espacio de trabajo”, “continuemos con la implementación” y “quiero continuar con la implementación”, con Sesión/topic opcional.
      - Autoridad: decisión 104 y Engram 10008.
      - Falsificador: El usuario debe declarar el modo, se acepta una quinta frase o se conserva el route público genérico anterior.
    - Decisión estructurada [derivable · ]: ¿Cómo clasifica el route el modo y selecciona su ejecución?
      - Criterio: INDETERMINATE falla cerrado con diagnóstico local y cero turno de modelo; OFF y ON seleccionan su ejecución después del mismo route, sin transferir autoridad.
      - Autoridad: decisión 104 y Engram 10008.
      - Evidencia: El probe S1.20 es la única clasificación de modo según el contrato inmutable de S9.7.
      - Checkpoint: antes de M9.7.1
      - Opción: Consultar exclusivamente el probe compartido S1.20 y fallar cerrado ante INDETERMINATE. → OFF y ON seleccionan su ejecución tras el mismo route sin pedir al usuario que declare modo ni transferir autoridad.
  - Referencias: Autoridad original: decisión 104, Engram 10008 y fuente cerrada de S9.6 como antecedente, no como contrato visible vigente. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S9.7. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 11 y 14. Preparación incompleta: falta delimitar la API/IPC consumida por el harness ON, su cobertura y la huella final; no se amplían los archivos conocidos ni se implementa esa API aquí por inferencia. S147/S148 no sustituyen esa cobertura ni autorizan activación.

### S9.8 — Dispatch fire-and-forget y cierre asíncrono
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S108, S1.18
  - Recursos: dispatch&#95;id, canal Intercom ya ligado por S1.18 y mailbox de Main; sin ownership de Herdr, lifecycle de procesos o entrega Git
  - Importación legacy: openspec/plans/plan-9/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Dispatch fire-and-forget y cierre asíncrono
  - Resultado y comportamiento: Main conserva la autoridad humana de assignment y solicita el despacho. Para una Ejecución admitida, el core registra el intento y dispatch&#95;id y emite el paquete ligado; el adapter transporta el envío y Main vuelve inmediatamente a coordinar después del acknowledgment de envío. La entrega del mensaje no prueba ejecución ni avance. Progreso y cierre llegan por send; ask sólo aparece con una pregunta de decisión exacta y deja el assignment BLOCKED recuperable. Cada assignment acepta exactamente un terminal COMPLETED, BLOCKED o FAILED con los campos de evidencia/recoverability aprobados; duplicado, stale o sin dispatch&#95;id falla cerrado. Un candidato local, un pane activo o trabajo parcial sin terminal no acredita progreso ni habilita downstream. Antes de cada dispatch o retry, S9.8 invoca S108 para el binding objetivo; &#96;active&#95;unchanged&#96; y cierres terminales exactos son convergencia válida, mientras evidencia ausente, fallida, ambigua o divergente produce cero dispatch. S9.8 no enumera, deriva, renombra ni cierra tabs, panes o workspaces Herdr y no interpreta los testigos persistidos por S121. OFF no atribuye persistencia/retry Tower-owned; ON exige binding y convergencia S108 del objetivo, sin bloquear por otras Sesiones activas válidas. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; seguridad-y-permisos]: ¿Cuál es la política de dispatch y cierre asíncrono?
      - Resolución: Dispatch es fire-and-forget; Main bloquea sólo ante una decisión verdadera; send lleva progreso/completion y ask queda reservado a decisión humana.
      - Autoridad: decisión 104 y Engram 10008.
      - Falsificador: Un dispatch espera ordinariamente, ask se usa fuera de una decisión humana, send no lleva progreso/completion, o Main acredita trabajo sin terminal válido.
    - Decisión estructurada [derivable · ]: ¿Cuándo acredita Main avance del assignment?
      - Criterio: COMPLETED exige evidence refs, changed paths y tests; BLOCKED/FAILED exigen razón y recoverability; estado parcial, pane visible o candidato local no acredita progreso.
      - Autoridad: decisión 104 y Engram 10008.
      - Evidencia: Contrato inmutable de S9.8.
      - Checkpoint: antes de acreditar progreso o habilitar downstream.
      - Opción: Acreditar sólo un terminal válido ligado al dispatch&#95;id. → Progreso parcial, pane visible o candidato local no habilitan downstream.
  - Referencias: Autoridad original: decisión 104 y Engram 10008. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S9.8. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 9, 10 y 14. Preparación incompleta: falta delimitar paquetes, admisión de resultados externos y cobertura de API/IPC con su huella final. RDD sigue siendo autoridad externa: no se inventan verdicts, FINALIZE ni archivos de receipt de Gentle AI. S147/S148 no implementan este circuito ni desbloquean por sí solas sus consumidores.

### S9.10 — Materialización canónica desde base&#95;sha aprobado
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S9.9
  - Recursos: asiento permanente limpio, base&#95;sha no-master exacto, binding público completo
  - Importación legacy: openspec/plans/plan-9/STATUS.md@e6b7e673f671e6bba30f9a600bf0333a1cd90af2
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Materialización canónica desde base&#95;sha aprobado
  - Resultado y comportamiento: materializar recibe asiento, rol, carril, rama, base&#95;sha y confirmación; asignar permanece read-only. Los 12 intentos son evidencia histórica no entregada; cuatro CRITICAL y corrección agotada bloquean S9.10 y S101. No entrega, archive, activation, readiness, package identity ni bytes de implementer-3.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [resuelta · contrato-visible-del-producto; api-publica; seguridad-y-permisos]
      - Resolución: materializar es una operación separada full-binding; asignar no muta.
      - Autoridad: Engram 10522
      - Falsificador: materializar omite rol/carril/base/confirmación o asignar muta.
    - Decisión estructurada [escala · seguridad-y-permisos]: ¿Se autoriza una nueva corrección tras cuatro CRITICAL y presupuesto agotado?
      - Evidencia: Verify final Engram 10531; maintainer chose no-action in 10532.
      - Checkpoint: blocked-human-decision after verify rev2
      - Alcanza: primer-modulo
      - Contamina: S101
      - Opción: no-action → Preservar el candidato de implementer-3; no nueva RED, corrección, review, commit ni archive.
  - Referencias: Autoridad original: Engram 10522 (full-binding), 10525/10527 (historical attempt), 10531 (verify FAIL), 10532 (no-action). Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S9.10. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.3 — Las cinco migraciones y sus manifiestos viven en db/migrations/ y db/manifests.mjs; core.mjs los re-exporta, ningún import cambia y las firmas SHA-256 permanecen idénticas.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S8.10
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Las cinco migraciones y sus manifiestos viven en db/migrations/ y db/manifests.mjs; core.mjs los re-exporta, ningún import cambia y las firmas SHA-256 permanecen idénticas.
  - Resultado y comportamiento: MIGRATION&#95;001..005&#95;CHECKSUM dan exactamente los mismos SHA-256 que en 7e718d6. Ninguno de los 22 archivos que importan de core.mjs cambia. La suite completa pasa con 1026 o más pruebas y 0 fallos. core.mjs baja de 4646 a 3900 líneas o menos. El diff no toca ninguna ruta fuera del Área histórica core.mjs, db/&#42;&#42; y test/db/&#42;&#42;. Registro histórico no autorizante: M12.3.1 movió 26 líneas a db/migrations/001.mjs, preservó las cinco firmas SHA-256 y dejó 1022 pass / 4 fail; no es entrega ni cierre. Consumidores históricos: install/runtime-payload.mjs:7,71 y test/install/payload-closure.test.mjs:95 exigen allowlist exacta y scanClosure; test/identity.test.mjs copia sólo core.mjs; test/install/launch-worker-cli.test.mjs:52 instala sólo core.mjs. Razonamiento histórico no autorizante: la entrega premia core.mjs como archivo único; partirlo sin cambiar la allowlist y los dos arneses empuja contra ese incentivo, no contra el descuido. Pregunta histórica no resuelta de routing: los prerrequisitos 2 y 3 deben ser ruteados por el maintainer a S12.8 ampliada, S8.10 o una Sesión propia; la fuente no declara clase ni alcance modernos y no se inventan. Recurso histórico no autorizante: core.mjs en exclusiva; no autoriza reserva ni ejecución. Decisión histórica retirada: el límite de 400 no requiere excepción al dividir cada movimiento en agregar y luego retirar/re-exportar; las copias coexisten y la firma sigue coincidiendo; no autoriza los prerrequisitos externos. Forecast histórico: M12.3.2 115 movidas/~235; M12.3.3 79/~165; M12.3.4 216/~435; M12.3.5 232/~465; M12.3.6 ~40.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [derivable · ]: ¿El destino de las migraciones es db/ en la raíz o src/adapters/db/?
      - Criterio: La decisión 4 difiere la mudanza a src/ y db/ sigue la convención plana de registry/, main-store/ y contracts/.
      - Autoridad: Decisión 4 del maintainer.
      - Evidencia: Decisión 4 del maintainer y contrato inmutable S12.3.
      - Checkpoint: Antes de extraer migraciones.
      - Opción: Usar db/ en la raíz. → El destino sigue la convención plana vigente; revertir la decisión 4 falsifica esta derivación.
    - Decisión estructurada [escala · contrato-visible]: ¿Debe S12.3 permanecer en el estacionamiento migratorio provisional autorizado, sin territorio ni ejecución?
      - Evidencia: La aprobación 10433 autoriza sólo estacionar la representación; no resuelve el routing histórico ni concede territorio, ruta, Cimientos, reservas, ownership o capacidad.
      - Checkpoint: Antes de cualquier territorio o ejecución.
      - Alcanza: criterios
      - Opción: Mantener el estacionamiento provisional. → S12.3 permanece sin Zona, ruta, Cimientos, reservas, ownership, cola, asiento, capacidad o ejecución.
  - Referencias: Autoridad original: Decisión 2 del maintainer, 2026-08-30; aprobación humana 10433 permite sólo el estacionamiento migratorio provisional de S12.3. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.3. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.4 — Las funciones que verifican coherencia entre SQLite y la versión del esquema viven en db/validators/ sin cambiar su cuerpo ni el comportamiento de persistencia.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S12.3
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Las funciones que verifican coherencia entre SQLite y la versión del esquema viven en db/validators/ sin cambiar su cuerpo ni el comportamiento de persistencia.
  - Resultado y comportamiento: La suite completa pasa con 1026 o más pruebas y 0 fallos. Ningún archivo que importa de core.mjs cambia. core.mjs baja a 2900 líneas o menos. Ninguna función de validación cambia su cuerpo; cada diff es un movimiento byte a byte. El diff no toca ninguna ruta fuera del Área histórica core.mjs, db/validators/&#42;&#42; y test/db/&#42;&#42;. Registro histórico no autorizante: el Estado PLANIFICADO de la fuente describe sólo su pasado; no es Estado authored ni autoriza ejecución. Recurso histórico no autorizante: core.mjs en exclusiva; no autoriza reserva, Zona, ruta, Cimiento, owner, cola, asiento, capacidad ni ejecución. Decisión histórica pendiente: validateSchema4Persistence tenía un forecast de ~1320 authored y contaminaba sólo M12.4.2; su clase y alcance no fueron declarados por la fuente y no se inventan.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [escala · contrato-visible]: ¿Puede formalizarse toda S12.4 con territorio, ruta, Cimientos y reservas ejecutables sin resolver ni reemplazar el hold histórico de M12.4.2?
      - Evidencia: La fuente inmutable S12.4:367-409 conserva el hold de validateSchema4Persistence sólo en M12.4.2; la aprobación 10433 acepta bloquear provisionalmente toda S12.4 para migración, pero no formaliza territorio, ownership, rutas, capacidad ni el hold original.
      - Checkpoint: Antes de formalizar territorio o ejecutar el primer Módulo.
      - Alcanza: criterios
      - Opción: Probar territorio y formalizar el contrato ordinario con autoridad posterior explícita. → La formalización posterior debe conservar el hold original de M12.4.2 hasta resolverlo.
      - Opción: Mantener territorio pendiente. → Toda S12.4 sigue bloqueada sin Zona, ruta, Cimientos, reservas, ownership, cola, asiento ni capacidad; M12.4.2 permanece separado y no resuelto.
  - Referencias: Autoridad original: Decisión 2 del maintainer, 2026-08-30; aprobación humana 10433 limita esta representación a formalización migratoria provisional de S12.4. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.4. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.5 — El protocolo de continuación sale de core.mjs bajo continuation/ sin cambiar cuerpos ni comportamiento.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S12.4
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: El protocolo de continuación sale de core.mjs bajo continuation/ sin cambiar cuerpos ni comportamiento.
  - Resultado y comportamiento: La superficie operativa actual de continuation se mide antes de descomponerla y preserva cuerpos y comportamiento. La superficie actual medida es: continuationActivate, continuationStatus, continuationBootstrapMain, continuationCreate, continuationValidate, continuationPublish, continuationClaim, continuationAck, continuationAttestCompletion, continuationComplete, continuationReject, continuationRevise, continuationRecover, continuationRecordTerminationReceipt, continuationBeginRollback, continuationRebindMain, continuationFinishRollback, continuationRegister y continuationReceive. core.mjs queda sólo con el vocabulario y las primitivas de la Torre después de una descomposición aprobada. La suite completa pasa y ningún importador de core.mjs cambia durante la extracción. Área histórica no autorizante: core.mjs, continuation/&#42;&#42; y test/continuation/&#42;&#42;; Recurso histórico no autorizante: core.mjs en exclusiva y continuation/integrated-base.mjs.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: ¿Qué Módulos y Tareas preservan la superficie operativa actual de continuation sin cambiar cuerpos ni comportamiento?
      - Evidencia: El contrato inmutable S12.5:410-451 aplaza toda la descomposición a session-plan; Emilio 10463 reemplaza el conteo histórico de 24 por la superficie actual medida en core.mjs y su dispatcher.
      - Checkpoint: Antes de M12.5.1.
      - Alcanza: primer-modulo
      - Opción: Medir la superficie actual y escribir Módulos y Tareas en session-plan. → La descomposición cubre cada operación actual y conserva cuerpos y comportamiento antes de cualquier ejecución.
      - Opción: Mantener la Sesión sin descomposición. → S12.5 permanece no ejecutable y no autoriza territorio, ruta, Cimientos, recurso ni ejecución.
  - Referencias: Autoridad original: Decisión 2 del maintainer, 2026-08-30; decisión Emilio 10463 sustituye el conteo histórico fijo por la superficie actual medida antes de M12.5.1. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.5. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.6 — La raíz se ordena después de la descomposición de core.mjs y el README se reconcilia con esa estructura.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: cimientos · —
  - Archivos autorizados: README.md
  - Depende de: S12.5, S150
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: La raíz se ordena y el README describe el producto real.
  - Resultado y comportamiento: El directorio host/ no existe; M12.6.1 ya fue entregado independientemente de S12.5. Cada carpeta que el README nombra existe y cada carpeta de primer nivel aparece en el README. La suite completa pasa y el trabajo restante no modifica una ruta fuera de sus archivos autorizados. Dependencia acotada: S12.5 aplica sólo al trabajo restante de M12.6.2 y M12.6.3; M12.6.1 permanece historia entregada, no cierre de S12.6. Entrega histórica no autorizante de M12.6.1: 08a99af00b627fea81a72013b4bdce780e73d1fc (ancestro de HEAD); no es entrega de la Sesión. Área histórica no autorizante: host/&#42;&#42;, hosts/&#42;&#42;, README.md y archivos que importen host/loop.mjs; el recurso histórico es —.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [derivable · ]: ¿Se mueve host/loop.mjs a hosts/ o al revés?
      - Criterio: hosts/ tenía catorce archivos y host/ uno; un contrato publicado que nombre host/ falsifica la derivación.
      - Autoridad: El árbol del repositorio, como registra S12.6.
      - Evidencia: El contrato inmutable S12.6:475-477 registra que hosts/ tenía catorce archivos y host/ uno.
      - Checkpoint: Antes de M12.6.1 histórico.
      - Opción: Mover host/loop.mjs a hosts/. → Se elimina la carpeta de un archivo y se conserva la organización con más archivos.
  - Referencias: Autoridad original: Decisión 4 del maintainer, opción B combinada, 2026-08-30. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.6. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.7 — La migración futura por Zonas mueve las 26 carpetas planas a src/domain/, src/app/, src/adapters/ y src/contracts/ sin que domain/ ni app/ importen de adapters/.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S12.6
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: La migración futura por Zonas mueve las 26 carpetas planas a src/domain/, src/app/, src/adapters/ y src/contracts/ sin que domain/ ni app/ importen de adapters/.
  - Resultado y comportamiento: Estrategia histórica no autorizante: migrar por Zona, con puentes temporales de raíz; retirar rutas de raíz sólo después de probar migrados todos los consumidores y payloads. Resultado histórico: las 26 carpetas planas pasan a src/domain/, src/app/, src/adapters/ y src/contracts/. Regla histórica verificable: domain/ y app/ no importan de adapters/. La Sesión permanece no ejecutable hasta completar su encargo y territorio autorizado y resolver sus decisiones pendientes contra HEAD; Gentle AI realiza el desglose técnico posterior. Área y recurso históricos no autorizantes: src/&#42;&#42;, todo el árbol de primer nivel y el repositorio entero.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: ¿Qué Módulos, Tareas, Zonas y puentes temporales migran las 26 carpetas sin retirar rutas de raíz antes de probar consumidores y payloads?
      - Evidencia: El contrato inmutable S12.7:516-527 fija el resultado, el aplazamiento a session-plan y la regla de importación; Emilio 10469 ordena conservar el aplazamiento histórico sin enumerar la descomposición sucesora actual.
      - Checkpoint: Antes del primer Módulo de session-plan.
      - Alcanza: primer-modulo
      - Opción: Diseñar la migración por Zona con puentes temporales de raíz. → Sólo después de probar todos los consumidores y payloads migrados se pueden retirar las rutas de raíz.
      - Opción: Mantener la Sesión diferida sin descomposición. → S12.7 no otorga territorio, Zona, Cimientos, recurso, revalidación ni ejecución.
  - Referencias: Autoridad original: Decisión 4 del maintainer, opción A, 2026-08-30; decisión Emilio 10469 para preservar el aplazamiento histórico sin inventar la descomposición sucesora. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.7. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S12.9 — El PRD, el RFC y los requisitos quedan corregidos sin alcance retirado, y la procedencia queda intacta: la revisión 1 conserva sus digests como registro histórico y el puntero canónico avanza a una revisión 2 que describe los bytes nuevos.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: —
  - Recursos: —
  - Importación legacy: openspec/plans/plan-12/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: El PRD, el RFC y los requisitos quedan corregidos sin alcance retirado, y la procedencia queda intacta: la revisión 1 conserva sus digests como registro histórico y el puntero canónico avanza a una revisión 2 que describe los bytes nuevos.
  - Resultado y comportamiento: Los tres documentos no contienen ningún enunciado de alcance retirado, con las ocho variantes que no usan palabra clave incluidas. revisions/1/manifest.yaml no cambió ni un byte. revisions/2/manifest.yaml existe, declara artifact&#95;revision: 2, supersedes la r1, y sus tres content&#95;digest coinciden con los bytes vivos. El puntero canónico avanzó de forma atómica: active&#95;revision: 2, manifest&#95;ref a la r2, map&#95;revision incrementado y previous&#95;pointer&#95;revision conservado. test/provenance/provenance.test.mjs resuelve el manifiesto por el puntero, y la suite pasa 1026 o más con 0 fallos. El diff no toca ninguna ruta fuera del Área histórica y ninguno de los 15 archivos de S12.8. Área histórica no autorizante: openspec/plans/autonomous-v2/revisions/&#42;&#42;, openspec/plans/product-version-map.yaml, openspec/prd/&#42;&#42;, openspec/rfc/&#42;&#42;, openspec/specs/sdd-tower-implementation-v1-requirements.md y test/provenance/provenance.test.mjs. Prohibición histórica no autorizante: los 15 archivos de test/&#42;&#42; que invocan git y test/helpers/&#42;&#42; son el Área exclusiva de S12.8. Recurso histórico no autorizante: el puntero canónico de publicación en exclusiva. Evidencia histórica no autorizante: el contenido está escrito y verificado en parked/s12.2-docs-congelados, resuelto como 2b0506ca3de04c29e7fab485b42c328cd3567c44; no es entrega ni autoridad de publicación.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El territorio es desconocido: el encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura.
    - Decisión estructurada [derivable · ]: ¿La revisión 1 se modifica?
      - Criterio: La nota de product-version-map.yaml dice que las revisiones históricas y sus artifact&#95;id no se eliminan, y delete&#95;historical&#95;artifacts: false lo repite en campo; un digest de la revisión 1 cambia si la derivación es falsa.
      - Autoridad: product-version-map.yaml
      - Evidencia: Fuente inmutable S12.9 líneas 648-651.
      - Checkpoint: Antes de diseñar o escribir la revisión 2.
      - Opción: Conservar la revisión 1 y sus artifact&#95;id sin modificación. → La revisión 1 permanece como registro histórico; cualquier cambio de digest la falsifica.
    - Decisión estructurada [derivable · ]: ¿Cómo resuelve el test el manifiesto de la revisión activa?
      - Criterio: La indirección manifest&#95;ref ya existe en el mapa para este fin; una ruta literal obliga a editar el test en cada revisión y el test sigue nombrando revisions/1/ después de avanzar el puntero si la derivación es falsa.
      - Autoridad: El diseño del mapa.
      - Evidencia: Fuente inmutable S12.9 líneas 652-655.
      - Checkpoint: Antes de diseñar o escribir la prueba de procedencia.
      - Opción: Resolver el manifiesto por el puntero canónico manifest&#95;ref. → El test no depende de una ruta literal ni escanea directorios al avanzar la revisión.
    - Decisión estructurada [escala · contrato-visible]: ¿Qué valor lleva source&#95;commit en una revisión autoral?
      - Evidencia: En la revisión 1 source&#95;commit es 0745f99, el commit que introdujo esos bytes; una revisión escrita ahora no puede nombrar el commit que la publica porque su SHA no existe hasta después de publicarla.
      - Checkpoint: Durante el diseño de SDD y antes de escribir el manifiesto del primer Módulo.
      - Alcanza: primer-modulo
      - Opción: Resolver y aprobar el valor de source&#95;commit antes de escribir el manifiesto. → El diseño fija un valor autoral sin tratar como disponible el SHA del commit que publica la revisión.
      - Opción: Usar como source&#95;commit el SHA del commit que publica la revisión. → No puede escribirse en el manifiesto de la revisión porque ese SHA no existe hasta después de publicarla.
    - Decisión estructurada [escala · dependencias-o-evidencia-contradictorias]: Después de medir 34 pins en 10 archivos, ¿se continúa con la opción A de avanzar a revisión 2 o se respeta la línea base sellada y se coloca el aviso de alcance en un archivo vecino sin sellar?
      - Evidencia: El maintainer eligió la opción A sobre un costo declarado de tres digests en un manifiesto; la medición posterior encontró 34 pins en 10 archivos, 19 en openspec/plans/sdd-tower-implementation/manifest.yaml, 3 en autonomous-v2/revisions/1/manifest.yaml, ocho en directorios de cambios activos y uno en plan-3/STATUS.md, dos de ellos registros que no deberían mutar.
      - Checkpoint: Antes del primer Módulo de S12.9 y antes de publicar cualquier revisión o aviso.
      - Alcanza: primer-modulo
      - Opción: Continuar la opción A y avanzar el puntero a revisión 2. → El alcance deja de ser el costo de tres digests y debe afrontar 34 pins en 10 archivos, incluidos registros que no deberían mutar.
      - Opción: Respetar la línea base sellada y poner el aviso de alcance en un archivo vecino sin sellar. → La medición de 34 pins se trata como evidencia de que los documentos son una línea base inmutable.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-08-30, opción A, sobre el hallazgo de M12.2.2. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S12.9. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S101 — Resolución de política: prepare&#95;through opaco y horizon&#95;ceiling salen de la política resuelta
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Zona/Área: capacidades · capabilities/, policy/, test/capabilities/, test/policy/
  - Archivos autorizados: policy/delivery-policy.mjs, policy/jornada.mjs, test/policy/delivery-policy.test.mjs, test/policy/jornada.test.mjs
  - Depende de: S100, S9.10
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Resolución de política: prepare&#95;through opaco y horizon&#95;ceiling salen de la política resuelta
  - Resultado y comportamiento: After migration activation, S101's Gentle AI execution proves that valid declared policy resolves prepare&#95;through as the opaque value TAREAS and horizon&#95;ceiling as 2 counted in Sessions. After migration activation, absent, malformed, invalid, or contradictory policy produces restrictive planning values with resolved false, the named result CT&#95;POLICY&#95;UNRESOLVED, and a non-empty stable reason. S100 remains the sole owner of the optional prepare&#95;through schema declaration, S101 remains the owner of policy and Jornada resolution, and S102 remains the owner of continuation consumption and literal removal. No S101-owned consumer recreates or interprets the TAREAS literal, and no Module count is accepted as the horizon&#95;ceiling unit. Main remains the sole assignment and dispatch authority; S101 grants no assignment, dispatch, continuation, delivery, Tower, Herdr, database, or merge authority. Future S101 runtime design, interfaces, implementation, and tests require a later authorized execution of this Session through Gentle AI after migration activation; ODD is the default and SDD requires an explicit human request.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · expansion-de-alcance]: Which successor owns schema declaration, policy and Jornada resolution, and continuation consumption?
      - Resolución: S100 owns schema declaration, S101 owns policy and Jornada resolution, and future S102 owns continuation consumption and literal removal.
      - Autoridad: Immutable successor lineage in migration/lineage.yaml, assignment commit 43130ad40af06f3ed05671000719217bee74f0a5, and approved proposal/specification rev2.
      - Falsificador: S101 changes schema or continuation ownership, or S102 is materialized in the current two-Session horizon.
      - Descartada: Materialize schema, resolution, and continuation as one S101 contract. → Rejected because it erases the approved S100/S101/S102 ownership and lineage boundaries.
    - Decisión estructurada [resuelta · contrato-visible]: Which planning values and unit are fixed before future runtime design?
      - Resolución: prepare&#95;through is the opaque value TAREAS; horizon&#95;ceiling is 2 and counts Sessions, never Modules.
      - Autoridad: Approved proposal/specification rev2, Engram 10536, and the canonical delivery-policy authority referenced there.
      - Falsificador: The future outcome interprets or recreates TAREAS downstream, uses a ceiling other than 2, or counts Modules.
      - Descartada: Let future runtime design choose another planning depth, ceiling, or counting unit. → Rejected because those product values and Session-count semantics are already approved.
    - Decisión estructurada [resuelta · contrato-visible]: What product outcome is required when policy is absent, malformed, invalid, or contradictory?
      - Resolución: Resolution remains restrictive with resolved false, named result CT&#95;POLICY&#95;UNRESOLVED, restrictive planning values, and a non-empty stable reason.
      - Autoridad: Approved proposal/specification rev2 and canonical fail-closed delivery-policy authority.
      - Falsificador: Any listed policy failure becomes permissive, reports resolved true, omits CT&#95;POLICY&#95;UNRESOLVED, or has no stable named reason.
      - Descartada: Permit a missing or invalid policy to inherit a permissive result. → Rejected because it violates the approved fail-closed boundary.
    - Decisión estructurada [resuelta · seguridad-y-permisos]: Does S101 change assignment or dispatch authority?
      - Resolución: No. Main remains the sole assignment and dispatch authority; S101 only owns future policy and Jornada resolution.
      - Autoridad: Approved proposal/specification rev2, Engram 10536, and the existing Main authority boundary.
      - Falsificador: A non-Main actor gains assignment or dispatch authority from S101.
      - Descartada: Allow policy or Jornada resolution to assign or dispatch work. → Rejected because resolution is not an authority grant.
    - Decisión estructurada [resuelta · migracion-o-perdida-de-datos]: At what depth is S101 complete in the migration candidate?
      - Resolución: S101 uses full-sdd with exactly modulos: &#91;&#93;; runtime decomposition is created only by post-activation full-sdd execution.
      - Autoridad: agent-workflows/tools/radar/check.go:514-524, approved proposal/specification rev2, and route-depth correction Engram 10540.
      - Falsificador: The candidate uses another route, contains any Module or Task, or treats empty modulos as an incomplete contract.
      - Descartada: Embed future runtime Modules and Tasks in the migration candidate. → Rejected because Radar forbids Modules for full-sdd and migration activation must precede runtime decomposition.
  - Referencias: Autoridad original: Identity, result, zona, dependency, cimientos, and replacement lineage are copied from migration/lineage.yaml successors&#91;S101&#93;, whose approved assignment source is immutable commit 43130ad40af06f3ed05671000719217bee74f0a5 at agent-workflows/ASIGNACION-24-SESIONES.md; predecessor S5.14 and its replacement edge remain recorded in migration/lineage.yaml archived&#95;originals and migration/sessions/plan-5.yaml. Product boundaries and route depth are approved by openspec/changes/s101-policy-resolution/proposal.md rev2, specs/policy-resolution/spec.md rev2, and correction 10540. Kickoff route provenance is Engram 10536. Engram 10525/10532 later authority adds S9.10 as a separate prerequisite; it supersedes assignment edge &#91;S100&#93; only by adding S9.10 and preserves S100. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S101. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S107 — Topología Herdr Tower-owned dentro del workspace ligado: MAIN y una tab worker por Session ID canónico, con readback determinista
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S1.18, S9.7, S121
  - Recursos: HERDR&#95;WORKSPACE&#95;ID explícito y recursos Herdr devueltos frescos; sin autoridad sobre recursos extranjeros
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Topología Herdr Tower-owned dentro del workspace ligado: MAIN y una tab worker por Session ID canónico, con readback determinista
  - Resultado y comportamiento: Dentro del workspace ID ligado existe una MAIN exacta y cada launch crea a lo sumo una tab worker etiquetada sólo con el session&#95;id emitido por S121; S107 no crea, nombra ni valida un workspace visible &#96;Control Tower&#96;. AGENTES, labels de asiento y seat split salen; toda tab/pane nueva prueba workspace&#95;id, IDs, label, cwd y foreground&#95;cwd antes de éxito. Sólo un recurso devuelto fresco o reprobado por binding/readback puede mutarse; extranjero o ambiguo queda intacto y falla cerrado. Antes de crear, el core persiste el intento mecánico ligado con workspace/session/cwd esperados. El adapter Herdr ejecuta sólo el efecto admitido y devuelve readback; el core admite la procedencia y finaliza el intento idempotentemente. Un retry admitido por el core recupera sólo una coincidencia exacta y única; conflicto/ambigüedad falla sin adoptar ni limpiar recursos ajenos. El adapter no decide transiciones ni adquiere autoridad de assignment. Herdr genérico sigue Tower-agnostic y las unidades de implementación se revisan en lotes de hasta 400 líneas.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · seguridad-y-permisos; contrato-visible-del-producto]: ¿Quién establece label y workspace visible?
      - Resolución: El label proviene sólo del session&#95;id S121; S107 usa el workspace ID opaco y no reclama una API de nombre visible no observada.
      - Autoridad: Decisión explícita del maintainer del 2026-09-13 y evidencia de hosts/herdr-topology.mjs.
      - Falsificador: Caller o superficie runtime sustituye el label, o S107 inventa una API de workspace-name.
      - Descartada: Inferir identidad desde branch, worktree, asiento, prompt, worker o OpenCode root&#95;session&#95;id. → No son autoridad y permitirían adoptar recursos ajenos.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-09-13 y fuente inmutable: commit 43130ad40af06f3ed05671000719217bee74f0a5, agent-workflows/ASIGNACION-24-SESIONES.md, blob a7c4ced3b196a6ea92a7bd8f181b98b87fc70ae3, línea 155, bytes 7456-7583, SHA-256 05c38114c8d00c5b8a492cc8f8757b222fe233995c8e72de0066621f74678862. El contrato usa sólo HERDR&#95;WORKSPACE&#95;ID y APIs tab/pane observadas; no reclama workspace-name. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S107. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 6, 11 y 14. Preparación incompleta: falta cerrar el contrato de efecto/readback con el core y revalidar la huella y cobertura de API. Los archivos y Cimientos conocidos se conservan; no habilitan escrituras de core ni otro store. S147/S148 no implementan el adapter ni su admisión completa.

### S108 — Ciclo idempotente de tabs worker Tower-owned desde witnesses S121 y estado terminal Radar
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S1.18, S9.7, S107
  - Recursos: witnesses S121 y puerto topology S107; sin roster o active-set paralelo
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Ciclo idempotente de tabs worker Tower-owned desde witnesses S121 y estado terminal Radar
  - Resultado y comportamiento: El core decide la transición contra procedencia S121 y evidencia fresca &#96;radar.snapshot/v1&#96; coincidentes para el session&#95;id almacenado. El adapter enumera sólo recursos Tower-owned mediante &#96;listTowerTabs()&#96;, re-lee workspace/tab/pane y ejecuta y atestigua únicamente el cierre exacto admitido; no reimplementa el cálculo de Radar ni decide lifecycle. Sólo COMPLETO/ARCHIVADO cierra la tab exacta; un estado no terminal válido converge como &#96;active&#95;unchanged&#96; sin mutar, mientras evidencia inválida, desconocida o divergente falla cerrado. Terminal + recurso exacto ya ausente converge idempotentemente; ausencia no terminal, desconocida o divergente falla. No infiere ownership/liveness desde branch, worktree, asiento, label, prompt, proceso, worker o caller; no depende de S109 ni expone Herdr raw. Las unidades de implementación se revisan separadas y cada lote queda bajo 400 líneas.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · seguridad-y-permisos; operaciones-irreversibles]: ¿Qué prueba ownership y qué autoriza cierre?
      - Resolución: El witness S121 prueba procedencia; Radar fresco prueba COMPLETO/ARCHIVADO. Ambos deben coincidir.
      - Autoridad: Decisión del maintainer del 2026-09-13 y evidencia S100.
      - Falsificador: Se cierra sin witness, readback o estado terminal exactos.
      - Descartada: Usar S109, un segundo active-set o inferencia runtime. → Duplica autoridad o adopta evidencia no autoritativa.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-09-13: S121 prueba procedencia y Radar estado; S109 no participa. Fuente inmutable: commit 43130ad40af06f3ed05671000719217bee74f0a5, agent-workflows/ASIGNACION-24-SESIONES.md, blob a7c4ced3b196a6ea92a7bd8f181b98b87fc70ae3, línea 156, bytes 7583-7732, SHA-256 647abd52f3b0a53bce67ddeeeb45832da578d7ea8662685e845e98063494be63. Evidencia lifecycle: S100 COMPLETO, commit 1237075200d2df72927c3b166ade1ba61929cbd2 integrado y cierre exacto w6H. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S108. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 10, 11 y 14. Preparación incompleta: falta cerrar la admisión de evidencias de lifecycle y la interfaz core-adapter con su huella final. Se preservan los terminales exactos y los Cimientos conocidos; no se implementa API/IPC ni persistencia central por expansión tácita. S147/S148 no cubren por sí solas este recorrido.

### S109 — Ventanilla única de plan: la Torre responde una asignación completa y Main deja de derivarla
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: contratos · contracts/, schemas/, registry/, test/contracts/, test/registry/
  - Archivos autorizados: mcp.mjs, schemas/project-registry-v1.schema.json, test/contracts/schema.test.mjs, test/contracts/mcp-assignment.test.mjs, test/registry/storage.test.mjs, test/registry/legacy-import.test.mjs
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Ventanilla única de plan: la Torre responde una asignación completa y Main deja de derivarla
  - Resultado y comportamiento: mcp.mjs responde la asignación completa —Sesión, agente, asiento, contrato de ejecución y política de entrega— en una sola operación, sin que el consumidor lea openspec/plan.yaml ni el ROADMAP. La Torre valida que el snapshot declare schema radar.snapshot/v1 y falla cerrado con un resultado nombrado ante cualquier otro valor, ausencia o JSON inválido; nunca dibuja cifras que el productor no firmó. El registro de proyectos declara por proyecto cómo obtener su snapshot, junto a manifest&#95;path y roadmap&#95;path, y un proyecto sin declaración se reporta como no disponible en vez de asumir un default. Ninguna regla de cálculo de Radar —estado de Sesión, cola por Zona, avance, asientos— queda reimplementada en JavaScript: existe una sola implementación y el consumidor sólo la consume. Main conserva la autoridad de asignación y despacho: NON&#95;MAIN&#95;DISPATCH y WORKER&#95;SELF&#95;ASSIGNMENT siguen siendo pisos irrelajables y esta Sesión no otorga autoridad nueva a nadie. El diseño técnico, las interfaces y la implementación de S109 se elaboran en una ejecución posterior autorizada mediante Gentle AI; cualquier decisión de API pública conserva su aprobación humana previa.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación. El alcance inicial se limita a contratos/MCP y no autoriza escrituras implícitas en Instalación o Método. Si el diseño de empaquetado requiere otros archivos con dueño, exige aprobación humana del padre y compatibilidad fresca antes de la escritura afectada; no se inventa una Sesión nueva ni se afirma que todo el diseño técnico ya sea conocido.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Se unifican los dos idiomas —Radar en Go y los módulos en JavaScript— o se unifica otra cosa?
      - Resolución: Se unifica el contrato, no los idiomas. La Torre no necesita ser Radar: necesita recibir radar.snapshot/v1 y validar el schema, sin saber quién lo produjo.
      - Autoridad: Maintainer, 2026-09-10, sobre el documento de diseño; el patrón ya está probado en agent-workflows/radiografia/measure.mjs desde 969f189.
      - Falsificador: Alguna regla de cálculo de Radar aparece reimplementada en JavaScript, o el consumidor acepta un snapshot cuyo schema no reconoce.
      - Descartada: Portar EstadosAt, ColaPorZonaAt, AvanceAt y AsientosAt a JavaScript. → Rechazada: son 309 líneas de reglas no triviales y dejaría dos implementaciones del mismo reglamento, que es la falla que la migración a Zonas acaba de eliminar.
    - Decisión estructurada [resuelta · expansion-de-alcance]: ¿Dónde corre el cálculo del plan cuando la Torre lo necesita?
      - Resolución: Radar viaja con la Torre y se invoca contra cada proyecto. Radar es el radar de la Torre, no una dependencia que cada proyecto deba traer.
      - Autoridad: Maintainer, 2026-09-10. El registro ya guarda roadmap&#95;path y manifest&#95;path por proyecto en schemas/project-registry-v1.schema.json.
      - Falsificador: La Torre exige que el proyecto gestionado provea Radar por su cuenta, o el cálculo se resuelve con un caché en disco pese a que el estado depende de HEAD.
      - Descartada: Generar un snapshot en disco y leerlo cuando haga falta. → Rechazada: el estado depende de HEAD por merge-base --is-ancestor en agent-workflows/tools/radar/git.go:80, así que el caché queda viejo en cada commit y no sólo al editar el plan.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Main sigue corriendo los tests?
      - Resolución: No los corre: los lee. La Torre ejecuta y guarda la salida completa; a Main le entrega el veredicto y sólo el extracto de lo que falló.
      - Autoridad: Maintainer, 2026-09-10, sobre el documento de diseño.
      - Falsificador: Main vuelve a recibir la salida completa de una suite, o la Torre emite un veredicto sobre si un criterio se cumplió.
      - Descartada: Que la Torre además juzgue si el resultado es aceptable. → Rechazada: distinguir una regresión de un fallo ambiental conocido es juicio sobre evidencia y no tiene respuesta única.
    - Decisión estructurada [resuelta · seguridad-y-permisos]: ¿Esta Sesión elimina el agente Main?
      - Resolución: No. Main sigue existiendo y conserva el juicio, la resolución de ambigüedad y la presentación de decisiones al humano; lo que cambia es que deja de derivar lo que ya está calculado.
      - Autoridad: Maintainer, 2026-09-10: «no estamos eliminando main, estamos protegiendo su ventana de contexto».
      - Falsificador: Un actor que no es Main obtiene autoridad de asignación o despacho a partir de esta Sesión.
      - Descartada: Que la Torre asuma también el despacho y Main desaparezca. → Rechazada por el maintainer: el objetivo es la ventana de contexto, no reemplazar al agente.
  - Referencias: Autoridad original: Idea aprobada por el maintainer el 2026-09-10 sobre el documento de diseño «Torre coordina, Main juzga» (artifact 728134a6-47ab-4088-b688-74af1c92bf2a), medido sobre master en bae57ba. La evidencia que la sostiene: responder «qué sigue y quién lo toma» cuesta 512.563 bytes leyendo openspec/plan.yaml entero contra 3.293 bytes pidiéndole avance, colas y asientos a Radar. El contrato radar.snapshot/v1 y su consumidor de referencia ya existen desde b50c0b3 y 969f189. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S109. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S114 — Todas las Sesiones vigentes declaran el tipo de su autoridad, migradas Zona por Zona para que ningún lote de revisión supere el tope declarado.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: autoridad · openspec/plans/, openspec/plan.yaml, openspec/ROADMAP.md, openspec/prd/, openspec/rfc/, openspec/specs/, openspec/maintenance/, openspec/config.yaml, docs/
  - Archivos autorizados: openspec/plan.yaml, openspec/plans/decision-register.md
  - Depende de: S112, S116
  - Recursos: openspec/plan.yaml; la migración es el único trabajo que lo escribe mientras dura
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Todas las Sesiones vigentes declaran el tipo de su autoridad, migradas Zona por Zona para que ningún lote de revisión supere el tope declarado.
  - Resultado y comportamiento: Cada lote de revisión migra exactamente una Zona y queda bajo el tope; M114.1 repite esos lotes serialmente. radar check pasa después de cada lote de revisión, no sólo al final: una migración parcial nunca deja el plan inválido. Ninguna autoridad cambia de sentido al migrar: se declara el tipo de la cita que ya estaba escrita, nunca se inventa una nueva. Al cerrar, cero Sesiones conservan la forma vieja sin tipo declarado. Queda una sola copia del registro de decisiones en el árbol: openspec/plans/decision-register.md se retira y openspec/archive/legacy-planning/decision-register.md queda como la citable. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Puede el esquema entregado por S112 representar las autoridades reales del plan?
      - Resolución: No. El snapshot histórico fechado del 2026-09-10 probó que varias autoridades citaban más de una clase de fuente y que una cita única perdía información. Las cantidades observadas ese día quedan como evidencia datada y no como total vigente. Extender el campo a una lista de citas es trabajo de la Zona metodo y nació como Sesión propia, S116, porque el alcance descubierto nunca se agrega en silencio a una Sesión ya entregada.
      - Autoridad: Descubrimiento histórico de esta Sesión sobre el snapshot fechado del 2026-09-10, medido contra el esquema entregado en f138e1b.
      - Falsificador: Se migra una autoridad multi-fuente aplastándola a una sola cita, o se extiende el esquema dentro de S112 en vez de en una Sesión nueva.
      - Descartada: Elegir una autoridad primaria por Sesión y descartar el resto. → Pierde información que hoy está escrita, y la Sesión dejaría de poder probar las fuentes que realmente la sostienen.
    - Decisión estructurada [resuelta · migracion-o-perdida-de-datos]: ¿Qué fidelidad conserva la migración cuando la autoridad es prosa que nombra decenas de fuentes?
      - Resolución: La prosa desordenada es un problema de la migración, no algo que la herramienta deba modelar. El esquema no gana ni un campo de contexto para prosa sin migrar ni tipos nuevos: la migración produce citas tipadas y el que no pueda tiparse no pertenece al campo. Lo único que el esquema sí gana es la lista, porque una Sesión que de verdad se apoya en dos decisiones no es prosa desordenada: es dato real que una cita única no puede representar.
      - Autoridad: Decisión del maintainer del 2026-09-10, respaldada por el canon §18 en agent-workflows/skills/&#95;shared/plan-naming-convention.md:548: «Extend the tool to accept the legacy shape — The schema is the contract. Data the schema rejects belongs in the archive, not in a compatibility branch». El campo de contexto propuesto era exactamente esa compatibility branch.
      - Falsificador: El esquema gana un campo de texto libre para prosa sin migrar, o un tipo nuevo cuya única razón de existir es aceptar una cita que quedó mal escrita.
      - Descartada: Conservar el resto de la prosa en un campo de contexto no verificable. → Es la compatibility branch que el canon §18 prohíbe: el esquema dejaría de ser el contrato para volverse un recipiente de lo que no se migró.
      - Descartada: Ampliar el conjunto de tipos para cubrir REQUIREMENTS, artifacts y decisiones de conversación. → Verificado sobre el árbol: cuatro de las cinco autoridades que parecían intipables sí lo son. REQUIREMENTS existe como archivo en openspec/specs/, el SHA suelto resuelve a un commit, y sólo el artifact vive fuera de Git, que ya es la forma de engram. No hacen falta tipos nuevos: hace falta migrarlas bien.
      - Descartada: Migrar sólo las citas que ya resuelven y declarar el resto como no verificable. → Marcaría como no probables autoridades que sí son archivos del repositorio, sólo porque estaban escritas dentro de un párrafo largo.
    - Decisión estructurada [derivable · ]: ¿En qué orden se migran las Zonas?
      - Criterio: Por cantidad de Sesiones, de menor a mayor, para que el primer lote sea el más barato de revisar y cualquier error del contrato aparezca temprano.
      - Autoridad: Decisión del maintainer del 2026-09-10 sobre la estrategia de migración, y el tope de lote declarado en el bloque manual de política del 2026-09-03.
      - Evidencia: radar status calcula las Sesiones por Zona, así que el orden es derivable del propio dato.
      - Checkpoint: antes del primer Módulo.
      - Opción: Ordenar las Zonas por cantidad de Sesiones ascendente. → El contrato se prueba primero sobre el lote más barato; si la forma está mal, se corrige antes de tocar las Zonas grandes.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-09-10 sobre la migración del campo autoridad, elegida entre tres alternativas: migrar por Zona y encender la exigencia al final. La población vigente y el orden se obtienen en ejecución mediante un snapshot &#96;radar status --json&#96; ligado a su revisión; ningún total fijo forma parte del alcance vivo. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S114. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S115 — Radar exige el tipo de autoridad: una Sesión sin tipo declarado falla cerrado, y la compuerta del Tramo 1 queda cerrada.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go
  - Depende de: S114
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Radar exige el tipo de autoridad: una Sesión sin tipo declarado falla cerrado, y la compuerta del Tramo 1 queda cerrada.
  - Resultado y comportamiento: Una Sesión cuya autoridad no declara tipo falla cerrado con un hallazgo que la nombra. La exigencia se enciende sobre un plan que ya está migrado entero: encenderla no produce ni un solo hallazgo sobre el plan vigente. Una autoridad de tipo engram sigue reportándose como no verificable y nunca cuenta como probada, ni siquiera con la exigencia encendida. El diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [derivable · ]: ¿Qué pasa si al encender la exigencia aparece una Sesión sin migrar?
      - Criterio: Falla cerrado y la Sesión no se cierra: encender la exigencia sobre un plan incompleto es exactamente lo que esta secuencia existe para evitar.
      - Autoridad: La estrategia de migración decidida el 2026-09-10, cuyo criterio de cierre en S114 es cero Sesiones sin tipo.
      - Evidencia: El criterio de cierre de S114 y la dependencia declarada de esta Sesión sobre ella.
      - Checkpoint: antes de encender la exigencia.
      - Opción: Fallar cerrado y volver a S114. → La exigencia sólo queda encendida sobre un plan íntegro; nunca se acepta una excepción para destrabar.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-09-10: la exigencia se enciende al final, en una Sesión aparte que depende de que la migración haya terminado, para que nunca convivan dos formas exigidas ni un lote por encima del tope. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S115. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S117 — Los tres registros de instalación dejan de forzar ediciones cross-Zona: sus datos enumerados salen del test a un módulo propio declarado como Cimiento exacto.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: instalacion · install/, test/install/
  - Archivos autorizados: test/install/payload-closure.contract.mjs, test/install/payload-closure.test.mjs, test/install/tower-role-assets.contract.mjs, test/install/tower-role-assets.test.mjs, test/install/runtime-payload.contract.mjs, test/install/runtime-payload.test.mjs
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Los tres registros de instalación dejan de forzar ediciones cross-Zona: sus datos enumerados salen del test a un módulo propio declarado como Cimiento exacto.
  - Resultado y comportamiento: Cada uno de los tres registros queda partido en dos: un &#96;&#42;.contract.mjs&#96; con sólo el dato enumerado, y el &#96;&#42;.test.mjs&#96; original con sólo la lógica, que lo importa. Cada valor extraído es idéntico byte a byte al que reemplazó. Falsificador: cualquier diferencia entre el literal viejo y el export nuevo, más allá del formato, falla este criterio. La suite completa pasa antes y después de cada unidad de implementación, sin debilitar, quitar ni condicionar ninguna aserción para acomodar la partición. &#96;radar check&#96; no reporta huérfanos, solapes ni reglas sin uso con las tres rutas &#96;&#42;.contract.mjs&#96; declaradas en &#96;cimientos.rutas&#96;. &#96;owners()&#96; resuelve cada &#96;&#42;.contract.mjs&#96; nuevo a &#96;cimientos&#96; solo, no a &#96;cimientos + instalacion&#96;. Falsificador: dos dueños significan que el recorte exacto no se aplicó y la partición sí solapa. Ningún archivo cambia de directorio. Falsificador: cualquier ruta fuera de &#96;test/install/&#96; en el diff significa que no se usó el recorte y la Zona instalacion perdió territorio que debía conservar. &#96;install/runtime-payload.mjs&#96; queda intacto: su lista es generada y editarlo sería alcance que la auditoría excluyó explícitamente.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [derivable · interna]: ¿Generar las tres listas en vez de extraerlas?
      - Resolución: No. Extraer. La generación es el remedio más fuerte y ya se usa donde aplica, pero ninguna de estas tres listas es derivable.
      - Criterio: Si alguna de las tres listas pudiera computarse del repositorio sin leer el propio código que verifica, esta resolución es incorrecta y corresponde generar en vez de extraer.
      - Autoridad: openspec/plans/audits/cross-zona-registry-audit.md §3
      - Evidencia: &#96;ASSET&#95;CONTRACTS&#96; guarda valores de frontmatter esperados y tres juegos de regex que fijan oraciones exactas, y ninguna herramienta los computa del árbol. Las dos listas golden son deliberadamente escritas a mano, y un golden generado por el mismo código que verifica no prueba nada. El precedente de generación que sí aplica, &#96;&lt;generated:runtime-payload&gt;&#96;, ya está entregado y cubre el caso derivable.
      - Checkpoint: antes de T117.1.1
      - Opción: Extraer el dato a un módulo propio declarado como Cimiento exacto. → El dato deja de forzar ediciones cross-Zona y se conserva byte a byte; el test queda con sólo lógica.
      - Opción: Generar las tres listas desde el árbol. → Un golden generado por el código que verifica deja de probar nada, y los markers de frontmatter y las oraciones exactas se pierden porque ninguna herramienta los computa.
    - Decisión estructurada [derivable · interna]: ¿Los módulos extraídos deben salir de &#96;test/install/&#96;?
      - Resolución: No. Se quedan donde están y se declaran como Cimientos de archivo exacto.
      - Criterio: Si &#96;owners()&#96; devolviera dos dueños para una ruta exacta declarada bajo una ruta amplia, el recorte no aplicó y mudar los módulos fuera de &#96;test/install/&#96; sería obligatorio.
      - Autoridad: agent-workflows/tools/radar/partition.go:81-83
      - Evidencia: Un Cimiento exacto recorta un archivo de una ruta amplia de Zona (partition.go:81-83), comportamiento cubierto por TestCimientoExactoRecortaUnaRutaAmpliaDeZona. El recorte resuelve el caso sin tocar la ruta amplia &#96;test/install/&#96; ni mover ningún archivo de directorio.
      - Checkpoint: antes de T117.1.3
      - Opción: Dejarlos en &#96;test/install/&#96; y declararlos como Cimientos exactos. → Ningún archivo cambia de directorio y la Zona instalacion conserva su territorio; el dato queda recortado a &#96;cimientos&#96;.
      - Opción: Mudarlos fuera de &#96;test/install/&#96;. → La Zona instalacion pierde territorio que le corresponde y el diff toca rutas que la auditoría excluyó del alcance.
  - Referencias: Autoridad original: openspec/plans/audits/cross-zona-registry-audit.md (Audit G, 2026-09-04), rescatada de support/read-only-20260830 y enumerada por decisión del maintainer del 2026-09-11 al integrar las tres propuestas pendientes. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S117. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S119 — La Torre declara su propia skill de runtime de Herdr: activa sólo ante un pedido explícito de Herdr, y todo despacho, ON/OFF, topología y ciclo de vida de asiento sigue enrutando por &#96;torre-control&#96; → &#96;torre asiento&#96;.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: producto-torre · product/tower/
  - Archivos autorizados: product/tower/skills/herdr/SKILL.md, product/tower/skills/torre-control/SKILL.md, test/install/tower-role-assets.contract.mjs
  - Depende de: S117, S108
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: La Torre declara su propia skill de runtime de Herdr: activa sólo ante un pedido explícito de Herdr, y todo despacho, ON/OFF, topología y ciclo de vida de asiento sigue enrutando por &#96;torre-control&#96; → &#96;torre asiento&#96;.
  - Resultado y comportamiento: &#96;product/tower/skills/herdr/SKILL.md&#96; activa sólo ante pedido explícito y enruta assignment/topología/lifecycle por &#96;torre-control&#96; → &#96;torre asiento&#96;; cierre consume sólo S108. La skill nunca deriva trabajo activo, enumera witnesses S121, interpreta Radar, acepta roster S109 ni manipula recursos extranjeros/ambiguos. La skill lleva las cuatro claves de frontmatter que exige &#96;SKILL&#95;FRONTMATTER&#95;KEYS&#96; (name, description, license, metadata) y las seis secciones que exige &#96;SKILL&#95;SECTIONS&#96;. El registro de assets declara la skill con markers que fijan las dos oraciones de propiedad de la Torre y las dos de aprobación humana del patch preservado, y la suite completa pasa. La skill no documenta ninguna mecánica de la CLI de Herdr que &#96;herdr --skill&#96; ya emite. Falsificador: cualquier flag, timeout o código de error documentado en ambos archivos es un duplicado y falla este criterio. &#96;radar check&#96; reporta 0 huérfanos, 0 solapes y 0 reglas sin uso, y &#96;owners()&#96; resuelve &#96;product/tower/skills/herdr/SKILL.md&#96; sólo a producto-torre, sin Cimiento. &#96;product/tower/skills/torre-control/SKILL.md&#96; gana una referencia a la skill nueva y sus markers existentes siguen pasando sin cambios.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿En qué Zona vive esta Sesión, si la skill está en producto-torre y el manifest que la declara en instalacion?
      - Resolución: En &#96;producto-torre&#96;. La Sesión vive donde vive el producto —es una skill de la Torre— y el manifest declarante se reserva como Cimiento de archivo exacto, que es el mecanismo que el plan ya usa para archivos compartidos.
      - Autoridad: Decisión del maintainer del 2026-09-11, tomada sobre la escalada que la propuesta original del 2026-09-04 dejó abierta y que la separación constructor/Torre volvió inevitable: cuando se escribió, la skill y su manifest vivían en un solo territorio.
      - Falsificador: Una Sesión de la Zona instalacion escribe dentro de &#96;product/tower/&#96;, cruzando la frontera entre el constructor y la Torre.
      - Descartada: Dejarla en &#96;instalacion&#96; como la escribió su autor. → Hoy significaría que una Sesión de instalación escribe dentro de product/tower/, que es exactamente la frontera que la separación trazó.
      - Descartada: Partirla en dos Sesiones, una por Zona. → Cada territorio quedaría limpio, pero el resultado deja de ser revisable de una sola vez: la primera entregaría una skill que nada declara todavía.
    - Decisión estructurada [derivable · interna]: ¿Esta skill toma un nombre &#96;chanks-&lt;tramo&gt;-&lt;nombre&gt;&#96;?
      - Resolución: No. Es una skill de maquinaria y vive al lado de &#96;torre-control&#96;.
      - Criterio: La skill toma un nombre &#96;chanks-&lt;tramo&gt;-&lt;nombre&gt;&#96;, o queda instalada en los directorios globales de skills de los agentes.
      - Autoridad: agent-workflows/FLUJO-END-TO-END.md:164-168
      - Evidencia: El flujo aprobado dice que la skill de runtime de Herdr «no reemplaza &#96;torre asiento&#96; ni se convierte en una skill nueva del método». El prefijo &#96;chanks-&#96; es la marca de las skills del método, que se instalan globalmente en los cuatro agentes; esta skill vive dentro del producto Torre y se empaqueta con él.
      - Checkpoint: antes de T119.1.2
      - Opción: Nombre de maquinaria, al lado de &#96;torre-control&#96; dentro de &#96;product/tower/skills/&#96;. → La skill viaja con el producto Torre y no entra al método global; la frontera constructor/Torre se mantiene.
      - Opción: Nombre &#96;chanks-&lt;tramo&gt;-&lt;nombre&gt;&#96; como skill del método. → Contradice la oración del flujo aprobado y mete una skill del producto en el método global de los cuatro agentes.
  - Referencias: Autoridad original: openspec/plans/audits/herdr-skill-ownership-audit.md y su patch, más decisiones del maintainer del 2026-09-11/13: la skill activa sólo por pedido explícito y delega lifecycle a &#96;torre-control&#96; → &#96;torre asiento&#96; → S108, sin roster S109 ni Herdr raw. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S119. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S121 — Binding Main-validado con Session ID canónico y procedencia durable de cada tab Tower-owned
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: S4.2, S4.5
  - Recursos: assignment-location, launch binding y namespace de witnesses Main-owned; sin segundo assignment store
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Binding Main-validado con Session ID canónico y procedencia durable de cada tab Tower-owned
  - Resultado y comportamiento: assignment-location exige session&#95;id canónico e inmutable; ausencia, forma inválida, conflicto o registro legacy falla cerrado. El binding copia ese ID sin caller injection y consumer revalida schema; session&#95;id de plan nunca se confunde con OpenCode root&#95;session&#95;id ni se infiere. Main establece exclusivamente assignment&#95;ref↔session&#95;id. Para una Ejecución admitida, el core persiste el intento mecánico con esa identidad validada y expectativas workspace/cwd; el adapter devuelve el readback que permite admitir procedencia idempotente, aceptar repetición byte-idéntica y rechazar conflicto, forged o ambigüedad. Ni core ni adapter eligen assignments. main-store JSON será proyección de compatibilidad del estado canónico en SQLite, nunca un segundo escritor de autoridad; la migración y proyección necesitan su propia cobertura antes de cambiar consumidores. &#96;listTowerTabs()&#96; enumera procedencia read-only, nunca liveness, active-set, dispatch o cierre. La fixture registra sólo identidad Main-owned y la CLI acepta únicamente request&#95;ref opaco. Cada lote de revisión queda bajo 400 líneas.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · seguridad-y-permisos; contrato-visible-del-producto]: ¿Quién establece Session ID y qué significa la lista de tabs?
      - Resolución: Sólo Main registra el session&#95;id canónico; la lista prueba procedencia y Radar/S108 determinan estado y cierre.
      - Autoridad: Decisión explícita del maintainer del 2026-09-13.
      - Falsificador: Caller/runtime inyecta o infiere Session ID, o S121 usa witnesses como roster/liveness.
      - Descartada: Persistir otro active-set o derivar identidad desde branch/worktree/seat/tab/worker. → Duplica autoridad o confía en superficies no autoritativas.
  - Referencias: Autoridad original: Decisión del maintainer del 2026-09-13. Main establece assignment&#95;ref↔session&#95;id en assignment-location; binding/consumer lo transportan y persisten workspace/tab/pane sólo tras readback S107. main-store/launch-consumer.mjs:79-88 hoy guarda sólo request&#95;ref y binding&#95;path. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S121. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Enmienda aprobada: Engram 11293 e informe docs/architecture/torre-motor-determinista.md, secciones 12 y 14. Preparación incompleta: falta delimitar API, proyección/migración y huella completa conservando la procedencia y los datos previos. No se ejecuta migración ni se concede escritura de core desde esta declaración; S147/S148 no implementan outbox, proyección ni conversión de main-store.

### S122 — Radar explica por qué una Sesión no está lista y marca qué Zona se queda sin trabajo LISTO por delante, sin cambiar ninguno de los siete estados.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/tools/radar/state.go, agent-workflows/tools/radar/state&#95;test.go, agent-workflows/tools/radar/snapshot.go, agent-workflows/tools/radar/snapshot&#95;test.go, agent-workflows/tools/radar/render.go, agent-workflows/tools/radar/render&#95;test.go, agent-workflows/tools/radar/testdata/ROADMAP.golden.md
  - Depende de: S127
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Radar explica por qué una Sesión no está lista y marca qué Zona se queda sin trabajo LISTO por delante, sin cambiar ninguno de los siete estados.
  - Resultado y comportamiento: Para el plan vigente, los siete estados que calcula Radar son idénticos antes y después del cambio. Cada Sesión en PLANIFICADO o BLOQUEADO lleva un motivo con exactamente uno de cuatro tipos —espera-natural, espera-atascada, falta-decision, falta-planificar— y los IDs de su raíz; LISTO, COMPLETO, ARCHIVADO y DIFERIDO no llevan motivo. Una Sesión PLANIFICADO cuya cadena de dependencias termina en una BLOQUEADO se clasifica espera-atascada y nombra esa raíz; una cuya cadena termina sólo en LISTO se clasifica espera-natural. Una dependencia hacia un ID ausente de sesiones se clasifica falta-planificar y nombra ese ID; un ciclo de dependencias produce un resultado estable y nunca cuelga ni entra en pánico. Por cada Zona, radar.snapshot/v1 informa cuántas Sesiones LISTO tiene en cola y marca déficit de horizonte cuando son menos de 2, con las raíces a preparar ordenadas por cuántas Sesiones destraba cada una. El umbral de horizonte es 2 y el cálculo no lee planning.horizon&#95;ceiling ni la política que resuelve S101. La vista generada muestra el motivo al lado de cada Sesión no lista. Radar sigue sin escribir openspec/plan.yaml y sin lanzar, asignar ni despachar trabajo.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Las situaciones que impiden estar LISTO se modelan como estados nuevos, como subestados de BLOQUEADO o como una nota de motivo?
      - Resolución: Como una nota de motivo calculada al lado del estado. Los siete estados del canon quedan intactos.
      - Autoridad: Decisión de Emilio del 2026-09-13, elegida sobre tres alternativas presentadas con su consecuencia.
      - Falsificador: Radar agrega, combina o renombra un estado, o cambia el estado calculado de alguna Sesión del plan vigente.
      - Descartada: Agregar un estado nuevo por cada tipo. → Rompe el conjunto cerrado de siete del canon §9 y obliga a cambiar el schema versionado del snapshot de sesiones, su contrato, la vista y los cuatro agentes.
      - Descartada: Mover espera atascada y falta planificar a BLOQUEADO con un subestado. → Cambia el significado de dos estados y lleva BLOQUEADO de 10 a 15 Sesiones, que el canon trata como defecto de planificación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿De dónde sale el umbral de 2 Sesiones LISTO por Zona?
      - Resolución: Es un número propio del horizonte, fijo en 2 por Zona y separado de planning.horizon&#95;ceiling, que S101 resuelve con otro significado.
      - Autoridad: Decisión de Emilio del 2026-09-13, elegida sobre tres alternativas presentadas con su consecuencia.
      - Falsificador: Radar lee planning.horizon&#95;ceiling o la política resuelta para calcular el déficit de horizonte.
      - Descartada: Fijarlo en Radar ahora y reemplazarlo por la política de S101 cuando se destrabe. → Ata al mismo número dos significados distintos: cuántas Sesiones hereda una aprobación y cuántas LISTO mantiene cada Zona.
      - Descartada: Leerlo de la política resuelta desde el principio. → S122 heredaría el bloqueo de S101 y no podría empezar.
  - Referencias: Autoridad original: Decisiones explícitas de Emilio del 2026-09-12 y 2026-09-13 en la conversación de diseño del horizonte (Claude Code, sesión ed42515b): los siete estados no cambian y Radar suma un motivo calculado; los tipos son espera natural, espera atascada, falta decidir y falta planificar; el horizonte mantiene 2 Sesiones LISTO por Zona como número propio, separado de planning.horizon&#95;ceiling de S101. Hoy radar status --json expone sólo id, zona, estado y resultado (agent-workflows/tools/radar/snapshot.go:55-60) y la clasificación completa se obtuvo con un script aparte. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S122. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S123 — Al cerrar una Sesión, si una Zona quedó con menos de 2 Sesiones LISTO, Main le pide a Support que prepare el horizonte sin preguntar y después le presenta el resultado al humano.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/skills/chanks-7-session-doc/SKILL.md, agent-workflows/skills/chanks-0-agente-soporte/SKILL.md, agent-workflows/templates/session-routing.md
  - Depende de: S122
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Al cerrar una Sesión, si una Zona quedó con menos de 2 Sesiones LISTO, Main le pide a Support que prepare el horizonte sin preguntar y después le presenta el resultado al humano.
  - Resultado y comportamiento: La evidencia de cierre de chanks-7-session-doc incluye el déficit de horizonte por Zona que informa Radar, o declara explícitamente que no hay déficit. chanks-0-agente-soporte acepta un pedido de horizonte: para falta-decision arma la decisión con chanks-1-cierre-de-decisiones, para falta-planificar deriva la propuesta a chanks-2-planificador-granular y para espera-atascada trabaja sobre la raíz. Un pedido de horizonte nunca prepara más de 2 Sesiones LISTO por Zona, y espera natural o DIFERIDO nunca lo generan. La plantilla de ruteo de Main declara que ante un déficit Main pide la preparación a Support directamente, presenta el resultado al humano y registra sólo lo que el humano confirma. Ninguna superficie modificada da a Support autoridad para activarse solo, despachar, asignar o escribir openspec/plan.yaml. Una prueba automatizada del Método falla si cualquiera de las tres superficies pierde su regla.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · seguridad-y-permisos]: ¿Quién ejecuta el horizonte: Support, Main o un agente de worktree dedicado?
      - Resolución: La detección es determinista y la hace Radar; Support prepara en su propio asiento; el humano decide; Main registra como único escritor. Un asiento de planificación sólo se usa cuando falta planificar muchas Sesiones, y también devuelve la propuesta a Main.
      - Autoridad: Decisión de Emilio del 2026-09-13, elegida sobre las alternativas presentadas con su consecuencia.
      - Falsificador: Support se activa solo, escribe openspec/plan.yaml o despacha trabajo, o un agente dedicado al horizonte registra decisiones sin pasar por Main.
      - Descartada: Un agente de worktree dedicado al horizonte. → Duplica a Support o se convierte en un segundo escritor del plan, y ocupa un asiento bajo el techo humano.
    - Decisión estructurada [resuelta · contrato-visible]: Cuando Radar marca un déficit, ¿Main pone a Support a preparar directamente o primero avisa al humano?
      - Resolución: Directamente. Preparar sólo lee y propone, y la decisión igual pasa por el humano cuando Main presenta el resultado.
      - Autoridad: Decisión de Emilio del 2026-09-13.
      - Falsificador: Main pregunta antes de preparar, o registra una preparación sin que el humano la haya confirmado.
      - Descartada: Avisar al humano antes de preparar. → Suma una interrupción por cada déficit antes de la que ya ocurre al decidir.
  - Referencias: Autoridad original: Decisiones explícitas de Emilio del 2026-09-13 en la conversación de diseño del horizonte (Claude Code, sesión ed42515b): el horizonte se activa cuando una Zona queda con menos de 2 LISTO y nunca prepara más de 2; la detección es determinista, Support prepara, el humano decide y Main registra como único escritor del plan; Main despacha a Support directo, sin avisar antes. Support ya es un ayudante read-only que nunca despacha ni escribe el plan (agent-workflows/skills/chanks-0-agente-soporte/SKILL.md:12,22,24). Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S123. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S129 — Radar mide cada Módulo entregado con la fórmula de la política —líneas agregadas más borradas, sin las rutas que el plan excluye— y avisa cuando supera el tope declarado.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/tools/radar/plan.go, agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go, agent-workflows/tools/radar/avance.go
  - Depende de: S128
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Radar mide cada Módulo entregado con la fórmula de la política —líneas agregadas más borradas, sin las rutas que el plan excluye— y avisa cuando supera el tope declarado.
  - Resultado y comportamiento: Con &#96;politica.tope&#95;de&#95;lote&#96; declarado, Radar mide cada Módulo entregado de una Sesión sumando líneas agregadas y borradas de los commits que llevan su trailer &#96;Modulo:&#96;. Las rutas declaradas en &#96;politica.excluir&#95;del&#95;lote&#96; —prefijos de directorio o archivos exactos— no cuentan; sin esa lista no se excluye ninguna ruta. Un Módulo que supera el tope emite un aviso &#96;tope de lote&#96; que nombra la Sesión, el Módulo, las líneas medidas y el tope; nunca un error. Una Sesión entregada sin trailers de Módulo se mide por su commit de entrega con la misma fórmula. Sin &#96;tope&#95;de&#95;lote&#96; declarado Radar no mide ni falla. La medición usa la ancestría del HEAD inmutable y nunca el árbol de trabajo. &#96;go test ./...&#96; en &#96;agent-workflows/tools/radar&#96; pasa y el diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Las rutas excluidas del tope son constantes del código o un dato del plan?
      - Resolución: Un dato del plan: &#96;politica.excluir&#95;del&#95;lote&#96;.
      - Autoridad: Aprobación de Emilio del 2026-09-14, decisión 2, con el mismo principio que S113 aplicó al tope.
      - Falsificador: Las rutas excluidas aparecen escritas como literal en el código de Radar.
      - Descartada: Fijar las exclusiones como constantes en Go. → Convierte una política de cada proyecto en una decisión de compilación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Con qué fórmula se mide el lote?
      - Resolución: Líneas agregadas más borradas de cada Módulo entregado, sin las rutas excluidas.
      - Autoridad: AGENTS.md:117 y aprobación de Emilio del 2026-09-14, problema 2, opción 1.
      - Falsificador: Radar cuenta sólo líneas agregadas, o mide sólo el commit de entrega de una Sesión que tiene trailers de Módulo.
      - Descartada: Conservar la fórmula de S113. → Cuenta los .md de planificación, ignora las líneas borradas y mide un solo commit.
  - Referencias: Autoridad original: Aprobación de Emilio del 2026-09-14 (Claude Code, sesión df306f72), problema 2, opción 1, y decisión 2 sobre dónde viven las exclusiones. Evidencia: agent-workflows/tools/radar/check.go:905-922 cuenta sólo líneas agregadas del commit de entrega e incluye openspec/, mientras AGENTS.md:117 fija 400 líneas por lote revisado, agregadas más borradas y sin artefactos de planificación ni generados. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S129. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S133 — El cierre de una Sesión no se declara completo hasta reinstalar las herramientas que cambió la entrega, según lo que declara el AGENTS.md del repositorio.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/skills/chanks-7-session-doc/SKILL.md, agent-workflows/tests/test&#95;builder&#95;flow.py
  - Depende de: S135
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: El cierre de una Sesión no se declara completo hasta reinstalar las herramientas que cambió la entrega, según lo que declara el AGENTS.md del repositorio.
  - Resultado y comportamiento: &#96;agent-workflows/skills/chanks-7-session-doc/SKILL.md&#96; exige leer del &#96;AGENTS.md&#96; del repositorio qué reinstalar según las rutas que tocó la entrega. Cuando corresponde reinstalar, la evidencia de cierre incluye el comando ejecutado y su verificación; sin esa evidencia el cierre no se declara completo y se reporta qué falta. Antes de reinstalar skills, la skill exige la confirmación del humano, porque la sincronización cierra las sesiones de Pi abiertas. Si el repositorio no declara reinstalación, la skill lo informa y no la exige. &#96;agent-workflows/tests/test&#95;builder&#95;flow.py&#96; falla si alguna de esas reglas desaparece; la suite del Método pasa y el diff toca sólo Área.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Quién lleva a la máquina las herramientas que cambió una entrega?
      - Resolución: El cierre de la Sesión, según lo que declara el AGENTS.md del repositorio.
      - Autoridad: Aprobación de Emilio del 2026-09-14, problema 4, opción 1.
      - Falsificador: Una Sesión que cambió Radar o una skill se declara cerrada sin evidencia de reinstalación.
      - Descartada: Que el hook de pre-push use el Radar del repositorio en vez del instalado. → En un worktree nuevo ese binario no existe y las skills seguirían sin propagarse.
  - Referencias: Autoridad original: Aprobación de Emilio del 2026-09-14 (Claude Code, sesión df306f72), problema 4, opción 1. Evidencia: ninguna skill ni plantilla de agent-workflows reinstala Radar o las skills; el push de de098bf fue rechazado porque ~/.local/bin/radar era anterior a S127 y hubo que correr install-radar.sh a mano. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S133. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto.

### S143 — Motor procedural Chanks verificable: los siete controles consumen autoridad y evidencia y permiten o bloquean transiciones sin ejecutar sus efectos.
- Coordinación:
  - Estado derivado: 🟢 LISTO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/chanks/controls.mjs, agent-workflows/tests/chanks/controls.test.mjs
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Motor procedural Chanks verificable: los siete controles consumen autoridad y evidencia y permiten o bloquean transiciones sin ejecutar sus efectos.
  - Resultado y comportamiento: Hay casos permitidos y rechazados para los siete controles: alcance aprobado antes de planificar; delta exacto validado antes de registrar; admisión humana con Radar fresco; mutaciones dentro de archivos y recursos permitidos; consumo de resultados técnicos genuinos; entrega autorizada conforme a la política del repositorio; cierre con publicación comprobada, registro y documentación. La autoridad, la ruta y el contrato aprobados y la evidencia quedan ligados al repositorio, Sesión y candidato correspondientes; una base desactualizada o evidencia de otro trabajo se rechaza. La ruta se valida dentro de la admisión existente, sin añadir un octavo control. Una afirmación del agente o una huella de archivos no fabrica aprobación humana. Radar instalado conserva el cálculo de estados y openspec/plan.yaml conserva la autoridad editable del plan; el núcleo no reimplementa el cálculo ni crea otro registro de estados, caché o migración de almacenamiento. Gentle AI conserva la implementación, las comprobaciones técnicas y su registro subordinado de continuidad existente. Chanks valida identidad, procedencia, actualidad y cobertura de sus resultados y referencias sin crear otro ejecutor, almacenamiento, evaluador, API de recibos ni revisión por Módulo. Un resultado desconocido, indisponible, vacío o declinado no se convierte en PASS; la declinación de revisión respeta el camino alternativo aplicable del proveedor, sin inventar un bloqueo incondicional. El registro del cierre y su documentación siguen a cargo del padre responsable de Chanks. El permiso de publicación se distingue de la evidencia de publicación efectiva del candidato exacto. Una publicación lograda con registro fallido impide declarar el cierre y no dispara otra publicación ni una reversión automática. El núcleo no escribe archivos, modifica Git, lanza workers ni publica. Sus pruebas verifican decisiones procedurales y no se presentan como demostración de que Pi impide efectos. El diseño fija el contrato compartido de autoridad, evidencia y transiciones antes de apply; las decisiones nuevas de API pública, seguridad o permisos requieren aprobación humana y no se resuelven por inferencia. El diff queda en la Zona Método, separado del router y del bundle Tower; una necesidad de modificar un archivo compartido exige declarar el Cimiento exacto y confirmar el cruce antes de mutarlo.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿El método ejecutable debe funcionar por sí solo antes de integrar la Torre?
      - Resolución: Sí. Método V1 hace cumplir los siete controles en el flujo manual con Torre apagada; Torre V1 integra el mismo método y V2 recibe sólo ampliaciones no indispensables. Los alcances y el orden relativo del resto se conservan; la decisión posterior de Emilio adelanta exclusivamente S145 → S143 → S144 → S146 mediante prioridades explícitas. La integración Torre V1 y las ampliaciones V2 restantes quedan por desglosar, sin nuevas altas en esta decisión.
      - Autoridad: Emilio eligió Método independiente primero y confirmó los dos contratos; Engram 11119 y 11127. Aprobó después el alcance prioritario y su representación en Radar; Engram 11171 y 11173.
      - Falsificador: Método V1 necesita activar Torre, se construye otro método para Torre o se posterga a V2 una protección indispensable para V1.
      - Descartada: Entregar los controles nuevos solamente junto con Torre V1. → El flujo manual seguiría dependiendo de instrucciones mientras espera a Torre.
      - Descartada: No decidir ni incorporar el alcance faltante. → El humano aprobó preparar y registrar los dos resultados nuevos.
    - Decisión estructurada [resuelta · contrato-visible]: ¿El motor procedural y la demostración de control efectivo en Pi se entregan como resultados distintos?
      - Resolución: Sí. S143 entrega el núcleo verificable sin efectos y S144 demuestra el control efectivo en Pi. Entrega y cierre manual forman parte de esos controles y no se cuentan otra vez como otro proyecto completo.
      - Autoridad: Confirmación de Emilio de la propuesta de dos Sesiones y sus rutas; Engram 11127.
      - Falsificador: Se presenta el núcleo solo como control efectivo de Pi o se duplica el alcance completo de entrega y cierre.
      - Descartada: Declarar cumplidos los siete controles efectivos al entregar únicamente el núcleo. → Una decisión correcta no prueba que el efecto indebido haya sido impedido.
  - Referencias: Autoridad original: Engram 11119, Engram 11127, Engram 11171, Engram 11173. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S143. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Emilio reemplazó la selección anterior de SDD por ODD y aprobó el modelo de dos bloques; Engram 11211, 11214, 11218.

### S144 — Controles Chanks efectivos en Pi con Torre apagada: el núcleo S143 gobierna los efectos del flujo manual y demuestra el recorrido autorizado completo en un entorno aislado.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/chanks/pi-controls.mjs, agent-workflows/tests/chanks/pi-controls.test.mjs, agent-workflows/tools/install.py, agent-workflows/tests/test&#95;install.py
  - Depende de: S143
  - Recursos: runtime Pi aislado de ensayos Chanks Método V1; uso exclusivo a confirmar antes de ejecutar, sin configuración global activa
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Controles Chanks efectivos en Pi con Torre apagada: el núcleo S143 gobierna los efectos del flujo manual y demuestra el recorrido autorizado completo en un entorno aislado.
  - Resultado y comportamiento: Un recorrido manual autorizado atraviesa los siete controles de S143 en Pi con Torre apagada, usando un entorno aislado sin instalación global ni publicación real del proyecto. Cada efecto cubierto pasa por el control antes de ocurrir. Los casos rechazados demuestran ausencia del efecto prohibido, incluidas escrituras por herramientas, órdenes y procesos derivados; un aviso o bloqueo del editor por sí solo no constituye esa prueba. Una operación cuyos efectos no puedan controlarse se rechaza sin salida permisiva alternativa. El mecanismo de intercepción y sus límites se demuestran en el runtime real antes de afirmar cobertura; si exige ampliar alcance o permisos, se pide decisión humana antes de apply. Las activaciones muestran exactamente 💪 Chanks, la acción real del método, un resultado permitido o bloqueado separado y contexto suficiente. Los mensajes corresponden a transiciones significativas, sin duplicarse por cada llamada de herramienta. Main manual no se etiqueta como 🗼 Torre; implementación, pruebas y revisión de Gentle AI conservan su identidad nativa. Una autorización no afirma ejecución, publicación ni cierre; la marca visible no sustituye la comprobación de efectos. El registro canónico exige el delta exacto aprobado y validado, rechaza bases desactualizadas sin escribir y conserva openspec/plan.yaml como único origen editable. No aparece otro registro de estados y el agente responsable conserva la confirmación de la evidencia. La entrega exige autorización del candidato exacto, respeta la política del repositorio y serializa operaciones incompatibles sobre el mismo destino incluso entre candidatos distintos. Las pruebas aisladas registran evidencia de publicación efectiva, no sólo un permiso o un commit local. Publicación exitosa con registro fallido conserva esa distinción: no declara cierre ni vuelve a publicar o revierte automáticamente. El cierre exige publicación comprobada, registro correspondiente y la documentación y reinstalación aplicables, preservando la confirmación humana exigida para skills. El recorrido Pi entrega el contrato y la ruta aprobados al orquestador existente de Gentle AI y consume sus resultados y referencias de continuidad genuinos y actuales bajo sus requisitos aplicables. La retoma reconcilia el trabajo válido tras la admisión Radar, sin repetirlo por estar aún sin entregar. No se añade otro ejecutor, almacenamiento, evaluador, API de recibos, revisión por Módulo ni autoridad de entrega derivada de un veredicto técnico; Chanks conserva el registro y la documentación del cierre. El adaptador y su distribución permanecen dentro de agent-workflows/, separados de extensions/pi/&#42;&#42; y adapters/pi/&#42;&#42; incluidos por S8.12 en el bundle Tower. No se cambia el contrato conservado del router S9.7 ni se afirma cobertura ejecutable equivalente para otros agentes. El uso exclusivo del runtime de ensayo se confirma antes de cualquier efecto; la declaración de Recurso no equivale a adquisición. El diff respeta la Zona y cualquier cruce nuevo requiere una reserva exacta aprobada antes de modificar archivos compartidos.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · expansion-de-alcance]: ¿Qué agentes deben tener controles ejecutables reales al completar el alcance nuevo de Método V1?
      - Resolución: Pi primero, con núcleo reutilizable. Claude Code, Codex y OpenCode conservan sus instrucciones actuales; sus adaptadores ejecutables quedan como alcance posterior explícito de V2, por desglosar, sin afirmar cobertura equivalente.
      - Autoridad: Emilio eligió Pi primero y luego confirmó el contrato; Engram 11121 y 11127.
      - Falsificador: Se exige entregar los cuatro adaptadores para cerrar este alcance o se presentan instrucciones instaladas como controles ejecutables comprobados.
      - Descartada: Exigir los cuatro agentes desde Método V1. → El humano eligió acotar la integración inicial al flujo Pi actual.
      - Descartada: Dejar indefinida la cobertura de agentes. → Impediría comprobar de forma binaria el resultado de esta Sesión.
    - Decisión estructurada [resuelta · seguridad-y-permisos]: ¿Basta con informar un bloqueo o se debe impedir el efecto indebido?
      - Resolución: Se debe impedir el efecto indebido, también cuando procede de órdenes o procesos derivados. Si no se puede controlar una operación, se rechaza; no se rebaja la garantía a instrucciones o avisos. El diseño y sus decisiones de permisos se aprueban antes de apply.
      - Autoridad: Siete controles aprobados y confirmación del contrato de control efectivo; Engram 11098, 11121 y 11127.
      - Falsificador: Una vía alternativa ejecuta el efecto que Chanks declaró bloqueado.
      - Descartada: Dar por suficiente la distribución de skills o un aviso de bloqueo. → No demuestra que una mutación por otra vía haya sido impedida.
    - Decisión estructurada [resuelta · expansion-de-alcance]: ¿Esta incorporación adelanta dependencias de V2 o reabre la recuperación aplazada?
      - Resolución: No se adelantan dependencias de Torre V1 o V2 ni se reabre recuperación. Se preservan los alcances y el orden relativo del resto; Emilio autorizó después adelantar exclusivamente S145 → S143 → S144 → S146 dentro del trabajo de Método V1. S102 sigue siendo una referencia futura, S12.5 no se trata como corrección de comportamiento y la auditoría exhaustiva de recuperación sigue aplazada. Si una dependencia de V2 resulta indispensable para V1, se presenta la contradicción al humano en vez de moverla o postergar seguridad silenciosamente.
      - Autoridad: Límites aprobados; Engram 11119, 11121 y 11127. Excepción posterior de prioridad expresamente aprobada; Engram 11171 y 11173.
      - Falsificador: Se adelanta trabajo fuera del conjunto expresamente aprobado, se inventa cobertura ejecutable de S102 o se reabre recuperación sin una nueva decisión humana.
      - Descartada: Resolver automáticamente los cruces adelantando las Sesiones existentes. → El humano pidió conservar sus alcances y prioridades.
  - Referencias: Autoridad original: Engram 11121, Engram 11127, Engram 11171, Engram 11173. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S144. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Emilio reemplazó la selección anterior de SDD por ODD y aprobó el modelo de dos bloques; Engram 11211, 11214, 11218.

### S145 — Radar explica alternativas LISTO, compatibilidad potencial por archivos, condiciones e hipotéticos mediante radar roadmap como vista humana de la evidencia canónica, sin autorizar ejecución.
- Coordinación:
  - Estado derivado: ✅ COMPLETO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/tools/radar/main.go, agent-workflows/tools/radar/snapshot.go, agent-workflows/tools/radar/state.go, agent-workflows/tools/radar/roadmap.go, agent-workflows/tools/radar/main&#95;test.go, agent-workflows/tools/radar/snapshot&#95;test.go, agent-workflows/tools/radar/state&#95;test.go, agent-workflows/tools/radar/roadmap&#95;test.go, agent-workflows/tools/radar/README.md, agent-workflows/tools/radar/encargo&#95;test.go, agent-workflows/skills/chanks-0-agente-soporte/SKILL.md
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Radar explica alternativas LISTO, compatibilidad potencial por archivos, condiciones e hipotéticos mediante radar roadmap como vista humana de la evidencia canónica, sin autorizar ejecución.
  - Resultado y comportamiento: radar status --json conserva una única proyección canónica de evidencia para consumidores; radar roadmap es una vista humana determinista de esa misma evidencia, no otra fuente JSON ni otro cálculo de estados. Main no necesita parsear texto humano para consumir los resultados. La vista enumera todas las alternativas LISTO actuales en su orden de Zona y muestra conjuntos explícitos de Sesiones, sus exclusiones y las condiciones de compatibilidad potencial por archivos. Distingue esa previsión del permiso de ejecución vigente y no convierte una Zona o un Cimiento compartidos en un veto indiscriminado sobre trabajo propio disjunto. Cada conclusión por archivos usa los archivos exactos autorizados de la Sesión, declarados durante su preparación, junto con Cimientos, recursos, dependencias y base vigentes. Una declaración desconocida, incompleta o desactualizada nunca se interpreta como vacía o segura; un cambio de alcance o base exige aprobación y recalcular compatibilidad antes de escribir. Un Cimiento compartido aparece con la condición explícita de intervención coordinada, y un recurso exclusivo incompatible excluye la combinación. El reporte no adquiere reservas, asigna workers, concede acceso ni supone que la coordinación futura ya está instalada. Los escenarios hipotéticos distinguen dependencias satisfechas de nuevas Sesiones realmente LISTO según todos los criterios y la prioridad aplicable. Un caso demuestra que resolver la dependencia de S123 en S122 no vuelve ejecutable V2 mientras no sea la prioridad activa; los escenarios no modifican el plan, Git ni la evidencia de entrega real. Sobre el mismo plan y base, se conservan los siete estados, el significado vigente de asientos y la admisión actual. La capacidad nueva queda condicionada a la integración, verificación y activación autorizada de sus consumidores en S146; ningún reporte se autoriza a sí mismo. S122 conserva su resultado, criterios, umbral fijo de horizonte y orden relativo respecto del resto no priorizado. El diseño reutiliza los datos existentes antes de proponer extensiones; cualquier ruptura del contrato público de radar.snapshot/v1 requiere decisión humana antes de apply. El diff permanece en la Zona Método; los archivos exactos y cualquier Cimiento necesario se declaran al preparar la Sesión, sin exigir descubrimiento ni desglose previo de ODD. Esa declaración no reserva capacidad ni autoriza ampliaciones silenciosas.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿El reporte nuevo cambia la autoridad de ejecución o explica alternativas y condiciones sin autoactivarlas?
      - Resolución: Explica alternativas y condiciones como una función adicional del método. La proyección máquina canónica sigue siendo radar status --json y radar roadmap la presenta a la persona. Las reglas nuevas de paralelo requieren integración, verificación y activación autorizadas; no se infieren del reporte.
      - Autoridad: Contrato del punto 3 y alcance prioritario aprobados por Emilio; Engram 11159 y 11171. Política del repositorio sobre consumidores de radar.snapshot/v1.
      - Falsificador: Main interpreta una vista humana como autoridad alternativa o un reporte habilita automáticamente paralelo, una reserva o un efecto.
      - Descartada: Dar por habilitado el paralelo al publicar la explicación. → La evidencia estática no demuestra que admisión, coordinación y controles efectivos apliquen el mismo contrato.
      - Descartada: Crear otra fuente editable de planificación para los escenarios. → El humano aprobó ampliar la planificación existente, no crear un segundo plan ni estado vivo.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Cómo debe reflejar Radar el orden prioritario S145 → S143 → S144 → S146?
      - Resolución: Dos prioridades explícitas de Método V1 preceden a metodo-v1: S145 ocupa la primera y S143/S144/S146 la segunda. El resto conserva alcance y orden relativo; sus alternativas listas quedan DIFERIDO mientras siga pendiente una prioridad anterior. No se inventan dependencias para forzar la cola.
      - Autoridad: Emilio eligió Prioridad visible en Radar tras conocer su efecto sobre DIFERIDO; Engram 11173.
      - Falsificador: Se cambia el algoritmo, se añaden dependencias ficticias o se afirma que mover filas YAML produce ese orden.
      - Descartada: Mantener la cola actual y seguir el orden sólo por selección humana. → El humano eligió que Radar también refleje la prioridad.
      - Descartada: Pausar el registro. → El humano autorizó continuar con la prioridad visible.
  - Referencias: Autoridad original: Engram 11159, Engram 11171, Engram 11173. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S145. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Emilio reemplazó la selección anterior de SDD por ODD y aprobó el modelo de dos bloques; Engram 11211, 11214, 11218.

### S146 — El método manual coordina intervenciones de Cimientos y paralelo por archivos con controles efectivos en Pi: Main coordina, workers y Gentle AI implementan y verifican, con Torre apagada.
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: metodo · agent-workflows/, odd/tasks/
  - Archivos autorizados: agent-workflows/chanks/interventions.mjs, agent-workflows/chanks/pi-controls.mjs, agent-workflows/tests/chanks/interventions.test.mjs, agent-workflows/tests/chanks/pi-controls.test.mjs, agent-workflows/skills/chanks-3-coordinador-manual/SKILL.md, agent-workflows/tests/test&#95;coordinador&#95;manual.py
  - Depende de: S144, S145
  - Recursos: runtime Pi aislado de ensayos Chanks Método V1; uso exclusivo a confirmar antes de ejecutar, sin configuración global activa
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: El método manual coordina intervenciones de Cimientos y paralelo por archivos con controles efectivos en Pi: Main coordina, workers y Gentle AI implementan y verifican, con Torre apagada.
  - Resultado y comportamiento: Tras integración, verificación y activación humana autorizada, la evidencia canónica de Radar, la admisión manual, el coordinador y los controles Chanks instalados aplican un único criterio acordado. El registro o el reporte S145 no activa ese criterio por sí solo ni mantiene un permiso alternativo incoherente. Sesiones de la misma Zona pueden avanzar en archivos propios sólo con alcance autorizado y huellas completas, vigentes y disjuntas. Compartir un Cimiento exige intervención coordinada sobre ese archivo, no el veto global de ambas Sesiones; una huella desconocida no habilita paralelo. Antes de tocar Cimientos, el worker solicita un conjunto coherente completo ligado a su trabajo y base; Main coordina las intervenciones sin solapamiento sobre el mismo archivo. No se acumulan concesiones parciales que permitan esperas circulares ni se amplía un conjunto silenciosamente. Cada intervención usa la base integrada completa vigente y conserva el trabajo propio válido; no sustituye esa base copiando un Cimiento suelto. La liberación ocurre sólo tras integración confirmada conforme al flujo de entrega, nunca por terminar la edición local o por silencio del worker. Pruebas reales en un entorno Pi aislado demuestran solicitudes e intervenciones autorizadas y rechazadas, conjuntos incompletos o en conflicto, base desactualizada, integración y liberación. Los casos rechazados demuestran ausencia del efecto prohibido; mensajes y pruebas de cadenas de texto no sustituyen esa evidencia. Los workers y Gentle AI implementan y verifican; Main sólo coordina e integra bajo el contrato vigente. Main no inspecciona para emitir otro juicio técnico, corrige código ni repite las pruebas del worker. Se consumen los controles de S143/S144 sin duplicar su implementación ni cambiar sus dependencias. Conflicto, cambio de alcance o base, desconexión o evidencia faltante detienen la intervención afectada y preservan trabajo y evidencia; no disparan reintentos, remapeos, permisos, liberaciones ni reanudaciones automáticos. No se crea otro estado de planificación, cola persistente, gestor de locks artificial, almacenamiento de continuidad, API de recibos ni ejecutor técnico. Radar no adquiere reservas vivas; las evidencias de coordinación tampoco conceden autoridad a sí mismas. Torre permanece apagada. S146 confirma su propio uso exclusivo del recurso Pi aislado antes de cualquier efecto; la declaración de S144 no lo concede. El diseño enumera rutas exactas y reservas de Cimientos antes de mutar, y escala permisos, API pública o cruces nuevos antes de apply. Los mensajes de acciones del método usan 💪 Chanks con acción y resultado reales, sin confundir permiso con efecto o cierre; Main manual no se etiqueta como 🗼 Torre y los mensajes técnicos nativos de Gentle AI no se duplican.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. Sólo los archivos declarados están autorizados; toda expansión requiere aprobación humana y compatibilidad fresca antes de escribir. Las decisiones estructuradas conservan su autoridad y se aplican sin duplicar aquí su prosa completa. Los nombres de archivo prospectivos delimitan autorización, no afirman existencia ni una implementación elegida y no conceden permiso de API pública; toda expansión futura requiere aprobación.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Quién coordina y quién modifica los Cimientos compartidos en el método manual?
      - Resolución: Main coordina las intervenciones y su integración; workers y Gentle AI modifican y verifican. Las Sesiones pueden avanzar sobre archivos propios independientes antes de su intervención compartida. Un Cimiento compartido no veta toda la concurrencia, pero nunca autoriza intervenciones superpuestas sobre el mismo archivo.
      - Autoridad: Elección explícita Main coordina; workers modifican y confirmación del contrato de planificación; Engram 11157, 11159 y 11171.
      - Falsificador: Main se convierte en implementador o revisor técnico, o compartir un Cimiento implica permiso simultáneo o veto indiscriminado a toda la Sesión.
      - Descartada: Centralizar en Main las modificaciones de Cimientos. → El humano eligió mantener la implementación y verificación en los workers y Gentle AI.
      - Descartada: Prohibir todo paralelo entre Sesiones que compartan un Cimiento. → El humano rechazó bloquear también el trabajo propio independiente.
    - Decisión estructurada [resuelta · contrato-visible]: ¿Bastan instrucciones y pruebas estáticas para cerrar esta coordinación nueva?
      - Resolución: No. La entrega demuestra el recorrido efectivo en Pi aislado y la coherencia de Radar, admisión y coordinación antes de activar el nuevo criterio. El método vigente controla la mejora; su versión candidata no se autoriza a sí misma.
      - Autoridad: Alcance de S146 con pruebas reales y activación controlada aprobado en el todo; Engram 11171.
      - Falsificador: Se declara operativo el paralelo nuevo por registrar una skill, por mostrar una marca o por aprobar únicamente pruebas de texto.
      - Descartada: Dar por suficiente el contrato de skills sin recorrido real. → Eso repetiría la confusión entre instrucciones y efectos que el alcance aprobado exige corregir.
  - Referencias: Autoridad original: Engram 11157, Engram 11159, Engram 11171, Engram 11173. Línea base Git: openspec/plan.yaml@ebc2ffb840030f7266a207536134c057a82bec70, bloque de Sesión S146. La ruta y el desglose técnico legacy son sólo historia; no hay trailers Modulo: parciales alcanzables desde HEAD. Los registros nativos de ejecución quedan subordinados y no son autoridad de producto. Emilio reemplazó la selección anterior de SDD por ODD y aprobó el modelo de dos bloques; Engram 11211, 11214, 11218.

### S147 — Contratos versionados verificables de Ejecución, paquete y evidencia sin duplicar autoridades externas
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: contratos · contracts/, schemas/, registry/, test/contracts/, test/registry/
  - Archivos autorizados: contracts/schema-registry.mjs, contracts/validate.mjs, contracts/tower-execution.mjs, schemas/observed-content-ref-v1.schema.json, schemas/tower-execution-context-v1.schema.json, schemas/sealed-packet-v1.schema.json, schemas/execution-evidence-v1.schema.json, test/contracts/schema.test.mjs, test/contracts/tower-execution.test.mjs, test/fixtures/contracts/schema-cases-v1.json
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Incorporar al registro existente cuatro contratos V1 compartidos por el futuro core: observed-content-ref, tower-execution-context, sealed-packet y execution-evidence. Distinguir Sesión, Ejecución, paquete e intento sin confundirlos con Jornada o proceso del host. Esta base valida datos y sus vínculos; no es un motor de admisión ni una nueva jerarquía del plan. Los consumidores posteriores deberán adoptar estos contratos bajo su propio alcance, sin inferir que S147 los adapta o habilita.
  - Resultado y comportamiento: Registrar observedContentRef, towerExecutionContext, sealedPacket y executionEvidence con los cuatro archivos schema V1 declarados, Draft 2020-12, schema y schema&#95;version constantes y propiedades declaradas estrictamente. Reutilizar el registro y conectar sus invariantes a contracts/validate.mjs; contracts/tower-execution.mjs aporta las funciones puras de huellas y vínculos, no una utilidad opcional desconectada. observed-content-ref identifica una captura local mediante observation&#95;id, producer, source&#95;kind, media&#95;type, digest&#95;mode raw-bytes, content&#95;digest y observed&#95;at; incluye issuer&#95;reference sólo cuando el emisor realmente la haya emitido. Conserva el sujeto original en el registro capturado, sin reasignarlo a un execution&#95;id posterior. Las referencias admiten este formato para capturas efímeras y el artifact-ref existente sólo para blobs reales de un commit Git. Radar status y radar sesion se vinculan por los bytes exactos de su stdout, nunca por una recanonicalización o procedencia Git inventada. tower-execution-context contiene execution&#95;id, execution&#95;revision, execution&#95;context&#95;digest, repository&#95;snapshot&#95;binding (repository&#95;id, canonical&#95;root, git&#95;common&#95;dir, base&#95;sha), session&#95;id, radar&#95;status&#95;ref, session&#95;contract&#95;ref, coordination&#95;ref, encargo&#95;ref, start&#95;authority&#95;refs y created&#95;at. Es una instantánea de identidad y contexto, no la raíz mutable completa de SQLite. Conserva IDs de Sesión como S147 y S4.12 sin convertirlos a slug minúsculo. Las rutas locales vinculan ese checkout; no prueban identidad portable. sealed-packet contiene packet&#95;id, packet&#95;revision, packet&#95;digest, attempt, el contexto de ejecución validado, transition&#95;binding, idempotency&#95;ref, expires&#95;at, actor&#95;binding&#95;ref, work&#95;purpose&#95;ref al mismo Encargo, decision&#95;refs, readonly&#95;input&#95;refs, materialized&#95;context, scope, expected&#95;evidence y predecessor. El alcance declara archivos exactos, Cimientos, recursos, efectos permitidos/prohibidos, comandos y checks autorizados y frontera de rollback/compensación. Vincula host/worker/capacidades esperados sin concederlos. Materializa sólo el contexto necesario y sus referencias/huellas, no una skill como autoridad ni acceso directo al store. La primera revisión carece de predecesor; las siguientes conservan Ejecución y enlazan paquete/revisión/huella anteriores, motivo, autoridad, presupuesto y evidencia terminal real. No fabrica comprobantes todavía inexistentes ni agrega partes al Encargo nativo de cuatro campos. execution-evidence incluye evidence&#95;id/evidence&#95;digest, execution&#95;id/execution&#95;revision/ execution&#95;context&#95;digest, packet&#95;id/packet&#95;revision/packet&#95;digest, attempt, actor&#95;binding&#95;ref, emitted&#95;at, result&#95;ref, changed&#95;paths, check&#95;observation&#95;refs y external&#95;observation&#95;refs; sólo incorpora referencias a candidato/commit/tree cuando existan. changed&#95;paths es un subconjunto de los archivos autorizados, no necesariamente toda su lista; admite subconjunto vacío y rechaza salidas de alcance. Los resultados y checks remiten a datos estructurados observados, no a veredictos o terminalidad inventados por el agente. Las huellas propias usan JCS/SHA-256 con dominios control-tower/tower-execution-context/artifact/v1, control-tower/sealed-packet/artifact/v1 y control-tower/execution-evidence/artifact/v1, excluyendo sólo su propio campo de huella. Las huellas externas identifican bytes originales; los handles del proveedor permanecen opacos. La validación devuelve datos inmutables y rechazos deterministas CT&#95;SCHEMA&#95;INVALID. Pruebas aisladas deben aceptar cada formato válido y el legado sin regresión, y rechazar versiones desconocidas, propiedades extra, huellas incorrectas, vínculos cruzados entre ejecuciones/revisiones/intentos, predecesores incoherentes y archivos fuera de alcance. Deben distinguir captura efímera sin commit de referencia Git real, comprobar el vínculo con el contexto/paquete suministrado y la integración por la entrada común de validación.
  - Restricciones y decisiones: La propuesta pública y la forma de entrega secuencial están aprobadas. Previsión inicial de 700–1100 líneas autorales añadidas más eliminadas, incluidos schemas, código, fixtures y pruebas. Antes de RED, Gentle AI debe afinar el forecast y producir el desglose técnico de entregas independientes, verificables y reversibles, cada una con pruebas y frontera de reversión propias. No se aprobaron cortes concretos, cantidad de entregas ni excepción de tamaño. Las 400 líneas son referencia, no límite duro: una unidad que la supere requiere consultar antes de implementarla, sin recortar pruebas ni fragmentar artificialmente. Gentle AI posee el desglose, implementación y verificación mediante ODD; SDD sólo por solicitud humana explícita. S147 se entrega antes de iniciar S148. El inicio requiere selección humana, admisión Radar y compatibilidad frescas, no esta publicación documental. Los V1 coexisten con los formatos anteriores: no conversión automática, importación, reescritura histórica ni interpretación silenciosa de otra versión. No modificar contracts/index.mjs ni duplicar el registro. Registrar los schemas cambia la lista derivada de assets instalables, pero no ejecuta una instalación. Validar forma, huella o igualdad contra contexto suministrado no prueba autenticidad, vigencia, permiso ni admisión de efectos. Tampoco el veto de nombres de campos garantiza ausencia de secretos dentro de texto; no transportar credenciales, tokens reutilizables o acceso al store como evidencia. No exigir un receipt de Gentle AI, FINALIZE ni copiar su lifecycle. Quedan fuera SQLite/migración, estados y transiciones del motor, transporte API/IPC, outbox/proyecciones, despacho, adapters, autenticación real, RDD, entrega, cierre y activación. Cualquier archivo adicional requiere aprobación y compatibilidad fresca antes de escribir; los Cimientos y recursos compartidos exigen exclusividad o serialización demostrada. No hay asiento ni recurso adquirido. Las pruebas descritas son resultados por demostrar, no un PASS ni comportamiento instalado.
    - Decisión estructurada [resuelta · api-publica]: ¿Se aprueba la propuesta concreta de nombres, campos, versiones, compatibilidad y archivos de estos contratos cuando se presente, o qué ajustes requiere antes de implementar?
      - Resolución: Aprobados los cuatro formatos V1 y los diez archivos de este Encargo, con rechazo de datos incompatibles, referencias observadas sin falsa procedencia, validación integrada y sin conversión automática de la historia. Permite preparar S148 sobre esta interfaz, no implementarla, instalarla o activarla. El presupuesto y la selección de ejecución quedan pendientes; la autorización posterior permite registrar aquí esa resolución.
      - Autoridad: Emilio; respuesta UI explícita Aprobar la propuesta, registrada en Engram 11305 y ratificada por su pedido de plasmar ambas propuestas en el plan.
      - Evidencia: La arquitectura fija contratos versionados y autoridades externas, pero el informe deja sin cerrar los schemas y nombres públicos; la lista actual sólo identifica archivos existentes y no los schemas nuevos.
      - Checkpoint: Antes de RED y de completar la autorización de archivos de S147; presentar primero la propuesta concreta sin implementar.
      - Alcanza: encargo
      - Falsificador: Se altera un formato histórico, se fabrica autoridad/procedencia Git o un receipt externo, se omite el validador común, se cambia el contrato V1 aprobado sin nueva autoridad o se amplían archivos sin aprobación.
      - Contaminaba: S147, S148
      - Opción: Aprobar una propuesta concreta compatible con las decisiones arquitectónicas vigentes. → Permite completar el Encargo y su huella; no autoriza consumidores, transporte ni activación.
      - Opción: Pedir ajustes o mantener la preparación incompleta. → No se implementan contratos ni se presume compatibilidad del núcleo o sus consumidores.
      - Descartada: Pedir ajustes o mantener la preparación incompleta. → Emilio eligió aprobar la propuesta concreta presentada, incluidos sus límites y diez archivos, en vez de dejar abierta esa definición pública.
    - Decisión estructurada [resuelta · ]: Antes de RED, con la previsión inicial de 700–1100 líneas y su refinamiento técnico, ¿se aprueban entregas secuenciales verificables y reversibles o una excepción de tamaño para S147?
      - Resolución: Emilio elige entregas secuenciales verificables y reversibles, con S147 entregada antes de iniciar S148. Resuelve la elección de forma de entrega: el desglose técnico refinado queda a cargo de Gentle AI antes de RED, sin cortes concretos ni excepción de tamaño preaprobados. Autoriza publicar la documentación, no comenzar implementación ni alterar las prioridades. La restricción de presupuesto pendiente en la resolución 11305 describe aquella aprobación anterior; esta decisión posterior resuelve sólo la forma secuencial.
      - Autoridad: Emilio; respuesta explícita «1. secuenciales. 2. si respetamos el orden. 3.publicamos y com esto cerramos esta magnifca sesio», registrada en Engram 11316.
      - Evidencia: La aprobación 11305 excluyó expresamente presupuesto e implementación; el forecast de schemas, helpers, fixtures y pruebas supera la referencia de revisión de 400 líneas.
      - Checkpoint: Antes de RED o cualquier escritura de código de S147; presentar forecast refinado y unidades técnicas propuestas sin crear Módulos/Tareas Chanks.
      - Alcanza: encargo
      - Falsificador: Se inicia S148 antes de entregar S147, se presenta un corte o forecast concreto como aprobado, se concede una excepción por inferencia o se escribe código sin desglose refinado, pruebas y autoridad de inicio.
      - Contaminaba: S147
      - Opción: Aprobar un desglose técnico en entregas secuenciales. → Cada unidad requiere pruebas y reversibilidad propias bajo la política de entrega del repositorio; no implica PRs ni nuevas Sesiones por tamaño.
      - Opción: Aprobar una excepción de tamaño explícita. → Acepta el volumen refinado para la unidad coherente aprobada, sin ampliar alcance ni omitir pruebas o revisión.
      - Opción: Mantener pendiente la implementación. → Conserva este contrato aprobado, pero no autoriza RED ni escritura de código.
      - Descartada: Aprobar una excepción de tamaño explícita. → Eligió entregas secuenciales; no concedió excepción de tamaño.
      - Descartada: Mantener pendiente la implementación. → Resolvió la elección de forma de entrega, sin seleccionar ni autorizar todavía el inicio de esta Sesión.
  - Referencias: Autoridad inicial Engram 11293; propuesta 11304 y aprobación humana 11305, seguidas por autorización de registro en el plan y decisión 11316 de entregas secuenciales, orden S147 antes de S148 y publicación documental. Este Encargo contiene el contrato operativo de alcance; Engram conserva procedencia, no es una dependencia necesaria para reconstruir sus requisitos. docs/architecture/torre-motor-determinista.md, secciones 3, 8, 9, 10, 15 y 17, SHA-256 cc9949d367e93a1b809534335248cbd9916d7acf99ed6d9f188dff63b7b04f62. Base de investigación HEAD 1658444ff52cddba3516f7e4e39bd314ccd21cdc: contracts/schema-registry.mjs:6–43, contracts/validate.mjs:169–220, contracts/artifact-ref.mjs:22–59 y schemas/artifact-ref-v1.schema.json. Revalidar contra el código vigente antes de implementar. Se conserva Torre V1 detrás del Método, la Zona contratos y el Cimiento exacto de fixtures; sin nuevas Sesiones o dependencias.

### S148 — Raíz de Ejecución estable en SQLite con revisión, estado e historial ligados a handoffs existentes
- Coordinación:
  - Estado derivado: 📋 PLANIFICADO
  - Zona/Área: cimientos · —
  - Archivos autorizados: core.mjs, test/migration.test.mjs
  - Depende de: S147
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: Incorporar una raíz de Ejecución duradera en tower.db, separada de Sesión, Jornada y proceso host, reutilizando ct&#95;handoff como sistema de intentos. Implementar la base de persistencia y preparación de borradores aprobada, no un segundo motor ni un ciclo operativo completo. S147 aporta los contratos V1: aprobar su propuesta no satisface su dependencia de entrega. El payload anterior exige datos source&#95;merge y proyecciones que un paquete nativo no tiene necesariamente; no inventarlos ni aceptar dos documentos independientes como autoridad del mismo trabajo. La ampliación del formato existente forma parte explícita de S148.
  - Resultado y comportamiento: Sobre la base de código que conoce schema 5, añadir la migración 006 sin editar las migraciones 001–005 ni sus checksums. No es DDL exclusivamente aditivo: ct&#95;handoff debe distinguir el formato anterior del sealed-packet V1, conservar las exigencias anteriores para sus filas y permitir ausencia de proyecciones específicas del legado en filas nativas, sin falsos SHA/URL de entrega o unidades de trabajo. El payload nativo es el paquete S147 real, único; los metadatos comunes se derivan de identidades y contexto reales del Core. packet&#95;digest y los digest/fingerprint propios del handoff conservan sus dominios distintos. Crear ct&#95;execution&#95;root (identidad estable, contexto, revisión, fase/estado separados y paquete vigente), ct&#95;execution&#95;history (sucesos append-only con revisiones y contextos) y ct&#95;execution&#95;handoff (asociación explícita al handoff real). Registrar por separado packet&#95;id/revisión/intento lógico y lineage/revisión/generación nativos: no igualar el intento a la generación de lease ni deducir la Ejecución de un lineage, Sesión o proceso. Una identidad de paquete/revisión no puede reutilizarse con contenido o intento distintos. Reutilizar ct&#95;idempotency del Core para clave/ámbito de operación, digest de solicitud/CAS y respuesta: repetición idéntica no duplica filas; identidad reutilizada con otro contenido se rechaza. Las relaciones se comprueban en Core y sus restricciones/guards: una declaración FK sin enforcement no basta, ni se habilita un PRAGMA global por suposición. Delimitar operaciones internas createExecutionRoot, registerManagedPacket, retirePreparedPacket y readExecutionRoot, sin agregar transporte o entrada de despacho. Sólo Core crea la raíz, registra borradores, retira borradores no despachados y lee estado e historial. Fase y estado se persisten separados con las etiquetas semánticas de la arquitectura; inicialmente ADMISSION y OPEN significan preparado para admisión posterior, no trabajo autorizado. No hay setter libre de fase/estado ni COMPLETED declarado por el agente. Los avances de negocio requieren trabajo posterior del Core, no autoridad de adapters. Separar el CAS previo n del contexto esperado posterior n+1 del paquete registrado. Core deriva/valida la instantánea y su huella de revisión; al confirmar, el contexto del paquete coincide con la raíz n+1. El ID estable no congela la huella inicial para siempre ni permite ciclos de autohuella. Raíz, hijo, asociación, historial y respuesta idempotente se actualizan atómicamente; una revisión vieja no deja escrituras parciales. Retirar un borrador conserva su prueba terminal real antes de que el siguiente paquete la cite; nunca anticipa un comprobante todavía no emitido ni opera sobre trabajo iniciado. Las rutas anteriores mantienen su comportamiento para los registros anteriores pero rechazan operar sobre los nuevos gestionados cuando eludirían la raíz, su CAS o historial. Cubrir también revisiones, recovery y operaciones globales que crucen esos datos; no confundir compatibilidad del legado con permiso para pasar paquetes nuevos por su validador. Los nuevos intentos permanecen sin despacho hasta completar admisión y controles posteriores. La migración preserva exactamente los valores previos de identidad, payload&#95;json, huellas, metadatos de productor, revisiones, generaciones, estados e historial, sin reserializar contenidos ni asociar filas previas automáticamente. Sólo clasifica un formato previo cuando lo comprueba; datos desconocidos o inconsistentes abortan sin cambios parciales. Conservar el límite existente de 65536 bytes por payload: rechazar excesos, no truncar ni ampliar la cuota automáticamente. El rollback después de nueva historia es reparación que la preserve, no DROP de tablas nuevas ni restauración que la borre silenciosamente. Pruebas futuras en bases aisladas con historia no vacía deben demostrar migración y solicitudes repetibles, preservación de valores/bytes y checksums anteriores, formato nuevo sin campos ficticios, fallos tardíos/ocupación sin esquema o filas parciales, conflicto CAS, contexto correcto tras registrar, vínculos explícitos entre intentos, identidad estable a través de borradores sucesivos, historial inmutable y rechazo de atajos por rutas anteriores. Mantener regresiones del formato previo. No hay prueba de ciclo operativo completo ni preservación de una base viva por haber leído el código o pasado fixtures.
  - Restricciones y decisiones: La propuesta de estructura, compatibilidad y forma de entrega secuencial está aprobada; la implementación no. Previsión inicial de 1200–1800 líneas autorales añadidas más eliminadas para migración, adaptación del formato, persistencia, guards y pruebas; no reutilizar el forecast menor de un almacén parcial. Antes de RED, Gentle AI debe afinarla y producir el desglose técnico de entregas independientes, verificables y reversibles, con pruebas y preservación de historia propias. No hay cortes concretos, cantidad de entregas ni excepción de tamaño preaprobados. Las 400 líneas son referencia, no límite duro: una unidad que la supere requiere consultar antes de implementarla, sin recortar pruebas ni fragmentar artificialmente. Gentle AI posee el desglose, implementación y verificación mediante ODD; SDD sólo por solicitud humana explícita, sin Módulos/Tareas Chanks nuevos. El inicio requiere selección humana, admisión Radar fresca y dependencia S147 entregada. La versión 5 es evidencia del código base, no de la base real: no se inspeccionó ni se autoriza mutar esa base. Cualquier conversión real exige inventario, respaldo, exclusividad y aprobación separados; no restaurar una copia antigua sobre historia posterior. Mantener la Torre apagada. No importar main-store JSON, inferir asociaciones históricas ni sustituir autoridad humana, Radar, Git o Gentle AI con datos de forma válida. No incluye transporte/API IPC, despacho operativo, máquina completa de admisión/avance, outbox/proyección JSON, adapters, RDD, entrega, cierre o activación. Tampoco habilita automáticamente los seis consumidores pendientes. Cualquier archivo adicional requiere aprobación y compatibilidad fresca antes de escribir; los dos Cimientos requieren evidencia exclusiva o serial para su mutación. No hay recurso adquirido. Los ensayos descritos siguen pendientes y no son un PASS. Revalidar el baseline antes de implementar; una contradicción de esquema, contrato o alcance no autoriza reescribir historia o ampliar superficies.
    - Decisión estructurada [resuelta · migracion-o-perdida-de-datos]: ¿Qué estrategia concreta de introducción de la raíz conserva los handoffs y datos previos, y qué interfaces y archivos se aprueban para implementarla en pruebas aisladas?
      - Resolución: Aprobada la ampliación explícita del almacenamiento ct&#95;handoff para paquetes S147, migración 006 con historia anterior intacta, raíz/historial/asociación, CAS e idempotencia, controles de compatibilidad y borradores sin despacho descritos en este Encargo, sólo en core.mjs y test/migration.test.mjs. La elección incluye la compatibilidad del contrato existente: no se sustituye por un almacén sin integración ni por conversión ficticia al formato anterior. El presupuesto sigue pendiente. No autoriza código, base viva, instalación, activación o entrega; la autorización posterior permite este registro.
      - Autoridad: Emilio; respuesta UI explícita Aprobar la propuesta, registrada en Engram 11310 después de S147/11305 y ratificada por su pedido de plasmar ambas propuestas en el plan.
      - Evidencia: SQLite y la reutilización de ct&#95;handoff ya están decididos; el enlace de datos previos, tablas, compatibilidad y huella final no. No se inspeccionó ni se autoriza mutar la base viva.
      - Checkpoint: Antes de RED o cualquier cambio de esquema; presentar estrategia, compatibilidad y huella concreta para aprobación.
      - Alcanza: encargo
      - Falsificador: Se reescriben datos o migraciones anteriores, se inventa source&#95;merge/procedencia, se infiere una asociación histórica, se elude la raíz por rutas anteriores, el paquete nace ligado a una revisión obsoleta o se habilitan despacho/migración viva sin autoridad adicional.
      - Contaminaba: S148
      - Opción: Aprobar una estrategia concreta que demuestre preservación en fixtures aisladas. → Permite completar el Encargo; una instalación o migración real sigue necesitando su propia autorización.
      - Opción: Mantener la preparación incompleta hasta resolver preservación e interfaces. → No se implementa persistencia ni se habilitan consumidores o conversiones por inferencia.
      - Descartada: Mantener la preparación incompleta hasta resolver preservación e interfaces. → Emilio aprobó la estrategia concreta, su ampliación de formato y sus límites en lugar de dejar S148 sin resolución.
    - Decisión estructurada [resuelta · ]: Antes de RED, con la previsión inicial de 1200–1800 líneas y su refinamiento técnico, ¿se aprueban entregas secuenciales verificables y reversibles o una excepción de tamaño para S148?
      - Resolución: Emilio elige entregas secuenciales verificables y reversibles para S148, sólo después de S147 entregada e integrada. Resuelve la elección de forma de entrega; Gentle AI debe refinar el desglose técnico antes de RED sin presumir cortes concretos ni excepción de tamaño aprobados. La aprobación publica documentación, no autoriza implementación, migración real, activación ni cambios de prioridad. El presupuesto pendiente de la resolución 11310 describe aquella aprobación anterior; esta decisión posterior resuelve sólo la forma secuencial y no satisface por sí misma la dependencia S147.
      - Autoridad: Emilio; respuesta explícita «1. secuenciales. 2. si respetamos el orden. 3.publicamos y com esto cerramos esta magnifca sesio», registrada en Engram 11316.
      - Evidencia: La aprobación 11310 excluyó expresamente presupuesto e implementación; adaptar el formato, migración, raíz, guards y pruebas supera la referencia de revisión de 400 líneas y no equivale al almacén parcial descartado.
      - Checkpoint: Antes de RED o cualquier escritura SQL/código de S148; presentar forecast refinado y unidades técnicas propuestas, sin conceder migración real ni crear Módulos/Tareas Chanks.
      - Alcanza: encargo
      - Falsificador: Se inicia S148 sin S147 entregada e integrada, se presume un corte, forecast o excepción aprobados, se escribe SQL/código sin desglose y autoridad de inicio o se permite perder historia o activar la Torre por esta decisión.
      - Contaminaba: S148
      - Opción: Aprobar un desglose técnico en entregas secuenciales. → Cada unidad conserva pruebas y reversibilidad propias bajo la política de entrega; no permite perder historia ni activar una integración parcial.
      - Opción: Aprobar una excepción de tamaño explícita. → Acepta el volumen refinado para la unidad coherente aprobada, sin ampliar alcance ni omitir controles de preservación o revisión.
      - Opción: Mantener pendiente la implementación. → Conserva la estrategia aprobada, pero no autoriza RED, escritura SQL/código o conversión de datos.
      - Descartada: Aprobar una excepción de tamaño explícita. → Eligió entregas secuenciales; no concedió excepción de tamaño.
      - Descartada: Mantener pendiente la implementación. → Resolvió la elección de forma de entrega, conservando S147 como dependencia y sin autorizar el inicio de esta Sesión.
  - Referencias: Autoridad inicial Engram 11293; descubrimiento 11308, propuesta 11309 y aprobación humana 11310, seguidas por autorización de registro y decisión 11316 de entregas secuenciales, S147 antes de S148 y publicación documental. Este Encargo explicita el alcance; Engram conserva la procedencia de las decisiones, no un diseño imprescindible fuera del plan. docs/architecture/torre-motor-determinista.md, secciones 3, 7, 8, 12, 15 y 17, SHA-256 cc9949d367e93a1b809534335248cbd9916d7acf99ed6d9f188dff63b7b04f62. Base de investigación HEAD 1658444ff52cddba3516f7e4e39bd314ccd21cdc: core.mjs:86–112,231–318,855–1058,2442–2591; test/migration.test.mjs:1679–1740. test/recovery.test.mjs:86–95 es lectura de regresión que provisiona explícitamente schema 5, no permiso de editar ese archivo. Reutilizar los validadores entregados de S147 sin ampliar su huella. Se conservan Torre V1 detrás del Método, S148→S147 y los dos Cimientos exactos. Son dos bases iniciales, no cobertura completa de API/IPC, admisión de efectos, proyección o cierre; no se inventan ahora otras Sesiones, dependencias o prioridades.

### S149 — La capa semáforo se distribuye como un ejecutable único que no exige bun instalado y conserva el contrato tower&#95;&#42; observable.
- Coordinación:
  - Estado derivado: 🔴 BLOQUEADO
  - Encargo incompleto: no autoriza territorio, cola ni asiento.
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: La capa semáforo de core.mjs —register, setState, send, receive, acquire, release, transfer, forceRelease, status, locate, probeMode, open y deactivate, medidas hoy en core.mjs:4318-4681— se distribuye como ejecutable único. Hoy la Torre exige bun instalado y se presenta como un conjunto de scripts; el producto que se entrega a un tercero necesita un artefacto que se copie y corra. Esta Sesión produce el binario y su frontera observable; no rediseña el semáforo, no toca la capa continuation y no decide el empaquetado, que pertenece a S8.12.
  - Resultado y comportamiento: Existe un ejecutable único, reproducible desde el árbol, que expone el contrato tower&#95;&#42; con el mismo comportamiento observable que hoy: registro por directorio, estados, mensajes, y los locks git-delivery y db-writer con su semántica de transferencia. El interruptor ACTIVE y la base por repositorio bajo git-common-dir conservan su ubicación y su formato; un repositorio ya armado sigue funcionando sin migración ni reimportación. El binario no transporta la capa continuation. Una invocación de una operación de continuation contra el binario falla cerrado con error tipado, no con un éxito parcial ni con una operación silenciosamente ausente. La suite vigente sigue pasando sobre el código fuente sin modificar sus aserciones, y una prueba nueva ejercita el ejecutable ya construido —no el módulo importado— sobre un repositorio temporal: registrar dos agentes, encolar y consumir un mensaje, tomar el lock de entrega, transferirlo y soltarlo. El ejecutable declara su versión y la revisión del árbol que lo produjo, de modo que S8.12 pueda enumerarlo por huella exacta.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. El territorio todavía no está resuelto: falta decidir si la capa semáforo se extrae a un módulo propio o se compila desde core.mjs tal como está, y esa decisión determina los archivos y los Cimientos exactos. Hasta resolverla el Encargo permanece incompleto y no autoriza archivos, Cimientos ni escritura. core.mjs, mcp.mjs, bin/torre, install.sh y package.json son Cimientos: su intervención exige reserva exacta por archivo y aprobación humana fresca. No se toca la capa continuation, ni sus migraciones, ni sus pruebas. No se cambia el esquema de las tablas agent, message y lock. No se activa la Torre, no se instala y no se publica.
  - Referencias: Medición del corte: Engram 11325 (core.mjs partido 90/10 entre continuation y semáforo, con el semáforo en core.mjs:4318-4681 creando sus tres tablas en open() sin el sistema de migraciones) y Engram 11326 (continuation en el paso 1 de los 11 de docs/architecture/torre-motor-determinista.md, sección 17). Decisión de alcance: Engram 11327. Línea base de código: core.mjs:4318-4681, mcp.mjs (ocho herramientas tower&#95;&#42;), bin/torre. Revalidar contra el código vigente antes de implementar.

### S150 — El README describe el producto que se entrega —el semáforo instalable— y no promete capacidades que pertenecen a torre-v2.
- Coordinación:
  - Estado derivado: 🟡 DIFERIDO
  - Zona/Área: cimientos · —
  - Archivos autorizados: README.md
  - Depende de: —
  - Recursos: —
  - Ejecución: ODD nativo.
- Encargo:
  - Pedido y contexto: El README vigente describe la Torre como un conjunto de piezas —core.mjs, mcp.mjs, plugin, bin/torre, validador— y enumera las ocho herramientas tower&#95;&#42;. Describe el repositorio, no el producto. Quien reciba la Torre V1 instalada necesita leer qué resuelve, cómo se instala y cuál es su frontera. Esta Sesión reescribe esa lectura; no reorganiza la raíz ni mueve archivos.
  - Resultado y comportamiento: El README abre con el problema que la Torre resuelve —varias sesiones de agente sobre el mismo repositorio entregan en orden y no se pisan en master— y con el resultado observable, antes que con su inventario de archivos. Declara explícitamente la frontera de la V1: coordina y serializa la entrega; no reparte trabajo, no traspasa encargos entre agentes y no recupera una sesión caída. Nombra que el traspaso de trabajo se coordina hoy con el método, no con la Torre, y que la versión automática pertenece a una versión posterior. Explica la instalación del artefacto entregable y el interruptor on/off con su efecto real sobre el estado existente. Describe la relación con Radar como dos programas distintos que se instalan juntos y se versionan por separado. Ninguna afirmación del README describe una capacidad que no exista en el árbol al momento de escribirlo; cada capacidad enunciada es verificable contra el código o contra una prueba.
  - Restricciones y decisiones: Gentle AI desglosa, implementa y verifica mediante ODD; SDD sólo por solicitud humana explícita. README.md es Cimiento: su intervención exige reserva exacta y exclusividad o serialización demostrada. Sólo se autoriza README.md; ROADMAP.md, AGENTS.md, CLAUDE.md y la documentación bajo docs/ quedan fuera. No se reorganiza la raíz, no se mueven ni renombran archivos y no se toca código: esa parte permanece en S12.6 dentro de torre-v3. El texto no anticipa capacidades de torre-v2 como disponibles.
  - Referencias: Decisión de alcance: Engram 11327. README.md vigente en HEAD como línea base. S12.6 conserva en torre-v3 la reorganización de la raíz. La frontera del producto se apoya en la medición de Engram 11325 y 11326. Revalidar contra el árbol vigente antes de escribir.

## Detalle de Módulos y Tareas
### S1.11 — Reconciliación independiente legacy P7
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Archivo.
- Depende de: S1.9, S1.10
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Create openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md with P6 evidence, manifest refs, DAG assertions, role/identity matrix, validation results, and explicit approval/block state.
  - [ ] Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected.
  - [ ] Approve the P7 gate only after the record and binary checks are complete.

#### M1.11.1 — P7 evidence and gate
Rutas históricas (evidencia): openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md

- **T1.11.1.1:** Create openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md with P6 evidence, manifest refs, DAG assertions, role/identity matrix, validation results, and explicit approval/block state. → Create openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md with P6 evidence, manifest refs, DAG assertions, role/identity matrix, validation results, and explicit approval/block state.
  - [ ] Create openspec/changes/p7-host-neutral-loop-opencode-adapter/reconciliation.md with P6 evidence
  - [ ] manifest refs
  - [ ] DAG assertions
  - [ ] role/identity matrix
  - [ ] validation results
  - [ ] and explicit approval/block state.
- **T1.11.1.2:** Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected. → Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected.
  - [ ] Binary check: P7 stays blocked without its approved record; missing IDs, conflated epochs, unauthorized SHA, or out-of-container worktree are rejected.
- **T1.11.1.3:** Approve the P7 gate only after the record and binary checks are complete. → Approve the P7 gate only after the record and binary checks are complete.
  - [ ] Approve the P7 gate only after the record and binary checks are complete.

### S1.12 — Reconciliación independiente P8
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Archivo.
- Depende de: S1.11
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Create openspec/changes/p8-slice-planning/reconciliation.md referencing—not absorbing—the integrated P7 record, with independent refs, boundaries, validation, and approval.
  - [ ] Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable.
  - [ ] Approve the P8 gate only after integrated P7 and the independent P8 record pass.
  - [ ] Parse both manifests; resolve every ArtifactRef source path, recompute digests, verify revisions, unique slices, acyclicity, C→D, both DAGs, no A→P7/P8, and no P9→P10/P11 gate.
  - [ ] Prove unchanged hashes for P6 apply-progress.md, P7 spec, P8 proposal/spec, canonical PRD/RFC/REQUIREMENTS, and all runtime/source/test files; run git diff --check and bun test.
  - [ ] Persist the completed task/reconciliation artifacts to matching Engram sdd/... topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed.
  - [ ] Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change.

#### M1.12.1 — P8 evidence and final validation
Rutas históricas (evidencia): openspec/changes/p8-slice-planning/reconciliation.md, openspec/changes/p8-slice-planning/STATUS.md, openspec/changes/p8-slice-planning/persistence-receipt.json

- **T1.12.1.1:** Create openspec/changes/p8-slice-planning/reconciliation.md referencing—not absorbing—the integrated P7 record, with independent refs, boundaries, validation, and approval. → Create openspec/changes/p8-slice-planning/reconciliation.md referencing—not absorbing—the integrated P7 record, with independent refs, boundaries, validation, and approval.
  - [ ] Create openspec/changes/p8-slice-planning/reconciliation.md referencing—not absorbing—the integrated P7 record
  - [ ] with independent refs
  - [ ] boundaries
  - [ ] validation
  - [ ] and approval.
- **T1.12.1.2:** Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable. → Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable.
  - [ ] Binary check: P8 remains blocked without both approved records; invalid digest, identity, epoch, branch, or worktree evidence is non-approvable.
- **T1.12.1.3:** Approve the P8 gate only after integrated P7 and the independent P8 record pass. → Approve the P8 gate only after integrated P7 and the independent P8 record pass.
  - [ ] Approve the P8 gate only after integrated P7 and the independent P8 record pass.
- **T1.12.1.4:** Parse both manifests; resolve every ArtifactRef source path, recompute digests, verify revisions, unique slices, acyclicity, C→D, both DAGs, no A→P7/P8, and no P9→P10/P11 gate. → Parse both manifests; resolve every ArtifactRef source path, recompute digests, verify revisions, unique slices, acyclicity, C→D, both DAGs, no A→P7/P8, and no P9→P10/P11 gate.
  - [ ] Parse both manifests; resolve every ArtifactRef source path
  - [ ] recompute digests
  - [ ] verify revisions
  - [ ] unique slices
  - [ ] acyclicity
  - [ ] C→D
  - [ ] both DAGs
  - [ ] no A→P7/P8
  - [ ] and no P9→P10/P11 gate.
- **T1.12.1.5:** Prove unchanged hashes for P6 apply-progress.md, P7 spec, P8 proposal/spec, canonical PRD/RFC/REQUIREMENTS, and all runtime/source/test files; run git diff --check and bun test. → Prove unchanged hashes for P6 apply-progress.md, P7 spec, P8 proposal/spec, canonical PRD/RFC/REQUIREMENTS, and all runtime/source/test files; run git diff --check and bun test.
  - [ ] Prove unchanged hashes for P6 apply-progress.md
  - [ ] P7 spec
  - [ ] P8 proposal/spec
  - [ ] canonical PRD/RFC/REQUIREMENTS
  - [ ] and all runtime/source/test files; run git diff --check and bun test.
- **T1.12.1.6:** Persist the completed task/reconciliation artifacts to matching Engram sdd/... topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed. → Persist the completed task/reconciliation artifacts to matching Engram sdd/... topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed.
  - [ ] Persist the completed task/reconciliation artifacts to matching Engram sdd/... topics and verify filesystem/OpenSpec and Engram contents agree; leave Tower disarmed.
- **T1.12.1.7:** Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change. → Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change.
  - [ ] Confirm the design threat matrix remains N/A; no runtime RED tests are required for this documentation-only change.

### S1.13 — Root lifecycle e invalidación sincrónica
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, cimientos.
- Depende de: S1.12
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] First-write-wins opaque root binding, exact-root settle gating, generation guards, and synchronous idempotent invalidation pass the canonical deterministic cases.
  - [ ] The controller remains host-neutral and excludes adapter composition, SQLite, core.mjs, mcp.mjs, consuming receive, and delivery claim behavior.
  - [ ] Focused polling tests and syntax validation pass over the delivered bytes.

#### M1.13.1 — Controller lifecycle
Rutas históricas (evidencia): hosts/loop.mjs, test/polling.test.mjs

- **T1.13.1.1:** Add failing deterministic cases in test/polling.test.mjs using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work. → Add failing deterministic cases in test/polling.test.mjs using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work.
  - [ ] Add failing deterministic cases in test/polling.test.mjs using a fake clock, FIFO one-shot scheduler, and deferred ports for invalid/first/repeated/conflicting root binding; exact-root settle gating; duplicate settled no-ops; queued stale callbacks; and root/plugin disposal before queued or deferred work.
- **T1.13.1.2:** Add hosts/loop.mjs with injected ports and createPollingLoop lifecycle methods sufficient to pass the lifecycle cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace. → Add hosts/loop.mjs with injected ports and createPollingLoop lifecycle methods sufficient to pass the lifecycle cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace.
  - [ ] Add hosts/loop.mjs with injected ports and createPollingLoop lifecycle methods sufficient to pass the lifecycle cases: first-write-wins opaque root binding, bound-root-only settle/deletion, one owned one-shot callback, generation rotation, and synchronous disposal before cancel/trace.
- **T1.13.1.3:** Extend test/polling.test.mjs with cancellation-throw and trace-throw cases plus disposal during deferred peek and deferred wake settlement; prove stale callbacks and completions perform no later peek, wake, receive, or claim. → Extend test/polling.test.mjs with cancellation-throw and trace-throw cases plus disposal during deferred peek and deferred wake settlement; prove stale callbacks and completions perform no later peek, wake, receive, or claim.
  - [ ] Extend test/polling.test.mjs with cancellation-throw and trace-throw cases plus disposal during deferred peek and deferred wake settlement; prove stale callbacks and completions perform no later peek, wake, receive, or claim.
- **T1.13.1.4:** Simplify hosts/loop.mjs and test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state. → Simplify hosts/loop.mjs and test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state.
  - [ ] Simplify hosts/loop.mjs and test helpers without changing behavior; preserve a host-SDK/SQLite/core/MCP-free controller boundary and frozen descriptor-free diagnostic state.
- **T1.13.1.5:** Run bun test test/polling.test.mjs and node --check hosts/loop.mjs; record exact results, an authored-line receipt from git diff --numstat, runtime harness result N/A, and the bounded S1.13 rollback boundary. → Run bun test test/polling.test.mjs and node --check hosts/loop.mjs; record exact results, an authored-line receipt from git diff --numstat, runtime harness result N/A, and the bounded S1.13 rollback boundary.
  - [ ] Run bun test test/polling.test.mjs and node --check hosts/loop.mjs; record exact results, an authored-line receipt from git diff --numstat, runtime harness result N/A, and the bounded S1.13 rollback boundary.

### S1.14 — Polling y wake safety
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, cimientos.
- Depende de: S1.13
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Throttle is evaluated before every fresh non-consuming peek and the monotonic window reopens exactly when required.
  - [ ] One wake is in flight; retries occur at 1000, 2000, and 4000 ms; the fourth failure exhausts without inventing work.
  - [ ] Successful wake pauses in AWAITING&#95;SETTLE and invalid clock or scheduler input pauses before storage access.
  - [ ] Focused polling tests, syntax validation, and the complete suite pass over the delivered bytes.

#### M1.14.1 — Polling y comportamiento de wake
Rutas históricas (evidencia): hosts/loop.mjs, test/polling.test.mjs

- **T1.14.1.1:** Add deterministic RED cases for throttle, fresh peek, one in-flight wake, accounting, wake failures, and pending preservation. → The complete polling and wake safety boundary is captured before implementation.
  - [ ] The canonical RED cases cover throttle, scheduling, wake serialization, failures, and non-consumption.
- **T1.14.1.2:** Add validated policy, monotonic accounting, throttle scheduling, fresh peek, serialized wake, and safe tracing. → The GREEN polling and wake cases pass without consumption or claim behavior.
  - [ ] All canonical GREEN cases pass.
- **T1.14.1.3:** Add exact retry, re-peek, exhaustion, settle, retained-window, and malformed-clock triangulation cases. → Retry and pause behavior remains deterministic and fail-closed.
  - [ ] All canonical TRIANGULATE cases pass with exact retry delays.
- **T1.14.1.4:** Remove duplicate scheduling and accounting paths and stabilize fake-scheduler helpers. → Opaque descriptors and non-consuming behavior are preserved.
  - [ ] Refactoring preserves all focused behavior.
- **T1.14.1.5:** Run focused polling tests and syntax validation and record evidence and rollback. → The delivered polling bytes pass focused and complete verification with bounded rollback.
  - [ ] Focused tests and syntax validation pass; runtime harness is correctly recorded as N/A.

### S1.15 — Conformidad lifecycle OpenCode
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, cimientos.
- Depende de: S1.14
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] The parameterized harness and OpenCode cases cover CT-R5-S1@OpenCode through CT-R5-S5@OpenCode, including child no-ops, matching-root deletion, plugin disposal, malformed metadata, and conflicting identities.
  - [ ] plugin/tower-spike.js exposes a testable factory that classifies only reconciled proven root/child events, binds once, forwards exact bound-root settle/deletion, and invalidates synchronously on matching root deletion or plugin disposal.
  - [ ] Event-order and incomplete-metadata variants prove unknown events are never roots, child cache cleanup cannot stop polling, and the generic helper exposes no OpenCode field names.
  - [ ] hosts/loop.mjs remains host-neutral and the adapter adds no SQLite, core.mjs, mcp.mjs, consuming receive, or delivery claim path.
  - [ ] Focused tests, CT-R5 conformance, syntax validation, authored-line evidence, runtime-harness disposition, and exact rollback evidence pass over the delivered bytes.
  - [ ] The implementation touches only the declared area and rollback removes only S1.15 adapter, fixture, and conformance changes.

#### M1.15.1 — OpenCode adapter and shared harness
Rutas históricas (evidencia): plugin/tower-spike.js, test/helpers/host-adapter-conformance.mjs, test/host-adapters.test.mjs

- **T1.15.1.1:** Create failing parameterized conformance cases with stable IDs CT-R5-S1@OpenCode through CT-R5-S5@OpenCode covering lifecycle no-ops, root deletion, disposal, malformed metadata, and conflicting identities. → The OpenCode lifecycle boundary is captured before implementation.
  - [ ] The RED cases cover all five named CT-R5 OpenCode scenarios.
- **T1.15.1.2:** Refactor plugin/tower-spike.js into a testable lifecycle adapter factory with proven root/child classification, one-time binding, exact forwarding, and synchronous invalidation. → The adapter lifecycle contract passes without transport or persistence expansion.
  - [ ] The GREEN lifecycle cases pass for the exact bound-root contract.
- **T1.15.1.3:** Add OpenCode event-order and incomplete-metadata variants and prove fail-closed unknown events, safe child cleanup, and host-neutral helper observations. → Classification remains deterministic and host-neutral across variants.
  - [ ] The TRIANGULATE variants pass without exposing OpenCode field names through the generic helper.
- **T1.15.1.4:** Reduce adapter and harness duplication while keeping hosts/loop.mjs host-neutral and excluding SQLite, core.mjs, mcp.mjs, consuming receive, and delivery claim paths. → Refactoring preserves the bounded adapter contract.
  - [ ] Focused behavior remains green and forbidden imports and paths remain absent.
- **T1.15.1.5:** Run the focused adapter and polling suites plus syntax checks and record exact results, authored-line receipt, CT-R5 runtime-harness disposition, and rollback boundary. → The delivered S1.15 bytes have complete verification and bounded rollback evidence.
  - [ ] Focused suites and syntax checks pass and the CT-R5-S1 through CT-R5-S5 boundary is recorded.

### S1.16 — Transporte reconciliado y composición wake
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, cimientos.
- Depende de: S1.15
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] The injected capability preserves non-consuming peek and fails closed when trusted root or binding&#95;epoch is absent or drifts.
  - [ ] Every wake calls client.session.promptAsync exactly once for the proven root with the fixed generic envelope.
  - [ ] The prompt interpolates no descriptor, token, evidence, sender, or domain content and fabricates no provider authority.
  - [ ] A rejected wake preserves pending delivery and follows retry policy without consuming, claiming, or acknowledging work.
  - [ ] The legacy automatic route remains bounded, non-consuming, and non-lossy and does not degrade to manual queue handling.
  - [ ] No second public continuation API or import of core.mjs, mcp.mjs, or SQLite exists.
  - [ ] Focused, expanded, runtime, syntax, diff, and complete-suite verification passes over the final bytes.
  - [ ] The diff touches only the declared area and rollback reverts only S1.16 composition and seams.

#### M1.16.1 — Trusted consumer transport and wake composition
Rutas históricas (evidencia): hosts/loop.mjs, plugin/tower-spike.js, test/host-adapters.test.mjs, test/polling.test.mjs

- **T1.16.1.1:** Add failing cases for injected non-consuming capability, trusted root and binding&#95;epoch drift, exact promptAsync mapping, wake rejection, automatic-wake preservation, and prohibited interpolation. → The trusted consumer transport boundary is captured before implementation.
  - [ ] The RED cases cover capability proof
  - [ ] exact wake mapping
  - [ ] preservation
  - [ ] and fail-closed behavior.
- **T1.16.1.2:** Wire only approved consumer dependencies so peek remains trusted and non-consuming, wake maps once to promptAsync, pending work is preserved, and missing or drifting proof fails closed. → The bounded consumer transport contract passes without provider authority expansion.
  - [ ] The GREEN transport and wake cases pass.
- **T1.16.1.3:** Add isolated capability and compatibility coverage proving stable errors, no second API or forbidden imports, no provider-authority manufacture, and preservation after rejected wakes. → Transport remains deterministic, bounded, and non-lossy across variants.
  - [ ] The TRIANGULATE cases pass without degrading to manual queue handling.
- **T1.16.1.4:** Consolidate composition boundaries and fixtures without expanding authority or persistence and keep unrelated migration and runtime configuration untouched. → Refactoring preserves transient-only polling and the approved seam.
  - [ ] Focused behavior remains green and the declared exclusions remain intact.
- **T1.16.1.5:** Run focused, isolated, expanded, complete, syntax, and diff checks and record authored-line, runtime-harness, and exact rollback evidence. → The delivered S1.16 bytes have complete verification and bounded rollback evidence.
  - [ ] All prescribed checks pass and rollback is limited to S1.16 composition and seam changes.

### S1.17 — Gate y RED del adapter Pi
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts.
- Depende de: S9.4
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] RED rejects self-declared identity, takeover, cross-worktree binding, cross-epoch binding, and stale receipts.
  - [ ] Capabilities respect the approved role: implementers retain bash, read-only roles receive no bash, write, or edit, and Intercom never grants authority.
  - [ ] The change remains within adapters/pi/contract.mjs and test/adapters/pi/contract.test.mjs and modifies neither Pi nor Intercom.

#### M1.17.1 — Gate falsificable Pi
Rutas históricas (evidencia): adapters/pi/contract.mjs, test/adapters/pi/contract.test.mjs

- **T1.17.1.1:** Establish RED failures for identity, epoch, scope, takeover, and capability-set violations. → The Pi authority boundary is falsified before implementation.
  - [ ] Self-declaration
  - [ ] takeover
  - [ ] cross-worktree
  - [ ] cross-epoch
  - [ ] stale binding
  - [ ] and invalid capability sets fail closed.
- **T1.17.1.2:** Create the minimum private seam against S9.4 and the neutral contract. → Tower-owned scope, epoch, role, and capabilities govern the Pi adapter gate.
  - [ ] The seam accepts only the exact Tower-owned binding and role-bounded capability set.
- **T1.17.1.3:** Remove wire-format knowledge outside the adapter without changing the authority boundary. → The adapter remains private and host-neutral boundaries remain intact.
  - [ ] No runtime
  - [ ] public wire
  - [ ] Pi
  - [ ] or Intercom surface changes and focused and complete verification pass.

### S1.18 — Adapter Pi/Intercom y reporte terminal asíncrono
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts.
- Depende de: S1.17
- Cimientos: —
- Recursos: procesos Pi Tower-spawned, conexión Intercom del supervisor y namespace de dispatch&#95;id
- Criterios de aceptación:
  - [ ] launch/observe/health/stop/attach implement the neutral port and the injected seam crosses Tower-owned PID/cwd; nonce and endpointEpoch prove attach.
  - [ ] Every assignment emitted by Main carries a stable dispatch&#95;id; the adapter returns after send acknowledgment and never awaits ordinary Support or worker work.
  - [ ] send transports progress and closure; ask is used only for a true human decision and produces recoverable BLOCKED, never progress polling.
  - [ ] Every dispatch&#95;id produces exactly one terminal COMPLETED, BLOCKED, or FAILED; COMPLETED includes evidence references, changed paths, and tests, while BLOCKED/FAILED include reason and recoverability.
  - [ ] ON preserves Tower-owned binding, persistence, acknowledgment, and retry; OFF does not fabricate that guarantee and uses only maintainer-approved live peers.
  - [ ] IDs are random, foreign processes are never adopted, Pi and Intercom are unchanged, and the diff stays within the declared Area.

#### M1.18.1 — Lifecycle y dispatch reconocido
Rutas históricas (evidencia): adapters/pi/runtime.mjs, test/adapters/pi/runtime.test.mjs

- **T1.18.1.1:** Falsify lifecycle, foreign process, divergent /proc, stale nonce or epoch attach, wrong broker, invalid stop ownership, successful disappearance treated as failure, missing or duplicate dispatch&#95;id, blocking acknowledgment, and ON/OFF differences. → Lifecycle and acknowledged-dispatch failures are captured before implementation.
  - [ ] The exact lifecycle
  - [ ] ownership
  - [ ] attach
  - [ ] dispatch identity
  - [ ] acknowledgment
  - [ ] and ON/OFF RED cases fail before implementation.
- **T1.18.1.2:** Implement launch/observe/health/stop/attach, validate ownership before stop, preserve successful disappearance after stop, and dispatch with a stable dispatch&#95;id plus non-blocking acknowledgment in ON and OFF. → Guarded lifecycle and acknowledged dispatch satisfy the approved neutral adapter contract.
  - [ ] Ownership is checked before stop
  - [ ] successful disappearance remains success
  - [ ] and every dispatch is acknowledged without awaiting ordinary work.
- **T1.18.1.3:** Encapsulate lifecycle and the external protocol, isolate foreign processes, and verify attach, dispatch, and acknowledgment boundaries without implementing retryable terminality early. → The first direct commit is independently verifiable and revertible.
  - [ ] Focused verification passes over only the two Area paths and the first commit remains at or below 400 authored lines.

#### M1.18.2 — Entrega terminal retryable y decisiones inmutables
Rutas históricas (evidencia): adapters/pi/runtime.mjs, test/adapters/pi/runtime.test.mjs

- **T1.18.2.1:** Cover concurrent terminal deliveries, first-send failure, later retry, duplicate after successful delivery, and mutation of a decision request while an operation awaits. → Retryability, exactly-one successful terminal delivery, and immutable decision evidence are captured before implementation.
  - [ ] The exact concurrency
  - [ ] failure
  - [ ] retry
  - [ ] duplicate
  - [ ] and mutation RED cases fail before implementation.
- **T1.18.2.2:** Reserve concurrent terminal delivery, commit terminal state only after successful delivery, release the reservation after failure for retry, and deep-copy and freeze the decision request before any await. → One terminal is delivered successfully per dispatch&#95;id and decision evidence remains immutable.
  - [ ] Failed delivery remains retryable
  - [ ] only the first successful terminal commits
  - [ ] and caller mutation cannot cross the await boundary.
- **T1.18.2.3:** Concentrate terminal reservation, release, and commit behavior and encapsulate immutable decision snapshots without mixing send and ask. → The second direct commit is independently verifiable and revertible.
  - [ ] Focused and full verification pass over only the two Area paths and the second commit remains at or below 400 authored lines.

### S1.20 — Probe tipado y read-only del modo Tower
- Estado derivado: ✅ COMPLETO
- Zona/Área: cimientos · —
- Depende de: —
- Cimientos: core.mjs, test/lifecycle.test.mjs
- Recursos: lectura del marcador ACTIVE y estado persistido
- Criterios de aceptación:
  - [ ] Un único probe compartido devuelve sólo ON, OFF o INDETERMINATE para el repositorio consultado y no exige que el usuario declare el modo.
  - [ ] El probe no crea ni modifica ACTIVE, DB, WAL/SHM, configuración, locks, procesos o worktrees y no ejecuta migraciones.
  - [ ] Evidencia ambigua, ilegible o contradictoria devuelve INDETERMINATE; nunca se adivina OFF.
  - [ ] Salud de host/proceso se reporta por su seam existente y no altera el resultado del modo.
  - [ ] El diff toca sólo Área.

#### M1.20.1 — Clasificación read-only del modo
Rutas: core.mjs, test/lifecycle.test.mjs

- **T1.20.1.1:** RED: cubrir ON, OFF, marcador/estado contradictorio, I/O ilegible y prueba de cero mutación. → RED: cubrir ON, OFF, marcador/estado contradictorio, I/O ilegible y prueba de cero mutación.
  - [ ] RED: cubrir ON, OFF, marcador/estado contradictorio, I/O ilegible y prueba de cero mutación.
- **T1.20.1.2:** GREEN: exponer el probe mínimo compartido sin abrir rutas creativas ni consultar salud. → GREEN: exponer el probe mínimo compartido sin abrir rutas creativas ni consultar salud.
  - [ ] GREEN: exponer el probe mínimo compartido sin abrir rutas creativas ni consultar salud.
- **T1.20.1.3:** REFACTOR: congelar el tipo cerrado, normalizar INDETERMINATE y repetir testigos de bytes/metadatos. → REFACTOR: congelar el tipo cerrado, normalizar INDETERMINATE y repetir testigos de bytes/metadatos.
  - [ ] REFACTOR: congelar el tipo cerrado, normalizar INDETERMINATE y repetir testigos de bytes/metadatos.

### S2.8 — Los nombres de fase salen del contrato de binding
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] AC1: rg 'proposal&#124;specs&#124;design&#124;tasks' schemas/binding-delta-v1.schema.json devuelve cero.
  - [ ] AC2: Un binding-delta sellado con los seis campos actuales sigue validando contra el schema recortado.
  - [ ] AC3: Un binding-delta con inputs de forma distinta también valida.
  - [ ] AC4: binding-delta-v1 sigue declarado en contracts/schema-registry.mjs y en el payload, sin cambio de membresía.
  - [ ] AC5: Ningún campo fuera de inputs cambia un byte.
  - [ ] AC6: Excepción humana autorizada; la corrida integral fue 952/953 por una falla preexistente fuera de Área, y el diagnóstico aislado pasó 17/17.

#### M2.8.1 — Opacidad del contrato
Rutas históricas (evidencia): schemas/binding-delta-v1.schema.json, test/contracts/schema.test.mjs

- **T2.8.1.1:** RED: demostrar que una forma de inputs ajena a SDD falla hoy y que el delta sellado actual debe seguir aceptado. → La incompatibilidad y la compatibilidad vigente quedan demostradas antes del cambio.
  - [ ] Una forma ajena falla y el delta sellado actual permanece aceptado.
- **T2.8.1.2:** GREEN: reemplazar la definición interna de inputs por un objeto opaco sin restricciones internas. → Inputs acepta cualquier forma de objeto sin interpretar nombres de fase.
  - [ ] La forma actual y una forma alternativa validan.
- **T2.8.1.3:** REFACTOR: probar cero nombres de fase y comparar que ningún campo del schema fuera de inputs cambió. → El contrato queda acotado a inputs y preserva los demás bytes.
  - [ ] No quedan nombres de fase y ningún campo externo cambia.

#### M2.8.2 — Compatibilidad y membresía
Rutas históricas (evidencia): test/fixtures/contracts/schema-cases-v1.json, test/contracts/schema.test.mjs

- **T2.8.2.1:** RED: fijar casos para el delta actual, un inputs alternativo y la membresía vigente en registry/payload. → Los casos de compatibilidad y membresía quedan fijados.
  - [ ] Los tres límites están cubiertos antes del cambio.
- **T2.8.2.2:** GREEN: actualizar fixtures y pruebas para que ambas formas validen sin tocar archivos prohibidos. → Ambas formas validan y la membresía permanece intacta.
  - [ ] Fixtures y pruebas pasan dentro del Área exacta.
- **T2.8.2.3:** REFACTOR: triangular correcciones de revisión, membresía inmutable, suite focalizada e integral y límite exacto de Área. → La entrega queda verificada sin expansión de alcance.
  - [ ] Membresía
  - [ ] suites y territorio exacto quedan probados.

### S3.1 — Change C Workspace checkpoint
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos.
- Depende de: S2.4
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Un fixture Git válido produce una captura inmutable con raíz canónica y OIDs completos de commit y árbol para base y result.
  - [ ] git -C inyectado, un relativo que escapa y una raíz absoluta distinta fallan cerrados sin efectos mutantes.
  - [ ] Un índice vacío, staging drift y cualquier intento de commit -a fallan cerrados.
  - [ ] La evidencia raw-bytes y la estructura rfc8785-jcs producen digests SHA-256 verificables y sensibles a alteraciones.
  - [ ] La captura no invoca red, push, fetch, PR ni escribe fuera del fixture Git.
  - [ ] bun test test/workspace/checkpoint.test.mjs y bun test pasan.
  - [ ] El diff toca sólo workspace/checkpoint.mjs y test/workspace/checkpoint.test.mjs.

#### M3.1.1 — Checkpoint
Rutas históricas (evidencia): workspace/checkpoint.mjs, test/workspace/checkpoint.test.mjs

- **T3.1.1.1:** RED: selección Git por argv fijo y raíz canónica; rechazar git -C inyectado, relativo que escapa y raíz absoluta que no coincide. → Los inputs hostiles fallan antes de implementar la captura.
  - [ ] Git y raíz canónica quedan cubiertos con casos falsificables.
- **T3.1.1.2:** RED: archivos y árbol explícitos; prohibir commit -a; rechazar drift en staging e índice vacío. → El estado local inseguro queda cubierto antes de la implementación.
  - [ ] Índice vacío
  - [ ] drift y argv mutante fallan cerrados.
- **T3.1.1.3:** GREEN: implementar la captura. → La captura canónica produce identidad inmutable sin efectos remotos.
  - [ ] La captura válida pasa con commit y tree OIDs completos.
- **T3.1.1.4:** REFACTOR: evidencia por bytes y modo. → La evidencia distingue alteraciones de bytes y modo.
  - [ ] Los digests raw-bytes y rfc8785-jcs verifican la identidad exacta.

### S3.2 — Change D Global/project Policy/Jornada
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Capacidades, Contratos, Enrolamiento.
- Depende de: S3.1
- Cimientos: —
- Recursos: Main filesystem CAS in main-store/store.mjs; no SQLite migration, db-writer, or delivery token
- Criterios de aceptación:
  - [ ] Un campo de política ausente resuelve al valor más restrictivo y el motivo queda nombrado con CT&#95;POLICY&#95;UNRESOLVED.
  - [ ] Un bloque no parseable, con valor desconocido, o no ligado, falla cerrado sin default permisivo.
  - [ ] Una fuente de política por symlink, que escapa de la raíz, o de raíz ajena, se rechaza sin leerla.
  - [ ] Una política de proyecto más permisiva que la global resuelve al valor global.
  - [ ] Un repositorio sin bloque delivery-policy se comporta exactamente igual que antes de que el bloque existiera.
  - [ ] Ningún valor de política ni excepción alcanza un floor; los cinco casos se rechazan nombrando el floor violado.
  - [ ] Un registro de autoridad persistido sin identidad de actor falla cerrado, y esa identidad sobrevive al commit.
  - [ ] Una autorización consumida pasado su expires&#95;at se rechaza.
  - [ ] Los seis schemas validan contra sus fixtures y están registrados en contracts/schema-registry.mjs.
  - [ ] Los bytes de los contratos V1 aceptados no cambian y test/provenance/provenance.test.mjs sigue verde.
  - [ ] Policy resuelve elegibilidad y nunca ruteo; ninguna ruta de policy/ crea ni modifica un assignment.
  - [ ] bun test test/contracts test/main-store.test.mjs test/policy pasa completo.
  - [ ] bun test no introduce fallos nuevos sobre la línea base de S3.1, con la Torre desarmada.
  - [ ] El diff de implementación no toca ninguna ruta del Prohibido.

#### M3.2.1 — Authority/contracts
Rutas históricas (evidencia): contracts/schema-registry.mjs, main-store/store.mjs, schemas/assignment-v2.schema.json, schemas/policy-report-v2.schema.json, schemas/reconciled-checkpoint-v1.schema.json, schemas/recovery-proof-v1.schema.json, schemas/support-proposal-v1.schema.json, test/contracts/s3-2-schemas.test.mjs, test/contracts/schema.test.mjs, test/main-store.test.mjs

- **T3.2.1.1:** Extender contratos con drift de rol, proyecto y schema, y probar que un registro de autoridad sin actor falla cerrado. → Los límites de autoridad y actor quedan falsificados antes de implementar.
  - [ ] Drift y ausencia de actor fallan cerrado.
- **T3.2.1.2:** Implementar cinco schemas, registrarlos, ejercer CAS sólo por Main, códigos CT&#95;&#42; deterministas y persistencia del actor. → Los contratos y la autoridad persistida pasan los casos GREEN.
  - [ ] Los cinco schemas y la identidad de actor validan.
- **T3.2.1.3:** Preservar bytes V1 y dejar auditoría por digest con campos §15.3 completos. → Los contratos aceptados no derivan y la auditoría queda completa.
  - [ ] Los bytes V1 permanecen idénticos y las pruebas focalizadas pasan.

#### M3.2.2 — Policy/Jornada
Rutas históricas (evidencia): main-store/store.mjs, policy/jornada.mjs, test/main-store.test.mjs, test/policy/jornada.test.mjs

- **T3.2.2.1:** Agregar RED para Jornada inactiva y vencida, autorización expirada, techo resuelto, denegación, expansión, excepción y acciones irreversibles. → Los límites temporales y de elegibilidad fallan antes de implementar.
  - [ ] Los casos RED cubren expiración
  - [ ] límites y acciones irreversibles.
- **T3.2.2.2:** Implementar policy/jornada.mjs sobre main-store/store.mjs con elegibilidad únicamente. → Policy decide si algo puede ocurrir sin asignar ni despachar.
  - [ ] La implementación no crea ruteo ni assignments.
- **T3.2.2.3:** Preservar Policy Reports V1 legibles junto a policy-report-v2. → La compatibilidad de reportes se mantiene.
  - [ ] Las pruebas focalizadas de policy pasan.

#### M3.2.3 — Delivery-policy resolution
Rutas históricas (evidencia): policy/delivery-policy.mjs, schemas/delivery-policy-v1.schema.json, test/policy/delivery-policy.test.mjs

- **T3.2.3.1:** Probar fuentes ausentes, no parseables, desconocidas, no ligadas, symlink, escape y raíz ajena con resolución restrictiva y CT&#95;POLICY&#95;UNRESOLVED. → Toda política no resuelta falla cerrada con motivo nombrado.
  - [ ] Cada variante alcanza el valor más restrictivo.
- **T3.2.3.2:** Probar que ninguna política ni excepción alcanza los cinco floors y nombrar el floor rechazado. → Los floors permanecen fuera de configuración y excepciones.
  - [ ] Los cinco casos de floor fallan cerrado.
- **T3.2.3.3:** Implementar delivery-policy-v1 y lectura por digest desde la raíz canónica con binding de revisión. → La política se resuelve desde una fuente canónica ligada.
  - [ ] Schema
  - [ ] digest y binding validan sin candidate&#95;revision adelantada.
- **T3.2.3.4:** Preservar que un repositorio sin el bloque se comporte exactamente como antes. → La compatibilidad por ausencia permanece inalterada.
  - [ ] Las pruebas focalizadas de delivery-policy pasan.

### S3.3 — Agent Capability Registry
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Capacidades, Contratos, cimientos.
- Depende de: S3.2
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Una capability se resuelve por rol y proyecto sin cruzar entradas entre proyectos.
  - [ ] Una entrada vencida no resuelve y el rechazo es explícito.
  - [ ] Binding de Jornada ausente, revisión distinta o reloj pasado expires&#95;at falla cerrado.
  - [ ] CAS R1 a R2 invalida todos los bindings de R1.
  - [ ] registry&#95;entry&#95;revision inicia en 1 y sólo sube cuando cambia el contenido canonicalizado.
  - [ ] Un agente no puede registrarse a sí mismo.
  - [ ] Drift entre schema declarado e invocado falla cerrado.
  - [ ] Escritura sin capability de Main asertada falla cerrado.
  - [ ] Symlink, modos inseguros, dueño ajeno, lock ocupado y revisión stale se rechazan igual que en registry/store.mjs.
  - [ ] El registry no crea, valida ni consume autoridad ni habilita Support a Worker.
  - [ ] agent-capability-registry-v1 está registrado y tiene fixture.
  - [ ] bun test test/capabilities test/contracts test/registry pasa completo.
  - [ ] bun test no introduce fallos nuevos sobre S3.2 con Torre desarmada.
  - [ ] El diff no toca Prohibido.

#### M3.3.1 — Registry
Rutas históricas (evidencia): capabilities/registry.mjs, schemas/agent-capability-registry-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/capabilities/registry.test.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T3.3.1.1:** Probar rol/proyecto, expiración/schema, R1 a R2, auto-registro y paridad de escritura atómica. → Los límites del registry fallan antes de implementar.
  - [ ] Todos los casos RED aprobados quedan cubiertos.
- **T3.3.1.2:** Implementar schema, registro, invariantes y capabilities/registry.mjs con CAS propio y autoridad Main asertada. → El registry versionado y acotado por proyecto pasa GREEN.
  - [ ] Resolución
  - [ ] CAS y validación pasan.
- **T3.3.1.3:** Eliminar autoridad sombra y visibilidad todos-contra-todos, documentando la paridad atómica. → El límite de visibilidad sin autoridad queda preservado.
  - [ ] Suites focalizadas pasan sin tocar Prohibido.

### S3.4 — Persistencia y ciclo de vida de Jornada
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Enrolamiento, Jornada.
- Depende de: S3.2, S3.3
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Una Jornada persiste validando jornada-v1 y falla cerrado si no lo satisface.
  - [ ] Una escritura por un actor que no es Main falla cerrada.
  - [ ] Una escritura sobre un proyecto ajeno falla cerrada.
  - [ ] REJECTED, EXPIRED, REVOKED y COMPLETED son irreversibles.
  - [ ] Toda transición incrementa jornada&#95;revision.
  - [ ] Una lectura pasada expires&#95;at reporta vencida sin transición previa.
  - [ ] Una capability ligada a una Jornada terminada deja de resolver.
  - [ ] No queda una lista manual de campos junto al schema.
  - [ ] bun test test/jornada test/main-store.test.mjs test/capabilities pasa completo.
  - [ ] bun test no introduce fallos nuevos sobre S3.3 con Torre desarmada.
  - [ ] El diff no toca Prohibido.

#### M3.4.1 — Jornada store
Rutas históricas (evidencia): main-store/store.mjs, test/main-store.test.mjs

- **T3.4.1.1:** Probar persistencia válida/inválida, actor Main, proyecto y CAS stale. → Los límites del store fallan antes de implementar.
  - [ ] Validación
  - [ ] autoridad
  - [ ] proyecto y CAS quedan cubiertos.
- **T3.4.1.2:** Agregar createJornada, readJornada y transitionJornada reusando commit, assertMain y schema. → Jornada persiste sin una segunda ruta de escritura.
  - [ ] Las operaciones pasan GREEN bajo autoridad Main.
- **T3.4.1.3:** Confirmar que no existe lista manual de campos junto al schema. → Store y schema no pueden derivar silenciosamente.
  - [ ] La suite main-store pasa.

#### M3.4.2 — Ciclo de vida
Rutas históricas (evidencia): jornada/lifecycle.mjs, test/jornada/lifecycle.test.mjs

- **T3.4.2.1:** Probar transiciones, terminalidad, revisión, expiración por reloj e invalidación pasiva. → El ciclo de vida queda falsificado antes de implementar.
  - [ ] Todos los límites de lifecycle quedan cubiertos.
- **T3.4.2.2:** Implementar la máquina y el incremento de revisión sobre el store. → Las transiciones legales pasan GREEN.
  - [ ] Terminalidad y revisión se preservan.
- **T3.4.2.3:** Unificar vencimiento por reloj y transición sin mutar capabilities. → Ambos caminos fallan cerrado por la misma semántica.
  - [ ] Suites focalizadas pasan y la invalidación permanece pasiva.

### S4.1 — Change E single-host candidate fence
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts.
- Depende de: S3.1, S3.2, S5.1
- Cimientos: —
- Recursos: línea exclusiva y journal owner-only propio por host
- Criterios de aceptación:
  - [ ] Un host sin prueba canónica positiva del anterior no se admite; silencio, ausencia o ambigüedad nunca cuentan como proof.
  - [ ] El caller operacional pasa sólo terminationProofRef o maintainerDecisionRef; proof envelopes, autoridades y actor: MAINTAINER son rechazados.
  - [ ] Los puertos de proof y decisión se fijan en el constructor y son controlados por composition root/Main; inputs caller-fabricados no pueden sustituirlos.
  - [ ] Project, predecessor, base, runtime, role y assignment coinciden exactamente entre journal, candidate y resultado del puerto, o falla cerrado.
  - [ ] El fence no crea, valida, consume ni delega autoridad.
  - [ ] El host epoch es monótono, nunca se reutiliza, no depende del reloj y dos activaciones distintas jamás comparten epoch.
  - [ ] El estado se deriva de eventos inmutables encadenados por digest; no existe un ledger mutable autoritativo ni migración SQLite.
  - [ ] Gap, duplicate epoch, bytes alterados, digest previo inválido o vista retrocedida fallan cerrado; una vista a prefijo nunca habilita epoch reuse.
  - [ ] La publicación final es no-replace/O&#95;EXCL equivalente y un evento publicado nunca se borra como rollback.
  - [ ] La toma forzada sólo ocurre con decisión humana autorizada por puerto; avanza epoch y expone TAKEOVER&#95;FORCED.
  - [ ] El trabajo desalojado queda FROZEN en el mismo evento y ninguna ruta lo adopta o descarta automáticamente.
  - [ ] Una base que arrastra trabajo congelado sin resolver se rechaza.
  - [ ] El path del trusted root no contiene componentes symlink; root y directorios descendientes verifican owner/mode; event y lock se abren con O&#95;NOFOLLOW, se validan por fstat y exigen nlink === 1.
  - [ ] El lock owner-only serializa dos procesos reales; hay un único winner y ningún lock/residuo/descriptores abiertos al terminar.
  - [ ] Todo rechazo pre-publicación deja cero mutación durable y conserva bytes existentes.
  - [ ] Todo fallo ambiguo post-create devuelve CT&#95;FENCE&#95;DURABILITY&#95;UNKNOWN, no borra el epoch y obliga readback sin retry automático.
  - [ ] Los tests de persistencia ejecutan success, rechazo, concurrencia, cleanup y cada failpoint declarado.
  - [ ] bun test test/hosts pasó 16/16 y bun test pasó 553/553 (553 pass / 0 fail; 3196 expectations, 35 files) sobre la base integrada.
  - [ ] La corrección final se conservó sin amend durante el rebase autorizado: 03ecb5d (predecesor) y 1f5fea7 (candidato de implementación verificado). El diff toca sólo Área y ninguna ruta de Prohibido.

#### M4.1.1 — Fence
Rutas históricas (evidencia): hosts/candidate-fence.mjs, test/hosts/candidate-fence.test.mjs

- **T4.1.1.1:** RED: demostrar que fallan los ataques de procedencia y autoridad fabricadas, rollback de vista a prefijo, gap/duplicate/tampering, ancestros symlink, event/lock symlink o hardlink, owner/mode inseguros, writers multiproceso, timeout y fallos de persistencia antes/después de publish. Los tests quedaron rojos contra 25b8617 por la razón esperada. → RED: demostrar que fallan los ataques de procedencia y autoridad fabricadas, rollback de vista a prefijo, gap/duplicate/tampering, ancestros symlink, event/lock symlink o hardlink, owner/mode inseguros, writers multiproceso, timeout y fallos de persistencia antes/después de publish. Los tests quedaron rojos contra 25b8617 por la razón esperada.
  - [ ] RED: demostrar que fallan los ataques de procedencia y autoridad fabricadas, rollback de vista a prefijo, gap/duplicate/tampering, ancestros symlink, event/lock symlink o hardlink, owner/mode inseguros, writers multiproceso, timeout y fallos de persistencia antes/después de publish. Los tests quedaron rojos contra 25b8617 por la razón esperada.
- **T4.1.1.2:** GREEN: reemplazar inputs proof/actor por refs más puertos constructor-owned; verificar bindings exactos; sustituir el ledger mutable por eventos per-epoch encadenados por digest y publicados no-replace; preservar takeover humano, freeze y base rejection en el mismo evento. → GREEN: reemplazar inputs proof/actor por refs más puertos constructor-owned; verificar bindings exactos; sustituir el ledger mutable por eventos per-epoch encadenados por digest y publicados no-replace; preservar takeover humano, freeze y base rejection en el mismo evento.
  - [ ] GREEN: reemplazar inputs proof/actor por refs más puertos constructor-owned; verificar bindings exactos; sustituir el ledger mutable por eventos per-epoch encadenados por digest y publicados no-replace; preservar takeover humano, freeze y base rejection en el mismo evento.
- **T4.1.1.3:** REFACTOR: preservar errores tipados, garantizar cero mutación durable antes de publish, prohibir rollback que borre un epoch publicado y exigir readback tras DURABILITY&#95;UNKNOWN; ejecutar evidencia de todas las ramas y cleanup. bun test test/hosts y luego bun test pasaron una vez post-GREEN. → REFACTOR: preservar errores tipados, garantizar cero mutación durable antes de publish, prohibir rollback que borre un epoch publicado y exigir readback tras DURABILITY&#95;UNKNOWN; ejecutar evidencia de todas las ramas y cleanup. bun test test/hosts y luego bun test pasaron una vez post-GREEN.
  - [ ] REFACTOR: preservar errores tipados, garantizar cero mutación durable antes de publish, prohibir rollback que borre un epoch publicado y exigir readback tras DURABILITY&#95;UNKNOWN; ejecutar evidencia de todas las ramas y cleanup. bun test test/hosts y luego bun test pasaron una vez post-GREEN.

### S4.2 — Lanzamiento visible de raíz OpenCode
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, Instalación, cimientos.
- Depende de: S4.1, S1.16
- Cimientos: —
- Recursos: panel Herdr interno y una línea OpenCode por project&#95;id
- Criterios de aceptación:
  - [ ] Main consume una binding canónica y crea un panel Herdr con una raíz OpenCode nueva en el worktree asignado.
  - [ ] La raíz usa gentle-orchestrator, recibe el brief aprobado y expone custodia exacta de pane, terminal y session&#95;id.
  - [ ] Un subagente nativo no puede reemplazar, reutilizar ni modificar el panel, identidad o estado de la raíz; el bootstrap plugin fue removido.
  - [ ] Binding/epoch/runtime inválidos, respuestas Herdr ambiguas o ajenas, IDs option-shaped y session&#95;id fuera de ^ses&#95;&#91;A-Za-z0-9&#93;{26}$ fallan cerrado.
  - [ ] El composition root productivo liga una vez los puertos de S4.1; provider ausente, inválido o sustituible falla antes de lanzar o mutar journal.
  - [ ] Installer/payload fijan Herdr 0.8.0 y OpenCode por identidad/hash/stat; el preflight Linux/WSL ejecuta descriptores /proc/self/fd/3 con ambiente, tiempo y salida acotados, sin exigir contract agent-root-observation.
  - [ ] El candidato y sus pruebas tocan sólo Área; S4.3 y S4.4 conservan sus paths y comportamiento.

#### M4.2.1 — Lanzador raíz OpenCode
Rutas históricas (evidencia): hosts/launcher.mjs, hosts/opencode-launcher.mjs, test/hosts/launcher.test.mjs, test/hosts/opencode-launcher.test.mjs

- **T4.2.1.1:** RED: se demostró que brief no aprobado, worktree distinto, assignment-location inválido o epoch no vigente no inician una sesión. → RED: se demostró que brief no aprobado, worktree distinto, assignment-location inválido o epoch no vigente no inician una sesión.
  - [ ] RED: se demostró que brief no aprobado, worktree distinto, assignment-location inválido o epoch no vigente no inician una sesión.
- **T4.2.1.2:** GREEN: la sesión raíz OpenCode queda ligada al brief, worktree, assignment y host epoch canónicos. → GREEN: la sesión raíz OpenCode queda ligada al brief, worktree, assignment y host epoch canónicos.
  - [ ] GREEN: la sesión raíz OpenCode queda ligada al brief, worktree, assignment y host epoch canónicos.
- **T4.2.1.3:** REFACTOR: se normalizó evidencia de creación y rechazos sin que inputs del launcher otorguen autoridad. → REFACTOR: se normalizó evidencia de creación y rechazos sin que inputs del launcher otorguen autoridad.
  - [ ] REFACTOR: se normalizó evidencia de creación y rechazos sin que inputs del launcher otorguen autoridad.

#### M4.2.2 — Custodia visible Herdr
Rutas históricas (evidencia): hosts/herdr.mjs, test/hosts/herdr.test.mjs

- **T4.2.2.1:** RED: se demostró rechazo de pane, terminal, cwd, agente o sesión incorrectos, ambiguos y option-shaped. → RED: se demostró rechazo de pane, terminal, cwd, agente o sesión incorrectos, ambiguos y option-shaped.
  - [ ] RED: se demostró rechazo de pane, terminal, cwd, agente o sesión incorrectos, ambiguos y option-shaped.
- **T4.2.2.2:** GREEN: se proyectó sólo la custodia 0.8 validada de la raíz recién lanzada. → GREEN: se proyectó sólo la custodia 0.8 validada de la raíz recién lanzada.
  - [ ] GREEN: se proyectó sólo la custodia 0.8 validada de la raíz recién lanzada.
- **T4.2.2.3:** REFACTOR: se normalizó una observación interna exacta sin atribuir lineage, liveness o recuperación a S4.2. → REFACTOR: se normalizó una observación interna exacta sin atribuir lineage, liveness o recuperación a S4.2.
  - [ ] REFACTOR: se normalizó una observación interna exacta sin atribuir lineage, liveness o recuperación a S4.2.

#### M4.2.3 — Cableado productivo del fence
Rutas históricas (evidencia): hosts/production-provider.mjs, install/lifecycle.mjs, test/hosts/production-provider.test.mjs, test/install/lifecycle.test.mjs, test/install/launch-worker-cli.test.mjs, plugin/tower-spike.js, .opencode/plugins/tower-spike.js, test/plugin/tower-spike.test.mjs

- **T4.2.3.1:** RED: Herdr 0.8 sin comando v1 y session&#95;id no canónico reprodujeron el rechazo o la aceptación insegura exactos. → RED: Herdr 0.8 sin comando v1 y session&#95;id no canónico reprodujeron el rechazo o la aceptación insegura exactos.
  - [ ] RED: Herdr 0.8 sin comando v1 y session&#95;id no canónico reprodujeron el rechazo o la aceptación insegura exactos.
- **T4.2.3.2:** GREEN: Main conserva binding/provider empaquetados y valida versión más respuestas agent&#95;started/agent&#95;info antes de proyectar. → GREEN: Main conserva binding/provider empaquetados y valida versión más respuestas agent&#95;started/agent&#95;info antes de proyectar.
  - [ ] GREEN: Main conserva binding/provider empaquetados y valida versión más respuestas agent&#95;started/agent&#95;info antes de proyectar.
- **T4.2.3.3:** REFACTOR: registros nuevos declaran compatibilidad 0.8, los v1 legados siguen fail-closed y no existe segunda ruta de wiring. → REFACTOR: registros nuevos declaran compatibilidad 0.8, los v1 legados siguen fail-closed y no existe segunda ruta de wiring.
  - [ ] REFACTOR: registros nuevos declaran compatibilidad 0.8, los v1 legados siguen fail-closed y no existe segunda ruta de wiring.

### S4.5 — Raíz primaria Main-owned con vista adjunta
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Enrolamiento, Hosts, Instalación.
- Depende de: S4.2
- Cimientos: —
- Recursos: namespace owner-only de backend, proceso, puerto loopback, secreto y binding de raíz por worktree asignado, vista TUI local
- Criterios de aceptación:
  - [ ] Main persiste exactamente una raíz primaria gentle-orchestrator por assignment/worktree, ligada a backend, proceso, sesión y epoch exactos.
  - [ ] Cada worktree asignado usa un backend Main-owned aislado con proceso, puerto loopback, secreto, root binding y evidencia propios; ninguna identidad se comparte entre worktrees.
  - [ ] Hijos nativos allowlisted conservan delegación pero ningún child ID reemplaza el root binding.
  - [ ] Main abre automáticamente, después de crear backend/raíz, un pane Herdr que ejecuta opencode attach sobre el root ID exacto.
  - [ ] Steering TUI no autoriza despacho, entrega, seguridad, identidad ni transición Main; el pane no es la raíz e Intercom no es transporte.
  - [ ] Cerrar/fallar Herdr o la TUI no detiene, reemplaza ni invalida backend, raíz o epoch.
  - [ ] El operador siempre puede adjuntar manualmente opencode attach al root exacto cuando falla el launcher visible.
  - [ ] Herdr no integra el launch de backend/root ni health, stop, rehidratación o recovery críticos; el launcher directo Main-owned queda diferido como reemplazo compatible.
  - [ ] Binding ausente/ambiguo/ajeno falla cerrado y el diff no toca paths fuera del Área, ampliada exclusivamente por la decisión 42 a los dos fixtures de payload/runtime instalado.

#### M4.5.1 — Binding durable de raíz primaria
Rutas históricas (evidencia): hosts/root-binding.mjs, hosts/root-identity.mjs, test/hosts/root-binding.test.mjs, test/hosts/root-identity.test.mjs

- **T4.5.1.1:** RED: rechazar binding ambiguo/ajeno, rol no primary y child ID como raíz. → RED: rechazar binding ambiguo/ajeno, rol no primary y child ID como raíz.
  - [ ] RED: rechazar binding ambiguo/ajeno, rol no primary y child ID como raíz.
- **T4.5.1.2:** GREEN: persistir/readback exacto de assignment, worktree, backend, proceso, root session, agente y epoch. → GREEN: persistir/readback exacto de assignment, worktree, backend, proceso, root session, agente y epoch.
  - [ ] GREEN: persistir/readback exacto de assignment, worktree, backend, proceso, root session, agente y epoch.
- **T4.5.1.3:** REFACTOR: aislar validación primary/child y cleanup owner-only sin autoridad caller. → REFACTOR: aislar validación primary/child y cleanup owner-only sin autoridad caller.
  - [ ] REFACTOR: aislar validación primary/child y cleanup owner-only sin autoridad caller.

#### M4.5.2 — Backend OpenCode Main-owned por worktree
Rutas históricas (evidencia): hosts/opencode-server.mjs, hosts/production-provider.mjs, main-store/launch-consumer.mjs, test/hosts/opencode-server.test.mjs, test/hosts/production-provider.test.mjs

- **T4.5.2.1:** RED: rechazar proceso, puerto, secreto o root binding compartidos/ajenos y probar que la muerte de una vista no mata el backend. → RED: rechazar proceso, puerto, secreto o root binding compartidos/ajenos y probar que la muerte de una vista no mata el backend.
  - [ ] RED: rechazar proceso, puerto, secreto o root binding compartidos/ajenos y probar que la muerte de una vista no mata el backend.
- **T4.5.2.2:** GREEN: lanzar desde Main un backend por worktree con loopback, secreto, evidencia y raíz primary exactos. → GREEN: lanzar desde Main un backend por worktree con loopback, secreto, evidencia y raíz primary exactos.
  - [ ] GREEN: lanzar desde Main un backend por worktree con loopback, secreto, evidencia y raíz primary exactos.
- **T4.5.2.3:** REFACTOR: aislar lifecycle/cleanup por worktree y separar backend/root de cualquier launcher visible. → REFACTOR: aislar lifecycle/cleanup por worktree y separar backend/root de cualquier launcher visible.
  - [ ] REFACTOR: aislar lifecycle/cleanup por worktree y separar backend/root de cualquier launcher visible.

#### M4.5.3 — Herdr temporal como vista TUI no autoritativa
Rutas históricas (evidencia): hosts/opencode-view.mjs, hosts/herdr.mjs, install/lifecycle.mjs, install/runtime-payload.mjs, test/hosts/opencode-view.test.mjs, test/hosts/herdr.test.mjs, test/install/lifecycle.test.mjs, test/install/runtime-payload.test.mjs

- **T4.5.3.1:** RED: rechazar pane/root ajeno, autoridad desde view o Intercom, lifecycle acoplado y ausencia de fallback manual. → RED: rechazar pane/root ajeno, autoridad desde view o Intercom, lifecycle acoplado y ausencia de fallback manual.
  - [ ] RED: rechazar pane/root ajeno, autoridad desde view o Intercom, lifecycle acoplado y ausencia de fallback manual.
- **T4.5.3.2:** GREEN: tras backend/root Main-owned, abrir Herdr con opencode attach al root exacto y exponer el comando manual equivalente. → GREEN: tras backend/root Main-owned, abrir Herdr con opencode attach al root exacto y exponer el comando manual equivalente.
  - [ ] GREEN: tras backend/root Main-owned, abrir Herdr con opencode attach al root exacto y exponer el comando manual equivalente.
- **T4.5.3.3:** REFACTOR: aislar el adapter Herdr reemplazable fuera de launch/health/stop/rehidratación/recovery críticos. → REFACTOR: aislar el adapter Herdr reemplazable fuera de launch/health/stop/rehidratación/recovery críticos.
  - [ ] REFACTOR: aislar el adapter Herdr reemplazable fuera de launch/health/stop/rehidratación/recovery críticos.

### S4.3 — Inspección, liveness y rehidratación segura
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Hosts.
- Depende de: S4.5
- Cimientos: —
- Recursos: evidencia backend/proceso/root-session; sin DB, migraciones ni token de entrega
- Criterios de aceptación:
  - [ ] inspect, health y heartbeat observan sólo backend, proceso y raíz ligados al assignment vigente
  - [ ] Los umbrales SUSPECTED/UNAVAILABLE y stop proof canónico pasan con bindings exactos
  - [ ] Rehidratación restaura una proyección, nunca crea/reemplaza raíz ni depende de pane/TUI/Herdr
  - [ ] Vista ausente no cambia health y el diff queda dentro del Área ampliada por la decisión 43

#### M4.3.1 — Inspección y liveness
Rutas históricas (evidencia): hosts/inspect.mjs, hosts/health.mjs, test/hosts/inspect.test.mjs, test/hosts/health.test.mjs

- **T4.3.1.1:** RED: cubrir backend/proceso/root/assignment ajenos y ambos umbrales → RED: cubrir backend/proceso/root/assignment ajenos y ambos umbrales
  - [ ] RED: cubrir backend/proceso/root/assignment ajenos y ambos umbrales
- **T4.3.1.2:** GREEN: clasificar desde proceso y root-session validados → GREEN: clasificar desde proceso y root-session validados
  - [ ] GREEN: clasificar desde proceso y root-session validados
- **T4.3.1.3:** REFACTOR: consolidar heartbeat y errores ambiguos sin observar la vista → REFACTOR: consolidar heartbeat y errores ambiguos sin observar la vista
  - [ ] REFACTOR: consolidar heartbeat y errores ambiguos sin observar la vista

#### M4.3.2 — Stop proof y rehidratación
Rutas históricas (evidencia): hosts/stop-proof.mjs, hosts/rehydration.mjs, test/hosts/stop-proof.test.mjs, test/hosts/rehydration.test.mjs, schemas/recovery-proof-v1.schema.json, test/contracts/s3-2-schemas.test.mjs, test/hosts/candidate-fence.test.mjs

- **T4.3.2.1:** RED: cubrir proof ausente/ambiguo y backend/root/epoch distintos → RED: cubrir proof ausente/ambiguo y backend/root/epoch distintos
  - [ ] RED: cubrir proof ausente/ambiguo y backend/root/epoch distintos
- **T4.3.2.2:** GREEN: ligar stop proof y rehidratar sólo la proyección exacta → GREEN: ligar stop proof y rehidratar sólo la proyección exacta
  - [ ] GREEN: ligar stop proof y rehidratar sólo la proyección exacta
- **T4.3.2.3:** REFACTOR: preservar readback/cleanup sin crear autoridad ni raíz → REFACTOR: preservar readback/cleanup sin crear autoridad ni raíz
  - [ ] REFACTOR: preservar readback/cleanup sin crear autoridad ni raíz

### S4.6 — Herdr deja de ser prerrequisito bloqueante de la instalación y deja de participar del camino crítico de lanzamiento; sobrevive únicamente como launcher reemplazable del panel de vista, que ya degrada solo
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, Instalación, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: contrato RUNTIME&#95;PAYLOAD&#95;FILES; sin DB ni migraciones
- Criterios de aceptación:
  - [ ] Una instalación con Herdr ausente, o con una versión distinta de 0.8.0, completa y deja la vista pública sólo DEGRADED, sin comando, helper, credencial, secreto ni instrucción manual; la falla interna de la vista opcional conserva disponible la ruta autenticada de attach
  - [ ] El adaptador de custodia de S4.2 no existe en el árbol, y ninguna ruta puede emitir CT&#95;LAUNCH&#95;REJECTED por custodia de Herdr
  - [ ] HERDR&#95;RUNTIME deja de declarar capacidades que el producto no usa
  - [ ] El fijado por bytes de OpenCode permanece intacto y verificado por su test
  - [ ] RUNTIME&#95;PAYLOAD&#95;FILES queda consistente: ningún miembro sin llamador
  - [ ] bun test no introduce fallos nuevos; el diff no toca el Prohibido

#### M4.6.1 — Retiro del adaptador legacy
Rutas históricas (evidencia): hosts/herdr.mjs, hosts/production-provider.mjs, install/runtime-payload.mjs, test/hosts/herdr.test.mjs, test/hosts/production-provider.test.mjs, test/install/launch-worker-cli.test.mjs, test/install/runtime-payload.test.mjs

- **T4.6.1.1:** RED: probar que la custodia legacy todavía se construye o exporta → RED: probar que la custodia legacy todavía se construye o exporta
  - [ ] RED: probar que la custodia legacy todavía se construye o exporta
- **T4.6.1.2:** GREEN: retirar la custodia legacy del provider → GREEN: retirar la custodia legacy del provider
  - [ ] GREEN: retirar la custodia legacy del provider
- **T4.6.1.3:** REFACTOR: retirar hosts/herdr.mjs sólo si queda sin caller y reconciliar tests/payload → REFACTOR: retirar hosts/herdr.mjs sólo si queda sin caller y reconciliar tests/payload
  - [ ] REFACTOR: retirar hosts/herdr.mjs sólo si queda sin caller y reconciliar tests/payload

#### M4.6.2 — Instalación opcional de Herdr
Rutas históricas (evidencia): install/lifecycle.mjs, test/install/lifecycle.test.mjs

- **T4.6.2.1:** RED: probar que Herdr ausente o distinto de 0.8.0 bloquea hoy, mientras el pin OpenCode pasa → RED: probar que Herdr ausente o distinto de 0.8.0 bloquea hoy, mientras el pin OpenCode pasa
  - [ ] RED: probar que Herdr ausente o distinto de 0.8.0 bloquea hoy, mientras el pin OpenCode pasa
- **T4.6.2.2:** GREEN: retirar el chequeo bloqueante y capacidades sin uso → GREEN: retirar el chequeo bloqueante y capacidades sin uso
  - [ ] GREEN: retirar el chequeo bloqueante y capacidades sin uso
- **T4.6.2.3:** REFACTOR: matriz ausente/0.8.0/0.8.2, sin adoptar 0.8.2 → REFACTOR: matriz ausente/0.8.0/0.8.2, sin adoptar 0.8.2
  - [ ] REFACTOR: matriz ausente/0.8.0/0.8.2, sin adoptar 0.8.2

### S4.7 — La raíz Main-owned exacta admite los bytes exactos del brief antes de éxito; la vista pública actual permanece DEGRADED con una envolvente mínima no ejecutable y el helper autenticado permanece privado
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts, Instalación, cimientos.
- Depende de: S4.5
- Cimientos: —
- Recursos: namespace efímero owner-only por backend para credencial/ref/proof, proceso, puerto loopback, root y pane exactos del worktree; sin DB, migraciones ni token de entrega
- Criterios de aceptación:
  - [ ] root&#95;session&#95;id y bytes del brief exactos quedan admitidos; 4xx/5xx/timeout/envelope ambiguo o root/brief distinto fallan cerrado
  - [ ] Éxito no espera completion, output ni primer token del modelo
  - [ ] Ningún secreto aparece en argv, comando de proceso, log, JSON, mensaje, fallback, binding, copy/paste ni fuera del namespace owner-only
  - [ ] La vista pública actual permanece siempre DEGRADED; no existe branch ATTACHED, ack del caller ni composición pane/auth/liveness como prueba
  - [ ] La respuesta pública agrega sólo view: { status: "DEGRADED", code: "CT&#95;VIEW&#95;UNVERIFIED", retryable: true }, preserva backend/root y no publica el helper
  - [ ] El helper prueba conexión, rechaza ref stale/foreign/replay y revoca al detener
  - [ ] OpenCode/package/lock permanecen sin cambios; focused y suite completa pasan sobre baseline reconciliada

#### M4.7.1 — Admisión del brief
Rutas históricas (evidencia): hosts/launch-worker.mjs, hosts/opencode-server.mjs, hosts/production-provider.mjs, test/hosts/launch-worker.test.mjs, test/hosts/opencode-server.test.mjs, test/hosts/production-provider.test.mjs, test/install/launch-worker-cli.test.mjs

- **T4.7.1.1:** RED: falso éxito, drift, fallas y espera indebida de token → RED: falso éxito, drift, fallas y espera indebida de token
  - [ ] RED: falso éxito, drift, fallas y espera indebida de token
- **T4.7.1.2:** GREEN: transportar brief/ref exactos al owner y admitir asíncronamente → GREEN: transportar brief/ref exactos al owner y admitir asíncronamente
  - [ ] GREEN: transportar brief/ref exactos al owner y admitir asíncronamente
- **T4.7.1.3:** REFACTOR: falla tipada, cleanup, binding/epoch y cero espera de output → REFACTOR: falla tipada, cleanup, binding/epoch y cero espera de output
  - [ ] REFACTOR: falla tipada, cleanup, binding/epoch y cero espera de output

#### M4.7.2 — Canal owner-only y helper seguro
Rutas históricas (evidencia): hosts/launch-worker.mjs, hosts/opencode-attach-helper.mjs, hosts/opencode-credential-channel.mjs, hosts/opencode-server.mjs, hosts/opencode-view.mjs, hosts/production-provider.mjs, install/runtime-payload.mjs, test/hosts/launch-worker.test.mjs, test/hosts/opencode-attach-helper.test.mjs, test/hosts/opencode-credential-channel.test.mjs, test/hosts/opencode-server.test.mjs, test/hosts/opencode-view.test.mjs, test/install/entrypoint-resolution.test.mjs, test/install/launch-worker-cli.test.mjs, test/install/runtime-payload.test.mjs

- **T4.7.2.1:** RED: leakage, cross-worktree, stale/replay, mode, symlink y lifecycle → RED: leakage, cross-worktree, stale/replay, mode, symlink y lifecycle
  - [ ] RED: leakage, cross-worktree, stale/replay, mode, symlink y lifecycle
- **T4.7.2.2:** GREEN: ref opaco por backend; secreto sólo dentro del canal/helper → GREEN: ref opaco por backend; secreto sólo dentro del canal/helper
  - [ ] GREEN: ref opaco por backend; secreto sólo dentro del canal/helper
- **T4.7.2.3:** REFACTOR: cleanup, revocación y helper privado sin autoridad bin/torre → REFACTOR: cleanup, revocación y helper privado sin autoridad bin/torre
  - [ ] REFACTOR: cleanup, revocación y helper privado sin autoridad bin/torre

#### M4.7.3 — Degradación veraz; ATTACHED reservado
Rutas históricas (evidencia): hosts/launch-worker.mjs, test/hosts/launch-worker.test.mjs, test/install/launch-worker-cli.test.mjs

- **T4.7.3.1:** RED: pane o auth fallidos nunca pueden declarar ATTACHED → RED: pane o auth fallidos nunca pueden declarar ATTACHED
  - [ ] RED: pane o auth fallidos nunca pueden declarar ATTACHED
- **T4.7.3.2:** GREEN: producir siempre la envolvente pública DEGRADED mínima; reservar ATTACHED hasta prueba real de S4.8/S4.9 → GREEN: producir siempre la envolvente pública DEGRADED mínima; reservar ATTACHED hasta prueba real de S4.8/S4.9
  - [ ] GREEN: producir siempre la envolvente pública DEGRADED mínima; reservar ATTACHED hasta prueba real de S4.8/S4.9
- **T4.7.3.3:** REFACTOR: helper privado instalado como única ruta, raíz preservada y cero comando inseguro → REFACTOR: helper privado instalado como única ruta, raíz preservada y cero comando inseguro
  - [ ] REFACTOR: helper privado instalado como única ruta, raíz preservada y cero comando inseguro

### S4.9 — Tras S4.6, probar 0.8.2 aislado end-to-end como launcher view-only y adoptar el binario local sólo con verde y rollback probado
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: sin dueño actual.
- Depende de: S4.6, S4.7
- Cimientos: —
- Recursos: HOME/config/panes aislados de 0.8.2 digest-pinned, path global Herdr exclusivo, rollback 0.8.0
- Criterios de aceptación:
  - [ ] 0.8.0 permanece hasta cerrar S4.6 y obtener verde; 0.8.2 se prueba por versión/digest exactos en aislamiento.
  - [ ] Pane split/run/auth proof/close producen IDs JSON y cwd exactos; root/child/restart no crea duplicado standalone.
  - [ ] Toda falla conserva 0.8.0 e identidades; verde permite adopción local reversible sin cambio crítico de fuente.

#### M4.9.1 — Matriz aislada
Rutas históricas (evidencia): scripts/host-compatibility/herdr.mjs, test/compat/herdr-runtime.test.mjs

- **T4.9.1.1:** RED: JSON/pane/auth/readiness/restore/root-child/duplicate fallan visiblemente → RED: JSON/pane/auth/readiness/restore/root-child/duplicate fallan visiblemente
  - [ ] RED: JSON/pane/auth/readiness/restore/root-child/duplicate fallan visiblemente
- **T4.9.1.2:** GREEN: ejecutar 0.8.2 aislado con helper de S4.7 → GREEN: ejecutar 0.8.2 aislado con helper de S4.7
  - [ ] GREEN: ejecutar 0.8.2 aislado con helper de S4.7
- **T4.9.1.3:** REFACTOR: cleanup, evidencia acotada y cero secreto → REFACTOR: cleanup, evidencia acotada y cero secreto
  - [ ] REFACTOR: cleanup, evidencia acotada y cero secreto

#### M4.9.2 — Adopción local reversible
Rutas históricas (evidencia): scripts/host-compatibility/herdr.mjs, test/compat/herdr-runtime.test.mjs

- **T4.9.2.1:** RED: bloquear reemplazo antes de verde y exigir rollback → RED: bloquear reemplazo antes de verde y exigir rollback
  - [ ] RED: bloquear reemplazo antes de verde y exigir rollback
- **T4.9.2.2:** GREEN: adoptar tras verde y verificar path/version/integración → GREEN: adoptar tras verde y verificar path/version/integración
  - [ ] GREEN: adoptar tras verde y verificar path/version/integración
- **T4.9.2.3:** REFACTOR: rollback, readback y cleanup → REFACTOR: rollback, readback y cleanup
  - [ ] REFACTOR: rollback, readback y cleanup

### S4.10 — Identidad, binding y puerto runtime host-neutral
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos.
- Depende de: —
- Cimientos: —
- Recursos: namespace de identidad/binding y reserva de puerto loopback
- Criterios de aceptación:
  - [ ] Identidad, worktree, proceso, binding e incarnation se validan sin vocabulario Pi/OpenCode.
  - [ ] El puerto pertenece al binding exacto.
  - [ ] Colisión, stale o campo extra fallan cerrado.
  - [ ] Ningún cambio de implementación salió de Área.

#### M4.10.1 — Contrato neutral de identidad y binding
Rutas históricas (evidencia): contracts/host-runtime/binding-context.mjs, contracts/host-runtime/identifiers.mjs, contracts/host-runtime/index.mjs, contracts/host-runtime/node-loopback-acquisition.mjs, contracts/host-runtime/ownership-registry.mjs, contracts/host-runtime/schema-registry.mjs, schemas/host-runtime-binding-v1.schema.json, schemas/host-runtime-identity-v1.schema.json, schemas/host-runtime-incarnation-v1.schema.json, schemas/host-runtime-process-v1.schema.json, schemas/host-runtime-worktree-v1.schema.json, test/contracts/host-runtime/loopback.test.mjs, test/contracts/host-runtime/ownership.test.mjs, test/contracts/host-runtime/shapes.test.mjs, test/contracts/schema.test.mjs

- **T4.10.1.1:** RED: cubrir identidad ambigua, puerto ocupado, binding cruzado y replay stale. → RED: cubrir identidad ambigua, puerto ocupado, binding cruzado y replay stale.
  - [ ] RED: cubrir identidad ambigua, puerto ocupado, binding cruzado y replay stale.
- **T4.10.1.2:** GREEN: definir schemas, validación exacta y reserva/release del puerto ligado. → GREEN: definir schemas, validación exacta y reserva/release del puerto ligado.
  - [ ] GREEN: definir schemas, validación exacta y reserva/release del puerto ligado.
- **T4.10.1.3:** REFACTOR: separar contrato neutral de cualquier adapter, ajustar únicamente expect(schemaFiles).toHaveLength(26) a expect(schemaFiles).toHaveLength(31) en el gate manual y verificar frontera de Área. → REFACTOR: separar contrato neutral de cualquier adapter, ajustar únicamente expect(schemaFiles).toHaveLength(26) a expect(schemaFiles).toHaveLength(31) en el gate manual y verificar frontera de Área.
  - [ ] REFACTOR: separar contrato neutral de cualquier adapter, ajustar únicamente expect(schemaFiles).toHaveLength(26) a expect(schemaFiles).toHaveLength(31) en el gate manual y verificar frontera de Área.

### S4.11 — Observe, health, stop y attach host-neutral
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts.
- Depende de: S4.10
- Cimientos: —
- Recursos: binding neutral vigente y prueba producer-owned
- Criterios de aceptación:
  - [ ] Observe, health, stop y attach comparten identidad neutral exacta.
  - [ ] Attach exige challenge fresco y proof producer-owned ligada a operación, binding e incarnation.
  - [ ] Stop separa acknowledgment de estado probado y nunca convierte desconexión en muerte.
  - [ ] El core no importa vocabulario Pi/OpenCode, no implementa política de timeout y el diff queda dentro del Área exacta.

#### M4.11.1 — Operaciones neutrales observables
Rutas históricas (evidencia): hosts/runtime-port.mjs, hosts/runtime-observe.mjs, test/hosts/runtime-port.test.mjs, test/hosts/runtime-observe.test.mjs

- **T4.11.1.1:** RED: probar recibo stale, self-report sin prueba, desconexión y stop ambiguo. → RED: probar recibo stale, self-report sin prueba, desconexión y stop ambiguo.
  - [ ] RED: probar recibo stale, self-report sin prueba, desconexión y stop ambiguo.
- **T4.11.1.2:** GREEN: exponer puertos neutrales con prueba ligada al binding/incarnation. → GREEN: exponer puertos neutrales con prueba ligada al binding/incarnation.
  - [ ] GREEN: exponer puertos neutrales con prueba ligada al binding/incarnation.
- **T4.11.1.3:** REFACTOR: unificar errores y aislar toda semántica de adapter. → REFACTOR: unificar errores y aislar toda semántica de adapter.
  - [ ] REFACTOR: unificar errores y aislar toda semántica de adapter.

### S4.13 — La adquisición neutral valida opcionalmente ownership aún no publicado, conserva compatibilidad cuando no hay hook y garantiza que sólo el registro puede cerrar o cuarentenar la adquisición exacta.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Autoridad, Contratos.
- Depende de: S4.10
- Cimientos: —
- Recursos: registro neutral, reserva unpublished, capacidad privada de close exacta
- Criterios de aceptación:
  - [ ] El orden observable es acquire → validate unpublished → publish; nunca se valida antes de adquirir ni después de publicar.
  - [ ] El hook es opcional y caller-neutral; ausente conserva exactamente la conducta compatible vigente.
  - [ ] El registro retiene privadamente el close exacto; caller, hook y capas posteriores no lo reciben, transfieren ni reconstruyen.
  - [ ] Una validación exitosa publica una sola vez la reserva exacta, sin ownership rival ni efecto host-specific.
  - [ ] Error, rechazo o throw de validación ejecuta el close exacto o registra cuarentena explícita; nunca cleanup best-effort ni inacción.
  - [ ] Tests RED/GREEN y alternos cubren hook ausente, éxito, fallo con exact-close, fallo de close con cuarentena y prohibiciones de orden/exposición.
  - [ ] El diff toca exactamente los cuatro paths de Área, sincroniza la spec canónica y suma 234 líneas authored, siempre ≤400.

#### M4.13.1 — Puerto neutral de validación unpublished
Rutas históricas (evidencia): contracts/host-runtime/ownership-registry.mjs, test/contracts/host-runtime/ownership.test.mjs, test/contracts/host-runtime/loopback.test.mjs, openspec/specs/host-runtime/spec.md

- **T4.13.1.1:** RED: fijar orden acquire/validate/publish, ausencia compatible, no exposición de close, fallo y cuarentena. → RED: fijar orden acquire/validate/publish, ausencia compatible, no exposición de close, fallo y cuarentena.
  - [ ] RED: fijar orden acquire/validate/publish, ausencia compatible, no exposición de close, fallo y cuarentena.
- **T4.13.1.2:** GREEN: agregar el puerto opcional mínimo y retener el close exacto dentro del registro. → GREEN: agregar el puerto opcional mínimo y retener el close exacto dentro del registro.
  - [ ] GREEN: agregar el puerto opcional mínimo y retener el close exacto dentro del registro.
- **T4.13.1.3:** TRIANGULATE/REFACTOR: cubrir alternos negativos, sincronizar la spec y simplificar sin host policy ni paths extra. → TRIANGULATE/REFACTOR: cubrir alternos negativos, sincronizar la spec y simplificar sin host policy ni paths extra.
  - [ ] TRIANGULATE/REFACTOR: cubrir alternos negativos, sincronizar la spec y simplificar sin host policy ni paths extra.

### S4.14 — El registro neutral confirma sincrónicamente la actualidad del ocupante exacto inmediatamente antes de publicar ownership, sin transferir autoridad ni alterar la compatibilidad cuando el guard está ausente.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Autoridad, Contratos.
- Depende de: S4.13
- Cimientos: —
- Recursos: registro neutral, adquisición unpublished exacta
- Criterios de aceptación:
  - [ ] Tras acquire, validateUnpublished async y el safety recheck local, el guard corre inmediatamente antes de publish y en el mismo stack.
  - [ ] El guard recibe metadata neutral exacta y congelada de worktree, proceso e incarnation; no recibe close ni vocabulario de host.
  - [ ] Sólo el booleano primitivo true permite publicar inmediatamente la adquisición exacta.
  - [ ] False, throw, todo no booleano y todo thenable fallan sin await ni asimilación y terminan en exact-close o cuarentena.
  - [ ] Guard ausente conserva compatibilidad; no existe ruta alternativa que omita el recheck local vigente.
  - [ ] Un proceso reemplazado en el mismo worktree no puede publicar ownership del ocupante anterior.
  - [ ] F1 permanece en S9.4; retorna el cierre exacto al registro antes de validateUnpublished; Proxy/accessors hostiles y producer no confiable quedan fuera.
  - [ ] El diff toca exactamente los tres paths del contrato histórico, registra RED/GREEN/alternos y suma 146 líneas authored, dentro del límite duro de 400.

#### M4.14.1 — Guardia sincrónica final-currentness
Rutas históricas (evidencia): contracts/host-runtime/ownership-registry.mjs, test/contracts/host-runtime/ownership.test.mjs, openspec/specs/host-runtime/spec.md

- **T4.14.1.1:** RED: demostrar replaced-process same-seat, false, throw, no booleano y thenable sin publicación. → RED: demostrar replaced-process same-seat, false, throw, no booleano y thenable sin publicación.
  - [ ] RED: demostrar replaced-process same-seat, false, throw, no booleano y thenable sin publicación.
- **T4.14.1.2:** GREEN: invocar validateCurrentBeforePublish opcional sobre metadata neutral exacta y congelada, sólo tras el recheck local. → GREEN: invocar validateCurrentBeforePublish opcional sobre metadata neutral exacta y congelada, sólo tras el recheck local.
  - [ ] GREEN: invocar validateCurrentBeforePublish opcional sobre metadata neutral exacta y congelada, sólo tras el recheck local.
- **T4.14.1.3:** TRIANGULATE: cubrir guard ausente, true primitivo, no-await/no-assimilation y exact-close/cuarentena. → TRIANGULATE: cubrir guard ausente, true primitivo, no-await/no-assimilation y exact-close/cuarentena.
  - [ ] TRIANGULATE: cubrir guard ausente, true primitivo, no-await/no-assimilation y exact-close/cuarentena.
- **T4.14.1.4:** REFACTOR: sincronizar la spec y simplificar sin exposición de cierre, vocabulario de host ni paths extra. → REFACTOR: sincronizar la spec y simplificar sin exposición de cierre, vocabulario de host ni paths extra.
  - [ ] REFACTOR: sincronizar la spec y simplificar sin exposición de cierre, vocabulario de host ni paths extra.

### S5.1 — Un candidato congelado liga identidad y autorización inmutables, deriva el siguiente Módulo sólo desde evidencia del ledger y mantiene a Support aislado bajo autoridad exclusiva de Main.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Enrolamiento, Entrega, Hosts, cimientos.
- Depende de: S3.2, S3.3, S3.4
- Cimientos: —
- Recursos: Main, authorization store con CAS de filesystem
- Criterios de aceptación:
  - [ ] Dos contenidos distintos nunca resuelven a la misma candidate&#95;revision.
  - [ ] Un candidato cuya identidad cambió no se consume bajo la autorización previa.
  - [ ] Una operación repetida sobre el mismo candidato no produce un segundo efecto remoto.
  - [ ] El authorization store valida contra authorization-v1 y no contra una lista de campos escrita a mano.
  - [ ] Una autorización consumida más de una hora después de emitida se rechaza.
  - [ ] Todo efecto irreversible exige Jornada ACTIVE y jornada&#95;revision actual, y falla cerrado ante Jornada terminal, revisión desactualizada o Jornada ausente.
  - [ ] Una autorización emitida bajo una jornada&#95;revision anterior no se consume después de una transición de Jornada.
  - [ ] Terminar una Jornada no revoca activamente capabilities ni autorizaciones.
  - [ ] Ninguna ruta crea garbage collector ni poda capabilities discontinuadas.
  - [ ] Una capability equivalente se reemplaza por agent&#95;role más capability, sin acuñar un ID nuevo.
  - [ ] La derivación no avanza con memoria narrativa; sin cumplimiento en el ledger no hay avance.
  - [ ] Un claim del Worker en desacuerdo produce CT&#95;CLAIM&#95;MISMATCH, sin assignment y nombrando ambos valores.
  - [ ] Un claim coincidente registra evidencia y no otorga privilegios.
  - [ ] Support no figura en board ni locks y ninguna transferencia de lock puede nombrarlo.
  - [ ] Un host sin subagente aislado rechaza la continuación con CT&#95;HOST&#95;CAPABILITY&#95;MISSING, sin sustituto en línea.
  - [ ] plugin/tower-spike.js es el único composition root que prueba autoridad de Main y recibe trustedBindingProvider por inyección antes de spawn o persistencia.
  - [ ] Un context.sessionID distinto del Main ligado se rechaza y el rechazo nombra la sesión.
  - [ ] Binding ausente, inválido o de otra sesión falla cerrado antes de spawn o persistencia.
  - [ ] Store o capability simulados fuera de la verificación se rechazan; ambos se obtienen sólo tras verificar el binding.
  - [ ] Support no recibe main&#95;store, capability ni autoridad y su respuesta se valida contra support-proposal-v1 antes de persistirse.
  - [ ] Correr Support no muta board, locks, Worker ni registry, tanto en éxito como en rechazo.
  - [ ] La autoridad no se deriva del capability registry.
  - [ ] core.mjs queda opaco al plan; las coordenadas sólo se resuelven en registros propiedad de Main.
  - [ ] candidate-revision-v1 está registrado y tiene fixture de contrato.
  - [ ] Los tests enfocados de continuation, main-store y contracts pasan completos.
  - [ ] La suite completa no introduce fallos sobre la línea base de S3.4.
  - [ ] El diff histórico no toca ninguna ruta prohibida por S5.1.

#### M5.1.1 — Candidate revision y authorization store ligados a identidad congelada
Rutas históricas (evidencia): contracts/candidate-revision.mjs, contracts/schema-registry.mjs, contracts/validate.mjs, schemas/candidate-revision-v1.schema.json, main-store/store.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json, test/main-store.test.mjs

- **T5.1.1.1:** RED: verificar commit y árbol final, freeze de identidad y host&#95;epoch, separación del ledger, invalidación, sucesor e idempotencia. → RED: contratos de identidad, invalidación e idempotencia fijados antes de implementar.
  - [ ] Dos contenidos distintos no comparten candidate&#95;revision y repetir un candidato no duplica efectos.
- **T5.1.1.2:** GREEN: implementar candidate-revision-v1, su contrato, registro, invariantes y fixture, respetando la frontera del ledger. → GREEN: candidate&#95;revision queda validado y registrado por una sola ruta contractual.
  - [ ] Schema, registro, validación y fixture representan el contrato congelado.
- **T5.1.1.3:** REFACTOR: unificar digests de identidad y evidencia y ejecutar tests de contracts y main-store. → REFACTOR: identidad y evidencia no pueden divergir por caminos duplicados.
  - [ ] Los tests enfocados pasan tras unificar el digest.

#### M5.1.2 — Derivación del siguiente Módulo y claim del Worker desde evidencia Main-owned
Rutas históricas (evidencia): continuation/derivation.mjs, main-store/store.mjs, test/continuation/derivation.test.mjs, test/main-store.test.mjs

- **T5.1.2.1:** RED: exigir plan sin cambios desde el cierre anterior y cumplimiento leído de ct&#95;delivery/ct&#95;claim en sólo lectura. → RED: la derivación queda ligada al digest y al ledger, no a narrativa.
  - [ ] Sin digest vigente y cumplimiento del ledger no hay avance.
- **T5.1.2.2:** RED: demostrar que memoria narrativa sin cumplimiento no avanza la derivación. → RED: la memoria narrativa queda excluida como prueba de cierre.
  - [ ] Narrativa sin ledger conserva el cursor anterior.
- **T5.1.2.3:** RED: probar claim coincidente sin privilegio y mismatch CT&#95;CLAIM&#95;MISMATCH sin assignment. → RED: evidencia de claim y autoridad de assignment permanecen separadas.
  - [ ] Mismatch nombra ambos valores; match no concede privilegios.
- **T5.1.2.4:** GREEN: traducir handoff&#95;id a coordenada sólo en registros Main-owned y revalidar Jornada antes de efectos irreversibles. → GREEN: la continuación deriva desde Main sin abrir core.mjs al plan.
  - [ ] Toda operación irreversible revalida Jornada ACTIVE y jornada&#95;revision actual.

#### M5.1.3 — Frontera aislada de Support y wiring canónico de Main
Rutas históricas (evidencia): .opencode/agent/support-agent.md, .opencode/plugins/tower-spike.js, bun.lock, continuation/support.mjs, main-store/store.mjs, package.json, plugin/tower-spike.js, test/continuation/support.test.mjs, test/main-store.test.mjs, test/plugin/tower-spike.test.mjs

- **T5.1.3.1:** RED: probar aislamiento de Support respecto de board, locks, Worker, registry, main&#95;store, capability y autoridad. → RED: testigos de bytes prueban no mutación en éxito y rechazo.
  - [ ] Support no ocupa territorio de ejecución ni recibe autoridad.
- **T5.1.3.2:** RED: rechazar CT&#95;HOST&#95;CAPABILITY&#95;MISSING cuando no existe subagente aislado, sin fallback en línea. → RED: la ausencia de delegación no ejecuta Support dentro de Main.
  - [ ] No existe sustituto en línea para Support.
- **T5.1.3.3:** RED/GREEN: inyectar trustedBindingProvider en la plugin, verificar Main antes de obtener store/capability y validar support-proposal-v1. → RED/GREEN: la plugin es el único composition root de autoridad y persiste sólo respuestas validadas.
  - [ ] Provider o binding inválido falla antes de spawn/persistencia y Support nunca recibe autoridad.

### S5.2 — Change F delivery adapters/reconciliation
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Entrega, cimientos.
- Depende de: S4.1, S3.3
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] La forma de entrega sale del bloque delivery-policy del proyecto, y un repositorio sin bloque resuelve al valor más restrictivo
  - [ ] Remoto, refspec y head son explícitos; la rama de tracking nunca decide el destino
  - [ ] Un destino que no coincide con el declarado se bloquea antes de emitir nada
  - [ ] Composición de comandos, prefijo de entorno y --head ausente se rechazan
  - [ ] Dos intentos sobre el mismo candidato se consideran la misma entrega; la identidad es la candidate&#95;revision congelada, nunca un ID por intento
  - [ ] Se reintenta como máximo tres veces, y cada reintento va precedido de reconciliación contra el remoto real
  - [ ] Si la reconciliación determina que el efecto sí ocurrió, se marca entregada y no se reintenta, sin importar el contador
  - [ ] Un efecto que ocurrió con la respuesta perdida no produce un segundo efecto al reintentar
  - [ ] Cuota, caída, checks incompletos y ambigüedad se clasifican en quota&#95;exhausted, provider&#95;unavailable, checks&#95;pending y unknown bloqueado
  - [ ] Una entrega irreconciliable entra en UNRECONCILED, congela el candidato y no emite ninguna mutación remota adicional, tampoco un revert
  - [ ] La Torre continúa con trabajo independiente después de una entrega UNRECONCILED; no se detiene entera
  - [ ] El registro de entrega es append-only y vive en delivery/&#42;&#42;; ninguna ruta escribe en ct&#95;delivery ni requiere migración de SQLite
  - [ ] La autorización se consume por el store de S5.1, importado sin modificar; S5.2 no abre una segunda ruta de escritura ni crea autoridad
  - [ ] delivery-record-v1 está registrado en contracts/schema-registry.mjs y tiene su caso en el fixture de contratos
  - [ ] bun test test/delivery test/contracts pasa completo y bun test no introduce fallos nuevos sobre la línea base que deje S4.1
  - [ ] Los 16 paths del candidato pertenecen al Área aprobada por las decisiones 47 y 48; el diff no toca ninguna ruta del Prohibido, en particular core.mjs

#### M5.2.1 — Adapters y reconciliación
Rutas históricas (evidencia): contracts/schema-registry.mjs, contracts/validate.mjs, delivery/git-adapter.mjs, delivery/ledger.mjs, delivery/pull-request-adapter.mjs, delivery/reconciliation.mjs, delivery/workflow.mjs, schemas/candidate-revision-v1.schema.json, schemas/delivery-record-v1.schema.json, test/contracts/schema.test.mjs, test/delivery/correction-security.test.mjs, test/delivery/git-adapter.test.mjs, test/delivery/pull-request-adapter.test.mjs, test/delivery/reconciliation.test.mjs, test/delivery/workflow.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.2.1.1:** RED: remoto, refspec y head explícitos; ignorar la rama de tracking, reconciliar antes del primer push y bloquear cualquier destino que no coincida con el declarado. → RED: destino de entrega explícito y reconciliado antes de cualquier push.
  - [ ] Remoto, refspec y head son explícitos; tracking no decide el destino y un mismatch se bloquea antes de emitir nada.
- **T5.2.1.2:** RED: repositorio, head y base explícitos por argv, con entorno separado; rechazar composición de comandos, prefijo de entorno y --head ausente. → RED: el límite de proceso acepta sólo argv y entorno separados y completos.
  - [ ] Composición, prefijo de entorno y --head ausente se rechazan.
- **T5.2.1.3:** RED: clasificar cuota o facturación como quota&#95;exhausted; caída, 5xx o timeout sondeado como provider&#95;unavailable; checks incompletos como checks&#95;pending; ambiguo como unknown bloqueado; el tercer intento fallido para y escala; UNRECONCILED no emite otra mutación. → RED: clasificación, tope de reintentos y terminal irreconciliable quedan fijados.
  - [ ] Tres intentos máximos con reconciliación previa; unknown irreconciliable entra en UNRECONCILED sin más efectos remotos.
- **T5.2.1.4:** GREEN/REFACTOR: commit, verificar commit y árbol, freeze, push directo a master; registrar en ledger append-only de delivery/&#42;&#42; y ligar la autorización de S5.1 sin modificarla; registrar delivery-record-v1 y su fixture. → GREEN/REFACTOR: la entrega idempotente queda ligada a evidencia inmutable y autorización existente.
  - [ ] El flujo verifica commit/árbol, congela candidate&#95;revision, entrega y registra delivery-record-v1 sin segunda ruta de autoridad.

### S5.3 — Continuación planner/implementer desde base integrada fresca
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Entrega.
- Depende de: S5.2
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El planner deja N+1 especificado hasta Tareas sobre la base integrada y el implementer ejecuta sólo N
  - [ ] Main es el único despachador; ningún wake, agente o interfaz humana concede autorización
  - [ ] Una base divergente preserva el sucesor, lo marca UNRECONCILED y escala, sin rebase, descarte o despacho automático
  - [ ] El diff toca sólo continuation/integrated-base.mjs y test/continuation/integrated-base.test.mjs, dentro del Área exacta

#### M5.3.1 — Continuación planner/implementer desde base integrada fresca
Rutas históricas (evidencia): continuation/integrated-base.mjs, test/continuation/integrated-base.test.mjs

- **T5.3.1.1:** RED: exigir planner N+1 hasta Tareas bajo techo 2, implementer sólo N, evidencia sobre base integrada, secuencia reconcile, Support, Policy y Main dispatch, y despacho cero ante negativas o caller no Main. → RED: horizonte, frescura, secuencia y autoridad de despacho quedan fijados antes de implementar.
  - [ ] NO&#95;SCOPE, denegación, evidencia stale o no integrada, overflow, drift de horizonte y cualquier caller no Main producen despacho cero.
- **T5.3.1.2:** GREEN: componer primitives existentes sin modificarlos para preparar N+1, ejecutar N y permitir sólo a Main despachar tras reconcile, Support y Policy con evidencia fresca. → GREEN: la continuación respeta horizonte, integración fresca y autoridad Main-only.
  - [ ] Toda negativa de alcance, política, frescura, integración, horizonte o autoridad termina con despacho cero.
- **T5.3.1.3:** REFACTOR/triangulate: cubrir base divergente y límites alternos sin ampliar el Área; preservar el sucesor byte por byte, marcarlo UNRECONCILED y escalar sin rebase, descarte o despacho automático. → REFACTOR/triangulate: la divergencia queda preservada y bloqueada sin alterar primitives preexistentes.
  - [ ] Los casos negativos permanecen en despacho cero y ningún primitive preexistente es modificado.

### S5.4 — Ruteo de escalamiento fuera/en casa
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos.
- Depende de: S5.1
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Un punto de decisión que requiere autoridad del maintainer emite una solicitud con objetivo exacto; una sin objetivo exacto falla cerrado
  - [ ] El modo de ruteo persiste entre procesos y conmutar es idempotente
  - [ ] Sólo las dos vías autenticadas del maintainer conmutan el modo: CLI local autenticada y callback remoto autenticado
  - [ ] Main y cualquier agente fallan cerrado al intentar conmutar el modo, y el rechazo nombra al actor
  - [ ] Estado de modo ausente, corrupto o ambiguo resuelve a local y no emite hacia ningún transporte remoto
  - [ ] Identidad ausente, inválida o ambigua resuelve a local por el mismo camino que el estado corrupto, sin una ruta separada que pueda divergir
  - [ ] La vía remota está definida pero inhabilitada hasta S8.7: conmutar a remoto por callback falla cerrado por autenticación ausente
  - [ ] S5.4 opera entera en modo local sin S8.7: ninguna de sus rutas requiere el transporte para funcionar
  - [ ] S5.4 no inventa transporte ni autenticación: no existe en su diff ninguna implementación de canal ni de verificación de identidad remota
  - [ ] Un fallo del transporte remoto deja la solicitud pendiente y recuperable, nunca consumida ni descartada
  - [ ] La solicitud emitida se persiste en el authorization store de S5.1, sin abrir una segunda ruta de escritura
  - [ ] Consultar el modo es read-only, verificado por testigos de bytes en éxito y en rechazo
  - [ ] S5.4 no crea, valida ni consume autoridad: esa ruta sigue siendo exclusiva de S5.1
  - [ ] bun test test/escalation pasa completo y bun test no introduce fallos nuevos sobre la línea base que deje S5.1
  - [ ] El diff no toca ninguna ruta del Prohibido ni ninguna fuera del Área

#### M5.4.1 — Emisión de solicitud de decisión
Rutas históricas (evidencia): escalation/request.mjs, test/escalation/request.test.mjs

- **T5.4.1.1:** RED: agregar pruebas para que un punto de decisión produzca una solicitud con objetivo exacto, origen y expiración, y una solicitud sin objetivo exacto falle cerrado. → RED: el contrato emitible y el fallo cerrado quedan fijados antes de implementar.
  - [ ] La solicitud exige objetivo exacto, origen y expiración.
- **T5.4.1.2:** GREEN: implementar la emisión reutilizando el authorization store de S5.1, sin abrir una segunda ruta de escritura. → GREEN: la solicitud emitida usa el único store autoritativo.
  - [ ] No existe escritura de solicitudes fuera del authorization store de S5.1.
- **T5.4.1.3:** REFACTOR: normalizar códigos de error estables y volver a correr bun test test/escalation. → REFACTOR: los errores son estables y el comportamiento permanece probado.
  - [ ] bun test test/escalation pasa completo.

#### M5.4.2 — Modo de ruteo
Rutas históricas (evidencia): escalation/routing.mjs, test/escalation/routing.test.mjs

- **T5.4.2.1:** RED: probar conmutación local/remoto, idempotencia, persistencia entre procesos y frontera de autoridad para las dos vías autenticadas del maintainer, rechazando Main y agentes con actor nombrado. → RED: persistencia, idempotencia y autoridad exclusiva quedan fijadas.
  - [ ] Sólo CLI local autenticada y callback remoto autenticado conmutan el modo.
- **T5.4.2.2:** RED: probar que estado o identidad ausente, corrupta, inválida o ambigua resuelve a local y no emite remotamente por una ruta divergente. → RED: todos los estados e identidades dudosos comparten el mismo fallo cerrado.
  - [ ] Estado e identidad dudosos resuelven a local sin transporte remoto.
- **T5.4.2.3:** GREEN: implementar resolución de modo y despacho, con callback remoto definido pero inhabilitado sin autenticación de S8.7 y operación local completa por CLI autenticada. → GREEN: el modo se resuelve y despacha sin inventar transporte ni autenticación.
  - [ ] S5.4 opera completa en local y remoto falla cerrado mientras falta S8.7.

#### M5.4.3 — Degradación y no mutación
Rutas históricas (evidencia): escalation/routing.mjs, test/escalation/routing.test.mjs

- **T5.4.3.1:** RED: agregar el caso de transporte remoto ausente o caído estando en modo remoto. → RED: la degradación del transporte queda fijada antes del comportamiento.
  - [ ] El fallo remoto no consume ni descarta la solicitud.
- **T5.4.3.2:** GREEN: confirmar que la solicitud queda pendiente y recuperable localmente y que el fallo nunca la consume ni la descarta. → GREEN: la recuperación local preserva la solicitud pendiente.
  - [ ] La solicitud permanece recuperable después del fallo remoto.
- **T5.4.3.3:** Verificar con testigos de bytes que consultar el modo no muta registro, DB, WAL, SHM ni estado de Torre. → La consulta queda probada read-only en éxito y rechazo.
  - [ ] Los testigos de bytes permanecen idénticos.

### S5.5 — Parking y retoma del loop
- Estado derivado: ✅ COMPLETO
- Zona/Área: asientos · supervision/, profiles/, escalation/, support/, workspace/, test/escalation/, test/supervision/, test/support/, test/workspace/
- Depende de: S5.10
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Una decisión no derivable produce un registro inmutable con pregunta exacta, evidencia, opciones con consecuencia, origen, checkpoint y clase
  - [ ] Un registro sin opciones, sin evidencia o sin checkpoint falla cerrado
  - [ ] La continuación sale del primary o de un alternatives de la propuesta vigente de Support; nada que la propuesta no nombre continúa
  - [ ] Una propuesta vencida, de otro plan, de otro ledger, de otro claim o de un caller&#95;role distinto de MAIN falla cerrado
  - [ ] Ninguna línea de producción lee adentro de primary, alternatives o conflicts; cualquier comparación o ramificación sobre su contenido falsifica el contrato
  - [ ] Con state NO&#95;SCOPE, Main estaciona y reporta sin inventar trabajo ni derivar un candidato propio
  - [ ] La continuación la ejerce Main; el worker no se autoasigna
  - [ ] Sólo una respuesta terminal validada por Main permite retomar desde el checkpoint exacto
  - [ ] Un checkpoint rancio exige reconciliación y no retoma solo
  - [ ] Una respuesta no validada, vencida o de origen equivocado no levanta nada ni muta el registro
  - [ ] S5.5 no crea, registra, valida ni consume contratos o autoridad, y no duplica la respuesta de S5.8 ni la emisión o el ruteo de S5.4
  - [ ] rg 'Depende de&#124;Área&#124;Recurso' escalation/ devuelve cero: la Torre no nombra un campo del formato de planes
  - [ ] Verificar la propuesta es read-only, comprobado por testigos de bytes en éxito y en rechazo
  - [ ] bun test test/escalation pasa completo y bun test no introduce fallos nuevos
  - [ ] El diff no toca continuation, core.mjs, mcp.mjs, delivery, contracts, schemas ni main-store/store.mjs

#### M5.5.1 — Registro de la decisión estacionada
Rutas: escalation/parked.mjs, test/escalation/parked.test.mjs

- **T5.5.1.1:** RED: agregar test/escalation/parked.test.mjs para exigir un registro inmutable completo de una decisión no derivable. → RED: el registro completo queda fijado antes de implementar.
  - [ ] El registro conserva pregunta, evidencia, opciones con consecuencia, origen, checkpoint y clase.
- **T5.5.1.2:** RED: rechazar registros sin opciones enumeradas, evidencia o checkpoint. → RED: una pregunta incompleta falla cerrado y no se estaciona.
  - [ ] Todo registro incompleto se rechaza sin escritura parcial.
- **T5.5.1.3:** GREEN: implementar escalation/parked.mjs sobre el ledger append-only, consumiendo parked-decision-v1 de S5.7 y reutilizando la solicitud de S5.4 sin otra ruta de escritura. → GREEN: el checkpoint durable se estaciona mediante los contratos y stores existentes.
  - [ ] No existe segundo writer, contrato local ni autoridad nueva.
- **T5.5.1.4:** REFACTOR: normalizar códigos de error estables y volver a correr bun test test/escalation. → REFACTOR: errores estables conservan el comportamiento probado.
  - [ ] bun test test/escalation pasa completo.

#### M5.5.2 — Verificación de la propuesta de Support
Rutas: escalation/parked.mjs, test/escalation/parked.test.mjs

- **T5.5.2.1:** RED: rechazar una propuesta vencida, de otro plan&#95;enumeration&#95;digest, ledger&#95;digest, worker&#95;claim o caller&#95;role distinto de MAIN. → RED: identidad, frescura, claim y rol quedan fijados antes de implementar.
  - [ ] Cada mismatch falla cerrado.
- **T5.5.2.2:** GREEN: verificar esos cinco campos sin parser de planes ni maquinaria de contaminación propia. → GREEN: la propuesta se verifica sólo en la frontera autorizada.
  - [ ] Producción no lee dentro de primary, alternatives o conflicts.
- **T5.5.2.3:** REFACTOR: verificar readback y no mutación fuera del checkpoint, con testigos de bytes para impedir ramas sobre primary, alternatives o conflicts. → REFACTOR: la verificación permanece read-only y opaca al contenido propuesto.
  - [ ] Los testigos permanecen idénticos en éxito y rechazo.

#### M5.5.3 — Continuación sobre trabajo propuesto
Rutas: escalation/parked.mjs, test/escalation/independent.test.mjs

- **T5.5.3.1:** RED: agregar test/escalation/independent.test.mjs para permitir sólo primary o alternatives de la propuesta vigente. → RED: sólo trabajo nombrado por Support puede continuar.
  - [ ] Nada ausente de la propuesta continúa.
- **T5.5.3.2:** RED: con NO&#95;SCOPE la Torre se detiene y reporta sin inventar trabajo, relajar criterios ni derivar candidato propio. → RED: NO&#95;SCOPE fija una detención cerrada sin planificación local.
  - [ ] NO&#95;SCOPE produce cero trabajo inventado.
- **T5.5.3.3:** GREEN: consumir la propuesta bajo Main; el worker no se autoasigna. → GREEN: Main ejerce la continuación propuesta por Support.
  - [ ] El worker carece de ruta de autoasignación.

#### M5.5.4 — Retoma desde el checkpoint
Rutas: escalation/resume.mjs, test/escalation/resume.test.mjs

- **T5.5.4.1:** RED: agregar test/escalation/resume.test.mjs para que una respuesta terminal validada por Main retome sólo el checkpoint exacto del worktree asignado. → RED: checkpoint, worktree y autoridad de retoma quedan fijados.
  - [ ] Sólo la respuesta terminal validada por Main retoma el checkpoint exacto.
- **T5.5.4.2:** RED: exigir reconciliación nueva cuando la base se movió desde el parking. → RED: un checkpoint rancio no retoma automáticamente.
  - [ ] Base divergente exige reconciliación.
- **T5.5.4.3:** RED: una respuesta no validada, vencida o de origen equivocado no levanta nada ni muta el registro. → RED: respuestas inválidas fallan cerrado sin mutación.
  - [ ] El registro permanece byte-idéntico ante respuestas inválidas.
- **T5.5.4.4:** GREEN: implementar escalation/resume.mjs retomando desde el checkpoint exacto registrado. → GREEN: la retoma conserva checkpoint, worktree y reconciliación exigida.
  - [ ] No se retoma otro checkpoint ni una base stale.

### S5.6 — Contrato canónico de snapshot de Sesión
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, cimientos.
- Depende de: S5.4
- Cimientos: —
- Recursos: registro canónico de contratos, fixture compartido
- Criterios de aceptación:
  - [ ] El snapshot liga bytes exactos y digest raw-bytes; un byte de drift lo invalida
  - [ ] El contrato expone grafo, Área, Recurso, Decisiones, criterios binarios y contaminación semántica
  - [ ] Ausencia, duplicado, referencia inexistente o ambigüedad falla cerrado sin snapshot parcial
  - [ ] El parser no lee engram ni ninguna fuente narrativa
  - [ ] No se importa, modifica ni duplica el parser privado de continuation/&#42;&#42;
  - [ ] Los mismos bytes producen bytes canónicos idénticos y el mismo digest
  - [ ] session-plan-snapshot-v1 está registrado en schemaFiles, validado por el camino canónico y cubierto por fixture
  - [ ] Parser y validación son read-only, verificados por testigos de bytes en éxito y rechazo
  - [ ] bun test test/contracts pasa completo y bun test no introduce fallos nuevos
  - [ ] El diff no toca ninguna ruta fuera del Área ni ninguna del Prohibido

#### M5.6.1 — Identidad y schema del snapshot
Rutas históricas (evidencia): contracts/session-plan-snapshot.mjs, schemas/session-plan-snapshot-v1.schema.json

- **T5.6.1.1:** RED: fijar casos para bytes/digest exactos, drift de un byte, encoding inválido y campos obligatorios ausentes. → RED: bytes, digest, drift, encoding y campos obligatorios quedan fijados antes de implementar.
  - [ ] Bytes y digest exactos; drift
  - [ ] encoding inválido y campos obligatorios ausentes fallan cerrado.
- **T5.6.1.2:** GREEN: implementar session-plan-snapshot-v1 con identidad inmutable y referencias cerradas a Sesiones. → GREEN: el contrato versionado liga identidad inmutable y referencias cerradas.
  - [ ] session-plan-snapshot-v1 valida identidad inmutable y referencias cerradas.
- **T5.6.1.3:** REFACTOR: reutilizar digestArtifact y eliminar cualquier digest o lista de campos duplicada. → REFACTOR: una sola implementación conserva digest y campos canónicos.
  - [ ] No existe digest ni lista de campos duplicada.

#### M5.6.2 — Parser único del contrato de Sesión
Rutas históricas (evidencia): contracts/session-plan-snapshot.mjs, test/contracts/session-plan-snapshot.test.mjs

- **T5.6.2.1:** RED: cubrir grafo, Área, Recurso, Decisiones, criterios binarios y contaminación semántica contra fixtures representativos. → RED: el contrato completo de Sesión queda fijado antes del parser.
  - [ ] Los fixtures cubren grafo
  - [ ] Área
  - [ ] Recurso
  - [ ] Decisiones
  - [ ] criterios y contaminación.
- **T5.6.2.2:** RED: ambigüedad, duplicados, referencias inexistentes o formato parcial fallan cerrado y no producen snapshot. → RED: toda entrada ambigua, duplicada, incompleta o no resuelta falla cerrado.
  - [ ] Ninguna entrada inválida produce snapshot parcial.
- **T5.6.2.3:** GREEN: implementar contracts/session-plan-snapshot.mjs sin importar continuation/&#42;&#42; ni leer engram. → GREEN: el parser canónico opera sin fuentes narrativas ni parser privado.
  - [ ] El parser no importa continuation/&#42;&#42; ni lee Engram.
- **T5.6.2.4:** REFACTOR: ordenar salidas canónicamente y probar determinismo sobre los mismos bytes. → REFACTOR: los mismos bytes producen salida y digest idénticos.
  - [ ] La salida canónica es determinista para los mismos bytes.

#### M5.6.3 — Registro y frontera read-only
Rutas históricas (evidencia): contracts/schema-registry.mjs, contracts/validate.mjs, test/contracts/schema.test.mjs, test/contracts/session-plan-snapshot.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.6.3.1:** RED: el schema sin entrada en schemaFiles, invariante y fixture se considera incompleto. → RED: registro, invariantes y fixture quedan exigidos antes del wiring.
  - [ ] El schema incompleto se rechaza si falta registro
  - [ ] invariante o fixture.
- **T5.6.3.2:** GREEN: registrar el schema, sumar invariantes cross-field y casos válidos/inválidos al fixture compartido. → GREEN: el contrato usa el registro y la validación canónicos con fixture compartido.
  - [ ] Registro
  - [ ] invariantes y fixture cubren casos válidos e inválidos.
- **T5.6.3.3:** REFACTOR: verificar con testigos de bytes que parsear y validar no muta plan, DB, WAL, SHM ni estado de Torre. → REFACTOR: parser y validación permanecen read-only en éxito y rechazo.
  - [ ] Plan
  - [ ] DB
  - [ ] WAL
  - [ ] SHM y estado de Torre permanecen byte-idénticos.

### S5.7 — Contratos canónicos de decisión estacionada y respuesta
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, cimientos.
- Depende de: S5.6
- Cimientos: —
- Recursos: registro canónico de contratos, fixture compartido
- Criterios de aceptación:
  - [ ] parked-decision-v1 exige todos los campos de §11 y scope congelado ligado al snapshot de S5.6
  - [ ] Opciones sin ID, duplicadas o sin consecuencia se rechazan
  - [ ] parked-decision-response-v1 liga decisión, una opción enumerada, snapshot y autorización exactos
  - [ ] Cambiar decisión, opción, snapshot o autorización invalida el binding
  - [ ] Texto, etiqueta u orden de propiedades nunca sustituye la identidad canónica
  - [ ] El contrato de respuesta no crea, valida ni consume autoridad
  - [ ] Ambos schemas pasan únicamente por contracts/schema-registry.mjs y contracts/validate.mjs
  - [ ] Ambos tienen invariantes y casos válidos/inválidos en el fixture compartido
  - [ ] bun test test/contracts pasa completo y bun test no introduce fallos nuevos
  - [ ] El diff no toca ninguna ruta fuera del Área ni ninguna del Prohibido

#### M5.7.1 — Contrato de decisión estacionada
Rutas históricas (evidencia): contracts/parked-decision.mjs, schemas/parked-decision-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/contracts/parked-decision.test.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.7.1.1:** RED: cubrir todos los campos de §11, opciones únicas y scope congelado ligado al snapshot de S5.6. → RED: los campos, opciones y scope quedan fijados antes de implementar.
  - [ ] Todos los campos
  - [ ] opciones únicas y scope congelado quedan cubiertos.
- **T5.7.1.2:** GREEN: implementar parked-decision-v1 y su construcción canónica sin persistencia. → GREEN: el contrato de decisión estacionada queda implementado sin persistencia.
  - [ ] parked-decision-v1 se construye canónicamente sin persistencia.
- **T5.7.1.3:** REFACTOR: unificar IDs, timestamps y digests con los $defs canónicos existentes. → REFACTOR: IDs, timestamps y digests reutilizan los $defs canónicos.
  - [ ] No hay definiciones paralelas de IDs
  - [ ] timestamps o digests.

#### M5.7.2 — Contrato de respuesta seleccionada
Rutas históricas (evidencia): contracts/parked-decision.mjs, schemas/parked-decision-response-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/contracts/parked-decision.test.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.7.2.1:** RED: una respuesta debe nombrar decisión, opción enumerada, snapshot y autorización exactos; cada mismatch falla cerrado. → RED: cada identidad y mismatch quedan fijados antes de implementar.
  - [ ] Cada mismatch de decisión
  - [ ] opción
  - [ ] snapshot o autorización falla cerrado.
- **T5.7.2.2:** GREEN: implementar parked-decision-response-v1 con binding canónico y sin capacidad de autoafirmar validación. → GREEN: la respuesta liga identidades exactas sin autoafirmar validación.
  - [ ] El binding canónico no crea ni afirma autoridad.
- **T5.7.2.3:** REFACTOR: probar que etiquetas, orden de objeto o texto narrativo no sustituyen option&#95;id ni alteran el digest canónico. → REFACTOR: sólo option&#95;id identifica selección y el orden no altera el digest.
  - [ ] Etiqueta
  - [ ] narrativa y orden no sustituyen option&#95;id ni alteran identidad.

#### M5.7.3 — Registro e invariantes cruzadas
Rutas históricas (evidencia): contracts/parked-decision.mjs, schemas/parked-decision-v1.schema.json, schemas/parked-decision-response-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/contracts/parked-decision.test.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.7.3.1:** RED: ambos schemas desconocidos fallan hasta entrar por el registro, invariantes y fixture compartidos. → RED: registro, invariantes y fixture quedan exigidos antes del wiring.
  - [ ] Ambos schemas son inválidos mientras falte registro
  - [ ] invariante o fixture.
- **T5.7.3.2:** GREEN: registrar ambos schemas y validar unicidad de opciones y consistencia de bindings. → GREEN: ambos schemas usan el registro y validan opciones y bindings.
  - [ ] Registro e invariantes validan unicidad y consistencia cruzada.
- **T5.7.3.3:** REFACTOR: cerrar casos válidos/inválidos y correr bun test test/contracts sobre el registro real. → REFACTOR: fixtures y suite enfocada cubren el registro real.
  - [ ] Casos válidos e inválidos pasan por el registro real.

### S5.8 — Binding de opción seleccionada en la autoridad canónica
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Enrolamiento.
- Depende de: S5.7
- Cimientos: —
- Recursos: authorization store de Main bajo assertMain y su mismo lock y transacción
- Criterios de aceptación:
  - [ ] Sólo Main, por el authorization store canónico de S5.1, registra una respuesta seleccionada
  - [ ] El registro parked-decision-response-v1 y la transición terminal de la autorización se persisten atómicamente bajo el mismo assertMain, lock y transacción
  - [ ] La respuesta liga criptográficamente authorization&#95;id, parked&#95;decision&#95;id, exactamente un option&#95;id enumerado, snapshot/digest de Sesión y revisión
  - [ ] La opción debe existir en la decisión estacionada validada; texto o assertions del caller no cuentan
  - [ ] Autorización no PENDING, expirada, consumida o de origen distinto falla cerrado sin mutación
  - [ ] Cada mismatch de binding falla cerrado y nombra el valor rechazado
  - [ ] Replay exacto es idempotente y replay divergente produce cero efectos adicionales
  - [ ] No existe segundo store, archivo sombra, segundo writer, método de autoridad ni persistencia fuera de main-store/store.mjs
  - [ ] No existe semántica terminal sólo en extensions ni assertion del caller que sustituya el registro versionado
  - [ ] S5.8 consume el schema de S5.7 sin modificar contracts, schemas, test/contracts ni fixtures
  - [ ] MERGE y START&#95;JORNADA existentes conservan compatibilidad sin migración
  - [ ] S5.8 no implementa ledger, contaminación, selección independiente ni retoma de S5.5
  - [ ] bun test test/main-store.test.mjs pasa completo contra el contrato registrado de S5.7 y bun test no introduce fallos nuevos
  - [ ] El diff no toca ninguna ruta fuera del Área ni ninguna del Prohibido

#### M5.8.1 — Terminal response bajo Main
Rutas históricas (evidencia): main-store/store.mjs, test/main-store.test.mjs

- **T5.8.1.1:** RED: caller sin autoridad, authorization no PENDING, expirada o de origen distinto no registra respuesta ni muta bytes. → RED: autoridad, estado y origen inválidos quedan rechazados sin mutación.
  - [ ] Ninguna entrada no autorizada o no PENDING registra respuesta ni altera bytes.
- **T5.8.1.2:** GREEN: extender el store canónico para validar y persistir la respuesta seleccionada bajo assertMain. → GREEN: Main persiste la respuesta y transición terminal en una operación atómica.
  - [ ] La respuesta seleccionada se valida y persiste bajo assertMain.
- **T5.8.1.3:** REFACTOR: mantener una sola transición terminal y una sola validación contra schemas canónicos. → REFACTOR: permanece un único owner, writer y camino terminal.
  - [ ] No existe transición
  - [ ] validación o writer paralelo.

#### M5.8.2 — Binding criptográfico e idempotencia
Rutas históricas (evidencia): main-store/store.mjs, test/main-store.test.mjs

- **T5.8.2.1:** RED: mismatch de decisión, opción, snapshot, autorización o revisión falla cerrado nombrando el binding rechazado. → RED: cada binding divergente queda cubierto antes de implementación.
  - [ ] Cada mismatch falla cerrado y nombra el valor rechazado.
- **T5.8.2.2:** RED: replay exacto es idempotente; replay con otra opción o bytes produce cero efectos adicionales. → RED: convergencia exacta y rechazo divergente quedan fijados.
  - [ ] Replay exacto converge y replay divergente no produce efectos adicionales.
- **T5.8.2.3:** GREEN/REFACTOR: ligar la respuesta terminal al digest canónico y al registro de autorización sin aceptar assertions del caller, y eliminar todo binding duplicado. → GREEN/REFACTOR: el binding canónico es único y no acepta autoafirmación del caller.
  - [ ] La respuesta queda ligada al digest y autorización canónicos sin bindings duplicados.

#### M5.8.3 — Compatibilidad y owner único del authorization store
Rutas históricas (evidencia): main-store/store.mjs, test/main-store.test.mjs

- **T5.8.3.1:** RED: autorizaciones MERGE/START&#95;JORNADA existentes conservan validación y transiciones sin respuesta estacionada. → RED: la compatibilidad previa queda protegida.
  - [ ] MERGE y START&#95;JORNADA preservan su contrato sin migración.
- **T5.8.3.2:** GREEN: consumir parked-decision-response-v1 desde S5.7 sin modificar schema, registro, invariantes ni fixtures, y sin migrar registros previos. → GREEN: el store consume el contrato registrado sin alterar su autoridad ni formato.
  - [ ] El schema de S5.7 se consume sin cambios ni migración.
- **T5.8.3.3:** REFACTOR: ejecutar el main-store contra el contrato registrado y verificar ausencia de shadow store, segundo writer, authority o ruta de caller assertion. → REFACTOR: el authorization store conserva owner y writer únicos.
  - [ ] No existe store sombra
  - [ ] segundo writer
  - [ ] authority paralela ni caller assertion.

### S5.11 — La captura y la reconciliación producen artefactos inmutables con identidad y digest propios, más los bindings cruzados necesarios para que Main pueda probar que ambos nombran el mismo checkpoint sin aceptar afirmaciones del caller.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Contratos, cimientos.
- Depende de: S5.8
- Cimientos: —
- Recursos: productores canónicos de checkpoint-provenance, registro canónico de contratos y fixture
- Criterios de aceptación:
  - [ ] captureCheckpoint produce un artefacto inmutable checkpoint-capture-v1 con identidad/digest y proyecto, assignment, generation, repositorio y base/result exactos
  - [ ] Existe un productor runtime canónico de reconciliación; schema y fixture por sí solos no cuentan
  - [ ] La reconciliación producida tiene identidad/digest propios, estado VALID y liga la captura exacta y todos sus cross-bindings
  - [ ] Drift de identidad, digest, proyecto, assignment, generation, repositorio, base o result falla cerrado
  - [ ] Ningún caller o consumidor puede afirmar, completar o sintetizar provenance faltante
  - [ ] Los productores no mutan Main store, no estacionan decisiones y no abren store, writer ni ingress alternativo
  - [ ] Schemas, registro, invariantes y fixtures pasan por el camino canónico único
  - [ ] El diff de implementación no toca ningún path fuera del Área
  - [ ] La captura conserva seguridad Git, igualdad exacta de bytes/modos, orden determinista y fallos CT&#95;CHECKPOINT&#95;UNSAFE, sin defaults para el contexto del productor
  - [ ] El resultado de 620 líneas authored no supera el techo 960 de la size:exception autorizada y conserva evidencia separada por Módulo y rollback coherente
  - [ ] El fix de compatibilidad padre y los artefactos de planificación quedan fuera de los once paths, del conteo authored y del rollback de S5.11
  - [ ] Los once hashes, modos y numstats coinciden con el manifest congelado 3d2467e5792d17d12080ee3ef26a875f415dab5a9327ca402f572435886fff1c

#### M5.11.1 — Identidad canónica de captura
Rutas históricas (evidencia): workspace/checkpoint.mjs, schemas/checkpoint-capture-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/workspace/checkpoint.test.mjs, test/contracts/schema.test.mjs, test/contracts/s3-2-schemas.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.11.1.1:** RED: demostrar que la captura vigente carece de identidad estable, project&#95;id, assignment&#95;id y generation, y que un consumidor puede inventarlos sin rechazo. → RED: demostrar que la captura vigente carece de identidad estable, project&#95;id, assignment&#95;id y generation, y que un consumidor puede inventarlos sin rechazo.
  - [ ] La captura vigente carece de identidad estable y rechaza campos producer-owned inventados por un consumidor.
- **T5.11.1.2:** GREEN: implementar checkpoint-capture-v1 y hacer que captureCheckpoint produzca identidad/digest y bindings cruzados canónicos sin mutar Main store. → GREEN: implementar checkpoint-capture-v1 y hacer que captureCheckpoint produzca identidad/digest y bindings cruzados canónicos sin mutar Main store.
  - [ ] captureCheckpoint produce identidad/digest y bindings cruzados canónicos sin mutar Main store.
- **T5.11.1.3:** REFACTOR: registrar schema e invariantes, eliminar listas/digests duplicados y probar determinismo y drift por cada binding. → REFACTOR: registrar schema e invariantes, eliminar listas/digests duplicados y probar determinismo y drift por cada binding.
  - [ ] Schema e invariantes canónicos prueban determinismo y drift por cada binding sin duplicación.

#### M5.11.2 — Productor canónico de reconciliación
Rutas históricas (evidencia): workspace/reconciliation.mjs, schemas/reconciled-checkpoint-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/workspace/reconciliation.test.mjs, test/contracts/schema.test.mjs, test/contracts/s3-2-schemas.test.mjs, test/fixtures/contracts/schema-cases-v1.json

- **T5.11.2.1:** RED: probar que reconciled-checkpoint-v1 hoy puede aparecer como fixture válido sin productor, digest propio ni vínculo a la captura exacta. → RED: probar que reconciled-checkpoint-v1 hoy puede aparecer como fixture válido sin productor, digest propio ni vínculo a la captura exacta.
  - [ ] Un fixture sin productor
  - [ ] digest propio o vínculo a captura no satisface reconciled-checkpoint-v1.
- **T5.11.2.2:** GREEN: implementar workspace/reconciliation.mjs para producir identidad/digest, estado VALID y cross-bindings desde la captura canónica y evidencia reconciliada. → GREEN: implementar workspace/reconciliation.mjs para producir identidad/digest, estado VALID y cross-bindings desde la captura canónica y evidencia reconciliada.
  - [ ] El productor runtime emite identidad/digest
  - [ ] estado VALID y cross-bindings desde captura y evidencia reconciliada.
- **T5.11.2.3:** REFACTOR: unificar canonicalización, cerrar mismatch de proyecto/assignment/generation/repositorio/base/result y verificar que ningún consumidor sintetiza el artefacto. → REFACTOR: unificar canonicalización, cerrar mismatch de proyecto/assignment/generation/repositorio/base/result y verificar que ningún consumidor sintetiza el artefacto.
  - [ ] La canonicalización única rechaza cada mismatch y ningún consumidor sintetiza el artefacto.

### S5.12 — Main invoca los productores canónicos mediante capabilities ligadas en constructor, conserva sus artefactos inmutables sin cambios y los entrega juntos a una sola transacción de parking.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Enrolamiento.
- Depende de: S5.11
- Cimientos: —
- Recursos: composición de Main, transacción única de parking, ingress exclusivo de parking del Main store
- Criterios de aceptación:
  - [ ] Main es el único composition root y recibe capture/reconciliation/parking como capabilities ligadas en constructor
  - [ ] Main invoca los productores canónicos; el caller no suministra ni afirma provenance
  - [ ] Los artefactos de captura y reconciliación llegan al parking con identidad, digest y bindings canónicos sin cambios
  - [ ] Una sola transacción de parking persiste la decisión y ambos artefactos o no persiste ninguno
  - [ ] Sólo existe el ingress aprobado en main-store/store.mjs; no hay fallback, alternate ingress, store sombra ni segundo writer
  - [ ] Replay exacto es idempotente y mismatch/replay divergente falla cerrado sin efecto parcial
  - [ ] S5.12 no crea contratos alternativos ni sintetiza identidad, digest, estado VALID o cross-bindings
  - [ ] El diff de implementación no toca ningún path fuera del Área

#### M5.12.1 — Composition root constructor-bound
Rutas históricas (evidencia): escalation/parking-composition.mjs, test/escalation/parking-composition.test.mjs

- **T5.12.1.1:** RED: rechazar producers ausentes/no ligados, artefactos aportados por el caller y toda ruta que invoque parking sin captura y reconciliación canónicas. → RED: rechazar producers ausentes/no ligados, artefactos aportados por el caller y toda ruta que invoque parking sin captura y reconciliación canónicas.
  - [ ] Producers ausentes o no ligados
  - [ ] artefactos del caller y parking sin captura/reconciliación canónicas son rechazados.
- **T5.12.1.2:** GREEN: implementar el seam acotado bajo escalation/ para que Main invoque ambas capabilities ligadas en constructor y transporte sus resultados exactos. → GREEN: implementar el seam acotado bajo escalation/ para que Main invoque ambas capabilities ligadas en constructor y transporte sus resultados exactos.
  - [ ] Main invoca ambas capabilities ligadas en constructor y transporta resultados exactos.
- **T5.12.1.3:** REFACTOR: probar orden determinista, una sola invocación por productor y ausencia de alternate ingress, fallback o síntesis del consumer. → REFACTOR: probar orden determinista, una sola invocación por productor y ausencia de alternate ingress, fallback o síntesis del consumer.
  - [ ] Orden determinista
  - [ ] una invocación por productor y ausencia de rutas alternativas quedan probados.

#### M5.12.2 — Ingress y transacción única de parking
Rutas históricas (evidencia): main-store/store.mjs, test/main-store.test.mjs

- **T5.12.2.1:** RED: probar atomicidad: mismatch o fallo de cualquier artefacto deja decisión, captura y reconciliación sin persistencia parcial. → RED: probar atomicidad: mismatch o fallo de cualquier artefacto deja decisión, captura y reconciliación sin persistencia parcial.
  - [ ] Mismatch o fallo deja decisión
  - [ ] captura y reconciliación sin persistencia parcial.
- **T5.12.2.2:** GREEN: extender sólo el ingress aprobado de main-store/store.mjs para recibir ambos artefactos sin cambios dentro de la transacción única de parking. → GREEN: extender sólo el ingress aprobado de main-store/store.mjs para recibir ambos artefactos sin cambios dentro de la transacción única de parking.
  - [ ] El ingress aprobado recibe ambos artefactos sin cambios dentro de una sola transacción.
- **T5.12.2.3:** REFACTOR: cerrar replay exacto, replay divergente, readback y testigos de bytes contra shadow store, segundo writer o mutación posterior. → REFACTOR: cerrar replay exacto, replay divergente, readback y testigos de bytes contra shadow store, segundo writer o mutación posterior.
  - [ ] Replay
  - [ ] readback y testigos de bytes excluyen divergencia
  - [ ] shadow store
  - [ ] segundo writer y mutación posterior.

### S5.9 — Persistir bajo autoridad exclusiva de Main una prueba inmutable que liga el valor exacto de parked.checkpoint a la captura canónica y a la evidencia de reconciliación que identifican el mismo punto de retoma.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Enrolamiento, cimientos.
- Depende de: S5.12
- Cimientos: —
- Recursos: Main store, writer lock y transacción canónicos
- Criterios de aceptación:
  - [ ] Existe un único binding autoritativo persistido en Main store entre el valor exacto de parked.checkpoint, la captura canónica y la evidencia reconciled-checkpoint-v1 correspondiente.
  - [ ] ENMENDADO por la decisión 41 (maintainer, 2026-08-18). Al retomar después de integrar S5.11 y S5.12, el SDD prueba antes de tasks/apply que el flujo real suministra evidencia canónica producer-owned de captura y reconciliación VALID — esa mitad PASA en test/main-store.test.mjs:257-272. La cláusula de preservación del falsificador fallido se cierra como pérdida aceptada y documentada: el design.md de SHA-256 a349747ceb0580ef700155499125c89a025232e85ec64677d65d8e8d0bff29b1 ya no existe y Engram 8604 fue upserteado al diseño reconciliado. Se perdió el veredicto negativo del primer intento de diseño; sobrevive el hallazgo de fase spec en Engram 8602 y la brecha original documentada en las decisiones 20 y 21, que motivó enumerar S5.11 y S5.12. La causa raíz —un topic&#95;key mutable— quedó registrada como regla del repositorio.
  - [ ] Mismatch de valor, digest, repositorio, base/result, assignment/generation o evidencia de reconciliación falla cerrado sin mutación parcial.
  - [ ] Caller assertion, texto equivalente y una inferencia local de S5.5 no sustituyen evidencia canónica.
  - [ ] Replay byte-idéntico es idempotente y replay divergente produce cero efectos adicionales.
  - [ ] Sellado al estacionar, persistencia, inmutabilidad y readback autoritativo dedicado por identidad de decisión estacionada ocurren bajo el writer, lock y transacción canónicos de Main; no existe store ni writer paralelo.
  - [ ] Los productores workspace/checkpoint.mjs y reconciled-checkpoint-v1 se consumen sin una segunda ruta de captura o reconciliación.
  - [ ] El diff de implementación no toca ningún path fuera del Área; nueve paths, todos dentro del Área.

#### M5.9.1 — Evidencia canónica y persistencia bajo Main
Rutas históricas (evidencia): contracts/parked-checkpoint-binding.mjs, contracts/schema-registry.mjs, contracts/validate.mjs, main-store/store.mjs, schemas/parked-checkpoint-binding-v1.schema.json, test/contracts/parked-checkpoint-binding.test.mjs, test/contracts/schema.test.mjs, test/fixtures/contracts/schema-cases-v1.json, test/main-store.test.mjs

- **T5.9.1.1:** RED: demostrar que el checkpoint textual de parked-decision-v1, captureCheckpoint y reconciled-checkpoint-v1 hoy pueden variar independientemente sin que ningún contrato rechace el desacople. → RED: demostrar que el checkpoint textual de parked-decision-v1, captureCheckpoint y reconciled-checkpoint-v1 hoy pueden variar independientemente sin que ningún contrato rechace el desacople.
  - [ ] El desacople independiente del checkpoint textual entre los tres artefactos queda demostrado.
- **T5.9.1.2:** RED: fijar rechazo binario para mismatch de valor exacto, digest, repositorio, base/result, assignment/generation o evidencia de reconciliación; caller assertion y lectura inferida por S5.5 no cuentan. → RED: fijar rechazo binario para mismatch de valor exacto, digest, repositorio, base/result, assignment/generation o evidencia de reconciliación; caller assertion y lectura inferida por S5.5 no cuentan.
  - [ ] Cada mismatch y sustitución no canónica falla cerrado sin mutación parcial.
- **T5.9.1.3:** GREEN: implementar el contrato aprobado y persistir el binding por el writer canónico del Main store, sin modificar los productores existentes ni abrir un segundo store. → GREEN: implementar el contrato aprobado y persistir el binding por el writer canónico del Main store, sin modificar los productores existentes ni abrir un segundo store.
  - [ ] El binding aprobado queda persistido por el único writer canónico sin modificar productores.
- **T5.9.1.4:** REFACTOR: cerrar idempotencia de replay exacto, rechazo de replay divergente y atomicidad/readback sobre los bytes persistidos. → REFACTOR: cerrar idempotencia de replay exacto, rechazo de replay divergente y atomicidad/readback sobre los bytes persistidos.
  - [ ] Replay
  - [ ] atomicidad y readback quedan cerrados sobre los bytes persistidos.

### S5.10 — Persistir bajo autoridad exclusiva de Main una prueba inmutable que liga trabajo independiente completado a la decisión estacionada exacta y a la opción o supuesto explícito bajo el que se ejecutó.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Enrolamiento, cimientos.
- Depende de: S5.9
- Cimientos: —
- Recursos: Main store, writer lock y transacción canónicos
- Criterios de aceptación:
  - [ ] Existe un único binding autoritativo e inmutable en Main store entre evidencia exacta de trabajo completado, decisión estacionada exacta y opción enumerada o supuesto explícito bajo el que corrió.
  - [ ] La forma pública/versionada, la representación de opción/supuesto y el momento de sellado fueron decididos explícitamente durante SDD antes de tasks/apply; la ubicación Main store no se usa para inferirlos.
  - [ ] El binding nombra una identidad inmutable del trabajo/candidato y no puede construirse sólo después de completado mediante assertion del caller o narrativa.
  - [ ] Mismatch de trabajo, decisión/digest, opción/supuesto, snapshot o revisión falla cerrado sin mutación parcial.
  - [ ] Replay byte-idéntico es idempotente y replay divergente produce cero efectos adicionales.
  - [ ] Persistencia, inmutabilidad y readback ocurren bajo el writer, lock y transacción canónicos de Main; no existe store ni writer paralelo.
  - [ ] S5.5 consume la prueba sin inferirla localmente y S7.1 puede atribuir la evidencia al candidato y supuesto exactos; esto está verificado por construcción porque ambos consumidores son posteriores.
  - [ ] El diff de implementación no toca ningún path fuera del Área.

#### M5.10.1 — Provenance del trabajo completado bajo decisión
Rutas históricas (evidencia): contracts/completed-work-binding.mjs, contracts/schema-registry.mjs, contracts/validate.mjs, schemas/completed-work-binding-v1.schema.json, main-store/store.mjs, test/contracts/completed-work-binding.test.mjs, test/fixtures/contracts/schema-cases-v1.json, test/main-store.test.mjs

- **T5.10.1.1:** RED: demostrar que una evidencia de trabajo completado puede existir hoy sin identidad inmutable de la decisión estacionada ni de la opción/supuesto bajo el que corrió. → RED: demostrar que una evidencia de trabajo completado puede existir hoy sin identidad inmutable de la decisión estacionada ni de la opción/supuesto bajo el que corrió.
  - [ ] Una evidencia de trabajo completado sin identidad inmutable de decisión ni opción o supuesto queda demostrada y rechazada.
- **T5.10.1.2:** RED: fijar rechazo binario para mismatch de candidato/evidencia de trabajo, decisión/digest, opción enumerada o supuesto explícito, snapshot y revisión; una declaración posterior del caller no cuenta. → RED: fijar rechazo binario para mismatch de candidato/evidencia de trabajo, decisión/digest, opción enumerada o supuesto explícito, snapshot y revisión; una declaración posterior del caller no cuenta.
  - [ ] Cada mismatch y declaración posterior del caller falla cerrado sin mutación parcial.
- **T5.10.1.3:** GREEN: implementar el contrato aprobado y persistir el binding por el writer canónico del Main store, serializado después de S5.9 y sin abrir un segundo store. → GREEN: implementar el contrato aprobado y persistir el binding por el writer canónico del Main store, serializado después de S5.9 y sin abrir un segundo store.
  - [ ] El binding aprobado se persiste por el writer canónico después de S5.9 sin segundo store.
- **T5.10.1.4:** REFACTOR: cerrar inmutabilidad, replay exacto, replay divergente, atomicidad y readback de la provenance completa. → REFACTOR: cerrar inmutabilidad, replay exacto, replay divergente, atomicidad y readback de la provenance completa.
  - [ ] Inmutabilidad
  - [ ] replay
  - [ ] atomicidad y readback quedan cerrados sobre la provenance completa.

### S5.13 — Retirar de la Torre la verificación de proceso de la entrega y transportar sólo un recibo opaco, sin interpretación ni gate.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Capacidades, Contratos, Enrolamiento, Entrega, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Cero usos activos de documentation&#95;close, required&#95;checks&#95;digest y required&#95;reviews&#95;digest en runtime, schemas, contratos y tests activos; sólo pueden quedar menciones históricas o de autoridad.
  - [ ] Las ocurrencias de horizon&#95;ceiling, policy&#95;report&#95;digest y verification&#95;digest son exactamente las mismas que antes del cambio.
  - [ ] La suite conserva en verde los cinco pisos de seguridad, el ledger, el lock por candidato y la reconciliación.
  - [ ] bin/torre y el payload derivado no cambian de miembros.
  - [ ] La frontera Torre-gentle-ai no contiene ninguna condición de bloqueo por calidad de trabajo.
  - [ ] process&#95;receipt&#95;digest es opcional en candidate-revision-v1 y obligatorio en delivery-record-v1 como digest o literal absent.
  - [ ] Una entrega sin recibo completa igual y registra absent.
  - [ ] Ninguna línea de producción parsea, compara ni ramifica sobre el contenido del recibo.
  - [ ] Un recibo escrito después de congelada candidate&#95;revision es rechazado.

#### M5.13.1 — Retiro de verificación de proceso en delivery-policy
Rutas históricas (evidencia): AGENTS.md, policy/delivery-policy.mjs, schemas/delivery-policy-v1.schema.json, test/policy/delivery-policy.test.mjs, test/policy/jornada.test.mjs

- **T5.13.1.1:** RED: política sin documentation&#95;close; bloque ausente o malformado sigue fallando cerrado. → RED: política sin documentation&#95;close; bloque ausente o malformado sigue fallando cerrado.
  - [ ] La política rechaza un bloque ausente o malformado sin exigir documentation&#95;close.
- **T5.13.1.2:** GREEN: retirar documentation&#95;close del bloque y la prosa de AGENTS.md, del schema y de strict, choose() y restrictiveDefaults. → GREEN: retirar documentation&#95;close del bloque y la prosa de AGENTS.md, del schema y de strict, choose() y restrictiveDefaults.
  - [ ] documentation&#95;close queda retirado de todas las superficies autorizadas sin reemplazo.
- **T5.13.1.3:** CHECKS: preservar el autorizador de merge, forma y destino de entrega, horizonte y los cinco floors. → CHECKS: preservar el autorizador de merge, forma y destino de entrega, horizonte y los cinco floors.
  - [ ] El autorizador de merge
  - [ ] la forma y destino de entrega
  - [ ] el horizonte y los cinco floors permanecen intactos.

#### M5.13.2 — Retiro contractual de digests y sellado opcional del recibo
Rutas históricas (evidencia): schemas/candidate-revision-v1.schema.json, schemas/authorization-v1.schema.json, contracts/schema-registry.mjs, contracts/validate.mjs, test/contracts/schema.test.mjs, test/contracts/s3-2-schemas.test.mjs, test/fixtures/contracts/schema-cases-v1.json, test/main-store.test.mjs, test/escalation/request.test.mjs, test/install/launch-worker-cli.test.mjs

- **T5.13.2.1:** RED: fijar el comportamiento de schemas de candidato y autorización sin los digests jubilados. → RED: fijar el comportamiento de schemas de candidato y autorización sin los digests jubilados.
  - [ ] Los schemas rechazan los digests jubilados y cubren el recibo opcional.
- **T5.13.2.2:** GREEN: retirar los digests jubilados y sellar el recibo de proceso opcional en la identidad congelada del candidato. → GREEN: retirar los digests jubilados y sellar el recibo de proceso opcional en la identidad congelada del candidato.
  - [ ] El recibo opcional queda ligado a la identidad congelada y los digests retirados desaparecen.
- **T5.13.2.3:** CHECKS: actualizar sólo las fixturas autorizadas y verificar identidad de freeze y rechazo de escritura posterior al freeze. → CHECKS: actualizar sólo las fixturas autorizadas y verificar identidad de freeze y rechazo de escritura posterior al freeze.
  - [ ] Sólo cambian las fixturas autorizadas y toda escritura posterior al freeze es rechazada.

#### M5.13.3 — Transporte opaco del recibo al ledger
Rutas históricas (evidencia): delivery/workflow.mjs, delivery/ledger.mjs, schemas/delivery-record-v1.schema.json, test/delivery/correction-security.test.mjs, test/delivery/workflow.test.mjs

- **T5.13.3.1:** RED: cubrir registros de entrega con recibo ausente y suministrado. → RED: cubrir registros de entrega con recibo ausente y suministrado.
  - [ ] Los casos con recibo ausente y suministrado quedan cubiertos.
- **T5.13.3.2:** GREEN: exigir digest o absent, transportar literalmente el valor y retirar la rama de checks. → GREEN: exigir digest o absent, transportar literalmente el valor y retirar la rama de checks.
  - [ ] El ledger recibe literalmente digest o absent sin gate de checks.
- **T5.13.3.3:** CHECKS: probar que no hay parseo ni ramificación por contenido y preservar ledger, lock y reconciliación. → CHECKS: probar que no hay parseo ni ramificación por contenido y preservar ledger, lock y reconciliación.
  - [ ] No existe parseo ni ramificación por contenido y ledger
  - [ ] lock y reconciliación permanecen intactos.

### S5.14 — La profundidad de planificación deja de estar clavada y pasa a provenir de la política resuelta sin que la Torre interprete nombres de fase ni números de horizonte.
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Capacidades, Contratos, Entrega.
- Depende de: S5.13
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] rg 'TAREAS' continuation/ policy/ devuelve cero ocurrencias.
  - [ ] El 2 de horizon sale del código y proviene de planning.horizon&#95;ceiling.
  - [ ] Un proyecto que declare otra profundidad continúa sin tocar una línea de la Torre.
  - [ ] Una política sin prepare&#95;through falla cerrado, con su código, y no asume un default permisivo.
  - [ ] horizon&#95;ceiling, merge.authorizing&#95;party, delivery.shape y los cinco pisos de assertFloorProtected conservan exactamente el mismo comportamiento.
  - [ ] bun test no introduce fallos nuevos; el diff no toca ninguna ruta prohibida por el contrato histórico.

#### M5.14.1 — prepare&#95;through como política
Rutas históricas (evidencia): schemas/delivery-policy-v1.schema.json, policy/delivery-policy.mjs, test/policy/delivery-policy.test.mjs

- **T5.14.1.1:** RED: una política sin prepare&#95;through falla cerrado; con un valor arbitrario no vacío resuelve. → RED: una política sin prepare&#95;through falla cerrado; con un valor arbitrario no vacío resuelve.
  - [ ] Una política sin prepare&#95;through falla cerrado y una política con valor no vacío resuelve.
- **T5.14.1.2:** GREEN: el campo vive en planning, junto a horizon&#95;ceiling, con default restrictivo. → GREEN: el campo vive en planning, junto a horizon&#95;ceiling, con default restrictivo.
  - [ ] prepare&#95;through vive en planning junto a horizon&#95;ceiling y conserva default restrictivo.
- **T5.14.1.3:** REFACTOR: choose() y restrictiveDefaults lo tratan igual que a horizon&#95;ceiling, sin rama propia. → REFACTOR: choose() y restrictiveDefaults lo tratan igual que a horizon&#95;ceiling, sin rama propia.
  - [ ] choose() y restrictiveDefaults tratan prepare&#95;through igual que horizon&#95;ceiling sin rama propia.

#### M5.14.2 — La continuación deja de interpretar
Rutas históricas (evidencia): continuation/integrated-base.mjs, test/continuation/derivation.test.mjs, test/continuation/integrated-base.test.mjs, test/continuation/support.test.mjs

- **T5.14.2.1:** RED: validatePlanning acepta un prepare&#95;through distinto de TAREAS si coincide con la política y rechaza el que no coincide. → RED: validatePlanning acepta un prepare&#95;through distinto de TAREAS si coincide con la política y rechaza el que no coincide.
  - [ ] validatePlanning acepta coincidencia con política y rechaza divergencia sin exigir TAREAS.
- **T5.14.2.2:** GREEN: el literal TAREAS y el 2 clavado salen; el valor se compara contra la política resuelta. → GREEN: el literal TAREAS y el 2 clavado salen; el valor se compara contra la política resuelta.
  - [ ] La continuación compara prepare&#95;through y horizon con la política resuelta sin literales clavados.
- **T5.14.2.3:** REFACTOR: validatePlanning no conoce ningún nombre de fase ni ningún número de horizonte. → REFACTOR: validatePlanning no conoce ningún nombre de fase ni ningún número de horizonte.
  - [ ] validatePlanning no conoce nombres de fase ni números de horizonte.

### S5.15 — Ninguna línea de producción de la Torre abre un documento de plan; deriveNextModule y session-plan-snapshot se retiran, mientras compareWorkerClaim sobrevive intacto.
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos, Entrega, Instalación.
- Depende de: S5.5, S102
- Cimientos: —
- Recursos: RUNTIME&#95;PAYLOAD&#95;FILES
- Criterios de aceptación:
  - [ ] rg 'matchAll' continuation/ contracts/ no devuelve una sola lectura de documento de plan.
  - [ ] compareWorkerClaim conserva exactamente su comportamiento y sus pruebas.
  - [ ] session-plan-snapshot sale del registro de schemas, del payload y del árbol, con sus bytes preservados en una rama de archivo.
  - [ ] RUNTIME&#95;PAYLOAD&#95;FILES mantiene igualdad exacta de conjunto y ningún miembro queda sin llamador.
  - [ ] support/agent.mjs y support/manifest.mjs no cambian un byte; la lectura de planes queda entera del lado del agente.
  - [ ] continuation/integrated-base.mjs no cambia un byte.
  - [ ] bun test no introduce fallos nuevos; el diff no toca ninguna ruta del Prohibido histórico.

#### M5.15.1 — Retiro del enumerador de plan
Rutas históricas (evidencia): continuation/derivation.mjs, test/continuation/derivation.test.mjs

- **T5.15.1.1:** RED: probar que deriveNextModule todavía existe y abre bytes de plan, y que compareWorkerClaim no los toca. → RED: probar que deriveNextModule todavía existe y abre bytes de plan, y que compareWorkerClaim no los toca.
  - [ ] deriveNextModule queda probado como lector de bytes de plan y compareWorkerClaim queda probado como independiente de esos bytes.
- **T5.15.1.2:** GREEN: retirar deriveNextModule y sus pruebas; compareWorkerClaim queda sin cambios de comportamiento. → GREEN: retirar deriveNextModule y sus pruebas; compareWorkerClaim queda sin cambios de comportamiento.
  - [ ] deriveNextModule y sus pruebas quedan retirados mientras compareWorkerClaim conserva su comportamiento.
- **T5.15.1.3:** REFACTOR: rg 'matchAll&#124;&#35;&#35;&#35; Módulo' continuation/ devuelve cero. → REFACTOR: rg 'matchAll&#124;&#35;&#35;&#35; Módulo' continuation/ devuelve cero.
  - [ ] continuation no conserva enumeración de planes por matchAll ni encabezados de Módulo.

#### M5.15.2 — Retiro del lector de planes y del payload
Rutas históricas (evidencia): contracts/schema-registry.mjs, install/runtime-payload.mjs, test/contracts/session-plan-snapshot.test.mjs, test/install/entrypoint-resolution.test.mjs, test/install/lifecycle.test.mjs, test/install/payload-closure.test.mjs, test/install/runtime-payload.test.mjs

- **T5.15.2.1:** RED: probar que session-plan-snapshot sigue declarado en el registro de schemas y viaja en el payload. → RED: probar que session-plan-snapshot sigue declarado en el registro de schemas y viaja en el payload.
  - [ ] La declaración de session-plan-snapshot en el registro y el payload queda demostrada.
- **T5.15.2.2:** GREEN: retirar módulo, schema, registro y membresía de payload, preservando los bytes en una rama de archivo. → GREEN: retirar módulo, schema, registro y membresía de payload, preservando los bytes en una rama de archivo.
  - [ ] Módulo
  - [ ] schema
  - [ ] registro y membresía quedan retirados con sus bytes preservados.
- **T5.15.2.3:** REFACTOR: RUNTIME&#95;PAYLOAD&#95;FILES conserva igualdad exacta de conjunto y ningún miembro queda sin llamador. → REFACTOR: RUNTIME&#95;PAYLOAD&#95;FILES conserva igualdad exacta de conjunto y ningún miembro queda sin llamador.
  - [ ] RUNTIME&#95;PAYLOAD&#95;FILES conserva igualdad exacta y todos sus miembros tienen llamador.

### S8.14 — Perfiles permanentes Tower, neutrales al host
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Instalación, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: contrato repo-owned de los tres perfiles permanentes
- Criterios de aceptación:
  - [ ] Existen exactamente tres perfiles permanentes repo-owned y host-neutral: Main/coordinator, Support e Implementer; Planner no se instala como cuarto perfil.
  - [ ] Main y Support carecen de bash, write y edit; Implementer conserva bash y ninguna capability contradice la decisión 83.
  - [ ] Las cinco fuentes canónicas declaradas y test/install/tower-role-assets.test.mjs son la única autoridad del contrato; no se copian perfiles globales ni específicos de Pi/OpenCode.
  - [ ] La prueba enfocada falla ante perfil faltante/extra, nombre o capability incorrectos y referencia a una fuente no canónica.
  - [ ] El diff de implementación toca sólo Área.

#### M8.14.1 — Contratos canónicos de perfil
Rutas históricas (evidencia): profiles/tower/main.md, profiles/tower/support.md, profiles/tower/implementer.md

- **T8.14.1.1:** RED: cubrir tres perfiles exactos, ausencia de Planner, neutralidad de host y matriz de capabilities de la decisión 83. → RED: cubrir tres perfiles exactos, ausencia de Planner, neutralidad de host y matriz de capabilities de la decisión 83.
  - [ ] Tres perfiles exactos
  - [ ] ausencia de Planner
  - [ ] neutralidad de host y matriz de capabilities quedan cubiertos.
- **T8.14.1.2:** GREEN: crear profiles/tower/{main,support,implementer}.md con identidad y autoridad mínimas. → GREEN: crear profiles/tower/{main,support,implementer}.md con identidad y autoridad mínimas.
  - [ ] Los tres perfiles canónicos existen con identidad y autoridad mínimas.
- **T8.14.1.3:** REFACTOR: eliminar duplicación entre perfiles y estabilizar nombres, referencias y rechazo de una cuarta identidad. → REFACTOR: eliminar duplicación entre perfiles y estabilizar nombres, referencias y rechazo de una cuarta identidad.
  - [ ] No hay duplicación evitable y una cuarta identidad se rechaza.

#### M8.14.2 — Ownership de skills y guardia de instalación
Rutas históricas (evidencia): skills/torre-control-entregas/SKILL.md, test/install/tower-role-assets.test.mjs

- **T8.14.2.1:** RED: cubrir fuentes canónicas faltantes, extras o externas y drift entre perfiles, skills propietarias y assets instalables. → RED: cubrir fuentes canónicas faltantes, extras o externas y drift entre perfiles, skills propietarias y assets instalables.
  - [ ] Fuentes faltantes
  - [ ] extras o externas y drift entre perfiles
  - [ ] skills y assets fallan cerrado.
- **T8.14.2.2:** GREEN: ligar torre-control-entregas y agente-soporte a los tres perfiles y completar tower-role-assets.test.mjs. → GREEN: ligar torre-control-entregas y agente-soporte a los tres perfiles y completar tower-role-assets.test.mjs.
  - [ ] Las skills históricas quedan ligadas a los tres perfiles y cubiertas por la guardia.
- **T8.14.2.3:** REFACTOR: dejar una sola enumeración auditable, sin Planner permanente ni dependencia de assets globales. → REFACTOR: dejar una sola enumeración auditable, sin Planner permanente ni dependencia de assets globales.
  - [ ] Existe una sola enumeración auditable sin Planner permanente ni assets globales.

### S9.1 — Pool de asientos permanentes y asignación por Main
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Instalación, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: registro de asientos, binding de asignación
- Criterios de aceptación:
  - [ ] El pool fijo contiene tres asientos permanentes que no se crean ni destruyen por Sesión.
  - [ ] El rol y la lane pertenecen a la asignación y no especializan el asiento.
  - [ ] Los asientos son intercambiables y el primer asiento libre se elige en orden determinista.
  - [ ] Main consulta asientos libres y liga path, rama y base&#95;sha sin persistir ocupación.
  - [ ] La rama cumple el formato tipo/sesión-slug antes de elegir un asiento.
  - [ ] Un pool lleno falla cerrado sin crear un cuarto asiento.
  - [ ] El reciclador manual permanece intacto y la asignación no cambia rama ni base.

#### M9.1.1 — Superficie histórica entregada del pool permanente y su exposición por Main
Rutas históricas (evidencia): bin/torre, hosts/seat-cli.mjs, install/runtime-payload.mjs, skills/torre-control/SKILL.md, test/hosts/seat-cli.test.mjs, test/install/runtime-payload.test.mjs, test/workspace/slots.test.mjs, workspace/slots.mjs

- **T9.1.1.1:** RED: cubrir provisión idempotente, asignación determinista y rechazo de entradas inválidas o pool ocupado. → RED: cubrir provisión idempotente, asignación determinista y rechazo de entradas inválidas o pool ocupado.
  - [ ] La prueba falla sin provisión idempotente
  - [ ] asignación determinista y rechazo seguro.
- **T9.1.1.2:** GREEN: implementar el pool fijo de tres asientos y exponer consulta, provisión y asignación por Main. → GREEN: implementar el pool fijo de tres asientos y exponer consulta, provisión y asignación por Main.
  - [ ] El pool fijo y su exposición por Main satisfacen el contrato aprobado sin persistir ocupación.
- **T9.1.1.3:** REFACTOR: consolidar el binding y verificar que la asignación no modifica el reciclador manual. → REFACTOR: consolidar el binding y verificar que la asignación no modifica el reciclador manual.
  - [ ] El binding conserva path
  - [ ] rama y base&#95;sha y no cambia rama
  - [ ] base ni reciclador manual.

### S9.3 — Caché externa congelada de Bun
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: sin dueño actual.
- Depende de: S9.1
- Cimientos: —
- Recursos: roots externas exactas de caché y estado, lock por input-digest
- Criterios de aceptación:
  - [ ] bun ci corre siempre; caché, receipt o árbol previo nunca autorizan omitirlo.
  - [ ] El fingerprint liga inputs, versión de Bun, CPU/OS, roots, argv y environment exactos.
  - [ ] La publicación del receipt ocurre atómicamente después de una instalación exitosa.
  - [ ] Una instalación parcial falla cerrado en vez de aceptarse.
  - [ ] El diff toca sólo el Área histórica y no introduce autoridad Main, SQLite ni API pública.
  - [ ] Trazabilidad de territorio histórico: se preservan sólo los ocho archivos actualmente tracked que expanden exactamente test/workspace/&#42;&#42; y los tests de schemas citados; workspace/dependency-cache.mjs, schemas/dependency-fingerprint-v1.schema.json y schemas/dependency-install-receipt-v1.schema.json están ausentes y quedan excluidos sin sustitutos.
Rutas históricas (evidencia): test/workspace/checkpoint.test.mjs, test/workspace/pi-binding.test.mjs, test/workspace/pi-supervisor.test.mjs, test/workspace/reconciliation.test.mjs, test/workspace/seat-inventory.test.mjs, test/workspace/slots.test.mjs, test/contracts/s3-2-schemas.test.mjs, test/contracts/schema.test.mjs


### S9.4 — Binding del launcher Pi y failure fence — contrato histórico
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos.
- Depende de: S106
- Cimientos: —
- Recursos: namespace de proceso y raíz Pi
- Criterios de aceptación:
  - [ ] El binding exacto se valida antes y después de cada await contra el contexto de S4.10, el keepalive Tower-owned se registra dentro de esa frontera verificada y observeProcess comprueba que PID, cwd y start-token del kernel coinciden antes y después de la observación async.
  - [ ] runtimeRoute es dato puro; preparación y validación no crean socket, archivo, listener, lock, reserva ni capacidad de close/release.
  - [ ] Ruta inválida o stale, pérdida del binding actual o dispose antes de start dejan cero broker/listener y ejecutan cero cleanup.
  - [ ] broker.start, llamado dentro de S4.10 acquireAtReservation, es el primer efecto y devuelve el close exacto que S4.10 retiene como owner.
  - [ ] Todo fallo posterior a start consume ese close exacto o deja la adquisición en cuarentena explícita; ninguna capa reconstruye o adivina cleanup.
  - [ ] Repetir el mismo input converge; conflicto o pérdida de actualidad fallan cerrado sin promover una ruta o binding rival.
  - [ ] El mailbox sigue volátil y no autoritativo; no se agrega mensajería durable, broker compartido, adopción de procesos ajenos, aislamiento de OS ni cambios a Pi/pi-intercom.
  - [ ] Strict TDD registra RED enfocado, suite combinada y suite completa verdes; el diff toca exactamente Área y cada Módulo queda en un commit independiente/revertible de ≤400 líneas authored.

#### M9.4.1 — Verificador de binding exacto
Rutas históricas (evidencia): workspace/pi-binding.mjs, test/workspace/pi-binding.test.mjs

- **T9.4.1.1:** RED: fijar la matriz de binding exacto antes/después de await, stale, conflicto y pérdida de actualidad. → RED: fijar la matriz de binding exacto antes/después de await, stale, conflicto y pérdida de actualidad.
  - [ ] RED: binding exacto antes/después de await, stale, conflicto y pérdida de actualidad quedan cubiertos.
- **T9.4.1.2:** GREEN: implementar el verificador mínimo sin cambiar forma pública ni adquirir recursos. → GREEN: implementar el verificador mínimo sin cambiar forma pública ni adquirir recursos.
  - [ ] GREEN: el verificador conserva la forma pública y no adquiere recursos.
- **T9.4.1.3:** TRIANGULATE/REFACTOR: cubrir alternos negativos y simplificar manteniendo el RED enfocado verde. → TRIANGULATE/REFACTOR: cubrir alternos negativos y simplificar manteniendo el RED enfocado verde.
  - [ ] TRIANGULATE/REFACTOR: alternos negativos quedan cubiertos sin perder el RED enfocado verde.

#### M9.4.2 — Supervisor de ruta pura y adquisición broker-first
Rutas históricas (evidencia): workspace/pi-supervisor.mjs, test/workspace/pi-supervisor.test.mjs

- **T9.4.2.1:** RED: cubrir la matriz async/effect completa — invalid, stale, dispose pre-start, start, fallo post-start, cuarentena, convergencia, conflicto y pérdida de actualidad. → RED: cubrir la matriz async/effect completa — invalid, stale, dispose pre-start, start, fallo post-start, cuarentena, convergencia, conflicto y pérdida de actualidad.
  - [ ] RED: la matriz async/effect completa queda cubierta.
- **T9.4.2.2:** GREEN: producir runtimeRoute puro y hacer broker.start primero dentro de S4.10 acquireAtReservation, preservando ownership y close exactos de S4.10. → GREEN: producir runtimeRoute puro y hacer broker.start primero dentro de S4.10 acquireAtReservation, preservando ownership y close exactos de S4.10.
  - [ ] GREEN: runtimeRoute permanece puro y S4.10 retiene ownership y close exactos.
- **T9.4.2.3:** TRIANGULATE/REFACTOR: cerrar alternos, correr suites combinada y completa y verificar límites de Área, efectos y rollback. → TRIANGULATE/REFACTOR: cerrar alternos, correr suites combinada y completa y verificar límites de Área, efectos y rollback.
  - [ ] TRIANGULATE/REFACTOR: alternos, suites, límites de Área, efectos y rollback quedan cerrados.

### S9.5 — Topología y materialización visual determinista
- Estado derivado: 📚 ARCHIVADO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, cimientos.
- Depende de: S1.18, S9.7
- Cimientos: —
- Recursos: sesión Herdr enfocada, tabs/panes exactos y worktrees aprobados; sin autoridad de dispatch, DB, lifecycle de worktrees ni token de entrega
- Criterios de aceptación:
  - [ ] Herdr materializa exactamente tabs &#96;MAIN&#96;, &#96;SUPPORT&#96; y &#96;AGENTES&#96;; ningún alias o label aproximado pasa.
  - [ ] MAIN y SUPPORT ocupan sus panes/worktrees exactos y AGENTES contiene sólo workers enumerados por el brief.
  - [ ] Antes de cualquier prompt, cada pane prueba por readback &#96;cwd&#96; y &#96;foreground&#95;cwd&#96; iguales al worktree aprobado; mismatch falla cerrado sin reparar por inferencia.
  - [ ] Repetir el mismo input converge sin duplicar tabs, panes o procesos; un recurso ajeno nunca se cierra ni reutiliza.
  - [ ] El diff toca sólo &#96;Área&#96; y no despacha trabajo, modifica skills, Pi/Intercom, worktrees ni runtime vivo.

#### M9.5.1 — Materialización y readback Herdr
Rutas históricas (evidencia): hosts/herdr-topology.mjs, test/hosts/herdr-topology.test.mjs, workspace/herdr-seat-materializer.mjs, test/workspace/herdr-seat-materializer.test.mjs

- **T9.5.1.1:** RED: cubrir labels exactos, pane extra/faltante, worktree/cwd/foreground&#95;cwd divergentes, repetición y recurso ajeno. → RED: cubrir labels exactos, pane extra/faltante, worktree/cwd/foreground&#95;cwd divergentes, repetición y recurso ajeno.
  - [ ] RED: labels exactos, pane extra/faltante, worktree/cwd/foreground&#95;cwd divergentes, repetición y recurso ajeno quedan cubiertos.
- **T9.5.1.2:** GREEN: componer el materializador sobre hosts/herdr-topology.mjs y devolver evidencia por pane sin despachar. → GREEN: componer el materializador sobre hosts/herdr-topology.mjs y devolver evidencia por pane sin despachar.
  - [ ] GREEN: el materializador devuelve evidencia por pane sin despachar.
- **T9.5.1.3:** REFACTOR: eliminar topología duplicada, estabilizar readback/fallback y probar convergencia. → REFACTOR: eliminar topología duplicada, estabilizar readback/fallback y probar convergencia.
  - [ ] REFACTOR: topología duplicada eliminada, readback/fallback estabilizado y convergencia probada.

### S9.9 — Binding explícito de workspace Herdr
- Estado derivado: ✅ COMPLETO
- Zona/Área: hosts · hosts/, adapters/, extensions/, plugin/, test/hosts/, test/adapters/, test/extensions/, test/plugin/, test/host-adapters.test.mjs, scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs
- Depende de: —
- Cimientos: test/install/launch-worker-cli.test.mjs, hosts/herdr-topology.mjs, test/hosts/herdr-topology.test.mjs, hosts/seat-cli.mjs, test/hosts/seat-cli.test.mjs
- Recursos: binding explícito de workspace Herdr y fixtures aislados; cero mutación real
- Criterios de aceptación:
  - [ ] hosts/herdr-topology.mjs, hosts/seat-cli.mjs, test/hosts/herdr-topology.test.mjs, test/hosts/seat-cli.test.mjs y test/install/launch-worker-cli.test.mjs; sin fallback.
  - [ ] Focused 36/0/139; full 1175/0/6390/88; 243 authored.

#### M9.9.1 — Propagación, scope y readback del workspace entregados
Rutas: hosts/herdr-topology.mjs, hosts/seat-cli.mjs, test/hosts/herdr-topology.test.mjs, test/hosts/seat-cli.test.mjs

- **T9.9.1.1:** RED correctivo registrado → 17/4 antecedente
  - [ ] Cierre entregado.
- **T9.9.1.2:** GREEN propagación y readback → entregado
  - [ ] Cierre entregado.
- **T9.9.1.3:** REFACTOR fixtures y negativos → entregado
  - [ ] Cierre entregado.

### S9.6 — Interceptor de intención Pi-first
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Hosts.
- Depende de: —
- Cimientos: —
- Recursos: cadena global de transforms pi.on("input"); snapshot exacto del conjunto de extensiones y su orden revisado; fingerprint cerrado de capacidades del runtime Pi instalado, con Pi 0.84.4 sólo como baseline probado y registro de evidencia; un único snapshot capturado de bytes validados, provenance y digest de la skill torre-control. Sin DB, migraciones, worktree lifecycle, Herdr ni token de entrega
- Criterios de aceptación:
  - [ ] Tras una coincidencia enrolada única, cada una de las cuatro frases autorizadas produce el bloque expandido exacto de Pi &lt;skill name="torre-control" location="…"&gt;…&lt;/skill&gt; desde un snapshot validado más contexto de Sesión normalizado; ninguna otra frase se acepta y nunca se emite un literal /skill:torre-control.
  - [ ] Tras una coincidencia enrolada única, /skill:session-kickoff ... se reescribe al mismo bloque expandido con el contexto normalizado; no existe route válido al kickoff genérico.
  - [ ] Antes del route se prueba una coincidencia canónica única de enrolamiento Tower; sólo después la carga real y el fingerprint cerrado prueban factory de extensión de un argumento, pi.on("input"), campos y source requeridos de InputEvent, continue&#124;transform&#124;handled, notificación local e inventario/orden revisados de transforms, junto con bytes/provenance/digest exactos de la skill inmutable y package manifest; capacidad ausente, rota o ambigua, fallo de carga, incompatibilidad o drift posterior a la captura terminan en CT&#95;PI&#95;TOWER&#95;&#42; handled y cero turno de modelo, mientras la versión por sí sola no acepta ni rechaza.
  - [ ] Evidencia de enrolamiento insegura, corrupta o ambigua ante input Tower-shaped, e input Tower-shaped inválido en un repositorio enrolado único, fallan cerrados con error local estable CT&#95;PI&#95;TOWER&#95;&#42; handled y cero turno de modelo; no hay degradación genérica ni prioridad asumida.
  - [ ] Un repositorio ordinariamente no enrolado, sin evidencia candidata, devuelve continue byte por byte para cualquier input, incluidas frases o invocaciones parecidas a intención Tower; input non-Tower hace lo mismo en todos los repositorios, sin transformación ni falsa captura.
  - [ ] Repetir el mismo input bajo el mismo snapshot capturado de skill, manifest y transforms converge al mismo resultado y evidencia ese único snapshot validado.
  - [ ] El diff toca sólo Área; no modifica Pi core, skills genéricas, torre-control, runtime global, worktrees ni evidencia estacionada.
  - [ ] Este cierre completa la fuente Tower-owned y su contrato. No activa todavía el comportamiento global instalado: S8.12 debe empaquetar esos bytes y S8.13 debe materializar, probar, activar y poder revertir control-tower-activation.json.

#### M9.6.1 — Gramática cerrada y route inmutable
Rutas históricas (evidencia): extensions/pi/tower-session-router.ts, extensions/pi/package.json, test/extensions/pi/tower-session-router.test.mjs

- **T9.6.1.1:** RED: cubrir literalmente las cuatro frases, una quinta forma, Tower-shaped inválido tras enrolamiento único, input non-Tower, cada frase en repositorio ordinariamente no enrolado sin evidencia candidata, rewrite explícito de /skill:session-kickoff ... y el seam del gate de capacidad inyectable sin consultar una versión como autoridad. → RED: las cuatro frases autorizadas, quinta forma, Tower-shaped inválido, input non-Tower, enrolamiento y rewrite explícito quedan cubiertos sin gate de versión.
  - [ ] RED: las cuatro frases autorizadas, quinta forma, Tower-shaped inválido, input non-Tower, enrolamiento y rewrite explícito quedan cubiertos sin gate de versión.
- **T9.6.1.2:** GREEN: implementar el parser cerrado y, sólo tras una coincidencia enrolada única y un gate de capacidad inyectable aprobado, construir el bloque expandido exacto desde un único snapshot capturado de bytes validados más contexto de Sesión normalizado, sin emitir /skill:torre-control. → GREEN: el parser cerrado construye el bloque expandido exacto desde un único snapshot capturado validado sin emitir /skill:torre-control.
  - [ ] GREEN: el parser cerrado construye el bloque expandido exacto desde un único snapshot capturado validado sin emitir /skill:torre-control.
- **T9.6.1.3:** REFACTOR: estabilizar continue byte por byte para repositorio ordinariamente no enrolado y todo input non-Tower, y CT&#95;PI&#95;TOWER&#95;&#42; handled con cero turno de modelo para Tower-shaped inválido tras enrolamiento único o gate inyectado fallido, sin ampliar la gramática, introducir fallback ni acoplar el contrato fuente a una versión. → REFACTOR: continue y CT&#95;PI&#95;TOWER&#95;&#42; handled quedan estabilizados sin ampliar la gramática, fallback ni gate de versión.
  - [ ] REFACTOR: continue y CT&#95;PI&#95;TOWER&#95;&#42; handled quedan estabilizados sin ampliar la gramática, fallback ni gate de versión.

#### M9.6.2 — Preflight de enrolamiento, runtime, provenance y transforms
Rutas históricas (evidencia): extensions/pi/tower-session-router.ts, extensions/pi/package.json, test/extensions/pi/tower-session-router.test.mjs

- **T9.6.2.1:** RED: cubrir repositorio ordinariamente no enrolado sin cambios, evidencia candidata insegura/corrupta/ambigua con input Tower-shaped, y tras match enrolado único fallo de carga, factory/ pi.on("input")/InputEvent/source/resultados/notificación inválidos, skill o manifest divergente, snapshot mutado, conflicto e inventario/orden ambiguo, manteniendo Pi 0.84.4 sólo como baseline. → RED: enrolamiento, runtime, provenance, manifest, snapshot y transforms inválidos quedan cubiertos sin gate de versión.
  - [ ] RED: enrolamiento, runtime, provenance, manifest, snapshot y transforms inválidos quedan cubiertos sin gate de versión.
- **T9.6.2.2:** GREEN: clasificar primero el enrolamiento; tras coincidencia enrolada única, hacer que carga real y extensions/pi/package.json produzcan y validen fingerprint cerrado de capacidades, provenance/digest de torre-control e inventario/orden revisados antes de capturar el único snapshot usado por el route, sin gate de versión. → GREEN: enrolamiento, fingerprint, provenance/digest e inventario/orden se validan antes del único snapshot del route sin gate de versión.
  - [ ] GREEN: enrolamiento, fingerprint, provenance/digest e inventario/orden se validan antes del único snapshot del route sin gate de versión.
- **T9.6.2.3:** REFACTOR: congelar snapshot/fingerprint/evidencia, probar convergencia y devolver CT&#95;PI&#95;TOWER&#95;&#42; handled ante evidencia insegura/corrupta/ambigua, capacidad ausente/rota/ambigua, fallo de carga, conflicto o drift posterior, sin depender de versión, prioridad implícita ni ejecutar un turno de modelo. → REFACTOR: snapshot/fingerprint/evidencia convergen y los fallos devuelven CT&#95;PI&#95;TOWER&#95;&#42; handled sin versión, prioridad implícita ni turno de modelo.
  - [ ] REFACTOR: snapshot/fingerprint/evidencia convergen y los fallos devuelven CT&#95;PI&#95;TOWER&#95;&#42; handled sin versión, prioridad implícita ni turno de modelo.

### S10.3 — Contrato de ejecución versionado
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Contratos.
- Depende de: S3.4
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El destino es byte-idéntico al origen y coincide en bytes, líneas y SHA-256
  - [ ] No se normaliza, genera ni modifica ningún otro archivo de runtime, schema o test
  - [ ] Ningún runtime lee &#96;~/.claude/&#96;; la fuente se consulta sólo durante la copia estructural
  - [ ] La excepción de tamaño se atribuye exclusivamente a este artefacto indivisible

#### M10.3.1 — Copia estructural del contrato
Rutas históricas (evidencia): schemas/execution-contract-v1.schema.json

- **T10.3.1.1:** RED: origen confirmado en 17.297 bytes, 407 líneas y SHA-256 &#96;2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc&#96;; destino ausente y worktree limpio en &#96;cdd0d09bcdd4d2104e54a7265d1dc3742ceea2e7&#96;. → RED: origen confirmado en 17.297 bytes, 407 líneas y SHA-256 &#96;2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc&#96;; destino ausente y worktree limpio en &#96;cdd0d09bcdd4d2104e54a7265d1dc3742ceea2e7&#96;.
  - [ ] RED: origen confirmado en 17.297 bytes, 407 líneas y SHA-256 &#96;2f4838aa244b30e280c5c558286b0e4d9fbb503a0ef1808ffc27501c1540fddc&#96;; destino ausente y worktree limpio en &#96;cdd0d09bcdd4d2104e54a7265d1dc3742ceea2e7&#96;.
- **T10.3.1.2:** GREEN: copia byte-idéntica creada únicamente en &#96;schemas/execution-contract-v1.schema.json&#96;, sin transformación. → GREEN: copia byte-idéntica creada únicamente en &#96;schemas/execution-contract-v1.schema.json&#96;, sin transformación.
  - [ ] GREEN: copia byte-idéntica creada únicamente en &#96;schemas/execution-contract-v1.schema.json&#96;, sin transformación.
- **T10.3.1.3:** REFACTOR: &#96;cmp&#96; confirmó identidad; readback confirmó 17.297 bytes, 407 líneas, SHA-256 esperado y modo Git &#96;100644&#96;. JSON parseó y conservó Draft 2020-12, &#96;$id&#96;, &#96;type: object&#96;, &#96;additionalProperties: false&#96;, 17 propiedades requeridas y &#96;$defs&#96; estructuralmente presentes. Runtime harness: N/A, artefacto pasivo sin frontera ejecutable. → REFACTOR: &#96;cmp&#96; confirmó identidad; readback confirmó 17.297 bytes, 407 líneas, SHA-256 esperado y modo Git &#96;100644&#96;. JSON parseó y conservó Draft 2020-12, &#96;$id&#96;, &#96;type: object&#96;, &#96;additionalProperties: false&#96;, 17 propiedades requeridas y &#96;$defs&#96; estructuralmente presentes. Runtime harness: N/A, artefacto pasivo sin frontera ejecutable.
  - [ ] REFACTOR: &#96;cmp&#96; confirmó identidad; readback confirmó 17.297 bytes, 407 líneas, SHA-256 esperado y modo Git &#96;100644&#96;. JSON parseó y conservó Draft 2020-12, &#96;$id&#96;, &#96;type: object&#96;, &#96;additionalProperties: false&#96;, 17 propiedades requeridas y &#96;$defs&#96; estructuralmente presentes. Runtime harness: N/A, artefacto pasivo sin frontera ejecutable.

### S10.1 — Preparación persistida de Jornada
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Jornada.
- Depende de: S10.3
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Ruta histórica aprobada: design-tasks — elaboración compacta del owner pasivo y gate consumidor; sin proposal/spec ni diseño productor de S10.2. No habilita una nueva ejecución de S10.1.
  - [ ] JSON canónico, digest, &#96;expires&#95;at&#96;, repositorio, worktree, rama, &#96;base&#95;sha&#96; y &#96;sesion&#95;id&#96; exactos se validan antes de persistir o declarar &#96;prepared&#96;
  - [ ] Contrato inválido, divergente o vencido falla cerrado, con cero llamadas de persistencia y sin estado &#96;prepared&#96;
  - [ ] Evidencia opaca de supervisión válida, vigente y coincidente se verifica después del contrato/contexto y antes de persistir; si está ausente, inválida, divergente o vencida hay cero llamadas de persistencia y no existe estado &#96;prepared&#96;
  - [ ] Sólo después de validar contrato, contexto y supervisión, una única llamada a la capability/root owner-only persiste pasivamente bajo &#96;jornada/&#42;&#42;&#96;; únicamente su éxito permite devolver &#96;prepared&#96;
  - [ ] &#96;S10.1&#96; no diseña ni produce evidencia de supervisión
  - [ ] No existe executor ni acceso a subprocess, Git, remoto, Main store o SQLite; ningún camino produce efectos
  - [ ] El diff no toca ninguna ruta fuera de &#96;jornada/&#42;&#42;&#96;, &#96;test/jornada/&#42;&#42;&#96; ni ninguna ruta prohibida: &#96;core.mjs&#96;, &#96;mcp.mjs&#96;, &#96;main-store/store.mjs&#96;, &#96;escalation/&#42;&#42;&#96;, &#96;delivery/&#42;&#42;&#96;, &#96;contracts/&#42;&#42;&#96; o &#96;schemas/&#42;&#42;&#96;; Main store y SQLite.

#### M10.1.1 — Validación canónica de contrato y contexto
Rutas históricas (evidencia): jornada/execution-contract.mjs, test/jornada/execution-contract.test.mjs

- **T10.1.1.1:** RED: rechazo de JSON/digest/expiry e identidad exacta divergentes con cero persistencia y sin &#96;prepared&#96;. → RED: rechazo de JSON/digest/expiry e identidad exacta divergentes con cero persistencia y sin &#96;prepared&#96;.
  - [ ] RED: rechazo de JSON/digest/expiry e identidad exacta divergentes con cero persistencia y sin &#96;prepared&#96;.
- **T10.1.1.2:** GREEN: contrato y contexto validados en una representación prevalidada, sin persistir ni declarar &#96;prepared&#96;. → GREEN: contrato y contexto validados en una representación prevalidada, sin persistir ni declarar &#96;prepared&#96;.
  - [ ] GREEN: contrato y contexto validados en una representación prevalidada, sin persistir ni declarar &#96;prepared&#96;.
- **T10.1.1.3:** REFACTOR: invariantes centralizadas; cero acceso a executor, subprocess, Git o remoto. → REFACTOR: invariantes centralizadas; cero acceso a executor, subprocess, Git o remoto.
  - [ ] REFACTOR: invariantes centralizadas; cero acceso a executor, subprocess, Git o remoto.

#### M10.1.2 — Gate consumidor de supervisión
Rutas históricas (evidencia): jornada/execution-contract.mjs, test/jornada/execution-contract.test.mjs

- **T10.1.2.1:** RED: evidencia opaca ausente, inválida, divergente o vencida deja cero persistencia y ningún &#96;prepared&#96;. → RED: evidencia opaca ausente, inválida, divergente o vencida deja cero persistencia y ningún &#96;prepared&#96;.
  - [ ] RED: evidencia opaca ausente, inválida, divergente o vencida deja cero persistencia y ningún &#96;prepared&#96;.
- **T10.1.2.2:** GREEN: evidencia válida, vigente y coincidente se verifica sólo después del contrato/contexto. → GREEN: evidencia válida, vigente y coincidente se verifica sólo después del contrato/contexto.
  - [ ] GREEN: evidencia válida, vigente y coincidente se verifica sólo después del contrato/contexto.
- **T10.1.2.3:** REFACTOR: frontera effect-incapable y ausencia de diseño productor de &#96;S10.2&#96; verificadas. → REFACTOR: frontera effect-incapable y ausencia de diseño productor de &#96;S10.2&#96; verificadas.
  - [ ] REFACTOR: frontera effect-incapable y ausencia de diseño productor de &#96;S10.2&#96; verificadas.

#### M10.1.3 — Persistencia pasiva owner-only
Rutas históricas (evidencia): jornada/execution-contract.mjs, test/jornada/execution-contract.test.mjs

- **T10.1.3.1:** RED: root/capability ausente, ajena o fallida prohíbe &#96;prepared&#96; prematuro. → RED: root/capability ausente, ajena o fallida prohíbe &#96;prepared&#96; prematuro.
  - [ ] RED: root/capability ausente, ajena o fallida prohíbe &#96;prepared&#96; prematuro.
- **T10.1.3.2:** GREEN: tras validar contrato, contexto y supervisión, una sola persistencia owner-only permite devolver &#96;prepared&#96;. → GREEN: tras validar contrato, contexto y supervisión, una sola persistencia owner-only permite devolver &#96;prepared&#96;.
  - [ ] GREEN: tras validar contrato, contexto y supervisión, una sola persistencia owner-only permite devolver &#96;prepared&#96;.
- **T10.1.3.3:** REFACTOR: readback/errores aislados sin Main store, SQLite ni writer alternativo. → REFACTOR: readback/errores aislados sin Main store, SQLite ni writer alternativo.
  - [ ] REFACTOR: readback/errores aislados sin Main store, SQLite ni writer alternativo.

### S10.2 — Supervisión sin armado local
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos.
- Depende de: S10.1
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Ruta histórica aprobada: design-tasks — cambia la semántica visible de supervisión, con arquitectura fijada por las decisiones 26 y 27; no autoriza una nueva ejecución de S10.2.
  - [ ] La Torre supervisa una ejecución sellada en un repositorio sin que ese repositorio quede armado
  - [ ] El productor, lector y validador externos atan exactamente proyecto, repositorio, worktree, &#96;base&#95;sha&#96;, &#96;sesion&#95;id&#96;, digest del contrato y vencimiento
  - [ ] Estado malformado, inseguro, enlazado simbólicamente, ajeno o divergente también falla cerrado
  - [ ] El seam consumidor real inyectado por &#96;S10.1&#96; acepta sólo supervisión válida, vigente y coincidente
  - [ ] No se crea &#96;.git/control-tower/ACTIVE&#96; ni se usa writer, lock o transacción del Main store, SQLite o token de entrega
  - [ ] &#96;bun test&#96; pasa completo durante una supervisión activa sobre este mismo repositorio
  - [ ] &#96;relayEligibility&#96; de &#96;remote-control&#96; sigue devolviendo &#96;frozen&#96; cuando la Torre está armada en su repositorio
  - [ ] &#96;remote-control&#96; queda sin cambios
  - [ ] Una supervisión ausente o vencida falla cerrado; no se degrada a ejecución sin supervisar
  - [ ] El diff no toca ninguna ruta fuera del Área histórica fijada por la elaboración técnica

#### M10.2.1 — Estado externo de supervisión
Rutas históricas (evidencia): supervision/state.mjs, test/supervision/state.test.mjs

- **T10.2.1.1:** RED: la prueba de comportamiento observó el fallo esperado antes de existir &#96;supervision/state.mjs&#96;; cubre productor, lector, validador, seam real de &#96;S10.1&#96; y rechazos ausente, malformado, inseguro, enlazado simbólicamente, ajeno, vencido o divergente. → RED: la prueba de comportamiento observó el fallo esperado antes de existir &#96;supervision/state.mjs&#96;; cubre productor, lector, validador, seam real de &#96;S10.1&#96; y rechazos ausente, malformado, inseguro, enlazado simbólicamente, ajeno, vencido o divergente.
  - [ ] RED: la prueba de comportamiento observó el fallo esperado antes de existir &#96;supervision/state.mjs&#96;; cubre productor, lector, validador, seam real de &#96;S10.1&#96; y rechazos ausente, malformado, inseguro, enlazado simbólicamente, ajeno, vencido o divergente.
- **T10.2.1.2:** GREEN: &#96;supervision/state.mjs&#96; publica y lee fail-closed con binding exacto, vencimiento y writer/lock exclusivo por proyecto, sin crear &#96;ACTIVE&#96; ni acceder a Main store, SQLite, token de entrega o &#96;remote-control&#96;. → GREEN: &#96;supervision/state.mjs&#96; publica y lee fail-closed con binding exacto, vencimiento y writer/lock exclusivo por proyecto, sin crear &#96;ACTIVE&#96; ni acceder a Main store, SQLite, token de entrega o &#96;remote-control&#96;.
  - [ ] GREEN: &#96;supervision/state.mjs&#96; publica y lee fail-closed con binding exacto, vencimiento y writer/lock exclusivo por proyecto, sin crear &#96;ACTIVE&#96; ni acceder a Main store, SQLite, token de entrega o &#96;remote-control&#96;.
- **T10.2.1.3:** REFACTOR: validación y errores quedaron consolidados dentro del Área; focused 4/0/22, full 721/0/4361 en 52 archivos durante supervisión externa válida y verificación &#96;remote-control&#96; 2/0/14, con centinela limpiado. → REFACTOR: validación y errores quedaron consolidados dentro del Área; focused 4/0/22, full 721/0/4361 en 52 archivos durante supervisión externa válida y verificación &#96;remote-control&#96; 2/0/14, con centinela limpiado.
  - [ ] REFACTOR: validación y errores quedaron consolidados dentro del Área; focused 4/0/22, full 721/0/4361 en 52 archivos durante supervisión externa válida y verificación &#96;remote-control&#96; 2/0/14, con centinela limpiado.

### S11.1 — cada comando dirigido a un agente y validado emite una sola directiva &#96;send&#96; hacia el &#96;target&#95;agent&#96; inmutable; &#96;CV&#95;STATUS&#96; es la única lectura local de toda la Torre y no requiere destino ni llama &#96;core.send&#96;. Los trece verbos quedan tipeables en &#96;bin/torre&#96;.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Instalación, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Ruta histórica aprobada: design-tasks. No autoriza una nueva ejecución de S11.1.
  - [ ] Cada verbo de &#96;COMMAND&#95;VOCABULARY&#96; tiene ejecutor y superficie tipeable, o queda declarado fuera de alcance con razón registrada
  - [ ] Los verbos dirigidos sólo emiten una directiva por &#96;core.send&#96;; &#96;CV&#95;STATUS&#96; permanece local y el diff no escribe la fila de otro agente
  - [ ] Los dos verbos &#96;R2&#96; no se ejecutan sin la confirmación que &#96;console/validate.mjs&#96; exige, con su evidencia y su TTL
  - [ ] Un verbo desconocido, un agente inexistente o un estado ilegal fallan con el código que el validador ya define, sin ruta alternativa
  - [ ] &#96;test/console-executor.test.mjs&#96; queda en cero pendientes y se conserva como cobertura ejecutable de regresión
  - [ ] La suite completa verifica 884 pass / 0 fail / 5.068 aserciones / 69 archivos
  - [ ] El diff respeta Área, Prohibido y las excepciones exactas autorizadas por las decisiones 69–70
  - [ ] Restricción histórica no autorizante: Área &#96;console/executor.mjs&#96;, &#96;console/validate.mjs&#96;, &#96;bin/torre&#96;, &#96;scripts/payload-closure.mjs&#96;, &#96;install/runtime-payload.mjs&#96; generado, &#96;test/console-executor.test.mjs&#96;, &#96;test/console/&#42;&#42;&#96;, &#96;test/install/payload-closure.test.mjs&#96; y &#96;test/install/runtime-payload.test.mjs&#96;; prohibidos &#96;core.mjs&#96;, &#96;console/vocabulary.mjs&#96;, &#96;main-store/&#42;&#42;&#96;, &#96;mcp.mjs&#96;, &#96;hosts/&#42;&#42;&#96; y todo &#96;install/&#42;&#42;&#96; salvo la excepción exacta generada.
  - [ ] Recurso histórico: ninguno — sin DB, migraciones ni token de entrega; no comparte namespace efímero, backend, root, puerto ni pane de S4.7.
  - [ ] El ejecutor y la superficie permanecen una sola Sesión por la regla de consumidor real: al cerrar, un Módulo tiene al menos un llamador de producto fuera de &#96;test/&#96;.
  - [ ] Evidencia histórica: commits &#96;8d86bf6af5b83b883d5f9cc8908600b08776ff0c&#96; y &#96;2dbb71499b78e3766880e08043175c5399571214&#96;; suite final 884 pass / 0 fail / 5.068 aserciones / 69 archivos; autoridades 69–70 y Engram 9489/9490/9497/9498.
  - [ ] Cierre documental histórico: la reconciliación OpenSpec integra el candidato local posterior a &#96;2dbb714&#96;; Notion no destructivo ocurre después de verificar publicación directa y no se afirma el paso remoto.
  - [ ] Fuera de alcance histórico — superficie remota: no existe ni hace falta; Moshi da la máquina entera en el teléfono (decisión 57).
  - [ ] Fuera de alcance histórico — cerrar o matar un agente: &#96;CV&#95;STOP&#96; y &#96;CV&#95;KILL&#96; no están en el vocabulario y no se agregan (decisión 61); se hace a mano.
  - [ ] Fuera de alcance histórico — garantizar la detención: el agente ya se autolimita bajo gentle-ai; agregar la garantía sería reimplementar el stack (decisión 59).

#### M11.1.1 — Ejecutor de directivas validadas
Rutas históricas (evidencia): console/executor.mjs, console/validate.mjs, test/console-executor.test.mjs, test/console-validator.test.mjs

- **T11.1.1.1:** Traducir un comando de agente validado en exactamente una llamada a &#96;core.send&#96;. → Traducir un comando de agente validado en exactamente una llamada a &#96;core.send&#96;.
  - [ ] Traducir un comando de agente validado en exactamente una llamada a &#96;core.send&#96;.
- **T11.1.1.2:** Mantener &#96;CV&#95;STATUS&#96; local y consumir &#96;target&#95;agent&#96; confiable sólo para verbos dirigidos a agentes. → Mantener &#96;CV&#95;STATUS&#96; local y consumir &#96;target&#95;agent&#96; confiable sólo para verbos dirigidos a agentes.
  - [ ] Mantener &#96;CV&#95;STATUS&#96; local y consumir &#96;target&#95;agent&#96; confiable sólo para verbos dirigidos a agentes.
- **T11.1.1.3:** Cerrar las regresiones del vocabulario entre ejecutor y validador. → Cerrar las regresiones del vocabulario entre ejecutor y validador.
  - [ ] Cerrar las regresiones del vocabulario entre ejecutor y validador.

#### M11.1.2 — Superficie tipeable y payload instalable
Rutas históricas (evidencia): bin/torre, scripts/payload-closure.mjs, install/runtime-payload.mjs, test/console/cli.test.mjs, test/console/fake-core.mjs, test/install/payload-closure.test.mjs, test/install/runtime-payload.test.mjs

- **T11.1.2.1:** Exponer el vocabulario por &#96;bin/torre&#96;, incluidos los verbos &#96;R2&#96;. → Exponer el vocabulario por &#96;bin/torre&#96;, incluidos los verbos &#96;R2&#96;.
  - [ ] Exponer el vocabulario por &#96;bin/torre&#96;, incluidos los verbos &#96;R2&#96;.
- **T11.1.2.2:** Aplicar la expansión serializada mínima del payload instalado. → Aplicar la expansión serializada mínima del payload instalado.
  - [ ] Aplicar la expansión serializada mínima del payload instalado.
- **T11.1.2.3:** Cerrar las regresiones de CLI/payload y ejecutar la verificación completa. → Cerrar las regresiones de CLI/payload y ejecutar la verificación completa.
  - [ ] Cerrar las regresiones de CLI/payload y ejecutar la verificación completa.

### S12.1 — Ningún commit llega a master sin que la suite haya corrido sola; va primera porque es la red que hace seguras las tres mudanzas de core.mjs y sin ella cada paso es a ciegas.
- Estado derivado: ✅ COMPLETO
- Zona/Área: cimientos · —
- Depende de: S12.8
- Cimientos: .githooks/pre-push, package.json
- Recursos: —
- Criterios de aceptación:
  - [ ] bun run test existe y corre la suite completa.
  - [ ] Registro histórico no autorizante: el workflow de push llegó a implementarse y probarse, pero se retiró con sus dos runs borrados porque el gate es local y no GitHub Actions en este repositorio privado; los minutos facturados están asignados a otro proyecto. Clase de la decisión: dinero, precios o cuotas.
  - [ ] Registro histórico no autorizante: S12.1 pasó a depender de S12.8 porque correr la suite desde un hook de Git corrompía el repositorio real; primero se cierra el aislamiento y luego se retoma el gate estacionado.
  - [ ] El trabajo histórico estacionado está en la rama local parked/s12.1-gate: .githooks/pre-push con el gate compuesto delante del informe, y package.json con scripts.test y scripts.hooks; se retoma sobre S12.8 cerrada, no se rehace, publica ni activa.
  - [ ] El diff histórico no tocó ninguna ruta fuera del Área histórica &#96;.githooks/&#42;&#42;&#96; y &#96;package.json&#96;.
  - [ ] Límite histórico no autorizante: ninguna mutación de runtime, Torre, DB, Notion, push, activación, cleanup, stash o reset pertenece a esta Sesión.

#### M12.1.1 — package.json declara scripts.test
Rutas: package.json

- **T12.1.1.1:** RED: bun run test falla hoy; no existe el bloque scripts. → bun run test falla mientras no existe el bloque scripts.
  - [ ] La ausencia del bloque scripts deja fallar bun run test.
- **T12.1.1.2:** GREEN: agregar "test": "bun test". → package.json declara el script test que ejecuta bun test.
  - [ ] package.json declara el script test exacto.
- **T12.1.1.3:** REFACTOR: confirmar que bun run test y bun test dan idéntico resultado. → Los dos comandos de Bun dan resultado idéntico.
  - [ ] bun run test y bun test tienen resultado idéntico.

#### M12.1.2 — Gate local compuesto antes del informe
Rutas: .githooks/pre-push

- **T12.1.2.1:** RED histórico: una rama con un test roto a propósito produce un resultado rojo verificable antes del gate local. → El caso roto queda registrado como rojo antes del gate local.
  - [ ] El caso roto produce evidencia roja verificable.
- **T12.1.2.2:** GREEN histórico: el gate compuesto de .githooks/pre-push corre la suite antes del informe; el workflow GitHub retirado no se restituye. → El gate local corre la suite antes del informe sin reintroducir GitHub Actions.
  - [ ] El gate local corre antes del informe y no restituye el workflow retirado.
- **T12.1.2.3:** REFACTOR histórico: quitar el test roto, confirmar verde y conservar el registro de que los dos runs del workflow retirado fueron borrados. → El caso sano queda verde y la historia del workflow retirado permanece trazable.
  - [ ] El caso sano es verde y la trazabilidad del workflow retirado permanece.

### S12.2 — Ningún documento de alcance vigente menciona VPS, Hermes o Telegram como parte del producto; el cambio de Telegram queda archivado y el archivo histórico conserva su traza intacta.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Archivo, Autoridad, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] rg -ci vps&#124;hermes&#124;telegram sobre el Área histórica devuelve cero menciones como alcance vigente; lo que queda es registro histórico con marca de supersesión.
  - [ ] openspec/changes/archive/&#42;&#42; conserva su contenido previo sin cambios.
  - [ ] sdd-tower-telegram-delivery está bajo openspec/changes/archive/.
  - [ ] core.mjs.bak.20260721-161315 ya no está trackeado; la suite quedó verde sin tocar ningún test.
  - [ ] ROADMAP.md existe y ya no se declara no versionado.
  - [ ] La suite completa quedó verde con 1026 pass y 0 fail.
  - [ ] El diff histórico no tocó ninguna ruta fuera de Área.
  - [ ] Ruta histórica no autorizante: direct. Esta importación conserva la ruta y restricciones históricas pero no autoriza una nueva ejecución, Zona, ruta de ejecución ni Cimientos de Sesión.
  - [ ] Área histórica: ROADMAP.md; openspec/plans/plan-{0,5,8}/STATUS.md; openspec/plans/decision-register.md; openspec/plans/scope-comparison.md; openspec/plans/release-chain.md; openspec/changes/sdd-tower-telegram-delivery/&#42;&#42;; test/migration.test.mjs. Prohibido: openspec/changes/archive/&#42;&#42;.
  - [ ] Corrección histórica de Área: release-chain.md se agregó porque contenía el único enunciado en presente del grupo; openspec/prd/&#42;&#42;, openspec/rfc/&#42;&#42; y requisitos se retiraron del Área porque están congelados por digest y pasan a S12.9, sin cierre silencioso.
  - [ ] El archivo histórico no se purga: plan-8/STATUS.md, plan-5/STATUS.md, decision-register.md, scope-comparison.md y plan-0/STATUS.md conservan registro y marcas de supersesión; presentar no es autorizar.
  - [ ] Fuera de Área histórico: openspec/plans/sdd-tower-implementation/manifest.yaml conserva product-f-telegram-delivery porque sus acceptance&#95;refs fijan el digest, el slice es dependencia de product-g-continuous-loop y slice&#95;id es entidad de dominio con esquema.
  - [ ] Recurso histórico no autorizante: openspec/plans/master-index.md, sólo al cerrar.
  - [ ] Evidencia histórica de M12.2.1: ff25eb9c3c66e2e7d690e4356d33de3151d7d1d3 y 7841f52ba2b8dafb0016582e70027e54e88457b7 reescribieron ROADMAP.md; 7841f52ba2b8dafb0016582e70027e54e88457b7 sólo cambió ROADMAP.md. El cierre completo es 40b1af72136c632a5df52ae83e305c1b570516bc: archiva proposal.md y actualiza master-index.md, plan-12/STATUS.md y plan-5/STATUS.md; es ancestro de 43130ad40af06f3ed05671000719217bee74f0a5.
  - [ ] Registro histórico no autorizante de M12.2.2: el trabajo está hecho y verificado, con cero enunciados de alcance retirado en los tres documentos. Incluye los ocho enunciados de alcance remoto del PRD sin las tres palabras clave, incluida la sección F2 entera, y el rol completo del agente remoto en el RFC. La duda de quién es dueño del registro de proyectos si desaparece el rol remoto se resolvió contra el código, no por decisión: registry/store.mjs lo implementa dentro de este repositorio y el RFC describía un diseño que la implementación ya había superado. El trabajo quedó estacionado en la rama local parked/s12.2-docs-congelados (2b0506c).
  - [ ] Límite histórico no autorizante de M12.2.2: openspec/plans/autonomous-v2/revisions/1/manifest.yaml:17-43 fija content&#95;digest en modo raw-bytes para PRD, RFC y requisitos, con source&#95;commit y artifact&#95;revision: 1; test/provenance/provenance.test.mjs:80-88 verifica que los bytes vivos sigan coincidiendo. Cualquier cambio de un byte rompe la procedencia, incluso agregar un aviso de alcance. Medido: 1025 pass / 1 fail. Entregarlo exige avanzar la revisión del artifact, fuera del Área de esta Sesión.
  - [ ] Registro histórico no autorizante de M12.2.3: plan-8/STATUS.md ya estaba correcto. S8.7 figura ARCHIVADO dos veces (líneas 17 y 30) con su razón; sus 14 menciones son cuerpo de esa Sesión archivada. plan-5/STATUS.md ya declara el puente archivado y no-dependencia (líneas 519, 572 y 825). decision-register.md conserva las decisiones 14, 15 y 16 como registro histórico; la 57 retiró el transporte remoto y la marca de supersesión se agregó a las tres, sin reescribir ninguna. scope-comparison.md se autodeclara BORRADOR PARA DECISIÓN con medición base inmutable del 2026-08-10: se marcó supersesión parcial y no se corrige porque fue exacta ese día. plan-0/STATUS.md está COMPLETO y sus Tareas &#91;x&#93; son registro de trabajo hecho; la nota conserva presentar no es autorizar y explica que su sujeto salió del producto. release-chain.md se agregó porque su línea 196 contenía el único enunciado en presente del grupo; es la misma responsabilidad, no alcance nuevo.
  - [ ] Registro histórico no autorizante de M12.2.4: openspec/changes/sdd-tower-telegram-delivery/proposal.md pasó a openspec/changes/archive/2026-08-30-sdd-tower-telegram-delivery/proposal.md, siguiendo el patrón de fecha del archivo. La cola activa bajó de 14 a 13. El link entrante de plan-5/STATUS.md:29 se corrigió a la ruta nueva con su marca de archivado; las otras dos referencias (v1-release/tasks.md:102 y openspec&#95;change: del manifiesto) nombran el cambio por id y no por ruta, así que no se rompen.

#### M12.2.1 — ROADMAP.md reescrito y respaldo retirado
Rutas históricas (evidencia): ROADMAP.md, test/migration.test.mjs

- **T12.2.1.1:** RED: borrar core.mjs.bak.20260721-161315 rompe la suite hoy; reproducir el fallo exacto. → La premisa histórica sobre el respaldo queda sometida a prueba.
  - [ ] La premisa sobre el respaldo queda medida antes de la corrección.
- **T12.2.1.2:** GREEN: sacarlo de expectedTrackedPaths, bajar el conteo a 11, borrar el archivo y reescribir el ROADMAP sin VPS. → El respaldo se retira y ROADMAP.md describe el alcance local.
  - [ ] El respaldo queda retirado y ROADMAP.md no vende VPS.
- **T12.2.1.3:** REFACTOR: el ROADMAP ya no se declara no versionado; suite verde. → ROADMAP.md conserva ruta y la suite queda verde.
  - [ ] ROADMAP.md no se declara no versionado y la suite queda verde.

#### M12.2.2 — PRD, RFC y requisitos con contenido listo pero entrega bloqueada por digest
Rutas históricas (evidencia): —

- **T12.2.2.1:** RED: enumerar las 41 menciones vivas en los tres documentos. → Las 41 menciones vivas quedan enumeradas sin tocar bytes congelados.
  - [ ] Las menciones vivas quedan enumeradas.
- **T12.2.2.2:** GREEN: reescribir el alcance como producto local. → El contenido preparado describe producto local, pendiente de una revisión de artifact autorizada.
  - [ ] El contenido preparado describe producto local sin falsificar los bytes vivos.
- **T12.2.2.3:** REFACTOR: rg -ci devuelve cero como alcance vigente. → La medición objetivo queda definida sin declarar entrega de documentos congelados.
  - [ ] La medición objetivo de alcance vigente queda explícita.

#### M12.2.3 — Supersesión marcada y registro histórico conservado
Rutas históricas (evidencia): openspec/plans/plan-0/STATUS.md, openspec/plans/plan-5/STATUS.md, openspec/plans/plan-8/STATUS.md, openspec/plans/decision-register.md, openspec/plans/scope-comparison.md, openspec/plans/release-chain.md

- **T12.2.3.1:** RED: separar qué menciones son alcance y cuáles registro histórico. → El alcance vigente se distingue del registro histórico.
  - [ ] Las menciones se clasifican sin purgar trazabilidad.
- **T12.2.3.2:** GREEN: corregir el alcance; marcar el registro como histórico en su lugar. → El alcance se corrige y el registro recibe marca histórica.
  - [ ] El registro histórico permanece y el alcance vigente queda corregido.
- **T12.2.3.3:** REFACTOR: ninguna Sesión viva del grafo depende de la VPS. → Ninguna Sesión viva depende de la VPS.
  - [ ] El grafo vivo no depende de la VPS.

#### M12.2.4 — Cambio archivado y definición de producto verificada
Rutas históricas (evidencia): openspec/changes/archive/2026-08-30-sdd-tower-telegram-delivery/proposal.md, openspec/plans/plan-5/STATUS.md

- **T12.2.4.1:** RED: leer el artifact y registrar si nombra VPS, Hermes o Telegram. → El artifact se lee y sus menciones quedan registradas.
  - [ ] Las menciones del artifact quedan registradas.
- **T12.2.4.2:** GREEN: mover el cambio a changes/archive/ y reconciliar la definición. → El cambio queda archivado y la definición se reconcilia sin modificarla si ya es correcta.
  - [ ] El cambio queda bajo changes/archive y la definición queda reconciliada.
- **T12.2.4.3:** REFACTOR: la cola activa de openspec/changes/ no contiene alcance retirado. → La cola activa no contiene el alcance remoto retirado.
  - [ ] La cola activa no contiene alcance retirado.

### S12.8 — La suite sanea el entorno Git heredado antes de ejecutar comandos y una regresión de aislamiento demuestra que el repositorio real conserva configuración, referencias y worktrees.
- Estado derivado: ✅ COMPLETO
- Territorio histórico: evidencia no autorizante; propietarios actuales: Asientos, Contratos, Enrolamiento, Hosts, cimientos.
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Ruta histórica no autorizante: direct; esta importación terminal no autoriza una nueva ejecución, Zona, ruta de ejecución, Cimientos ni recurso de Sesión.
  - [ ] El ayudante histórico git() en test/helpers/ limpia GIT&#95;DIR, GIT&#95;WORK&#95;TREE, GIT&#95;INDEX&#95;FILE, GIT&#95;PREFIX, GIT&#95;COMMON&#95;DIR, GIT&#95;OBJECT&#95;DIRECTORY, GIT&#95;ALTERNATE&#95;OBJECT&#95;DIRECTORIES y GIT&#95;QUARANTINE&#95;PATH; los 15 consumidores lo usan.
  - [ ] La regresión histórica ejecuta Git con GIT&#95;DIR señuelo y conserva intactos el señuelo y el repositorio real: sin commits, worktrees ni cambios de configuración.
  - [ ] La suite histórica final registró 1031 pass, 0 fail, 5915 expect calls, 82 archivos y exit 0; el snapshot conservó las 9 identidades de worktree, refs y core.bare=false.
  - [ ] Restricción histórica no autorizante: el diff quedó limitado a test/&#42;&#42;; prohibidos core.mjs, .githooks/&#42;&#42;, openspec/&#42;&#42; y bin/torre.
  - [ ] Evidencia histórica de entrega: 8767ec3620e05b2f910f6399bdbb007960f8040c (ayudante), cd4214c9c4d3fb443a42134e1288559f048da3e2 (migración de consumidores), 21a0718affd59331602523a1b35893c8b4ec0c53 (regresión de aislamiento) y cierre 44685c74f28027ee86dc541c12f2122423010b79; todos son ancestros de HEAD.

#### M12.8.1 — Ayudante compartido en test/helpers/ para sanear el entorno Git heredado.
Rutas históricas (evidencia): test/helpers/bin/git, test/helpers/git.mjs, test/helpers/git.test.mjs

- **T12.8.1.1:** RED histórico: reproducir la contaminación por entorno Git heredado. → La contaminación histórica queda reproducida.
  - [ ] La falla histórica queda medida antes del ayudante compartido.
- **T12.8.1.2:** GREEN histórico: crear el ayudante Git compartido. → El ayudante compartido sanea el entorno heredado.
  - [ ] El ayudante limpia las variables Git heredadas.
- **T12.8.1.3:** REFACTOR histórico: verificar el ayudante aislado. → El ayudante conserva su verificación histórica.
  - [ ] El ayudante histórico registra 4 pass y 0 fail.

#### M12.8.2 — Los quince archivos consumidores usan el ayudante compartido.
Rutas históricas (evidencia): test/contracts/artifact-ref.test.mjs, test/enroll/enroll.test.mjs, test/fail-closed.test.mjs, test/helpers/restore-fixture.mjs, test/hosts/production-provider.test.mjs, test/identity.test.mjs, test/install/launch-worker-cli.test.mjs, test/lifecycle.test.mjs, test/main-store.test.mjs, test/migration.test.mjs, test/plugin/tower-spike.test.mjs, test/recovery.test.mjs, test/registry/storage.test.mjs, test/support/support.test.mjs, test/workspace/checkpoint.test.mjs, test/workspace/reconciliation.test.mjs

- **T12.8.2.1:** RED histórico: localizar los consumidores con ayudantes Git locales. → Los consumidores históricos quedan identificados.
  - [ ] Los consumidores de Git quedan identificados antes de migrarlos.
- **T12.8.2.2:** GREEN histórico: migrar los consumidores al ayudante compartido. → Los consumidores usan el ayudante compartido.
  - [ ] Los consumidores históricos usan el ayudante compartido.
- **T12.8.2.3:** REFACTOR histórico: ejecutar el orden contaminado ayudante a lifecycle. → La migración de consumidores conserva el orden aislado.
  - [ ] El orden histórico registra 33 pass y 0 fail.

#### M12.8.3 — La prueba de aislamiento protege el repositorio real con un señuelo.
Rutas históricas (evidencia): test/git-isolation.test.mjs

- **T12.8.3.1:** RED histórico: ejecutar Git con GIT&#95;DIR señuelo y medir la contaminación. → El escenario de contaminación queda ejercitado.
  - [ ] La prueba ejercita una llamada real a Git con señuelo.
- **T12.8.3.2:** GREEN histórico: conservar intactos el señuelo y el repositorio real. → El aislamiento preserva configuración, refs y worktrees.
  - [ ] El snapshot antes y después conserva las 9 identidades de worktree
  - [ ] refs y core.bare=false.
- **T12.8.3.3:** REFACTOR histórico: fijar la regresión de aislamiento. → La regresión queda como prueba repetible.
  - [ ] La prueba focalizada histórica registra 1 pass
  - [ ] 0 fail y 5 expectations.

### S100 — Contrato de schema de delivery-policy, incluido planning.prepare&#95;through fail-closed
- Estado derivado: ✅ COMPLETO
- Zona/Área: contratos · contracts/, schemas/, registry/, test/contracts/, test/registry/
- Depende de: S5.13
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] schemas/delivery-policy-v1.schema.json's &#96;planning&#96; object declares an optional &#96;prepare&#95;through&#96; property constrained to the single literal value &#96;TAREAS&#96; via &#96;const&#96;, and &#96;prepare&#95;through&#96; is not added to &#96;planning&#96;'s &#96;required&#96; array.
  - [ ] A &#96;delivery-policy&#96; fixture whose &#96;planning&#96; block omits &#96;prepare&#95;through&#96; still validates successfully against the schema after this change, exactly as it did before it.
  - [ ] A &#96;delivery-policy&#96; fixture whose &#96;planning.prepare&#95;through&#96; equals &#96;TAREAS&#96; validates successfully against the schema.
  - [ ] A &#96;delivery-policy&#96; fixture whose &#96;planning.prepare&#95;through&#96; is any value other than &#96;TAREAS&#96; fails schema validation.
  - [ ] &#96;bun test test/contracts/s3-2-schemas.test.mjs&#96; passes, and the full repository &#96;bun test&#96; passes with zero failures, after the change.
  - [ ] The diff touches only Area: schemas/delivery-policy-v1.schema.json and test/contracts/s3-2-schemas.test.mjs.

#### M100.1 — The delivery-policy schema declares the closed prepare&#95;through contract.
Rutas: schemas/delivery-policy-v1.schema.json, test/contracts/s3-2-schemas.test.mjs

- **T100.1.1:** RED: add fixtures to test/contracts/s3-2-schemas.test.mjs proving planning.prepare&#95;through: TAREAS is rejected by the current schema as an unknown property, while an omitted prepare&#95;through and a wrong value already behave as expected today. → RED: the TAREAS fixture fails against the unmodified schema; the omitted and wrong-value fixtures already pass or fail as expected.
  - [ ] The prepare&#95;through: TAREAS fixture fails schema validation before the schema change, because planning has additionalProperties: false and does not yet declare prepare&#95;through.
- **T100.1.2:** GREEN: add prepare&#95;through as an optional const: TAREAS property to planning in schemas/delivery-policy-v1.schema.json, without adding it to required. → GREEN: all three fixtures pass: omitted, TAREAS, and a wrong value correctly rejected.
  - [ ] test/contracts/s3-2-schemas.test.mjs passes with the three fixtures included, and bun test at the repository root passes with zero failures.
- **T100.1.3:** REFACTOR: confirm no other schema-registry fixture regressed and the diff stays inside Area. → REFACTOR: the schema change is confirmed isolated, with no unrelated fixture touched.
  - [ ] git diff --cached --numstat reports changes only in schemas/delivery-policy-v1.schema.json and test/contracts/s3-2-schemas.test.mjs.

### S110 — Corte del entorno constructor: el repositorio deja de exponerle skills de la Torre a un host Pi, y ningún agente que construye la Torre la recibe como sistema de coordinación.
- Estado derivado: ✅ COMPLETO
- Zona/Área: hosts · hosts/, adapters/, extensions/, plugin/, test/hosts/, test/adapters/, test/extensions/, test/plugin/, test/host-adapters.test.mjs, scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs
- Depende de: —
- Cimientos: .pi/settings.json
- Recursos: —
- Criterios de aceptación:
  - [ ] El repositorio deja de declararle skills/torre-control, skills/torre-control-entregas y skills/torre-control-soporte a un host Pi; una sesión Pi abierta sobre este árbol no descubre ninguna de las tres.
  - [ ] .pi/settings.json sigue existiendo y sigue siendo un cimiento declarado: se le quita la clave que carga las skills de la Torre, no el archivo.
  - [ ] Las skills del Método y las de gentle-ai siguen disponibles para cualquier agente: el corte saca Maquinaria y nunca Método.
  - [ ] .git/control-tower/ACTIVE sigue ausente y nada bajo ~/.local/share/control-tower/ se lee, escribe ni desinstala.
  - [ ] openspec/plan.yaml sigue siendo la única autoridad sobre el trabajo pendiente, y radar check pasa antes y después.
  - [ ] El diff toca sólo Área.

#### M110.1 — El repositorio deja de exponerle skills de la Torre a Pi
Rutas: .pi/settings.json, test/extensions/pi/tower-skill-exposure.test.mjs

- **T110.1.1:** RED: escribir el test que falla hoy, afirmando que la configuración Pi del repositorio no declara ninguna ruta bajo skills/torre-control&#42;. → RED: existe un test que falla contra el árbol actual porque .pi/settings.json declara las tres skills de la Torre.
  - [ ] RED: existe un test que falla contra el árbol actual porque .pi/settings.json declara las tres skills de la Torre.
- **T110.1.2:** GREEN: quitar de .pi/settings.json la clave que carga las skills de la Torre, conservando el archivo y cualquier otra configuración Pi legítima. → GREEN: el test pasa, el archivo sigue existiendo y ninguna skill de la Torre queda declarada.
  - [ ] GREEN: el test pasa, el archivo sigue existiendo y ninguna skill de la Torre queda declarada.
- **T110.1.3:** REFACTOR: dejar el test afirmando la regla general —ninguna configuración del repositorio expone Maquinaria a un host— en vez de las tres rutas exactas de hoy. → REFACTOR: el test prueba la regla y no la lista, y sigue pasando.
  - [ ] REFACTOR: el test prueba la regla y no la lista, y sigue pasando.

### S111 — Radar deja de creerle a la ruta declarada: consume gentle-ai.sdd-status@2 y rechaza una Sesión cuyo pipeline no entró por la puerta que su ruta declara.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: el binario gentle-ai instalado; sin dependencias nuevas más allá de git y gentle-ai
- Criterios de aceptación:
  - [ ] Radar lee gentle-ai.sdd-status@2 para toda Sesión que declare un cambio, y valida el nombre y la versión del schema antes de usar cualquier campo.
  - [ ] Una Sesión cuya ruta declara una puerta de entrada distinta de la que el pipeline realmente usó falla cerrado con un hallazgo que nombra la Sesión, la ruta declarada y la puerta observada.
  - [ ] Un cambio ausente, un status ilegible, un schema no reconocido o un JSON inválido producen un hallazgo nombrado y nunca un pase silencioso.
  - [ ] Radar no reimplementa ninguna regla de fases de gentle-ai: consume el contrato y no deriva el estado de las compuertas por su cuenta.
  - [ ] Las dependencias externas de radar siguen siendo exactamente git y gentle-ai; el Método sigue siendo portable a un repositorio que no tenga Engram ni la Torre.
  - [ ] El diff toca sólo Área.

#### M111.1 — Radar consume el contrato de estado de fases y lo valida
Rutas: agent-workflows/tools/radar/ledger.go, agent-workflows/tools/radar/ledger&#95;test.go

- **T111.1.1:** RED: cubrir schema no reconocido, JSON inválido, cambio ausente y status ilegible, cada uno con su hallazgo nombrado. → RED: los cuatro modos de falla del contrato quedan cubiertos y fallan.
  - [ ] RED: los cuatro modos de falla del contrato quedan cubiertos y fallan.
- **T111.1.2:** GREEN: leer gentle-ai.sdd-status@2, validar nombre y versión del schema y exponer la puerta observada junto al estado de cada compuerta. → GREEN: el contrato se lee y se valida, y los cuatro modos de falla producen hallazgos nombrados.
  - [ ] GREEN: el contrato se lee y se valida, y los cuatro modos de falla producen hallazgos nombrados.
- **T111.1.3:** REFACTOR: unificar la invocación de gentle-ai con la del ledger de intentos, dejando una sola forma de hablarle al proveedor. → REFACTOR: existe una sola forma de invocar gentle-ai y los tests siguen pasando.
  - [ ] REFACTOR: existe una sola forma de invocar gentle-ai y los tests siguen pasando.

#### M111.2 — Check rechaza una ruta que miente sobre su puerta de entrada
Rutas: agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go

- **T111.2.1:** RED: cubrir las tres rutas contra su puerta —direct/apply, design-tasks/design, full-sdd/proposal— y el caso en que la observada no coincide. → RED: las tres correspondencias y el desacuerdo quedan cubiertos y fallan.
  - [ ] RED: las tres correspondencias y el desacuerdo quedan cubiertos y fallan.
- **T111.2.2:** GREEN: emitir un hallazgo que nombre la Sesión, la ruta declarada y la puerta observada cuando no coinciden. → GREEN: el desacuerdo produce el hallazgo exacto y las tres correspondencias pasan.
  - [ ] GREEN: el desacuerdo produce el hallazgo exacto y las tres correspondencias pasan.
- **T111.2.3:** REFACTOR: mover la correspondencia ruta→puerta a una tabla única, para que agregar una ruta no requiera tocar la lógica de check. → REFACTOR: la correspondencia vive en una tabla única y los tests siguen pasando.
  - [ ] REFACTOR: la correspondencia vive en una tabla única y los tests siguen pasando.

### S112 — El campo autoridad deja de ser texto libre: declara su tipo y radar prueba lo que se puede probar, diciendo explícitamente lo que no.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: el registro de decisiones archivado en openspec/archive/legacy-planning/; sin dependencia nueva de Engram
- Criterios de aceptación:
  - [ ] El campo autoridad admite tres tipos declarados: repo, decision y engram; un tipo ausente o desconocido falla cerrado.
  - [ ] Los tipos repo y decision se prueban contra Git con la misma exigencia byte a byte que ya usa validateFragmentLocator; una cita que no resuelva falla cerrado.
  - [ ] El tipo engram se declara y no se verifica, y radar lo reporta explícitamente como no verificable: nunca lo cuenta como probado.
  - [ ] Las dependencias externas de radar siguen siendo exactamente git y gentle-ai: el Método no queda atado al Engram del maintainer y sigue siendo portable a otro producto.
  - [ ] Todas las Sesiones vigentes quedan migradas o declaradas con su tipo; ninguna conserva la forma vieja sin tipo al cerrar la migración.
  - [ ] El diff toca sólo Área.

#### M112.1 — El esquema admite los tres tipos y radar los valida sin exigirlos todavía
Rutas: agent-workflows/tools/radar/plan.go, agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go

- **T112.1.1:** RED: cubrir tipo desconocido, tipo repo cuya cita no resuelve, tipo decision cuya referencia no está en el registro, tipo engram, y la forma vieja sin tipo. → RED: los cinco casos quedan cubiertos y los que deben fallar, fallan.
  - [ ] RED: los cinco casos quedan cubiertos y los que deben fallar, fallan.
- **T112.1.2:** GREEN: aceptar los tres tipos, probar repo y decision contra Git con la exigencia de validateFragmentLocator, y reportar engram como no verificable. → GREEN: repo y decision se prueban byte a byte, engram se reporta no verificable, y la forma vieja sigue pasando porque todavía no se exige el tipo.
  - [ ] GREEN: repo y decision se prueban byte a byte, engram se reporta no verificable, y la forma vieja sigue pasando porque todavía no se exige el tipo.
- **T112.1.3:** REFACTOR: reusar validateFragmentLocator en vez de duplicar la resolución de blob y rango, dejando una sola prueba de cita en la herramienta. → REFACTOR: existe una sola prueba de cita y los tests siguen pasando.
  - [ ] REFACTOR: existe una sola prueba de cita y los tests siguen pasando.

### S116 — El campo autoridad admite varias citas: una Sesión que se apoya en más de una fuente puede declararlas todas, y radar prueba cada una por separado.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S112
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El campo autoridad admite una lista de citas tipadas, y cada una se verifica con la misma exigencia que hoy se aplica a una cita sola.
  - [ ] Una autoridad con una sola cita se sigue escribiendo sin lista: la forma simple no se vuelve más ceremoniosa por existir la compuesta.
  - [ ] Un hallazgo sobre una cita de la lista nombra cuál de ellas falló, no sólo la Sesión.
  - [ ] El esquema no gana ningún campo de texto libre para prosa sin migrar, ni ningún tipo nuevo: el canon §18 prohíbe extender la herramienta para aceptar la forma vieja.
  - [ ] La forma de texto libre sigue pasando; la exigencia se enciende en S115, después de que S114 haya migrado el dato.
  - [ ] El diff toca sólo Área.

#### M116.1 — Autoridad admite varias citas y cada una se verifica por separado
Rutas: agent-workflows/tools/radar/plan.go, agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/authority&#95;test.go

- **T116.1.1:** RED: cubrir una lista con dos citas válidas, una lista donde la segunda falla, una cita sola sin lista, y la forma de texto libre. → RED: los cuatro casos quedan cubiertos y el que debe fallar, falla nombrando cuál cita de la lista fue.
  - [ ] RED: los cuatro casos quedan cubiertos y el que debe fallar, falla nombrando cuál cita de la lista fue.
- **T116.1.2:** GREEN: aceptar escalar, mapa y lista en el mismo campo, y verificar cada cita de la lista con la exigencia ya entregada. → GREEN: las tres formas cargan, cada cita se verifica por separado y el hallazgo nombra la posición que falló.
  - [ ] GREEN: las tres formas cargan, cada cita se verifica por separado y el hallazgo nombra la posición que falló.
- **T116.1.3:** REFACTOR: dejar una sola función que verifica una cita, usada igual por la forma simple y por cada elemento de la lista. → REFACTOR: existe una sola verificación de cita y los tests siguen pasando.
  - [ ] REFACTOR: existe una sola verificación de cita y los tests siguen pasando.

### S113 — Radar verifica las dos reglas de entrega que hoy no verifica nadie: que archive corra después de entregar, y que el lote de revisión no pase de 400 líneas.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El esquema admite el campo que declara por cuál de los tres caminos se archivó una Sesión —entregada, reemplazada o evidencia histórica retenida— y un valor fuera de esos tres falla cerrado.
  - [ ] Una Sesión archivada que declara entrega y no tiene evidencia integrada falla cerrado; una que declara reemplazo y no tiene sucesora falla cerrado; una que declara evidencia histórica no exige ninguna de las dos.
  - [ ] Una archivada que todavía no declara su camino sigue pasando: exigirlo aquí fallaría S4.9 y S9.4, que hoy no tienen cómo declararlo. La exigencia se enciende en una Sesión posterior, después de que el dato esté declarado.
  - [ ] El camino no se infiere nunca. Inferir «evidencia histórica» de la ausencia de las otras dos convertiría cada entrega olvidada en historia legítima, que es exactamente el error que este chequeo existe para atrapar.
  - [ ] Radar mide las líneas escritas del candidato contra el tope declarado y emite un hallazgo cuando lo supera; el tope es un dato del plan, no una constante en el código.
  - [ ] Un plan que no declara tope no se mide y no falla: el tope es política, y una herramienta que inventa una política que nadie declaró es peor que una que no la verifica.
  - [ ] La medición usa la misma prueba de ancestría inmutable que ya usa la evidencia de entrega, y no una lectura del árbol de trabajo.
  - [ ] Ninguna de las dos reglas bloquea una Sesión que todavía no entregó: son verificaciones de cierre, no compuertas previas.
  - [ ] El diff toca sólo Área.

#### M113.1 — Una Sesión archivada declara por cuál de los tres caminos se archivó
Rutas: agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go

- **T113.1.1:** RED: cubrir los tres caminos con las seis archivadas reales del plan —entregada, reemplazada desde references.future&#95;successors, y retenida como evidencia histórica— más una archivada que no declara ninguno. → RED: los tres caminos legítimos quedan cubiertos y sólo la que no declara ninguno falla.
  - [ ] RED: los tres caminos legítimos quedan cubiertos y sólo la que no declara ninguno falla.
- **T113.1.2:** GREEN: exigir que una archivada declare su camino, y verificar cada uno como corresponde: entrega integrada, sucesora existente, o nada más que la declaración. → GREEN: una archivada sin camino declarado falla cerrado y las seis del plan vigente pasan.
  - [ ] GREEN: una archivada sin camino declarado falla cerrado y las seis del plan vigente pasan.
- **T113.1.3:** REFACTOR: reusar la prueba de ancestría y la resolución de linaje que ya existen, en vez de duplicarlas para este chequeo. → REFACTOR: no hay una segunda resolución de ancestría ni de linaje, y los tests siguen pasando.
  - [ ] REFACTOR: no hay una segunda resolución de ancestría ni de linaje, y los tests siguen pasando.

#### M113.2 — El tope del lote de revisión se declara y se mide
Rutas: agent-workflows/tools/radar/plan.go, agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/check&#95;test.go

- **T113.2.1:** RED: cubrir un plan sin tope declarado, un candidato por debajo y uno por encima del tope. → RED: los tres casos quedan cubiertos y el excedido falla.
  - [ ] RED: los tres casos quedan cubiertos y el excedido falla.
- **T113.2.2:** GREEN: leer el tope del plan y emitir un hallazgo cuando las líneas escritas del candidato lo superan. → GREEN: el tope se lee del plan y el candidato excedido produce el hallazgo.
  - [ ] GREEN: el tope se lee del plan y el candidato excedido produce el hallazgo.
- **T113.2.3:** REFACTOR: dejar el tope ausente resolviendo a una política declarada y no a un número escondido en el código. → REFACTOR: un plan sin tope declarado se comporta de forma explícita y los tests siguen pasando.
  - [ ] REFACTOR: un plan sin tope declarado se comporta de forma explícita y los tests siguen pasando.

### S118 — Una operación de la Torre se reconoce a simple vista dentro de una sesión Pi: emoji, nombre y color propios en los cuatro estados observables.
- Estado derivado: ✅ COMPLETO
- Zona/Área: hosts · hosts/, adapters/, extensions/, plugin/, test/hosts/, test/adapters/, test/extensions/, test/plugin/, test/host-adapters.test.mjs, scripts/host-compatibility/opencode.mjs, test/compat/opencode-runtime.test.mjs
- Depende de: —
- Cimientos: —
- Recursos: superficie de render de la extensión Pi y el contrato de capacidades de extensions/pi/package.json
- Criterios de aceptación:
  - [ ] Las filas de las tools de la Torre renderizan emoji, nombre y color en los cuatro estados observables: preparando, corriendo, completado y fallido.
  - [ ] &#96;torre&#96; se expone como UN tool con subcomando enumerado. Falsificador: el catálogo expone más de un tool para el vocabulario de &#96;bin/torre&#96;.
  - [ ] &#96;extensions/pi/package.json&#96; declara las capacidades de render nuevas y conserva un único inventario de transforms; no quedan listas paralelas.
  - [ ] El badge consume tokens de tema ya existentes. Falsificador: se declara un token nuevo, que falla cerrado contra el schema de Pi.
  - [ ] El diff toca sólo &#96;extensions/pi/&#42;&#42;&#96; y &#96;test/extensions/pi/&#42;&#42;&#96;.
  - [ ] Ninguna mutación de Pi core, &#96;pi-intercom&#96;, skills genéricas de Gentle AI, &#96;adapters/pi/&#42;&#42;&#96;, &#96;mcp.mjs&#96;, &#96;bin/torre&#96;, &#96;hosts/&#42;&#42;&#96; ni &#96;install/&#42;&#42;&#96;: esta Sesión presenta, no redefine router de input, enrolamiento, autoridad ni transporte.

#### M118.1 — Renderer del badge y contrato de capacidades
Rutas: extensions/pi/package.json, extensions/pi/tower-session-router.ts, test/extensions/pi/tower-session-router.test.mjs

- **T118.1.1:** RED: escribir el test que afirma emoji, nombre y color de la Torre en los cuatro estados observables, y un único tool &#96;torre&#96; con subcomando enumerado. → RED: el test falla nombrando los estados sin badge y el catálogo sin subcomando.
  - [ ] RED: existe un test que falla contra el árbol actual y nombra los cuatro estados.
- **T118.1.2:** GREEN: declarar las capacidades de render en &#96;extensions/pi/package.json&#96; y emitir el badge consumiendo tokens de tema existentes. → GREEN: los cuatro estados renderizan el badge y el catálogo expone un solo tool.
  - [ ] GREEN: el test de T118.1.1 pasa sin debilitar ninguna aserción.
  - [ ] No se declara ningún token de tema nuevo.
- **T118.1.3:** REFACTOR: dejar un único inventario de transforms en el package, sin listas paralelas, y la suite en verde. → REFACTOR: el inventario es uno solo y los tests siguen pasando.
  - [ ] REFACTOR: no quedan listas paralelas de transforms.
  - [ ] La suite completa pasa.

### S120 — Contrato verificable de integración: direct y design-tasks usan el implementador general de Gentle AI y una entrada de verificación semántica desde el plan; full-sdd conserva su recorrido nativo.
- Estado derivado: 📚 ARCHIVADO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El contrato identifica una revisión inmutable del plan, la Sesión, su ruta aprobada, límites, decisiones, tareas y criterios binarios; no crea otra fuente editable de planificación.
  - [ ] El diseño distingue capacidades reutilizables existentes de adaptaciones necesarias, con archivos y contratos observados; no presenta la entrada externa como una configuración ya soportada.
  - [ ] Direct y design-tasks reciben antecedentes del plan mediante una entrada explícita; el contrato prohíbe fabricar documentos SDD, fingir fases completadas o evadir el dispatcher.
  - [ ] La ruta media completa únicamente diseño técnico y tareas faltantes, sin cambiar objetivo, límites ni criterios aprobados.
  - [ ] La verificación relaciona cada criterio con evidencia observable y conserva los controles aplicables de SDD; una suite verde con un criterio incumplido no puede producir aprobación.
  - [ ] El diseño declara pruebas positivas y negativas para revisión del plan cambiada, criterios omitidos, evidencia faltante o contradictoria y resultado no verificable; ninguno habilita cierre aprobatorio.
  - [ ] Full-sdd conserva implementación, verificación y cierre nativos; el diseño diferencia consolidación de especificaciones e historial SDD de actualizar el avance en plan.yaml.
  - [ ] La matriz de viabilidad identifica por cada capacidad su soporte actual, adaptación requerida y prueba aislada pendiente; termina con una propuesta implementable sustentada o una incompatibilidad explícita, nunca con una afirmación de ejecución no realizada.
  - [ ] El resultado enumera las superficies del método afectadas, dependencias externas, criterios de la prueba aislada y condiciones de activación posterior, sin modificar paquetes externos, instalar componentes ni cambiar instrucciones globales.

### S124 — Un agente obtiene el contrato completo de una sola Sesión con &#96;radar sesion &lt;ID&gt;&#96;, y Support lee el plan sólo por Radar, nunca openspec/plan.yaml entero.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;radar sesion S114&#96; imprime sólo S114: estado calculado, Zona, autoridad, dependencias con su estado, cimientos, recurso, criterios, decisiones, ruta, Módulos y Tareas; ninguna otra Sesión aparece en la salida.
  - [ ] La salida de &#96;radar sesion S114&#96; sobre el plan real pesa menos de 15 KB.
  - [ ] Un ID inexistente o una referencia no ejecutable termina con código 1 y un mensaje de una línea.
  - [ ] Si el plan no valida, &#96;radar sesion&#96; termina con código 1 igual que &#96;radar status&#96; y no imprime ningún estado.
  - [ ] &#96;radar status&#96; en texto termina con una línea que indica &#96;radar sesion &lt;ID&gt;&#96;; &#96;radar status --json&#96; no cambia.
  - [ ] &#96;radar render&#96; produce un ROADMAP byte a byte idéntico al anterior.
  - [ ] chanks-0-agente-soporte y su brief no instruyen leer openspec/plan.yaml ni openspec/ROADMAP.md enteros y nombran &#96;radar status&#96; y &#96;radar sesion &lt;ID&gt;&#96; como la única vía de lectura.
  - [ ] Si radar falta o rechaza el plan, la skill ordena detenerse y reportar; nunca leer el archivo como respaldo.
  - [ ] Una prueba del Método falla si la skill vuelve a instruir la lectura completa del plan; &#96;go test ./...&#96; y los tests de agent-workflows pasan.
  - [ ] Tras la entrega, el binario instalado responde &#96;radar sesion&#96; y la skill instalada en los cuatro runtimes coincide con el repo.
  - [ ] El diff toca sólo Área.

#### M124.1 — Radar imprime el contrato de una sola Sesión
Rutas: agent-workflows/tools/radar/main.go, agent-workflows/tools/radar/sesion.go, agent-workflows/tools/radar/sesion&#95;test.go, agent-workflows/tools/radar/README.md

- **T124.1.1:** RED: exigir que &#96;radar sesion &lt;ID&gt;&#96; imprima sólo esa Sesión completa, falle con ID inexistente o plan inválido, y que status indique el comando. → RED: el subcomando no existe y la prueba falla.
  - [ ] RED: el subcomando no existe y la prueba falla.
- **T124.1.2:** GREEN: agregar el subcomando usando Load, CheckAt y SesionPorID, y la línea final de status en texto. → GREEN: la prueba pasa, status --json no cambia y el ROADMAP generado es idéntico.
  - [ ] GREEN: la prueba pasa, status --json no cambia y el ROADMAP generado es idéntico.
- **T124.1.3:** REFACTOR: documentar el comando en README y en el uso de main.go sin duplicar helpers de render. → REFACTOR: una sola descripción del comando y las pruebas siguen pasando.
  - [ ] REFACTOR: una sola descripción del comando y las pruebas siguen pasando.

#### M124.2 — Support lee el plan sólo por Radar
Rutas: agent-workflows/skills/chanks-0-agente-soporte/SKILL.md, agent-workflows/skills/chanks-0-agente-soporte/assets/brief-diario.md, agent-workflows/tests/test&#95;builder&#95;flow.py

- **T124.2.1:** RED: exigir que la skill y el brief nombren &#96;radar sesion &lt;ID&gt;&#96; y no instruyan leer plan.yaml ni ROADMAP enteros. → RED: la skill actual instruye la lectura completa y la prueba falla.
  - [ ] RED: la skill actual instruye la lectura completa y la prueba falla.
- **T124.2.2:** GREEN: reescribir la regla de lectura y las fuentes del brief, y actualizar las huellas SHA256 fijadas en la prueba. → GREEN: la prueba pasa con la lectura acotada por Radar.
  - [ ] GREEN: la prueba pasa con la lectura acotada por Radar.
- **T124.2.3:** REFACTOR: conservar las reglas de solo lectura existentes sin duplicarlas. → REFACTOR: la regla de lectura vive en un solo lugar y la prueba sigue pasando.
  - [ ] REFACTOR: la regla de lectura vive en un solo lugar y la prueba sigue pasando.

### S125 — Una Sesión con Módulos ya entregados se ve a medias en Radar y se retoma desde el primer Módulo pendiente, sin cambiar ninguno de los siete estados.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S124
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Un commit alcanzable desde HEAD con el trailer &#96;Modulo: M&lt;id&gt;&#96; de un Módulo del plan cuenta ese Módulo como entregado; un commit fuera de HEAD no cuenta.
  - [ ] Una Sesión no cerrada con al menos un Módulo entregado conserva su estado calculado y &#96;radar status&#96; en texto le agrega &#96;a medias N/M Módulos&#96;.
  - [ ] &#96;radar sesion &lt;ID&gt;&#96; marca cada Módulo como entregado con su commit o pendiente, y nombra el primer Módulo pendiente.
  - [ ] &#96;radar status --json&#96;, &#96;radar render&#96; y el ROADMAP generado no cambian.
  - [ ] Un trailer que nombra un Módulo inexistente produce un aviso en &#96;radar check&#96;, nunca un error.
  - [ ] chanks-3-session-kickoff ordena retomar desde el primer Módulo pendiente y nunca rehacer uno entregado.
  - [ ] chanks-4-puente exige el trailer &#96;Modulo: &lt;ID&gt;&#96; en cada commit de Módulo.
  - [ ] Una prueba del Método falla si cualquiera de las dos skills pierde su regla; &#96;go test ./...&#96; y los tests de agent-workflows pasan.
  - [ ] El diff toca sólo Área.

#### M125.1 — Radar deriva los Módulos entregados desde Git y los muestra
Rutas: agent-workflows/tools/radar/avance.go, agent-workflows/tools/radar/avance&#95;test.go, agent-workflows/tools/radar/main.go, agent-workflows/tools/radar/sesion.go, agent-workflows/tools/radar/README.md

- **T125.1.1:** RED: exigir Módulos entregados por trailer alcanzable desde HEAD, la marca en status, el detalle en &#96;radar sesion&#96; y el aviso por Módulo inexistente. → RED: radar no lee trailers y la prueba falla.
  - [ ] RED: radar no lee trailers y la prueba falla.
- **T125.1.2:** GREEN: leer los trailers desde Git, cruzarlos con los Módulos del plan y mostrarlos en status y sesion. → GREEN: la prueba pasa y status --json y el ROADMAP no cambian.
  - [ ] GREEN: la prueba pasa y status --json y el ROADMAP no cambian.
- **T125.1.3:** REFACTOR: dejar la lectura de Git en un solo lugar y documentar el trailer en README. → REFACTOR: una sola lectura de trailers y las pruebas siguen pasando.
  - [ ] REFACTOR: una sola lectura de trailers y las pruebas siguen pasando.

#### M125.2 — Las skills dejan la marca y retoman desde ella
Rutas: agent-workflows/skills/chanks-3-session-kickoff/SKILL.md, agent-workflows/skills/chanks-4-puente/SKILL.md, agent-workflows/tests/test&#95;builder&#95;flow.py

- **T125.2.1:** RED: exigir la regla de retomar en kickoff y la del trailer en puente. → RED: las skills actuales no tienen las reglas y la prueba falla.
  - [ ] RED: las skills actuales no tienen las reglas y la prueba falla.
- **T125.2.2:** GREEN: agregar ambas reglas y actualizar las huellas SHA256 fijadas en la prueba. → GREEN: la prueba pasa con las dos reglas.
  - [ ] GREEN: la prueba pasa con las dos reglas.
- **T125.2.3:** REFACTOR: ubicar cada regla junto a sus pasos existentes sin duplicar el canon. → REFACTOR: cada regla vive en un solo lugar y la prueba sigue pasando.
  - [ ] REFACTOR: cada regla vive en un solo lugar y la prueba sigue pasando.

### S126 — Con la Torre apagada, el padre responsable abre en Herdr una tab por cada Sesión que el humano eligió, cada una con su worktree y su agente, y al cerrar retira sola los worktrees que prueban estar integrados.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S125
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md&#96; existe, figura en &#96;CHANKS&#95;SKILLS&#96; y la instalación la copia idéntica a la fuente en las cuatro raíces de runtime.
  - [ ] El despacho actúa sólo sobre una lista explícita del humano con ID y runtime por Sesión. Sin lista, o con un ID que &#96;radar status&#96; no calcula &#96;LISTO&#96;, termina sin crear worktree, tab ni agente.
  - [ ] Dos Sesiones elegidas que comparten un Cimiento o un Recurso no se despachan en paralelo; la skill lo reporta y no crea nada para la segunda.
  - [ ] Por cada Sesión despachada existen el worktree hermano &#96;Worktrees/&lt;id&gt;&#96; sobre la rama &#96;work/&lt;id&gt;&#96; creada desde el master verificado, una tab de Herdr propia y un agente con el nombre de la Sesión; la salida es una tabla Sesión · worktree · rama · tab · agente con IDs leídos de las respuestas JSON de Herdr.
  - [ ] Sin &#96;HERDR&#95;ENV=1&#96; la skill se detiene y ofrece el flujo con subagentes; ante una respuesta ambigua de Herdr cierra sólo lo que abrió y se detiene.
  - [ ] La skill nunca carga &#96;torre-control&#96;, nunca lee ni escribe &#96;.git/control-tower/ACTIVE&#96; ni &#96;~/.local/share/control-tower/&#96;, y nunca responde por el humano la pregunta de un agente bloqueado.
  - [ ] El agente despachado commitea sólo en &#96;work/&lt;id&gt;&#96;; nunca pushea a master ni escribe &#96;openspec/plan.yaml&#96;. El padre integra de a una Sesión por vez.
  - [ ] El retiro corre sólo después de que el padre registró la entrega de la Sesión en &#96;openspec/plan.yaml&#96;, y muta sólo si pasan los seis chequeos: &#96;radar status&#96; la calcula &#96;COMPLETO&#96; o &#96;ARCHIVADO&#96;; &#96;entrega.commit&#96; es ancestro de master; &#96;git status --porcelain&#96; del worktree está vacío; &#96;git cherry master work/&lt;id&gt;&#96; no tiene líneas &#96;+&#96;; el agente de la tab está &#96;idle&#96; o &#96;done&#96;, o la tab ya no existe; la ruta es &#96;Worktrees/&lt;id&gt;&#96; con rama &#96;work/&lt;id&gt;&#96; y nunca el checkout principal.
  - [ ] Si falla cualquiera de los seis chequeos, el retiro no cierra tab, no borra worktree ni rama, y reporta el chequeo que falló.
  - [ ] El retiro ejecuta en orden: cerrar la tab de esa Sesión, &#96;git worktree remove&#96; sin &#96;--force&#96;, &#96;git branch -d&#96; sin &#96;-D&#96;; después &#96;git worktree list&#96; ya no lista la ruta. Falsificador: aparece &#96;--force&#96; o &#96;-D&#96; en la skill.
  - [ ] Una rama integrada por cherry-pick o rebase, cuyo &#96;git cherry&#96; sólo muestra líneas &#96;-&#96;, se retira. Falsificador: la skill trata cualquier salida de &#96;git cherry&#96; como trabajo sin integrar.
  - [ ] La skill no copia procedimientos de la skill &#96;herdr&#96;: la carga para la mecánica de la CLI y no repite ningún bloque de código de ella.
  - [ ] El bloque de ruteo instalado nombra &#96;chanks-3-despacho-herdr&#96; después de la elección humana de Sesiones y su modo retiro después del registro de cierre, y declara que ese despacho con la Torre apagada es un pedido explícito de Herdr, no un despacho de Control Tower. Las pruebas de ruteo existentes siguen pasando.
  - [ ] Tras la entrega, una sesión Pi con la Torre apagada a la que se le pide despachar Sesiones aprobadas carga la skill y no se niega por la exclusión de Control Tower de la skill &#96;herdr&#96;.
  - [ ] &#96;python3 -m unittest discover -s agent-workflows/tests&#96; pasa y &#96;radar check&#96; no suma errores.
  - [ ] El diff toca sólo Área.

#### M126.1 — La skill abre una tab con worktree y agente por cada Sesión elegida
Rutas: agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md, agent-workflows/tools/install.py, agent-workflows/tests/test&#95;despacho&#95;herdr.py, agent-workflows/README.md

- **T126.1.1:** RED: exigir que la skill exista en &#96;CHANKS&#95;SKILLS&#96;, actúe sólo con lista humana de Sesiones LISTO, rechace Cimientos o Recursos compartidos, y fije una tab, un worktree &#96;Worktrees/&lt;id&gt;&#96; y un agente por Sesión sin tocar la Torre. → RED: la skill no existe y la prueba falla.
  - [ ] RED: la skill no existe y la prueba falla.
- **T126.1.2:** GREEN: escribir la skill con sus compuertas fail-closed y registrarla en el instalador y en la tabla del README. → GREEN: la prueba y las pruebas de instalación pasan.
  - [ ] GREEN: la prueba y las pruebas de instalación pasan.
- **T126.1.3:** REFACTOR: referenciar la skill &#96;herdr&#96;, Support y kickoff sin copiar sus procedimientos. → REFACTOR: ningún bloque de otra skill queda duplicado y las pruebas siguen pasando.
  - [ ] REFACTOR: ningún bloque de otra skill queda duplicado y las pruebas siguen pasando.

#### M126.2 — El modo retiro borra sólo worktrees que pasan los seis chequeos
Rutas: agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md, agent-workflows/skills/chanks-3-despacho-herdr/references/retiro.md, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T126.2.1:** RED: exigir los seis chequeos, la parada sin mutación ante cualquier falla, el orden tab → worktree → rama, la ausencia de &#96;--force&#96; y &#96;-D&#96;, y que &#96;git cherry&#96; cuente sólo líneas &#96;+&#96;. → RED: la skill no tiene modo retiro y la prueba falla.
  - [ ] RED: la skill no tiene modo retiro y la prueba falla.
- **T126.2.2:** GREEN: escribir el modo retiro en su referencia y enlazarlo desde la skill. → GREEN: la prueba pasa.
  - [ ] GREEN: la prueba pasa.
- **T126.2.3:** REFACTOR: dejar cada chequeo en un solo lugar. → REFACTOR: los chequeos viven sólo en la referencia y la prueba sigue pasando.
  - [ ] REFACTOR: los chequeos viven sólo en la referencia y la prueba sigue pasando.

#### M126.3 — El ruteo del padre enlaza despacho y retiro en el flujo
Rutas: agent-workflows/templates/session-routing.md, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T126.3.1:** RED: exigir que el bloque instalado nombre el despacho tras la elección humana, el retiro tras el registro de cierre, y que declare el despacho con Torre apagada como pedido explícito de Herdr. → RED: el bloque actual no nombra la skill y la prueba falla.
  - [ ] RED: el bloque actual no nombra la skill y la prueba falla.
- **T126.3.2:** GREEN: agregar las líneas al bloque de ruteo. → GREEN: la prueba y las pruebas de ruteo existentes pasan.
  - [ ] GREEN: la prueba y las pruebas de ruteo existentes pasan.
- **T126.3.3:** REFACTOR: mantener el bloque sin repetir reglas que ya declara. → REFACTOR: ninguna regla del bloque queda duplicada y las pruebas siguen pasando.
  - [ ] REFACTOR: ninguna regla del bloque queda duplicada y las pruebas siguen pasando.

### S127 — Radar ordena el trabajo por prioridades que define cada proyecto: sólo la primera prioridad con Sesiones abiertas ofrece trabajo LISTO, y la siguiente se activa sola cuando esa se cierra.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Con un plan que no declara &#96;prioridades&#96;, los estados, las colas por Zona, los asientos, &#96;radar.snapshot/v1&#96; y la vista generada son idénticos a los que produce Radar antes del cambio.
  - [ ] El plan acepta &#96;prioridades&#96; como lista ordenada de entradas &#96;{id, nombre}&#96; definidas por cada proyecto; &#96;radar check&#96; falla ante un id vacío, un id duplicado o un nombre vacío.
  - [ ] Con &#96;prioridades&#96; declarada, una Sesión abierta sin &#96;prioridad&#96; o con un id que no está en la lista hace fallar &#96;radar check&#96; nombrando esa Sesión; una Sesión COMPLETO o ARCHIVADO puede omitirla.
  - [ ] Una Sesión cuyo &#96;depende&#95;de&#96; apunta a una Sesión de una prioridad posterior hace fallar &#96;radar check&#96; nombrando las dos Sesiones.
  - [ ] La prioridad activa es la primera de la lista con al menos una Sesión abierta; una Sesión con &#96;diferida: true&#96; cuenta como abierta. Si no queda ninguna abierta, no hay prioridad activa y ninguna Sesión se difiere por prioridad.
  - [ ] Una Sesión de una prioridad posterior a la activa cuyo estado calculado habría sido LISTO queda DIFERIDO; PLANIFICADO, BLOQUEADO, COMPLETO y ARCHIVADO conservan su estado, y las Sesiones de la prioridad activa no cambian.
  - [ ] Cuando la última Sesión abierta de la prioridad activa pasa a COMPLETO, la siguiente prioridad se activa sin editar &#96;openspec/plan.yaml&#96;; una prueba lo demuestra con dos entregas integradas sucesivas.
  - [ ] &#96;radar status&#96;, &#96;radar sesion &lt;ID&gt;&#96;, &#96;radar.snapshot/v1&#96; y la vista generada muestran la prioridad activa y la prioridad de cada Sesión; el snapshot conserva su schema y todos sus campos actuales.
  - [ ] &#96;agent-workflows/skills/&#95;shared/plan-naming-convention.md&#96; declara &#96;prioridad&#96; como atributo opcional de orden, no como nivel, sin campo de tiempo; los cuatro niveles, los siete estados y la lista de sustantivos prohibidos no cambian.
  - [ ] Radar sigue sin escribir &#96;openspec/plan.yaml&#96;; &#96;go test ./...&#96; en &#96;agent-workflows/tools/radar&#96; pasa y &#96;radar check&#96; sobre el plan vigente no suma errores.
  - [ ] El diff toca sólo Área.

### S128 — Radar reconoce el trailer Modulo de una Sesión full-sdd: el commit cuenta como Módulo entregado de su Sesión y deja de aparecer como trailer desconocido.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Un trailer &#96;Modulo: M&lt;n&gt;.&lt;k&gt;&#96; cuya Sesión S&lt;n&gt; existe y tiene ruta efectiva full-sdd se reconoce como Módulo entregado de esa Sesión y no produce el aviso &#96;trailer de Módulo&#96;.
  - [ ] Un trailer que no nombra un Módulo del plan ni pertenece a una Sesión full-sdd sigue produciendo el aviso &#96;trailer de Módulo&#96;.
  - [ ] Para Sesiones direct y design-tasks el avance por Módulo y la marca &#96;a medias k/N&#96; de &#96;radar status&#96; no cambian.
  - [ ] &#96;radar status&#96; muestra para una Sesión full-sdd con Módulos entregados la cantidad entregada sin un total.
  - [ ] Sobre el plan vigente, &#96;radar check&#96; deja de reportar los avisos de M127.1, M127.2 y M127.3 y conserva los demás avisos.
  - [ ] &#96;go test ./...&#96; en &#96;agent-workflows/tools/radar&#96; pasa y el diff toca sólo Área.

#### M128.1 — Radar reconoce los trailers de Sesiones full-sdd
Rutas: agent-workflows/tools/radar/avance.go, agent-workflows/tools/radar/avance&#95;test.go, agent-workflows/tools/radar/main.go

- **T128.1.1:** RED: exigir que un trailer de una Sesión full-sdd cuente como Módulo entregado sin aviso, que un trailer ajeno siga avisando, que direct y design-tasks no cambien y que status muestre la cantidad entregada sin total. → RED: las pruebas fallan contra el lector de trailers actual.
  - [ ] RED: las pruebas fallan contra el lector de trailers actual.
- **T128.1.2:** GREEN: reconocer en AvanceModulosAt los trailers cuyo prefijo nombra una Sesión con ruta efectiva full-sdd y mostrar la cantidad en cmdStatus. → GREEN: las pruebas nuevas y existentes de Go pasan.
  - [ ] GREEN: las pruebas nuevas y existentes de Go pasan.
- **T128.1.3:** REFACTOR: resolver el dueño de un trailer en un solo helper reutilizado por el avance y por los avisos. → REFACTOR: existe un único resolvedor de dueño y go test pasa.
  - [ ] REFACTOR: existe un único resolvedor de dueño y go test pasa.

### S130 — El puente protege el lote de revisión: revisa sólo el código del Módulo en staging, commitea los artefactos SDD aparte y cierra el intento nativo de un Módulo antes de tocar el siguiente.
- Estado derivado: 📚 ARCHIVADO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S135
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;agent-workflows/skills/chanks-4-puente/SKILL.md&#96; declara que la revisión nativa de cada Módulo se hace sobre la proyección staged que contiene sólo los archivos de ese Módulo.
  - [ ] La skill declara que proposal, specs, design, tasks, apply-progress y verify-report se commitean en un commit de documentación separado de cada commit de Módulo.
  - [ ] La skill declara que el intento nativo de un Módulo se cierra con &#96;gentle-ai sdd-attempt settle&#96; antes de modificar cualquier archivo del Módulo siguiente.
  - [ ] &#96;agent-workflows/tests/test&#95;builder&#95;flow.py&#96; falla si alguna de las tres reglas desaparece de la skill.
  - [ ] &#96;cd agent-workflows &amp;&amp; python3 -m unittest discover -s tests&#96; pasa y el diff toca sólo Área.

#### M130.1 — El puente escribe las tres reglas que protegen el lote
Rutas: agent-workflows/skills/chanks-4-puente/SKILL.md, agent-workflows/tests/test&#95;builder&#95;flow.py

- **T130.1.1:** RED: exigir en test&#95;builder&#95;flow.py las reglas de revisión sobre staged, commit separado de artefactos SDD y cierre del intento antes del Módulo siguiente. → RED: la prueba falla contra el puente actual.
  - [ ] RED: la prueba falla contra el puente actual.
- **T130.1.2:** GREEN: agregar las tres reglas a las Hard Rules o a los pasos de ejecución del puente. → GREEN: la suite del Método pasa.
  - [ ] GREEN: la suite del Método pasa.
- **T130.1.3:** REFACTOR: dejar cada regla escrita una sola vez en la skill, sin repetirla entre secciones. → REFACTOR: ninguna regla queda duplicada y la suite del Método pasa.
  - [ ] REFACTOR: ninguna regla queda duplicada y la suite del Método pasa.

### S131 — El despacho manual con Herdr reutiliza el pool de workers que declara el repositorio: conserva worktree, tab y dependencias entre Sesiones, y renueva sólo la rama de asignación y el agente.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S126
- Cimientos: —
- Recursos: directorio persistente de sincronización bajo el Git common-dir con ownership HELD efímero protegido por flock y uso exclusivo de los workers declarados durante despacho o retiro
- Criterios de aceptación:
  - [ ] &#96;chanks-3-despacho-herdr&#96; lee de &#96;AGENTS.md&#96; la declaración del pool reutilizable, sus roles y cuándo preparar o refrescar cada worker; no fija Bun, npm, cantidad ni nombres para otros proyectos.
  - [ ] Si el repositorio no declara un pool reutilizable completo, la skill falla cerrado antes de crear ramas o agentes; nunca crea un worktree efímero por Sesión ni adivina una topología.
  - [ ] Antes de leer disponibilidad, asignar o retirar, el padre toma un &#96;flock&#96; exclusivo no bloqueante sobre el único directorio persistente de sincronización bajo &#96;git rev-parse --git-common-dir&#96;, valida path+inode y publica ownership &#96;HELD&#96; efímero con readback exacto; un owner vivo o ambiguo nunca se recupera, y un estado interrumpido sólo se reemplaza con autorización fresca del mantenedor ligada a la evidencia exacta y con el pool quiescente.
  - [ ] Con el lock adquirido, el padre valida y reserva el lote humano completo antes de lanzar el primer agente: todas las Sesiones siguen LISTO, son compatibles y tienen un worker apto. Si una falla, libera sólo el lock propio y lanza cero agentes; el orden de la lista nunca produce un despacho parcial.
  - [ ] El mapeo reservado asigna cada Sesión a un worker declarado que prueba estar libre, limpio y fuera del checkout Main; &#96;issue-resolver&#96; sólo recibe una Sesión respaldada por un issue de Control Tower elegido por el humano.
  - [ ] El worktree y la tab identifican al worker y permanecen entre asignaciones; cada Sesión activa conserva una tab propia, una rama nueva &#96;work/&lt;id&gt;&#96; desde el master verificado y un agente nuevo con el nombre de la Sesión. Una rama ya existente o un readback ambiguo detiene el lote sin reset ni force.
  - [ ] La disponibilidad se prueba bajo el &#96;flock&#96; desde Git, Radar y el readback vivo de Herdr: no hay árbol sucio, agente anterior activo, entrega pendiente ni identidad divergente. El ownership vuelve atómicamente a &#96;RELEASED&#96; y el &#96;flock&#96; se libera sólo después del readback de todos los agentes lanzados o de un rollback comprobado; no existe roster ni estado de planificación paralelo.
  - [ ] La preparación declarada corre sólo al provisionar el worker o cuando falta su entorno o la evidencia declarada quedó stale; una reasignación con entorno válido ejecuta cero reinstalaciones y nunca copia ni enlaza dependencias desde otro checkout.
  - [ ] Si preparación o lanzamiento falla, se cierran sólo los agentes abiertos por ese lote y se devuelven sólo sus ramas nuevas a un estado limpio comprobado; worktrees, tabs y dependencias permanecen. Un rollback ambiguo conserva el lock y pide decisión humana.
  - [ ] El modo retiro adquiere el mismo lock, conserva los seis chequeos seguros aplicables de S126, cierra sólo el agente terminado, mantiene tab, worktree y dependencias, deja el worker detached en el master integrado y libera el lock después de confirmar por readback que quedó libre; nunca ejecuta &#96;git worktree remove&#96; para un worker del pool.
  - [ ] Un retiro o asignación fallidos no reciclan por inferencia, no borran ramas con force y no tocan otro worker. El padre sigue integrando una Sesión por vez y es el único que escribe &#96;openspec/plan.yaml&#96;.
  - [ ] &#96;agent-workflows/tests/test&#95;despacho&#95;herdr.py&#96; falla si reaparece creación o borrado por Sesión, reinstalación incondicional, check-then-act sin lock, despacho parcial, selección no humana, reutilización ocupada o coupling con Torre; la suite del Método pasa y el diff toca sólo Área.

#### M131.1 — El despacho y retiro reciclan workers declarados sin perder su entorno
Rutas: agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md, agent-workflows/skills/chanks-3-despacho-herdr/references/retiro.md, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T131.1.1:** RED: exigir pool declarado, lock atómico compartido, validación all-or-nothing del lote, disponibilidad probada, rama y agente nuevos, preparación sólo por ausencia o drift, especialización de issue-resolver y retiro persistente bajo el mismo lock. → RED: las pruebas fallan contra el lifecycle efímero y el check-then-act de S126.
  - [ ] RED: cubre contención, lock ambiguo, conflicto tardío sin lanzamiento parcial y rollback ambiguo además del camino válido.
- **T131.1.2:** GREEN: reescribir despacho y retiro para reservar el lote bajo el lock común, lanzar agentes nuevos y devolver cada worker limpio y detached sin perder entorno ni crear estado paralelo. → GREEN: la suite contractual pasa; dos despachos no toman el mismo worker y una reasignación válida conserva dependencias.
  - [ ] GREEN: crear o retirar una Sesión ejecuta cero creación o borrado del worktree declarado y libera sólo el lock propio tras readback.
- **T131.1.3:** REFACTOR: concentrar exclusión, disponibilidad, preparación y retorno en un solo lifecycle referenciado por ambos modos, preservando gates humanos, Radar y Herdr de S126. → REFACTOR: no hay check-then-act, reglas duplicadas ni regresiones de autoridad y la suite del Método pasa.
  - [ ] REFACTOR: una sola frontera all-or-nothing gobierna asignación y devolución del pool.

### S132 — Un worker reutilizable de control-tower corre la prueba del gate de pre-push sin preparar Radar a mano, y AGENTS.md declara la preparación persistente, la reinstalación de herramientas y la captura inmediata de fricciones.
- Estado derivado: ✅ COMPLETO
- Zona/Área: cimientos · —
- Depende de: S12.1
- Cimientos: AGENTS.md, test/pre-push-plan-gate.test.mjs
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;AGENTS.md&#96; declara el pool manual Herdr-off actual como Main más &#96;issue-resolver&#96; y tres implementers reutilizables: es una topología elegida, no un límite universal para agentes autorizados por el humano.
  - [ ] Cada worker ejecuta &#96;bun install --frozen-lockfile&#96; al crearse y sólo lo repite si faltan dependencias o cambió &#96;bun.lock&#96;; nunca copia ni enlaza &#96;node&#95;modules&#96; desde otro checkout y una nueva asignación conserva el entorno válido.
  - [ ] Toda Sesión que detecta o recibe una fricción busca issues abiertos y cerrados de &#96;achangkuon/control-tower&#96; mientras conserva el contexto fresco; actualiza el issue sistémico canónico o crea un Friction Report sanitizado y verifica el efecto por readback.
  - [ ] Crear o actualizar un issue nunca autoriza repararlo; &#96;issue-resolver&#96; sólo trabaja en issues de Control Tower y sólo modifica código después de aprobación humana, una Sesión admisible por Radar y evidencia de compatibilidad con el trabajo concurrente.
  - [ ] &#96;AGENTS.md&#96; declara qué reinstalar al cerrar: &#96;agent-workflows/tools/install-radar.sh&#96; cuando la entrega toca &#96;agent-workflows/tools/radar/&#96;, y &#96;python3 agent-workflows/tools/install.py&#96; seguido de &#96;--check&#96; cuando toca &#96;agent-workflows/skills/&#96; o &#96;agent-workflows/templates/&#96;, con confirmación humana previa para las skills.
  - [ ] &#96;test/pre-push-plan-gate.test.mjs&#96; compila Radar en un directorio temporal cuando &#96;agent-workflows/tools/radar/radar&#96; no existe, pasa &#96;-f&#96; con el plan absoluto del repositorio objetivo y usa el binario versionado cuando existe.
  - [ ] En un worker reutilizable sin el binario de Radar, &#96;bun test test/pre-push-plan-gate.test.mjs&#96; pasa sin depender del checkout principal.
  - [ ] El diff toca sólo los dos Cimientos reservados.

#### M132.1 — La prueba del gate compila su propio Radar y liga el plan objetivo cuando falta el binario
Rutas: test/pre-push-plan-gate.test.mjs

- **T132.1.1:** RED: ejecutar la prueba del gate sin el binario y desde un cwd cuyo plan no es el objetivo; observar los fallos de resolución. → RED: la prueba falla por binario ausente o por resolver el plan equivocado.
  - [ ] RED: ambos fallos quedan reproducidos antes de implementar.
- **T132.1.2:** GREEN: compilar Radar en un directorio temporal cuando falta y pasar &#96;-f&#96; con el plan absoluto del repositorio objetivo. → GREEN: la prueba pasa con y sin binario versionado y desde un worker distinto.
  - [ ] GREEN: las tres variantes usan el mismo plan objetivo y pasan.
- **T132.1.3:** REFACTOR: resolver binario y plan objetivo en un solo helper y limpiar el directorio temporal al terminar. → REFACTOR: existe un único resolvedor y no quedan temporales.
  - [ ] REFACTOR: la resolución está concentrada y la prueba permanece verde.

#### M132.2 — AGENTS.md declara workers reutilizables, reinstalación de herramientas y captura inmediata de fricción
Rutas: AGENTS.md

- **T132.2.1:** RED: comprobar que AGENTS.md no declara todavía el pool persistente, la preparación por ausencia o drift, la captura inmediata ni qué reinstalar al cerrar. → RED: las cuatro reglas están ausentes o contradicen el modelo aprobado.
  - [ ] RED: cada ausencia o contradicción queda enumerada antes de editar.
- **T132.2.2:** GREEN: agregar una política única con topología reutilizable, preparación inicial o por drift, intake sistémico sanitizado y tabla de reinstalación por rutas tocadas. → GREEN: AGENTS.md gobierna el ciclo completo sin autorizar reparaciones desde un issue.
  - [ ] GREEN: las cuatro reglas y sus límites están presentes y no contradicen la entrega directa.
- **T132.2.3:** REFACTOR: enlazar la política operativa sin repetir la política de entrega, el formulario ni los criterios de Radar. → REFACTOR: existe una sola regla operativa y las fuentes canónicas siguen separadas.
  - [ ] REFACTOR: no hay instrucciones duplicadas ni una segunda fuente de verdad.

### S134 — Un agente decide si dos Sesiones pueden correr en paralelo leyendo sólo a Radar: la capacidad se presenta como veredicto de paralelo, una Sesión de cimientos muestra su territorio real y el ruteo carga la skill de despacho al elegir paralelo.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;radar sesion&#96; de una Sesión con &#96;zona: cimientos&#96; muestra como Área sus reservas exactas de Cimientos y nunca &#96;—&#96;.
  - [ ] &#96;radar status&#96; dice que las Zonas listadas en Asientos pueden trabajar en paralelo sin compartir Zona, Cimientos ni Recurso, y que Radar no reserva el asiento; la frase «pronóstico, no locks» desaparece.
  - [ ] La vista generada presenta la capacidad con el mismo veredicto de paralelo y la misma aclaración sobre reservas, y el golden de render queda regenerado.
  - [ ] &#96;agent-workflows/templates/session-routing.md&#96; declara que, cuando el humano elige Sesiones LISTO en paralelo, el padre responsable carga &#96;chanks-3-despacho-herdr&#96;; ya no dice «may load».
  - [ ] La skill de soporte y el §13 del canon declaran que la compatibilidad de Asientos es el veredicto de paralelo derivado de la partición y que no reserva nada en vivo; el canon conserva «forecast, never a live lock».
  - [ ] &#96;go test ./...&#96; en &#96;agent-workflows/tools/radar&#96; y &#96;cd agent-workflows &amp;&amp; python3 -m unittest discover -s tests&#96; pasan, y el diff toca sólo Área.

#### M134.1 — Radar presenta el paralelo como veredicto y el territorio de cimientos
Rutas: agent-workflows/tools/radar/sesion.go, agent-workflows/tools/radar/main.go, agent-workflows/tools/radar/render.go, agent-workflows/tools/radar/sesion&#95;test.go, agent-workflows/tools/radar/render&#95;test.go, agent-workflows/tools/radar/testdata/ROADMAP.golden.md

- **T134.1.1:** RED: exigir que radar sesion muestre las reservas de una Sesión de cimientos como Área, que status diga que las Zonas compatibles pueden trabajar en paralelo sin reservar el asiento y que la vista generada diga lo mismo. → RED: las pruebas fallan contra las frases actuales.
  - [ ] RED: las pruebas fallan contra las frases actuales.
- **T134.1.2:** GREEN: cambiar la línea de Área para cimientos, la línea de Asientos de cmdStatus y la sección de capacidad de RenderAt, y regenerar el golden. → GREEN: go test pasa con el golden regenerado.
  - [ ] GREEN: go test pasa con el golden regenerado.
- **T134.1.3:** REFACTOR: escribir la frase del veredicto de paralelo en un solo lugar reutilizado por status y por la vista. → REFACTOR: la frase existe una sola vez y go test pasa.
  - [ ] REFACTOR: la frase existe una sola vez y go test pasa.

#### M134.2 — El Método lee la compatibilidad como veredicto y carga el despacho
Rutas: agent-workflows/templates/session-routing.md, agent-workflows/skills/chanks-0-agente-soporte/SKILL.md, agent-workflows/skills/&#95;shared/plan-naming-convention.md, agent-workflows/tools/radar/README.md, agent-workflows/tests/test&#95;builder&#95;flow.py, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T134.2.1:** RED: exigir que el ruteo cargue chanks-3-despacho-herdr al elegir paralelo y que la skill de soporte y el canon declaren la compatibilidad como veredicto de paralelo sin reserva en vivo. → RED: las pruebas del Método fallan contra los textos actuales.
  - [ ] RED: las pruebas del Método fallan contra los textos actuales.
- **T134.2.2:** GREEN: cambiar «may load» por «loads» y agregar el veredicto de paralelo a la plantilla, a la skill de soporte, al §13 del canon y al README de Radar. → GREEN: la suite del Método pasa.
  - [ ] GREEN: la suite del Método pasa.
- **T134.2.3:** REFACTOR: hacer que la skill de soporte, la plantilla y el README remitan al §13 del canon sin repetir la regla completa. → REFACTOR: la regla vive en el canon y la suite del Método pasa.
  - [ ] REFACTOR: la regla vive en el canon y la suite del Método pasa.

### S135 — SDD nativo sólo para full-sdd: direct y design-tasks usan el camino no-SDD de Gentle AI y verifican contra los criterios del plan sin crear openspec/changes, y Radar sólo acepta &#96;cambio&#96; en Sesiones full-sdd.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] El §15 de &#96;agent-workflows/skills/&#95;shared/plan-naming-convention.md&#96; declara que sólo &#96;full-sdd&#96; recorre la pipeline SDD nativa de Gentle AI y su &#96;archive&#96;, y que &#96;direct&#96; y &#96;design-tasks&#96; usan el camino no-SDD de Gentle AI sin crear &#96;openspec/changes/&#96;.
  - [ ] El canon declara que &#96;verify&#96; sigue siendo obligatorio para las tres rutas y que en &#96;direct&#96; y &#96;design-tasks&#96; se verifica contra los criterios del plan, con la evidencia criterio por criterio en el cuerpo del commit que registra la entrega.
  - [ ] El canon declara que una Sesión &#96;design-tasks&#96; registra el resultado de su design en el plan —revalidación, decisiones y Tareas ajustadas— y no en un documento aparte.
  - [ ] &#96;chanks-4-puente&#96;, &#96;templates/session-routing.md&#96;, &#96;references/juicio-de-ruta.md&#96;, &#96;chanks-7-session-doc&#96; y la plantilla de asignación de Support remiten a esa regla y no afirman que las tres rutas pasan por SDD ni que &#96;archive&#96; es común a las tres.
  - [ ] &#96;radar check&#96; falla, sin consultar a Gentle AI, cuando una Sesión cuya ruta efectiva no es &#96;full-sdd&#96; declara &#96;cambio&#96;; para &#96;full-sdd&#96; sigue validando el estado SDD nativo.
  - [ ] &#96;go test ./...&#96; en &#96;agent-workflows/tools/radar&#96; y &#96;cd agent-workflows &amp;&amp; python3 -m unittest discover -s tests&#96; pasan, y el diff toca sólo Área.

#### M135.1 — Radar sólo acepta &#96;cambio&#96; y la puerta SDD en Sesiones full-sdd
Rutas: agent-workflows/tools/radar/check.go, agent-workflows/tools/radar/ledger.go, agent-workflows/tools/radar/gate&#95;test.go, agent-workflows/tools/radar/README.md

- **T135.1.1:** RED: exigir que radar check falle sin consultar a Gentle AI cuando una Sesión direct o design-tasks declara &#96;cambio&#96;, y que siga leyendo el estado nativo sólo para full-sdd. → RED: las pruebas fallan contra la puerta de tres rutas.
  - [ ] RED: las pruebas fallan contra la puerta de tres rutas.
- **T135.1.2:** GREEN: rechazar &#96;cambio&#96; fuera de la ruta efectiva full-sdd antes de cualquier consulta al ledger o al estado, y conservar la validación del estado para full-sdd. → GREEN: go test pasa.
  - [ ] GREEN: go test pasa.
- **T135.1.3:** REFACTOR: reemplazar el mapa de tres puertas por una única regla de full-sdd y actualizar el README de Radar. → REFACTOR: no queda mapa de ruta a fase y go test pasa.
  - [ ] REFACTOR: no queda mapa de ruta a fase y go test pasa.

#### M135.2 — El Método sólo manda full-sdd por la pipeline SDD nativa
Rutas: agent-workflows/skills/&#95;shared/plan-naming-convention.md, agent-workflows/skills/chanks-4-puente/SKILL.md, agent-workflows/templates/session-routing.md, agent-workflows/skills/chanks-2-planificador-granular/references/juicio-de-ruta.md, agent-workflows/skills/chanks-7-session-doc/SKILL.md, agent-workflows/skills/chanks-7-session-doc/references/links.md, agent-workflows/skills/chanks-0-agente-soporte/assets/assignment-implementation.md, agent-workflows/tests/test&#95;install.py, agent-workflows/tests/test&#95;builder&#95;flow.py

- **T135.2.1:** RED: exigir que canon, puente, ruteo, juicio de ruta, cierre y asignación declaren SDD nativo y archive sólo para full-sdd, verify contra criterios con evidencia en el commit de entrega para direct y design-tasks, y el design de design-tasks en el plan. → RED: las pruebas del Método fallan contra los textos actuales.
  - [ ] RED: las pruebas del Método fallan contra los textos actuales.
- **T135.2.2:** GREEN: reescribir la regla de rutas en cada superficie. → GREEN: la suite del Método pasa.
  - [ ] GREEN: la suite del Método pasa.
- **T135.2.3:** REFACTOR: dejar la regla completa sólo en el §15 del canon y hacer que las demás superficies remitan a él. → REFACTOR: la regla vive una vez y la suite del Método pasa.
  - [ ] REFACTOR: la regla vive una vez y la suite del Método pasa.

### S136 — Control Tower recibe errores, bugs y fricciones de proceso mediante un formulario único de GitHub que exige búsqueda de duplicados, evidencia y limpieza de datos sensibles antes de publicar.
- Estado derivado: ✅ COMPLETO
- Zona/Área: cimientos · —
- Depende de: —
- Cimientos: .github/ISSUE&#95;TEMPLATE/friction&#95;report.yml
- Recursos: github:achangkuon/control-tower:issues
- Criterios de aceptación:
  - [ ] La rama master contiene &#96;.github/ISSUE&#95;TEMPLATE/friction&#95;report.yml&#96; y GitHub lo expone como Issue Form de Control Tower.
  - [ ] El formulario exige confirmar búsqueda de duplicados y remoción de credenciales, tokens, rutas privadas, hostnames y otros datos sensibles.
  - [ ] El formulario distingue Bug, Process friction y Radar warning, y exige problema, impacto, evidencia o reproducción, y comportamiento esperado.
  - [ ] Un agente puede materializar el cuerpo en el orden del formulario, crear un issue y verificar por readback su título, cuerpo, estado y etiquetas.
  - [ ] No se agrega un formulario Markdown, un cuerpo libre alternativo ni una dependencia nueva.

#### M136.1 — Formulario único y publicable de fricciones de Control Tower
Rutas: .github/ISSUE&#95;TEMPLATE/friction&#95;report.yml

- **T136.1.1:** RED: comprobar que GitHub no encuentra &#96;.github/ISSUE&#95;TEMPLATE&#96; en master y que no existe un formulario seleccionable. → La consulta al repositorio devuelve 404 antes de implementar.
  - [ ] La ausencia actual del formulario queda probada por GitHub.
- **T136.1.2:** GREEN: agregar el Issue Form con los controles y campos obligatorios derivados de gentle-pi. → El YAML es válido y contiene el contrato de captura aprobado.
  - [ ] Todos los campos y opciones exigidos están presentes en orden estable.
- **T136.1.3:** REFACTOR: validar el formulario, publicarlo en master y crear los primeros issues con readback exacto. → GitHub expone el formulario y los primeros reportes quedan confirmados en el tracker de Control Tower.
  - [ ] La publicación y cada issue tienen identidad estable y readback coincidente.

### S137 — El despacho manual pre-V1 usa Herdr sólo para asientos y procesos, transporta el trabajo de workers Pi por Intercom sin bloquear a Main y devuelve cada evento por una ruta explícita.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;chanks-3-despacho-herdr&#96; rechaza antes de cualquier efecto todo lote sin aprobación humana completa o cuyo agent kind no sea Pi, y nunca sustituye el runtime elegido.
  - [ ] Herdr se usa sólo para crear o identificar los asientos y procesos ya autorizados; el handoff de trabajo a cada worker Pi usa Intercom &#96;send&#96; y Main retorna después del resultado de entrega sin &#96;herdr agent wait&#96;, &#96;prompt --wait&#96; ni &#96;intercom ask&#96;.
  - [ ] Cada worker Pi reporta progreso y estados terminales COMPLETED, BLOCKED o FAILED a Main por Intercom; una decisión humana usa una solicitud bloqueante iniciada por el worker, nunca polling iniciado por Main.
  - [ ] Una identidad Intercom ausente, ambigua, desconectada o distinta del worker aprobado falla cerrado y no se declara despachada; la skill no agrega retry, cola, roster, persistencia, autoasignación ni fallback a otro transporte.
  - [ ] El routing instalado conserva explícitamente que Intercom es transporte sin autoridad, que el modo manual pre-V1 es Pi-only y que el bridge heterogéneo pertenece a Tower V1.
  - [ ] Las pruebas contractuales fallan si reaparece una espera ordinaria de Main, un agent kind no-Pi, un mensaje que otorgue autoridad o un bridge provisional, y la suite del Método pasa sobre el diff declarado.

#### M137.1 — Despacho Pi por Intercom sin espera del coordinador
Rutas: agent-workflows/skills/chanks-3-despacho-herdr/SKILL.md, agent-workflows/templates/session-routing.md, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T137.1.1:** RED: exigir Pi-only, separación entre topología Herdr y transporte Intercom, handoff con send, eventos worker→Main y ausencia de wait, polling, autoridad o bridge provisional. → RED: la prueba contractual falla contra el dispatcher que acepta runtimes mixtos y espera cada agente.
  - [ ] RED: cada regresión de runtime, transporte, dirección del evento y no bloqueo tiene una aserción falsificable.
- **T137.1.2:** GREEN: ajustar el dispatcher y el routing instalado para validar workers Pi, enviar cada handoff por Intercom y devolver control tras la entrega, con decisiones bloqueantes iniciadas sólo por el worker. → GREEN: dos handoffs Pi independientes quedan definidos como fire-and-forget y Main no supervisa por espera o polling.
  - [ ] GREEN: el contrato nombra identidad, fallo cerrado, observabilidad y los tres resultados terminales sin persistencia nueva.
- **T137.1.3:** REFACTOR: eliminar reglas de transporte duplicadas y conservar intactos autoridad humana, gates Radar, lifecycle Herdr y el límite entre coordinación manual y Tower V1. → REFACTOR: una sola frontera separa asiento, mensaje y autoridad, y la suite del Método pasa.
  - [ ] REFACTOR: el diff queda dentro de las tres rutas declaradas y no modifica S131, S132 ni runtime Tower.

### S138 — El puente ejecuta Tareas como evidencia interna RED/GREEN/REFACTOR, entrega exactamente un commit reversible por Módulo y revisa por defecto una única candidata inmutable de Sesión mediante RDD nativo antes de la entrega.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S135
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;agent-workflows/skills/chanks-4-puente/SKILL.md&#96; declara que cada Tarea sólo aporta evidencia interna RED/GREEN/REFACTOR y no produce ni un commit ni un checkpoint de revisión RDD nativa.
  - [ ] La skill declara que cada Módulo completado produce exactamente un commit independientemente reversible que incluye su código y pruebas y lleva el trailer &#96;Modulo: M&lt;n&gt;.&lt;k&gt;&#96;.
  - [ ] La skill declara que, por defecto, una única transacción RDD nativa revisa la candidata inmutable completa de la Sesión después de completar todos sus Módulos y verify, y antes de delivery.
  - [ ] La skill permite una revisión anterior o por Módulo sólo cuando el humano la seleccionó explícitamente para una unidad sobredimensionada o independientemente entregable; la mera existencia de un Módulo nunca selecciona esa excepción.
  - [ ] La skill declara que los artefactos de planificación y SDD permanecen fuera de la referencia de 400 líneas según la política del repositorio y no reinstala el modelo de review o intento por Módulo de S130.
  - [ ] La regla se aplica a direct, design-tasks y full-sdd sin alterar que sólo full-sdd posee la pipeline SDD nativa y archive.
  - [ ] &#96;agent-workflows/tests/test&#95;builder&#95;flow.py&#96; falla si desaparece cualquiera de estas reglas; &#96;cd agent-workflows &amp;&amp; python3 -m unittest discover -s tests&#96; pasa y el diff toca sólo las rutas del Módulo.

#### M138.1 — El puente y su prueba fijan el alcance de Tareas, commits por Módulo y revisión RDD por Sesión.
Rutas: agent-workflows/skills/chanks-4-puente/SKILL.md, agent-workflows/tests/test&#95;builder&#95;flow.py

- **T138.1.1:** RED: agregar una prueba contractual que exija evidencia RED/GREEN/REFACTOR interna por Tarea, exactamente un commit reversible con pruebas y trailer por Módulo, una transacción RDD nativa por candidata completa de Sesión y la excepción sólo por selección humana explícita. → RED: la prueba falla contra el puente actual.
  - [ ] Cada límite de Tarea, Módulo, Sesión, excepción humana y ownership de ruta tiene una aserción falsificable.
- **T138.1.2:** GREEN: declarar en el puente el contrato único para direct, design-tasks y full-sdd, sin convertir Módulos en checkpoints RDD ni cambiar la propiedad de ruta de S135. → GREEN: el puente expresa el contrato aprobado y la suite del Método pasa.
  - [ ] Las reglas aprobadas aparecen una vez y las aserciones nuevas y existentes pasan.
- **T138.1.3:** REFACTOR: eliminar ambigüedad o duplicación entre el flujo de ejecución y el contrato de review, conservando verify obligatorio, archive exclusivo de full-sdd y el límite de 400 líneas de la política. → REFACTOR: la regla queda coherente, no recrea S130 y mantiene la compatibilidad de rutas.
  - [ ] El diff queda dentro de las dos rutas declaradas y la suite del Método pasa.

### S139 — Radar admite una clasificación inline y cerrada para rutas intencionalmente ausentes, silencia sólo esas declaraciones y falla si la clasificación queda obsoleta.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Las reglas de &#96;zonas&#91;&#93;.rutas&#96; y &#96;cimientos.rutas&#96; aceptan la forma escalar vigente o una forma inline con &#96;ruta&#96; y &#96;ausencia&#95;intencional&#96;, sin una lista paralela de excepciones.
  - [ ] &#96;ausencia&#95;intencional&#96; acepta sólo &#96;legado-retirado&#96; o &#96;reserva-futura&#96;; claves, valores o formas desconocidas fallan cerrado al cargar el plan.
  - [ ] Una regla anotada y realmente ausente no emite &#96;rutas reales&#96;, mientras toda regla ausente no anotada conserva el aviso actual.
  - [ ] Si una regla anotada ya corresponde a un archivo tracked, Radar devuelve un error stale en vez de conservar o ignorar silenciosamente la clasificación.
  - [ ] La representación interna preserva los consumidores existentes de rutas, y &#96;go test ./...&#96; pasa en &#96;agent-workflows/tools/radar&#96;.

#### M139.1 — Contrato Radar para clasificar una ausencia intencional en su única declaración de ruta.
Rutas: agent-workflows/tools/radar/plan.go, agent-workflows/tools/radar/partition.go, agent-workflows/tools/radar/contract&#95;test.go, agent-workflows/tools/radar/future&#95;paths&#95;test.go

- **T139.1.1:** RED: exigir parser cerrado, supresión exacta, preservación de avisos no anotados y rechazo stale. → RED: las pruebas fallan contra el parser escalar y los avisos actuales.
  - [ ] Cada forma inválida, supresión indebida y clasificación stale tiene una aserción falsificable.
- **T139.1.2:** GREEN: aceptar el metadato inline, proyectar las rutas a los consumidores actuales y aplicar sólo la supresión exacta. → GREEN: las nuevas pruebas y la suite Radar pasan.
  - [ ] No cambia el resultado para planes que usan sólo rutas escalares.
- **T139.1.3:** REFACTOR: centralizar el enum y separar coincidencia tracked de reserva futura para que stale no dependa de &#96;usadas&#96;. → REFACTOR: el contrato queda cerrado, legible y sin una segunda lista de ownership.
  - [ ] El diff queda dentro de las cuatro rutas declaradas y &#96;go test ./...&#96; pasa.

### S140 — El plan clasifica inline sus cinco rutas intencionalmente ausentes y &#96;radar check&#96; vuelve a cero avisos sin borrar ownership histórico o futuro.
- Estado derivado: ✅ COMPLETO
- Zona/Área: autoridad · openspec/plans/, openspec/plan.yaml, openspec/ROADMAP.md, openspec/prd/, openspec/rfc/, openspec/specs/, openspec/maintenance/, openspec/config.yaml, docs/
- Depende de: S139
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;profiles/&#96; y las tres rutas retiradas &#96;skills/torre-control-&#42;&#96; se declaran inline como &#96;legado-retirado&#96;.
  - [ ] &#96;test/install/tower-role-assets.contract.mjs&#96; se declara inline como &#96;reserva-futura&#96;.
  - [ ] No cambia ninguna regla de ownership, no aparece una lista paralela y los comentarios narrativos dejan de ser la única clasificación operativa.
  - [ ] &#96;radar check -C .&#96; devuelve 0 errores y 0 avisos; &#96;radar status&#96; y &#96;radar render&#96; siguen pasando.

#### M140.1 — Activación de las cinco clasificaciones de ausencia intencional.
Rutas: openspec/plan.yaml

- **T140.1.1:** RED: ejecutar Radar contra el plan sin anotaciones y conservar los cinco avisos observados. → RED: &#96;radar check&#96; informa 0 errores y 5 avisos.
  - [ ] Los cinco avisos corresponden exactamente a las rutas de &#35;135.
- **T140.1.2:** GREEN: convertir sólo esas cinco entradas a la forma inline con su enum aprobado. → GREEN: &#96;radar check&#96; informa 0 errores y 0 avisos.
  - [ ] Cada anotación queda junto a su única declaración de ruta.
- **T140.1.3:** REFACTOR: regenerar ROADMAP y confirmar que status, render y la suite Radar no cambian su semántica. → REFACTOR: la vista y las comprobaciones quedan convergentes.
  - [ ] &#96;go test ./...&#96;, &#96;radar check&#96; y &#96;radar render&#96; pasan.

### S141 — Toda intención manual de iniciar, continuar o retomar implementación atraviesa una admisión Radar fresca antes de elegir skill; una Sesión no elegible sólo produce su estado y las opciones LISTO actuales, sin caer en cierre de decisiones.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: —
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] Support define un bundle de admisibilidad ligado al HEAD actual, compuesto por &#96;radar status --json&#96;, &#96;radar sesion &lt;ID&gt;&#96;, el estado/bloqueo pedido y las opciones &#96;LISTO&#96; en orden de cola por Zona.
  - [ ] El bundle distingue explícitamente capacidad compatible (&#96;asientos&#96;), longitud/orden de cola y cantidad de opciones &#96;LISTO&#96;; ninguno se presenta como cantidad de agentes asignables.
  - [ ] El routing exige ese bundle fresco antes de seleccionar cualquier skill para start/continue/resume implementation; una Sesión no &#96;LISTO&#96; produce sólo estado, bloqueo y opciones actuales.
  - [ ] &#96;chanks-3-session-kickoff&#96; falla cerrado ante bundle ausente, HEAD divergente o ID no admisible, y preserva el resume exacto desde el primer Módulo pendiente cuando la Sesión ya iniciada tiene evidencia válida.
  - [ ] &#96;chanks-1-cierre-de-decisiones&#96; se activa sólo por pedido humano explícito de resolver la decisión nombrada, consume evidencia Radar mediante Support y nunca es fallback de una continuación rechazada.
  - [ ] La plantilla instalada proyecta el mismo gate en los cuatro runtimes; las pruebas fallan si reaparece lectura directa de &#96;plan.yaml&#96;, bypass de kickoff o confusión entre asientos, cola y opciones LISTO.
  - [ ] El cambio toca sólo &#96;agent-workflows/&#96;, no carga Tower, y &#96;python3 -m unittest discover -s agent-workflows/tests&#96; pasa.

#### M141.1 — Gate de admisión Radar imposible de saltear en routing, Support, kickoff y cierre de decisiones.
Rutas: agent-workflows/skills/chanks-0-agente-soporte/SKILL.md, agent-workflows/skills/chanks-0-agente-soporte/assets/brief-diario.md, agent-workflows/skills/chanks-0-agente-soporte/assets/assignment-implementation.md, agent-workflows/skills/chanks-3-session-kickoff/SKILL.md, agent-workflows/skills/chanks-1-cierre-de-decisiones/SKILL.md, agent-workflows/skills/chanks-1-cierre-de-decisiones/references/decision-extraction.md, agent-workflows/templates/session-routing.md, agent-workflows/tests/test&#95;builder&#95;flow.py, agent-workflows/tests/test&#95;install.py

- **T141.1.1:** RED: exigir bundle fresco, rechazo de no-LISTO sin fallback, pedido explícito de decisiones, resume exacto y separación asientos/cola/opciones. → RED: las pruebas contractuales fallan contra el routing advisory, kickoff sin admisión y lectura directa del plan.
  - [ ] Cada bypass y confusión de capacidad tiene una aserción negativa nombrada.
- **T141.1.2:** GREEN: definir el bundle en Support y hacerlo obligatorio en routing, kickoff y cierre de decisiones sin duplicar el cálculo de Radar. → GREEN: una intención elegible llega a kickoff; una no elegible termina con estado y opciones, y una decisión sólo abre por pedido explícito.
  - [ ] El mismo HEAD e ID aparecen en status, sesion, handoff y readback.
- **T141.1.3:** REFACTOR: eliminar lectura directa y prosa duplicada, proyectar el gate a instalación y conservar el boundary manual/Tower. → REFACTOR: Support produce evidencia, routing elige, kickoff defiende y cierre de decisiones queda aislado.
  - [ ] El diff queda en las nueve rutas declaradas y la suite del Método pasa.

### S142 — Una skill stateless de Tramo 3 coordina lotes manuales Tower-off ya aprobados, retorna tras el handoff, reacciona a eventos worker y serializa integración/cierre sin asumir trabajo, review ni autoridad Tower.
- Estado derivado: ✅ COMPLETO
- Zona/Área: metodo · agent-workflows/, odd/tasks/
- Depende de: S131, S137, S141
- Cimientos: —
- Recursos: —
- Criterios de aceptación:
  - [ ] &#96;chanks-3-coordinador-manual&#96; carga sólo después de una aprobación humana completa que liga cantidad paralela, IDs de Sesión, alias/worker, kind/runtime Pi, session ID y cwd/worktree exactos; no selecciona, sustituye, reduce, amplía ni reordena el lote.
  - [ ] El coordinador delega admisión, pool, Herdr, Intercom, locks y retiro a &#96;chanks-3-despacho-herdr&#96;, confirma cada handoff y retorna inmediatamente sin wait, polling, retry ni seguimiento activo.
  - [ ] Cada implementer conserva implementación, self-verification, RDD y commits de Módulo; Main no inspecciona, revisa, corrige ni vuelve a ejecutar la candidata del worker.
  - [ ] Main procesa sólo eventos inbound &#96;COMPLETED&#96;, &#96;BLOCKED&#96; o &#96;FAILED&#96;: integra una Sesión confirmada por vez, detiene conflictos sin resolverlos y coordina evidencia de plan/cierre/retiro mediante las skills existentes.
  - [ ] &#96;BLOCKED&#96;, &#96;FAILED&#96;, progreso, desconexión o ausencia de Main preservan worker y worktree; no crean cola, roster, ledger, auto-resume, fallback de transporte ni inferencia de completion.
  - [ ] Tras salida de Main, una activación humana puede reconstruir sólo una asignación ya despachada desde Git, Radar, Herdr y readback Intercom; terminal y readbacks exactos autorizan integrar/cerrar esa asignación, nunca despachar, reintentar o cambiar su mapeo.
  - [ ] La misma skill permanece como fallback manual Tower-off después de completar V1, sin leer/escribir estado Tower, cargar skills Tower ni reclamar autoridad Tower.
  - [ ] La skill incluye una tabla de migración que separa evidencia/choreography manual de autoridad, ack/retry, terminalidad, checkpoint y delivery Tower V1.
  - [ ] Un journey contractual prueba dos workers Pi, handoffs independientes, retorno de Main, eventos terminales e integración serial; las suites del Método e instalación pasan y el diff implementado no supera 400 líneas.

#### M142.1 — Coordinador manual stateless y journey de dos workers con integración serial.
Rutas: agent-workflows/skills/chanks-3-coordinador-manual/SKILL.md, agent-workflows/templates/session-routing.md, agent-workflows/tools/install.py, agent-workflows/README.md, agent-workflows/tests/test&#95;coordinador&#95;manual.py, agent-workflows/tests/test&#95;despacho&#95;herdr.py

- **T142.1.1:** RED: exigir aprobación completa previa, dispatch delegado no bloqueante, eventos inbound, ownership del implementer, integración serial, reconstrucción acotada y exclusiones Tower/state. → RED: el routing actual carga dispatcher directamente y no existe el coordinador ni su journey terminal.
  - [ ] Cada autoridad, evento, efecto prohibido y fila de migración tiene una aserción falsificable.
- **T142.1.2:** GREEN: crear la skill stateless, registrarla en instalador/README y enrutar lotes aprobados a ella antes del dispatcher. → GREEN: dos workers Pi reciben handoffs independientes y Main integra sus terminales uno por vez sin supervisión activa.
  - [ ] La skill sólo referencia contratos existentes y no crea estado, runtime o procedimientos duplicados.
- **T142.1.3:** REFACTOR: consolidar modos dispatch/event/reconstruction, tabla de migración y límites Tower-off; eliminar frases que transfieran review o ejecución a Main. → REFACTOR: una frontera legible separa choreography manual, evidencia y autoridad Tower V1.
  - [ ] El diff queda en las seis rutas declaradas, no supera 400 líneas y la suite del Método pasa.

## Capacidad
1 Zona(s) con trabajo LISTO pueden trabajar en paralelo sin compartir Zona, Cimientos ni Recurso: metodo.
Radar no reserva el asiento: no adquiere locks, no autentica al proceso invocante y no recupera claims stale.

## Non-executable references
- **S102** · future_successor · agent-workflows/ASIGNACION-24-SESIONES.md@43130ad40af06f3ed05671000719217bee74f0a5:L124-L124 · outside-approved-horizon
- **S103** · future_successor · agent-workflows/ASIGNACION-24-SESIONES.md@43130ad40af06f3ed05671000719217bee74f0a5:L134-L134 · outside-approved-horizon
- **S104** · future_successor · agent-workflows/ASIGNACION-24-SESIONES.md@43130ad40af06f3ed05671000719217bee74f0a5:L135-L135 · outside-approved-horizon
- **S105** · future_successor · agent-workflows/ASIGNACION-24-SESIONES.md@43130ad40af06f3ed05671000719217bee74f0a5:L145-L145 · outside-approved-horizon
- **S106** · future_successor · agent-workflows/ASIGNACION-24-SESIONES.md@43130ad40af06f3ed05671000719217bee74f0a5:L146-L146 · outside-approved-horizon
- **S1.9** · satisfied_history · openspec/plans/plan-1/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5:L24-L24 · omitted-completed-import-dependency
- **S1.10** · satisfied_history · openspec/plans/plan-1/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5:L25-L25 · omitted-completed-import-dependency
- **S2.4** · satisfied_history · openspec/plans/plan-2/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5:L19-L19 · omitted-completed-import-dependency
- **S8.10** · satisfied_history · openspec/plans/plan-8/STATUS.md@43130ad40af06f3ed05671000719217bee74f0a5:L32-L32 · omitted-completed-import-dependency
