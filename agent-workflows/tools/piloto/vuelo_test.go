package main

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

func vueloCon(id string, miembros ...Miembro) Vuelo {
	return Vuelo{ID: id, Ancla: id, Rama: ramaDeVuelo("2026-10-02", id), Copia: "/tmp/copia-" + id, Sesiones: miembros}
}

func corridaConVuelos(t *testing.T, root string, vuelos ...Vuelo) *Corrida {
	t.Helper()
	c := &Corrida{Fecha: "2026-10-02", Inicio: "2026-10-02T22:00:00Z", Vuelos: vuelos}
	if err := escribirCorrida(root, *c); err != nil {
		t.Fatalf("escribirCorrida: %v", err)
	}
	return c
}

func idsDeVuelo(v Vuelo) []string {
	var ids []string
	for _, m := range v.Sesiones {
		ids = append(ids, m.Sesion)
	}
	sort.Strings(ids)
	return ids
}

func buscarVuelo(t *testing.T, vuelos []Vuelo, id string) Vuelo {
	t.Helper()
	for _, v := range vuelos {
		if v.ID == id {
			return v
		}
	}
	t.Fatalf("no hay vuelo %s entre %+v", id, vuelos)
	return Vuelo{}
}

func TestVuelosPosibles(t *testing.T) {
	t.Run("dos LISTO compatibles son dos vuelos", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{
			{ID: "S1", Zona: "z1", Estado: "LISTO"},
			{ID: "S2", Zona: "z2", Estado: "LISTO"},
			{ID: "S3", Zona: "z1", Estado: "PLANIFICADO", DependeDe: []string{"S1"}},
		}, Compatibilidad: []ParCompatibilidad{{A: "S1", B: "S2", Clase: "compatible"}}}
		vuelos := vuelosPosibles(snap)
		if len(vuelos) != 2 {
			t.Fatalf("vueltas = %+v", vuelos)
		}
		a := buscarVuelo(t, vuelos, "S1")
		if got := idsDeVuelo(a); strings.Join(got, ",") != "S1,S3" {
			t.Fatalf("miembros del vuelo S1 = %v", got)
		}
		if got := idsDeVuelo(buscarVuelo(t, vuelos, "S2")); strings.Join(got, ",") != "S2" {
			t.Fatalf("miembros del vuelo S2 = %v", got)
		}
	})
	t.Run("LISTO que chocan dejan un vuelo", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{
			{ID: "S1", Zona: "z1", Estado: "LISTO"},
			{ID: "S2", Zona: "z1", Estado: "LISTO"},
		}, Compatibilidad: []ParCompatibilidad{{A: "S1", B: "S2", Clase: "solapa-archivos"}}}
		if vuelos := vuelosPosibles(snap); len(vuelos) != 1 || vuelos[0].ID != "S1" {
			t.Fatalf("vueltas = %+v", vuelos)
		}
	})
	t.Run("par ausente no es compatible", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{
			{ID: "S1", Zona: "z1", Estado: "LISTO"},
			{ID: "S2", Zona: "z2", Estado: "LISTO"},
		}}
		if vuelos := vuelosPosibles(snap); len(vuelos) != 1 {
			t.Fatalf("un par sin veredicto debe leerse incompatible: %+v", vuelos)
		}
	})
	t.Run("sesión que une dos vuelos queda marcada", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{
			{ID: "S1", Zona: "z1", Estado: "LISTO"},
			{ID: "S2", Zona: "z2", Estado: "LISTO"},
			{ID: "S7", Zona: "z3", Estado: "PLANIFICADO", DependeDe: []string{"S1", "S2"}},
			{ID: "S8", Zona: "z3", Estado: "PLANIFICADO", DependeDe: []string{"S7"}},
		}, Compatibilidad: []ParCompatibilidad{{A: "S1", B: "S2", Clase: "compatible"}}}
		vuelos := vuelosPosibles(snap)
		a := buscarVuelo(t, vuelos, "S1")
		var union *Miembro
		for i := range a.Sesiones {
			if a.Sesiones[i].Sesion == "S7" {
				union = &a.Sesiones[i]
			}
		}
		if union == nil || !union.Union {
			t.Fatalf("S7 debe quedar marcada como unión: %+v", a.Sesiones)
		}
		if got := idsDeVuelo(a); strings.Join(got, ",") != "S1,S7,S8" {
			t.Fatalf("miembros del vuelo S1 = %v", got)
		}
		if got := idsDeVuelo(buscarVuelo(t, vuelos, "S2")); strings.Join(got, ",") != "S2" {
			t.Fatalf("miembros del vuelo S2 = %v", got)
		}
	})
	t.Run("sin LISTO no hay vuelos", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{{ID: "S1", Zona: "z1", Estado: "PLANIFICADO"}}}
		if vuelos := vuelosPosibles(snap); len(vuelos) != 0 {
			t.Fatalf("vueltas = %+v", vuelos)
		}
	})
	t.Run("planificado ajeno no entra", func(t *testing.T) {
		snap := Snapshot{Sesiones: []SesionEstado{
			{ID: "S1", Zona: "z1", Estado: "LISTO"},
			{ID: "S9", Zona: "z2", Estado: "PLANIFICADO", DependeDe: []string{"S8"}},
			{ID: "S8", Zona: "z2", Estado: "COMPLETO"},
		}}
		vuelos := vuelosPosibles(snap)
		if len(vuelos) != 1 || strings.Join(idsDeVuelo(vuelos[0]), ",") != "S1" {
			t.Fatalf("vueltas = %+v", vuelos)
		}
	})
}

