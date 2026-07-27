# PRD — SDD Tower Implementation V1: Jornadas autónomas con control humano

**Control Tower V1 permite que una persona dirija, supervise y recupere jornadas de trabajo con agentes sobre varios proyectos sin reconstruir el contexto manualmente ni ceder decisiones irreversibles.**

## 1. El problema

El trabajo con varios agentes se degrada cuando cada sesión depende de contexto conversacional, carpetas reutilizadas y coordinación manual. El mantenedor debe recordar qué agente hacía qué, transmitir handoffs, revisar worktrees, detectar trabajo parcial, elegir la siguiente tarea y evitar que mensajes o sesiones equivocadas ejecuten acciones con autoridad implícita.

Esto produce cinco problemas principales:

1. **Pérdida de continuidad:** una sesión nueva no conoce de forma confiable el plan, la realidad implementada ni el siguiente paso.
2. **Coordinación frágil:** planificación, implementación y entrega compiten por recursos o trabajan sobre supuestos incompatibles.
3. **Autoridad ambigua:** una conversación, un wake o un mensaje entre agentes puede confundirse con autorización humana.
4. **Supervisión costosa:** el mantenedor debe estar frente al terminal para tareas rutinarias, incluso cuando el alcance ya fue aprobado.
5. **Recuperación insegura:** ante una caída se corre el riesgo de repetir efectos, perder cambios parciales o crear dos escritores sobre el mismo trabajo.

## 2. Objetivo de V1

| Objetivo | Resultado esperado | Decisión firme |
|---|---|---|
| Continuidad entre slices | El siguiente agente retoma desde evidencia versionada y estado observable | La conversación no es fuente de verdad |
| Autonomía acotada | Una jornada puede planificar, implementar y preparar entregas dentro de límites aprobados | La autonomía siempre tiene tiempo, capacidad y alcance definidos |
| Control remoto | El mantenedor puede observar, aprobar, pausar o revocar desde Telegram | La superficie remota no dirige trabajadores directamente |
| Entrega controlada | Commits, push y PR pueden prepararse sin intervención rutinaria | Cada merge requiere autorización humana exacta |
| Recuperación segura | Una caída puede rehidratarse sin repetir efectos inciertos | Ante contradicción o ambigüedad, el sistema se bloquea |
| Escala multiproyecto | Una persona puede trabajar con varios proyectos y campañas coordinadas | Cada proyecto conserva su autoridad independiente |

## 3. Alcance de V1

### 3.1 Incluye

- Registro explícito de proyectos y selección inequívoca del proyecto activo.
- Un orquestador principal por proyecto y políticas independientes por plan.
- Soporte global de solo lectura para proponer división, conflictos y capacidad segura.
- Jornadas autónomas acotadas con presets versionados.
- Selección de una única línea de ejecución activa por jornada.
- Fallback preautorizado hacia otra línea compatible, sin escritores simultáneos.
- Planificación anticipada de slices futuros dentro de un horizonte aprobado.
- Implementación de slices elegibles mediante sesiones frescas.
- Worktrees efímeros y aislados por plan, lane y slice.
- Reconciliación obligatoria entre el plan preparado y la realidad implementada.
- Delta vinculante después de cada slice verificado.
- Creación automática de commit, push y PR cuando la jornada lo permite.
- Autorización individual de cada merge desde Telegram.
- Estado remoto de proyectos, planes, jornadas, slices, bloqueos y entregas.
- Pausa, revocación, expiración y recuperación de jornadas.
- Campañas V1 entre repositorios mediante PRs compatibles y ordenados.

### 3.2 No incluye

- Autonomía ilimitada o presupuestos implícitos.
- Merge automático de PRs.
- Interpretación de código o decisiones de producto por la infraestructura de Control Tower.
- Cambios silenciosos de alcance, comportamiento, permisos, seguridad o datos.
- Propiedad física de repositorios por parte de Hermes.
- Selección silenciosa de proyectos basada solamente en una conversación.
- Escritores concurrentes en distintos hosts para una misma jornada.
- Transacciones atómicas distribuidas entre repositorios.
- Orquestación general de deploy, tráfico o feature flags.
- Limpieza destructiva de worktrees con estado desconocido.
- Sustitución de SDD, OpenSpec o los documentos canónicos del proyecto.

## 4. Usuario principal

### Mantenedor-operador

Persona técnica que dirige uno o más proyectos con agentes, trabaja tanto desde terminal como desde Telegram y necesita delegar ejecución sin perder autoridad.

Necesita:

- conocer el estado real sin inspeccionar manualmente cada sesión;
- aprobar una jornada una vez y no cada handoff rutinario;
- elegir el proyecto, plan, límites y línea de ejecución;
- recibir preguntas únicamente ante decisiones materiales o excepciones;
- aprobar cada merge sobre código exacto;
- recuperar trabajo después de una caída;
- poder pausar o revocar inmediatamente.

## 5. Experiencia principal

### 5.1 Preparación local

1. El mantenedor registra un proyecto localmente.
2. El sistema valida su identidad y asocia el orquestador principal.
3. Los planes disponibles quedan visibles para consulta remota.

