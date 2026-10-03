# S209 — Aviso de actualización al abrir la Torre

## Estado y contrato

Implementación preparada; cierre bloqueado por validación sin espacio en `/tmp`.
Autoridad: `radar sesion S209`, consultado antes de editar. No se leyó el plan completo.
No se hizo commit ni push; la entrega y revisión quedan a cargo del responsable.

- `torre-control update --check` entrega JSON `available`, `up-to-date` o `unknown`.
- Comprueba la instalación con doctor global offline, sin comprobar runtimes ni requisitos. Consulta sólo autenticación activa y metadata de release; no descarga checksums, paquetes ni interfaz, ni prepara directorios o modifica permisos.
- El presupuesto compartido de los dos subprocessos gh es 8 segundos, con SIGKILL y salida acotada a 1024 bytes. La TUI admite este comando con un límite externo de 10 segundos.
- Comparación intencionalmente simple: tags válidos iguales → `up-to-date`; distintos → `available`. No se ordenan versiones semánticas. Un `checkout-*` no prueba antigüedad: se aplica exactamente la misma comparación, incluso con una etiqueta publicada anterior.
- Sin instalación conocida, gh, sesión, red o tag válido → `unknown`, sin exponer salidas de autenticación ni errores sensibles.
- Bubble Tea agenda estado y chequeo por separado en un Batch; Home no espera por el chequeo. Sólo `available` con tag válido agrega aviso destacado y hint al menú.
- Instalar/actualizar exitosamente limpia el aviso y descarta respuestas tardías del chequeo inicial; un fallo o rollback no lo limpia.
- En terminales angostas se conserva truncado seguro y se omiten los hints completos antes de truncar etiquetas. En pantallas bajas el menú y la pista de salida tienen prioridad sobre el aviso.

## Superficie

Las siete superficies de producto autorizadas y sus pruebas fueron usadas, más este registro.
Superficie adicional esencial preaprobada: `product/tower/v1/tui/main.go`, para admitir `update --check` en el runner real y evitar que herede los cinco minutos de update.
Se reutilizó la validación S199 de tags y se compartió el descubrimiento de metadata entre chequeo y adquisición, sin cambiar la adquisición de assets.

## TDD observado

### RED

- `HOME=$(mktemp -d) bun test product/tower/v1`: las dos pruebas CLI nuevas fallaron (exit 1 en vez de 0); release tests no pudieron importar el nuevo export todavía ausente. El comando se interrumpió por timeout a los 120 s antes de terminar el resto de la suite.
- `cd product/tower/v1/tui && HOME=$(mktemp -d) GOMODCACHE=/home/emili/go/pkg/mod GOWORK=off GOPROXY=off go test ./...`: fallaron los casos nuevos de startup asíncrono, aviso/hint, vida del aviso y admisión del runner. Los tests existentes pasaron en esa ejecución.

### GREEN parcial y triangulación

- Última ejecución completa de Bun: **531 pass, 1 skip, 6 fail**, 538 tests, 8428 assertions, 157.91 s. Las dos pruebas nuevas CLI y las ocho pruebas nuevas de release pasaron (estados, tags checkout, sin descargas/escrituras, presupuesto compartido, timeout, errores e invalid tags).
- Tres fallos observados en builds existentes (`runtime-config`, `adoption`, `bundle`) muestran explícitamente `no space left on device`. Otros tres fallos CLI existentes son exit-code failures durante esa misma ejecución; no se atribuyen definitivamente a espacio sin repetirlos.
- Primera iteración Go tras implementación permitió observar el Home con aviso y menú correcto; detectó un fixture que no admitía el nuevo startup y el pie desplazado en altura 12. Se corrigieron ambos conservando la navegación.
- Última ejecución Go quedó bloqueada en compilación por `no space left on device`. No hay GREEN final de TUI ni cierre con cero fallos. Debe repetirse tras resolver capacidad temporal.

## Comandos finales y bloqueo

```text
HOME=$(mktemp -d) bun test product/tower/v1
# 531 pass, 1 skip, 6 fail

cd product/tower/v1/tui && HOME=$(mktemp -d) GOMODCACHE=/home/emili/go/pkg/mod GOWORK=off GOPROXY=off go test ./...
# build failed: no space left on device

df -h /tmp /home/emili/projects/control-tower/Main
# /tmp: 7.8G, 7.7G usados, 69M disponibles, 100%
# filesystem del repo: 892G disponibles
```

HOME aislado en cada validación; módulo Go existente usado sólo como caché de dependencias. Los tests S209 inyectan runners y no consultan GitHub real. No se borraron archivos para intentar resolver la falta de espacio, ni se modificaron tests ajenos para ocultar fallos. No se ejecutó formatter (no autorizado explícitamente); revisar formato Go antes de entrega.

## Home observado (sin color, ancho 110)

```text
Torre de Control V1
Versión: v1.1.0
Activa: v1.1.0 · Anterior: v1.0.2
⬆ Hay una actualización disponible: v1.2.2 · elegí «Instalar o actualizar»
Estado
  Motor        instalado · sano
  Versión      v1.1.0 · anterior v1.0.2
  Gentle AI    4.0.0
  Proyectos    1
  /proyecto: sano
Requisitos
  gh           2.90.0 · con sesión
  Bun          1.3.0
  Git          2.50.0
  Go           1.26.4
Agentes
  Claude Code  listo
  Pi           sólo configuración
  Codex        no detectado
  OpenCode     no detectado
  Sistema      linux/x64 · bash

> Instalar o actualizar         (v1.2.2 disponible)
  Volver a la versión anterior  (v1.0.2)
  Proyectos                     (1)
  Diagnóstico
  Ayuda
  Sumar un proyecto             (prompt para tu agente)
  Salir

↑↓ o j/k mover · enter elegir · a: Versión específica (avanzado) · r refrescar · q salir
```

## Revisión y rollback

Revisar admisión cerrada de flags, cero writes/downloads en chequeo, presupuesto gh compartido, startup concurrente, respuestas tardías luego de éxito y alturas 9/12/16. Repetir ambas suites con cero fail antes de entregar. El rollback elimina únicamente `--check`, su aviso/startup, las pruebas S209 y este registro, conservando install/update S199 y etiquetas S208.