func TestPisos(t *testing.T) {
	v := Vuelo{Sesiones: []Miembro{
		{Sesion: "S1"},
		{Sesion: "S3", DependeDe: []string{"S1"}},
		{Sesion: "S4", DependeDe: []string{"S1"}},
		{Sesion: "S5", DependeDe: []string{"S3"}},
		{Sesion: "S6", DependeDe: []string{"afuera", "S4"}},
	}}
	p := pisos(v)
	quiere := map[string]int{"S1": 1, "S3": 2, "S4": 2, "S5": 3, "S6": 3}
	for id, piso := range quiere {
		if p[id] != piso {
			t.Fatalf("piso de %s = %d, quiere %d (%v)", id, p[id], piso, p)
		}
	}
}

func TestPuedeEmpezar(t *testing.T) {
	c := &Corrida{Vuelos: []Vuelo{
		vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}}),
		vueloCon("S2", Miembro{Sesion: "S2"}),
		vueloCon("S9", Miembro{Sesion: "S7", Union: true}),
	}}
	prendido := &Interruptor{Prendido: true, Rondas: 3, Tope: 10}
	cierre := func(id string) map[string]*Marca {
		return map[string]*Marca{id: {Sesion: id, Estado: estadoCierre, Ronda: 1, Commit: strings.Repeat("a", 40)}}
	}
	for _, tc := range []struct {
		nombre  string
		c       *Corrida
		marcas  map[string]*Marca
		i       *Interruptor
		sesion  string
		rechaza bool
	}{
		{"primera Sesión del vuelo", c, map[string]*Marca{}, prendido, "S1", false},
		{"piloto apagado", c, map[string]*Marca{}, &Interruptor{Prendido: false, Rondas: 3, Tope: 10}, "S1", true},
		{"interruptor ausente", c, map[string]*Marca{}, nil, "S1", true},
		{"sesión fuera de la corrida", c, map[string]*Marca{}, prendido, "S99", true},
		{"sesión que une dos vuelos", c, map[string]*Marca{}, prendido, "S7", true},
		{"dependencia sin cerrar", c, map[string]*Marca{}, prendido, "S3", true},
		{"dependencia cerrada", c, cierre("S1"), prendido, "S3", false},
		{"dependencia con novedad", c, map[string]*Marca{"S1": {Sesion: "S1", Estado: estadoNovedad, Ronda: 1, Motivo: motivoInterrumpida}}, prendido, "S3", true},
		{"tope alcanzado", c, map[string]*Marca{"S1": {Sesion: "S1", Estado: estadoEnCurso, Ronda: 1}}, &Interruptor{Prendido: true, Rondas: 3, Tope: 1}, "S2", true},
		{"sin tope", c, map[string]*Marca{"S1": {Sesion: "S1", Estado: estadoEnCurso, Ronda: 1}}, &Interruptor{Prendido: true, Rondas: 3, Tope: 0}, "S2", false},
		{"piso sobre el límite de rondas", c, cierre("S1"), &Interruptor{Prendido: true, Rondas: 1, Tope: 10}, "S3", true},
		{"sesión ya marcada", c, map[string]*Marca{"S1": {Sesion: "S1", Estado: estadoEnCurso, Ronda: 1}}, prendido, "S1", true},
	} {
		t.Run(tc.nombre, func(t *testing.T) {
			err := puedeEmpezar(tc.c, tc.marcas, tc.i, tc.sesion)
			if tc.rechaza && err == nil {
				t.Fatalf("debe rechazar %s", tc.sesion)
			}
			if !tc.rechaza && err != nil {
				t.Fatalf("debe permitir %s: %v", tc.sesion, err)
			}
		})
	}
}

