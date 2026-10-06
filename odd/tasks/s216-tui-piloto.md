# Feature: S216 — Controles del piloto en la TUI

Autoridad: Diseño de Piloto automático 2026-10-03 (P1–P14); mapa V2/V3 2026-10-04. Encargo
completo en `openspec/plan.yaml` (S216). Zona producto-torre, prioridad v2-piloto.

## Alcance
Panel de control del piloto en la TUI de la Torre: interruptor prende/apaga (llama a `piloto`),
vista de vuelos en curso con ronda, tope y estado de cada Sesión (NOVEDAD con motivo, POR
REVISAR, EN CURSO) leyendo el estado que Radar publica (snapshot/status --json), freno de
emergencia seguro y accesible en todo momento. La TUI sigue siendo consultiva (P14): convoca a
`piloto`, nunca escribe marcas ni estados por su cuenta. El despegue desde la TUI muestra cuenta
regresiva y resumen de la corrida (vuelos, rondas, tope).

## Tareas
- [x] T1: Preparar copia de trabajo del writer.
- [x] T2: Implementación test-first por writer (RED → GREEN → gofmt/vet).
- [x] T3: Verificación independiente del padre (go test/vet/gofmt en TUI y Radar).
- [x] T4: Revisión RDD, integración a master, push y archivado de la Sesión.

## Evidencia de commits
- `6b11dac` feat(tui): resolve and run the piloto CLI safely from the Tower TUI (radar.go/model.go, 721 líneas); `22b6f40` test(tui): 11 tests S216 (223 líneas).
- TDD: RED por build failure observado; GREEN 185 casos TUI, radar/piloto intactos y verdes; gofmt/vet limpios (verificación independiente del padre).
- Revisión nativa `review-93f25d44b458cc3f` (high, 4 lentes): APPROVED, acuse quemado (f1994824…). Hallazgo informativo: R4-001 WARNING radar.go:576-585 (trabajo posterior).
- Reintentos mecánicos de captura: 6 (risk terminated 1, resilience truncado 2 + severidad —, reliability truncado 2); todos por transporte del proveedor; slot único secuencial resolvió siempre.