### 5.2 Inicio remoto de jornada

1. El mantenedor selecciona proyecto y plan.
2. Solicita una jornada `short`, `standard`, `extended` o personalizada.
3. Elige Pi u OpenCode como línea activa y, opcionalmente, un fallback.
4. Recibe un resumen de alcance, capacidad, riesgos y límites efectivos.
5. Autoriza la jornada exacta.

### 5.3 Ejecución continua

1. El sistema habilita únicamente slices elegibles.
2. La planificación puede adelantarse dentro del horizonte aprobado.
3. La implementación consume el plan preparado y la realidad del slice anterior.
4. Cada slice produce evidencia verificable y un delta vinculante.
5. Si el delta es compatible, el siguiente slice continúa automáticamente.
6. Si existe drift material o ambigüedad, la jornada se bloquea y consulta al mantenedor.

### 5.4 Entrega

1. El sistema prepara commit, push y PR después de verificar el trabajo.
2. Telegram muestra proyecto, plan, PR, base, código exacto y checks.
3. El mantenedor aprueba o rechaza el merge.
4. Después del merge probado, la jornada continúa si conserva presupuesto.

### 5.5 Recuperación

1. El sistema detecta que una sesión o línea dejó de responder.
2. Preserva trabajo parcial y comprueba efectos reales.
3. Si existe fallback preautorizado, transfiere la línea de forma exclusiva.
4. Una sesión fresca retoma desde evidencia y estado persistido.
5. Si no puede demostrar exclusividad o consistencia, se bloquea.

## 6. Presets de jornada

| Preset | Duración máxima | Slices que pueden entrar en implementación | Horizonte de planificación | Planning simultáneo | Implementation simultáneo |
|---|---:|---:|---:|---:|---:|
| `short` | 2 horas | 1 | 1 | 2 | 1 |
| `standard` | 8 horas | 2 | 2 | 3 | 2 |
| `extended` | 16 horas | 4 | 3 | 5 | 4 |

Reglas de producto:

- Los valores son techos, no cuotas.
- Cada slice admite como máximo dos intentos dentro de la jornada.
- Una jornada queda vinculada a la revisión exacta de su preset.
- Reducir, pausar o revocar puede aplicarse inmediatamente.
- Ampliar cualquier límite requiere una nueva autorización.
- El mantenedor puede crear una jornada personalizada.

## 7. Funcionalidades

### F1. Registro y selección de proyectos

**Responde:** “¿Sobre qué proyecto autorizado estamos operando?”

**Habilita:** seleccionar un proyecto por identidad estable, mostrar la selección y bloquear discrepancias antes de iniciar trabajo.

### F2. Estado remoto confiable

**Responde:** “¿Qué está ocurriendo ahora y qué necesita mi atención?”

**Habilita:** consultar planes, jornadas, slices, sesiones, bloqueos, PRs y próximos pasos sin recorrer worktrees manualmente.

### F3. Jornada autónoma acotada

**Responde:** “¿Qué puede avanzar sin volver a preguntarme?”

**Habilita:** autorizar duración, slices, concurrencia, intentos, línea activa y fallback como una unidad versionada.

### F4. Continuación entre slices

**Responde:** “¿Cómo usa el siguiente agente lo que realmente ocurrió?”

**Habilita:** reconciliar planificación anticipada con un delta vinculante y continuar automáticamente cuando no existe drift material.

### F5. Workspaces y sesiones aisladas

**Responde:** “¿Dónde y bajo qué identidad trabaja cada slice?”

**Habilita:** crear worktrees y sesiones efímeras, evitar reutilización incompatible y retirar espacios únicamente cuando sea seguro.

### F6. Entrega con merge humano

**Responde:** “¿Qué trabajo está listo y qué código exacto voy a integrar?”

**Habilita:** automatizar preparación de entrega y reservar el merge para una autorización exacta, visible y revocable.

### F7. Recuperación y fallback

**Responde:** “¿Podemos continuar después de una caída sin duplicar efectos?”

**Habilita:** inspeccionar estado real, preservar cambios, transferir exclusividad y rehidratar un nuevo intento.

### F8. Campañas multiproyecto

**Responde:** “¿Cómo coordinamos un cambio que necesita varios repositorios?”

**Habilita:** ordenar PRs compatibles, mantener autoridad local, verificar cada paso y ejecutar compensaciones declaradas.

## 8. Reglas de negocio

1. El mantenedor es la autoridad final.
2. Una conversación, wake o mensaje entre agentes nunca concede autoridad operativa.
3. Una jornada solo opera dentro de sus límites efectivos y revisión aprobada.
4. Una sola línea de ejecución puede estar activa por jornada.
5. Un fallback preautorizado puede continuar sin nueva consulta únicamente después de demostrar exclusividad.
6. El sistema puede preparar entregas, pero no fusionarlas automáticamente.
7. Cada merge se autoriza por separado y sobre una versión exacta del código.
8. Drift técnico compatible puede reconciliarse automáticamente.
9. Drift material o ambiguo requiere decisión humana.
10. Estado parcial, contradictorio o desconocido se preserva y bloquea; no se limpia para mantener apariencia de progreso.
11. Cada proyecto conserva su propio orquestador principal y autoridad.
12. Una campaña multiproyecto coordina; no transfiere propiedad entre proyectos.