func TestMarcarEnCursoCierreYNovedad(t *testing.T) {
	root, _ := repoGit(t)
	conSonda(t, root)
	c := corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}}))
	i := &Interruptor{Prendido: true, Rondas: 3, Tope: 10}
	if err := escribirInterruptor(root, *i); err != nil {
		t.Fatal(err)
	}

	if _, err := marcarEnCurso(root, i, "S3"); err == nil {
		t.Fatal("no se arranca una Sesión con su dependencia sin cerrar")
	}
	m, err := marcarEnCurso(root, i, "S1")
	if err != nil {
		t.Fatalf("marcarEnCurso S1: %v", err)
	}
	if m.Estado != estadoEnCurso || m.Ronda != 1 || m.Vuelo != "S1" || m.Rama != c.Vuelos[0].Rama {
		t.Fatalf("marca EN CURSO = %+v", m)
	}
	if _, err := marcarCierre(root, i, "S1", strings.Repeat("a", 40), 0); err == nil {
		t.Fatal("un commit que no está en la rama del vuelo no cierra")
	}

	gitFixture(t, root, "commit", "--allow-empty", "-qm", "entrega S1")
	entrega := gitFixture(t, root, "rev-parse", "HEAD^{commit}")
	gitFixture(t, root, "branch", c.Vuelos[0].Rama, entrega)
	cerrado, err := marcarCierre(root, i, "S1", entrega, 2)
	if err != nil {
		t.Fatalf("marcarCierre: %v", err)
	}
	if cerrado.Estado != estadoCierre || cerrado.Commit != entrega || cerrado.Decisiones != 2 || cerrado.Ronda != 1 {
		t.Fatalf("marca de cierre = %+v", cerrado)
	}
	if _, err := marcarEnCurso(root, i, "S3"); err != nil {
		t.Fatalf("con S1 cerrada, S3 arranca: %v", err)
	}
	if _, err := marcarCierre(root, i, "S1", entrega, 0); err == nil {
		t.Fatal("cerrar una Sesión que ya está POR REVISAR no es válido")
	}
	novedad, err := marcarNovedad(root, i, "S3", motivoNoSePudoInferir)
	if err != nil {
		t.Fatalf("marcarNovedad: %v", err)
	}
	if novedad.Estado != estadoNovedad || novedad.Motivo != motivoNoSePudoInferir || novedad.Ronda != 2 {
		t.Fatalf("marca de novedad = %+v", novedad)
	}
	if _, err := marcarNovedad(root, i, "S3", "porque sí"); err == nil {
		t.Fatal("un motivo fuera del conjunto cerrado no se registra")
	}
	if _, err := marcarEnCurso(root, &Interruptor{Prendido: false, Rondas: 3, Tope: 10}, "S3"); err == nil {
		t.Fatal("con el piloto apagado no se crean estados nuevos")
	}
}

func TestMarcarEnCursoExigeSonda(t *testing.T) {
	root, _ := repoGit(t)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}))
	_ = escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 3, Tope: 10})
	if _, err := marcarEnCurso(root, &Interruptor{Prendido: true, Rondas: 3, Tope: 10}, "S1"); err == nil {
		t.Fatal("sin la sonda el EN CURSO debe negarse")
	}
	conSonda(t, root)
	m, err := marcarEnCurso(root, &Interruptor{Prendido: true, Rondas: 3, Tope: 10}, "S1")
	if err != nil || m.Estado != estadoEnCurso {
		t.Fatalf("con la sonda S1 arranca: %v (%+v)", err, m)
	}
}

func TestFreno(t *testing.T) {
	root, _ := repoGit(t)
	conSonda(t, root)
	c := corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S2"}))
	i := &Interruptor{Prendido: true, Rondas: 2, Tope: 5}
	if err := escribirInterruptor(root, *i); err != nil {
		t.Fatal(err)
	}
	if _, err := marcarEnCurso(root, i, "S1"); err != nil {
		t.Fatal(err)
	}
	if _, err := marcarEnCurso(root, i, "S2"); err != nil {
		t.Fatal(err)
	}
	interrumpidas, err := frenar(root, i)
	if err != nil {
		t.Fatalf("frenar: %v", err)
	}
	if strings.Join(interrumpidas, ",") != "S1,S2" {
		t.Fatalf("interrumpidas = %v", interrumpidas)
	}
	for _, id := range []string{"S1", "S2"} {
		m, err := leerMarca(root, id)
		if err != nil || m == nil || m.Estado != estadoNovedad || m.Motivo != motivoInterrumpida {
			t.Fatalf("marca de %s tras el freno = %+v (%v)", id, m, err)
		}
	}
	leido, err := leerInterruptor(root)
	if err != nil || leido.Prendido || leido.Rondas != 2 || leido.Tope != 5 {
		t.Fatalf("el freno apaga el modo conservando los límites: %+v (%v)", leido, err)
	}
	if otra, err := frenar(root, leido); err != nil || len(otra) != 0 {
		t.Fatalf("frenar de nuevo no interrumpe nada: %v (%v)", otra, err)
	}
	if _, err := marcarEnCurso(root, leido, "S1"); err == nil {
		t.Fatal("con el freno puesto no arranca nada nuevo")
	}
	_ = c
}

