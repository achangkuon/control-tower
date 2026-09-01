# `plan` — herramienta determinista de planificación

Calcula todo lo que hoy los agentes escriben a mano. El contrato completo está en
[`skills/_shared/plan-naming-convention.md`](../../skills/_shared/plan-naming-convention.md);
la §17 es la que reparte qué calcula esta herramienta y qué sigue necesitando criterio humano.

```
plan check   -f plan.yaml    valida el plan y la partición contra el árbol real
plan status  -f plan.yaml    estado calculado, colas por zona y asientos
plan zonas   -f plan.yaml    cobertura de cada zona sobre los archivos rastreados
```

## Por qué existe

Un mismo hecho —«¿cerró S23?»— vivía escrito a mano en seis documentos, diez en
`control-tower`. Ninguno se calculaba desde otro, así que mantenerlos al día era un ritual
manual, y los rituales se saltean. El estado ahora se deriva de las dependencias, las
decisiones abiertas y la evidencia de entrega. **Nadie lo escribe.**

## Compilar

```sh
go build -o plan .
go test ./...

# El socio está en Mac:
GOOS=darwin GOARCH=arm64 go build -o plan-darwin-arm64 .
```

Binario único, sin dependencias en la máquina destino.

## El archivo de plan

Uno por producto. Es lo único que se escribe a mano.

```yaml
schema: plan
schema_version: 1
producto: la-casa
raiz: /ruta/al/repo

zonas:
  - id: cocina
    nombre: Cocina
    rutas: [cocina/, test/cocina/]

cimientos:
  rutas: [package.json, core.mjs]

sesiones:
  - id: S23
    zona: cocina
    resultado: instalar el horno
    depende_de: [S18]
    cimientos: [package.json]      # archivos compartidos que reserva
    criterios: ["el horno enciende"]
    ruta: direct
    decisiones:
      - tipo: escala
        pregunta: "¿gas o eléctrico?"
        clase: dinero-precios-cuotas
        alcanza: criterios          # criterios | primer-modulo | <id de Módulo>
        contamina: [S31]
```

**No hay campo `estado`.** Un estado escrito es un valor que el siguiente cálculo pisa. Lo
que sí se declara es *evidencia*: `entrega:` con el commit que lo cerró, `diferida:` cuando
un humano eligió postergarlo —«eligió no» no se puede calcular—, y `archivada:`.

Tres formas de ruta, y no más, porque una partición escrita con todo el lenguaje de globs es
una partición cuyo significado nadie puede predecir:

| Forma | Significa |
|---|---|
| `hosts/` | todo lo que cuelga del directorio |
| `hosts/**` | lo mismo, explícito |
| `core.mjs` | ruta exacta, o un patrón de un solo segmento |

## Qué verifica `check`

- Toda zona se define por **rutas**, no por un tema. Una zona sin rutas es un tema, y los temas no particionan nada.
- **Zonas disjuntas**: ningún archivo con dos dueños. Es lo que hace la colisión imposible en vez de desaconsejada.
- **Partición exhaustiva**: ningún archivo rastreado sin dueño. Usa `git ls-files`, así que lo ignorado no cuenta.
- Rutas que no le corresponden a ningún archivo (aviso): así es como una partición se pudre.
- Dependencias que no existen, y **ciclos** — un ciclo no es un plan lento, es un plan donde nada puede empezar nunca.
- Toda Sesión abierta tiene criterios de aceptación binarios.
- Una decisión `derivable` declara **autoridad y criterio falsificable**, y no pertenece a ninguna de las ocho clases que siempre escalan.
- Una decisión que `escala` dice hasta dónde llega; sin eso no se puede saber si bloquea.
- Toda reserva de cimiento apunta a un cimiento declarado.

## Qué NO verifica

A propósito. Fingir que las verifica haría que la pasada no signifique nada:

- Si el corte en zonas es un **buen** corte.
- Si una decisión es **honestamente** derivable.
- Si un criterio de aceptación es de verdad binario.
- Si la contaminación semántica declarada está completa.

Eso necesita un humano, o un agente con criterio.