## 9. Métricas de éxito

### Operación

- [ ] Un proyecto registrado puede seleccionarse inequívocamente desde Telegram.
- [ ] Una jornada puede iniciarse, observarse, pausarse y revocarse de forma remota.
- [ ] Dos slices consecutivos pueden completarse usando delta vinculante sin handoff manual.
- [ ] Commit, push y PR pueden prepararse sin intervención rutinaria.
- [ ] El 100 % de los merges requiere autorización humana exacta y vigente.

### Seguridad y control

- [ ] Ningún wake, alias conversacional o mensaje peer puede iniciar trabajo autorizado por sí solo.
- [ ] Ninguna jornada supera silenciosamente tiempo, slices, intentos o concurrencia aprobados.
- [ ] Nunca existen dos escritores válidos para el mismo assignment.
- [ ] Un cambio de código posterior invalida la autorización de merge anterior.
- [ ] Un proyecto no puede recibir trabajo destinado a otro proyecto.

### Recuperación

- [ ] Una caída de OpenCode puede continuar en Pi cuando el fallback fue preautorizado.
- [ ] Trabajo parcial y efectos externos inciertos se preservan para inspección.
- [ ] Una operación mutable no se repite sin comprobar primero su efecto real.
- [ ] Un estado contradictorio termina en `BLOCKED` y no en avance especulativo.

## 10. Riesgos de producto

| Riesgo | Impacto | Mitigación de V1 |
|---|---|---|
| Autonomía percibida como ilimitada | Pérdida de confianza o cambios fuera de alcance | Jornadas versionadas con límites visibles y revocación inmediata |
| Exceso de notificaciones | El mantenedor deja de atender alertas importantes | Consultar solo ante merge, drift material, excepción o bloqueo |
| Aprobación remota sobre contexto insuficiente | Integración equivocada | Mostrar proyecto, plan, PR, código exacto y checks |
| Recuperación que duplica trabajo | Conflictos o efectos repetidos | Inspección previa, intentos nuevos y exclusividad demostrable |
| Demasiados agentes activos | Costo, colisiones y revisión inmanejable | Presets como techos y reducción dinámica por conflictos |
| Automatización multiproyecto sobredimensionada | Complejidad sin valor inmediato | V1 limitada a PRs ordenados y compensaciones explícitas |

## 11. Supuestos y restricciones

- Los proyectos ya utilizan Git y cuentan con planes o artefactos versionables.
- El mantenedor realiza un bootstrap local para registrar o relocalizar proyectos.
- Telegram es una superficie privada y previamente autorizada.
- Pi y OpenCode son las líneas normales de ejecución; Claude requiere opt-in explícito.
- El sistema puede observar el estado necesario de Git, sesiones y entregas.
- Las operaciones destructivas, de producción o irreversibles permanecen fuera de la autonomía implícita.
- La infraestructura de Control Tower conserva un comportamiento plan-agnostic.

## 12. Diferido

| Capacidad | Razón para diferir |
|---|---|
| Ejecución mixta Pi/OpenCode simultánea | Complica ownership, costos y recuperación sin ser necesaria para V1 |
| Merge automático | El merge es la frontera humana irreversible aprobada |
| Deploy y traffic shifting | Requieren contratos operativos específicos por plataforma |
| Feature flags generalizados | No todos los proyectos comparten el mismo mecanismo |
| Rollback distribuido universal | No existe atomicidad real entre repositorios independientes |
| Reubicación automática de repositorios | Cambia identidad, worktrees y bindings; debe ser una migración separada |
| Selección autónoma de producto o alcance | La intención pertenece al mantenedor y a los documentos aprobados |

## 13. Criterios de aceptación de V1

- [ ] El mantenedor puede registrar localmente un proyecto y seleccionarlo remotamente sin ambigüedad.
- [ ] Puede aprobar una jornada con preset, revisión, plan, línea activa y fallback visibles.
- [ ] La jornada puede planificar e implementar slices elegibles dentro de sus techos.
- [ ] Cada implementación usa un workspace y una sesión aislados.
- [ ] Cada slice verificado produce un delta vinculante para reconciliar el siguiente.
- [ ] Drift compatible continúa; drift material o ambiguo bloquea y consulta.
- [ ] Commit, push y PR pueden generarse automáticamente después de verificación.
- [ ] Cada merge exige una autorización individual que expira si cambia el código.
- [ ] El mantenedor puede observar, pausar y revocar la jornada desde Telegram.
- [ ] Una caída puede rehidratar trabajo sin escritores concurrentes ni repetición ciega.
- [ ] Una campaña puede coordinar PRs ordenados sin prometer atomicidad entre repositorios.
- [ ] Control Tower permanece como infraestructura plan-agnostic.

## 14. Siguiente paso

El RFC debe traducir este producto a una arquitectura implementable: roles y autoridad, registro, artefactos, estado runtime, jornadas, worktrees, sesiones, línea de ejecución, Telegram, entrega, recuperación y campañas multiproyecto.