func TestResumir(t *testing.T) {
	root, _ := repoGit(t)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}}), vueloCon("S2", Miembro{Sesion: "S2"}))
	i := &Interruptor{Prendido: true, Rondas: 3, Tope: 10}
	if err := escribirInterruptor(root, *i); err != nil {
		t.Fatal(err)
	}
	if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: ramaDeVuelo("2026-10-02", "S1"), Estado: estadoCierre, Commit: strings.Repeat("a", 40), Decisiones: 2, Ronda: 1}); err != nil {
		t.Fatal(err)
	}
	if err := escribirMarca(root, Marca{Sesion: "S2", Vuelo: "S2", Rama: ramaDeVuelo("2026-10-02", "S2"), Estado: estadoNovedad, Motivo: motivoDecisionDelicada, Ronda: 1}); err != nil {
		t.Fatal(err)
	}
	r, err := resumir(root)
	if err != nil {
		t.Fatalf("resumir: %v", err)
	}
	if r.PorRevisar != 1 || r.Novedad != 1 || r.SinEmpezar != 1 || r.EnCurso != 0 {
		t.Fatalf("totales = %+v", r)
	}
	if !r.Prendido || r.Rondas != 3 || r.Tope != 10 {
		t.Fatalf("interruptor del resumen = %+v", r)
	}
	a := r.Vuelos[0]
	if a.ID != "S1" || a.RondaAlcanzada != 1 || a.PorRevisar != 1 || a.SinEmpezar != 1 {
		t.Fatalf("resumen del vuelo S1 = %+v", a)
	}
	if a.Sesiones[0].Nota != "con 2 decisiones anotadas" {
		t.Fatalf("nota de POR REVISAR = %q", a.Sesiones[0].Nota)
	}
	otro, _ := repoGit(t)
	if _, err := resumir(otro); err == nil {
		t.Fatal("resumir sin corrida debe fallar cerrado")
	}
}

