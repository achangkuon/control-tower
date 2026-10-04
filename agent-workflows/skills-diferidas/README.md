# Skills diferidas fuera de V1

Estas fuentes se conservan para versiones posteriores; moverlas no activa su instalación ni cambia el roster de la Torre V1. Ver las [definiciones de V1, V2 y V3](../../docs/architecture/definiciones-v1-v2-v3.md).

## V2 — Pista: entrega ordenada por proyecto

| Skill | Qué hace y por qué se difiere |
|---|---|
| [chanks-0-jornada](v2/chanks-0-jornada/SKILL.md) | Diagnostica y prepara las copias de trabajo de una jornada. Esa preparación coordinada no forma parte del flujo orgánico de V1. |
| [chanks-3-session-kickoff](v2/chanks-3-session-kickoff/SKILL.md) | Admite y marca el inicio de una Sesión con Radar. V1 no tiene arranque formal ni registra «en curso». |
| [chanks-3-coordinador-manual](v2/chanks-3-coordinador-manual/SKILL.md) | Coordina un lote elegido por el humano y sus handoffs. La coordinación entre conversaciones independientes queda fuera de V1. |
| [chanks-0-agente-soporte](v2/chanks-0-agente-soporte/SKILL.md) | Aporta evidencia de planificación, capacidad y conflictos. Su fuente queda fuera del producto V1; como excepción de compatibilidad, el instalador personal sigue instalándola desde aquí. |

## V3 — Torre automática: tabs de trabajo prolongado, Herdr

| Skill | Qué hace y por qué se difiere |
|---|---|
| [chanks-3-despacho-herdr](v3/chanks-3-despacho-herdr/SKILL.md) | Despacha workers mediante Herdr y conserva su pool y tabs. V1 no exige esa topología ni coordinación externa. |
| [chanks-4-unattended-implementation](v3/chanks-4-unattended-implementation/SKILL.md) | Prepara un mandato sellado de ejecución desatendida. La ejecución prolongada sin presencia humana corresponde a la Torre automática. |

Las otras cinco skills no se instalan; sus copias anteriores se archivan reversiblemente. Se conserva el texto de comportamiento, incluso sus etiquetas históricas de versión; solo se ajustan rutas relativas al mover las fuentes. Las referencias a skills externas de Gentle AI se resuelven en el runtime, no en este repositorio.
