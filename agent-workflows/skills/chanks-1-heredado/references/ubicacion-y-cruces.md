# Ubicación y cruces

Usá esta referencia para ubicar trabajo dentro de una partición existente o para proponer la partición completa.

## Ubicar territorio

1. Enumerá los resultados de producto y las rutas exactas que cada resultado modificaría.
2. Separá lecturas de verificación de escrituras previstas: leer no transfiere ownership.
3. Asigná cada escritura a la Zona cuya responsabilidad de producto la explica.
4. Marcá como huérfana cualquier ruta que no tenga una Zona responsable.

## Resolver cruces

Construí una matriz `ruta exacta → Zonas que la modifican`.

| Resultado | Tratamiento |
|---|---|
| Una Zona modifica la ruta | La ruta pertenece a esa Zona. |
| Más de una Zona modifica la ruta | La ruta es Cimiento; reportá el conflicto y dejá la coordinación a una decisión humana. |
| El resultado puede dividirse sin perder valor | Cortá por Zona y declarà dependencias. |
| Dividir destruye el resultado | Proponé una Zona nueva con autoridad humana. |
| El mismo cruce reaparece | Revisá la partición; no agregues excepciones sucesivas. |

## Prueba

Validá el candidato con `radar check` contra `git ls-files`. La partición sólo está lista cuando no quedan huérfanos ni solapes no clasificados y cada patrón resuelve rutas reales.
