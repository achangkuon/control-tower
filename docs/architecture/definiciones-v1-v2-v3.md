# Definiciones de V1, V2 y V3

> **Estado:** decisiones del mantenedor tomadas el 2026-10-01. Este documento las registra; no las implementa.
>
> **Propósito:** dejar citable qué entra en cada versión y cómo se resolvió cada ambigüedad de la auditoría de `docs/architecture/pista-entrega-ordenada.md` (secciones 10 y 11).
>
> **Límite:** no reemplaza el plan ni el canon, no asigna IDs de Sesión y no autoriza instalación ni entrega. La fuente editable del plan sigue siendo `openspec/plan.yaml`.

## 1. Qué es cada versión

V1 es una versión estable, orgánica y fluida, sin candados ni reservas. La complejidad se agrega después, de a una versión.

| Versión | Qué es | Qué no incluye |
|---|---|---|
| V1 | Método de Chanks adelgazado y adopción project-local de la Torre. El trabajo paralelo ocurre dentro de una sola conversación. | Semáforo, reserva de Sesiones, candado de escritura, coordinador Main, Herdr e Intercom como requisito. |
| V2 | **Pista**: entrega ordenada por proyecto. Varias conversaciones independientes entregan por una sola puerta. | Torre automática. |
| V3 | Torre automática (despacho, ejecución desatendida, tabs de trabajo prolongado) y los arreglos que estaban clasificados como V2. | — |

«Semáforo» deja de ser un nombre vigente: la herramienta de control de entregas se llama Pista.

## 2. Decisiones

Los identificadores N corresponden a la auditoría del documento de Pista.

### Plan

| # | Ambigüedad | Decisión |
|---|---|---|
| A1 | «V1» nombraba a la vez una Torre con semáforo y una sin semáforo (N6, N14). | V1 no tiene semáforo. `S149` queda como historia. |
| A2 | El plan llamaba V2 a la Torre automática. | V2 es Pista. La Torre automática y la resolución de problemas clasificada como V2 pasan a V3. |
| A3 | No estaba definido quién integra y entrega (N7). | En V1 un orquestador delega cada Sesión a un subagente dentro de la misma conversación, coordina e integra. Varias conversaciones entregando a la vez llega con V2. |
| A4 | Tres Sesiones abiertas fijaban un máximo de 400 líneas (N8). | Las 400 líneas son una referencia de Gentle AI. No forman parte de la configuración propia ni de las restricciones de una Sesión. |
| A5 | `S169` describe un coordinador que ya no existe en V1 (N13). | Se conserva para V3. |
| A6 | No se sabía si GitHub permite proteger la rama principal. | Se verifica antes de planificar V2. Ver sección 4. |

### Skills e instrucciones

| # | Ambigüedad | Decisión |
|---|---|---|
| B1 | Las etapas 3 y 5 tienen dos nombres (N2). | No es un problema: en la etapa 3 se despacha y se trabaja en paralelo; en la etapa 5 se entrega y se cierra. |
| B2 | No estaba claro si cada Sesión pasa por un arranque formal (N17). | No hay arranque formal. El inicio de una Sesión es orgánico, como en ODD y Gentle AI, y nunca bloquea la escritura. |
| B3 | Codex y Hermes no tienen los bloques de cierre documental, nombres de plan y explicación simple (N16). | Deben tenerlos. |
| B4 | Quedan piezas de control instaladas fuera de las skills (N11). | Se conservan el aviso de etapa (`chanks-etapa.sh`) y `pi-intercom`. El candado de escritura (`chanks-controls.ts`) pasa a V2 y la firma de la Torre (`torre-firma.sh`) a V3: dejan de instalarse y su fuente se conserva. |

### Estado vivo

| # | Ambigüedad | Decisión |
|---|---|---|
| C1 | Marca de despacho de `S165` viva sobre una Sesión diferida (N9). | V1 no usa marcas de despacho. |
| C2 | Copia de trabajo `issue-resolver` con 17 rutas sin guardar (N10). | Guardada sin integrar en `work/issue-150`. No se borra trabajo hecho para otras versiones. |
| C3 | 31 commits locales sin subir. | Se suben a `origin/master`. |
| C4 | No estaba probado que una conversación nueva cargue las instrucciones nuevas. | El mantenedor lo está probando en Pi; sin fallas hasta ahora. |

### Copias y documentos

| # | Ambigüedad | Decisión |
|---|---|---|
| D1 | Skills viejas en Windows y Gemini (N12). | Se actualizan a la configuración vigente. |
| D2 | Documentos del sistema anterior sin aviso (N15). | Los que se usan se actualizan; los que no, se marcan como históricos y se mueven. |
| D3 | Registros de skills con rutas archivadas (N18). | Se regeneran. |
| D4 | El documento «Chanks como guía de etapas — análisis por tramos» describe piezas retiradas. | Es la proyección del flujo con V2, no la descripción de V1. |

## 3. Consecuencias

- `chanks-3-session-kickoff` y `radar marcar` / `radar desmarcar` dejan de ser parte del flujo de V1. La reserva de Sesiones vuelve en V2 como primera pieza de Pista.
- En V1 nada impide por herramienta que un agente escriba fuera de los archivos de su Sesión. El límite son sus instrucciones y la revisión.
- `chanks-3-paralelo` debe nombrar al orquestador como quien integra y entrega.
- Las restricciones de `S174`, `S150` y `S173` deben dejar de fijar un máximo de 400 líneas.
- Nada de lo construido para V2 o V3 se borra: la fuente se conserva en el repositorio y las copias instaladas se archivan de forma reversible.

## 4. Verificaciones

- **Rama protegida (A6).** El repositorio es privado y de una cuenta personal. `master` no está protegida y no hay conjuntos de reglas. La consulta de protección respondió «Branch not protected» y no un pedido de mejorar el plan, lo que indica que la función está disponible. No se comprobó creando una regla.
- **Sin verificar.** El plan de GitHub contratado, el funcionamiento simultáneo de dos conversaciones y las partes del código que el documento de Pista declara no leídas.

## 5. Procedencia

Decisiones tomadas por el mantenedor en conversación el 2026-10-01, sobre `master` en `826ee07`. Espejo en Engram: `planning/ambiguedades-v1-v2-v3`.