func TestRetirarVuelo(t *testing.T) {
	t.Run("retira copia y rama tras integrar", func(t *testing.T) {
		root, _ := repoGit(t)
		rama := ramaDeVuelo("2026-10-02", "S1")
		ruta, err := rutaCopia(root, "2026-10-02", "S1")
		if err != nil {
			t.Fatal(err)
		}
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		writeTestFile(t, filepath.Join(ruta, "entrega.txt"), "entrega S1\n", 0o644)
		gitFixture(t, ruta, "add", "entrega.txt")
		gitFixture(t, ruta, "commit", "-qm", "entrega S1")
		entrega := gitFixture(t, ruta, "rev-parse", "HEAD^{commit}")
		c := corridaConVuelos(t, root, Vuelo{ID: "S1", Ancla: "S1", Rama: rama, Copia: ruta, Sesiones: []Miembro{{Sesion: "S1"}}})
		if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: rama, Estado: estadoCierre, Commit: entrega, Ronda: 1}); err != nil {
			t.Fatal(err)
		}
		// Todavía no está integrada: el retiro se niega.
		if err := retirarVuelo(root, "S1"); err == nil {
			t.Fatal("sin integración aprobada el retiro se niega")
		}
		gitFixture(t, root, "merge", "--ff-only", rama)
		if err := retirarVuelo(root, "S1"); err != nil {
			t.Fatalf("retirarVuelo: %v", err)
		}
		if _, err := os.Lstat(ruta); !os.IsNotExist(err) {
			t.Fatalf("la copia debe desaparecer: %v", err)
		}
		if _, err := gitOutput(root, "show-ref", "--verify", rama); err == nil {
			t.Fatal("la rama debe desaparecer")
		}
		leida, err := leerCorrida(root)
		if err != nil || leida == nil || len(leida.Vuelos) != 0 {
			t.Fatalf("el vuelo retirado sale de la corrida: %+v (%v)", leida, err)
		}
		_ = c
	})
	t.Run("conserva una NOVEDAD", func(t *testing.T) {
		root, _ := repoGit(t)
		rama := ramaDeVuelo("2026-10-02", "S1")
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		corridaConVuelos(t, root, Vuelo{ID: "S1", Ancla: "S1", Rama: rama, Copia: ruta, Sesiones: []Miembro{{Sesion: "S1"}}})
		if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: rama, Estado: estadoNovedad, Motivo: motivoInterrumpida, Ronda: 1}); err != nil {
			t.Fatal(err)
		}
		if err := retirarVuelo(root, "S1"); err == nil {
			t.Fatal("un vuelo con NOVEDAD conserva copia y rama")
		}
		if _, err := os.Lstat(ruta); err != nil {
			t.Fatalf("la copia debe seguir: %v", err)
		}
		if _, err := gitOutput(root, "show-ref", "--verify", rama); err != nil {
			t.Fatalf("la rama debe seguir: %v", err)
		}
	})
	t.Run("sin porción aprobada no retira", func(t *testing.T) {
		root, _ := repoGit(t)
		ruta := t.TempDir()
		corridaConVuelos(t, root, Vuelo{ID: "S1", Ancla: "S1", Rama: ramaDeVuelo("2026-10-02", "S1"), Copia: ruta, Sesiones: []Miembro{{Sesion: "S1"}}})
		if err := retirarVuelo(root, "S1"); err == nil {
			t.Fatal("sin cierre integrado no hay nada que retirar")
		}
	})
	t.Run("vuelo desconocido", func(t *testing.T) {
		root, _ := repoGit(t)
		corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}))
		if err := retirarVuelo(root, "S9"); err == nil {
			t.Fatal("un vuelo que no está en la corrida no se retira")
		}
	})
	t.Run("con una Sesión EN CURSO no retira", func(t *testing.T) {
		root, head := repoGit(t)
		rama := ramaDeVuelo("2026-10-02", "S1")
		ruta, _ := rutaCopia(root, "2026-10-02", "S1")
		if err := crearCopia(root, "refs/heads/master", rama, ruta); err != nil {
			t.Fatal(err)
		}
		corridaConVuelos(t, root, Vuelo{ID: "S1", Ancla: "S1", Rama: rama, Copia: ruta, Sesiones: []Miembro{{Sesion: "S1"}, {Sesion: "S2"}}})
		// S1 ya integrada y S2 todavía en el aire: el vuelo no se retira.
		if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: rama, Estado: estadoCierre, Commit: head, Ronda: 1}); err != nil {
			t.Fatal(err)
		}
		if err := escribirMarca(root, Marca{Sesion: "S2", Vuelo: "S1", Rama: rama, Estado: estadoEnCurso, Ronda: 2}); err != nil {
			t.Fatal(err)
		}
		if err := retirarVuelo(root, "S1"); err == nil {
			t.Fatal("un vuelo con una Sesión EN CURSO no se retira")
		}
		if _, err := os.Lstat(ruta); err != nil {
			t.Fatalf("la copia debe seguir: %v", err)
		}
	})
}

func TestDecodificarSnapshot(t *testing.T) {
	data := []byte(`{
	  "schema":"radar.snapshot/v1",
	  "head":"` + strings.Repeat("a", 40) + `",
	  "avance":{"cerradas":1,"total":3},
	  "asientos":["z1"],
	  "zonas":[{"id":"z1","nombre":"Z"}],
	  "compatibilidad":[{"a":"S1","b":"S2","clase":"compatible","motivo":"sin cruces","detalle":["x"]}],
	  "sesiones":[{"id":"S1","zona":"z1","estado":"LISTO","depende_de":["S0"],"archivos":["a.go"]}]
	}`)
	snap, err := decodificarSnapshot(data)
	if err != nil {
		t.Fatalf("decodificarSnapshot: %v", err)
	}
	if len(snap.Sesiones) != 1 || snap.Sesiones[0].ID != "S1" || snap.Sesiones[0].Estado != "LISTO" {
		t.Fatalf("sesiones = %+v", snap.Sesiones)
	}
	if len(snap.Sesiones[0].DependeDe) != 1 || snap.Sesiones[0].DependeDe[0] != "S0" {
		t.Fatalf("dependencias = %+v", snap.Sesiones[0].DependeDe)
	}
	if len(snap.Compatibilidad) != 1 || snap.Compatibilidad[0].Clase != "compatible" {
		t.Fatalf("compatibilidad = %+v", snap.Compatibilidad)
	}
	if _, err := decodificarSnapshot([]byte("no es json")); err == nil {
		t.Fatal("un snapshot inválido debe fallar")
	}
}
