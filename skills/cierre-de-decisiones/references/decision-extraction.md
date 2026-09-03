# Extracción de decisiones

## Fuente

Leé `openspec/plan.yaml` y enumerá cada decisión de las Sesiones incluidas en el pedido. Para cada una extraé pregunta, tipo, criterio, autoridad, clase, evidencia, opciones, checkpoint, alcance y contaminación. Engram puede corroborar, pero no reemplaza el dato.

## Vocabulario

- `derivable`: sólo con autoridad aprobada y criterio falsificable.
- `escala`: requiere decisión humana y declara clase y contaminación.

## Clases que siempre escalan

1. Contrato visible del producto.
2. Operaciones irreversibles.
3. Migraciones o pérdida de datos.
4. API pública.
5. Seguridad y permisos.
6. Dinero, precios o cuotas.
7. Expansión de alcance.
8. Dependencias o evidencia contradictorias.

## Conteo y presentación

- Declarà exactamente qué Sesiones auditaste.
- No cuentes dependencias, gaps de enumeración ni fallos de runtime como decisiones.
- Ordená por el trabajo que cada resolución habilita.
- Presentá primero la opción recomendada y explicá la consecuencia de no hacer nada.
- Después de responder, preservá pregunta, evidencia y alternativas en el delta.
