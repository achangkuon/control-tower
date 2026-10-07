package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// escribirCrudo writes a raw switch file so malformed evidence can be tested.
func escribirCrudo(t *testing.T, root, contenido string) string {
	t.Helper()
	common, err := commonDir(root)
	if err != nil {
		t.Fatalf("commonDir: %v", err)
	}
	dir := filepath.Join(common, "chanks", "piloto")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "interruptor.json")
	if err := os.WriteFile(path, []byte(contenido), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestLeerInterruptorAusente(t *testing.T) {
	root, _ := repoGit(t)
	i, err := leerInterruptor(root)
	if err != nil {
		t.Fatalf("un interruptor ausente no es un error: %v", err)
	}
	if i != nil {
		t.Fatalf("un interruptor ausente lee como nil, salió %+v", i)
	}
}

func TestInterruptorContratoYLimites(t *testing.T) {
	root, _ := repoGit(t)
	if err := escribirInterruptor(root, Interruptor{Prendido: true, Rondas: 2, Tope: 7}); err != nil {
		t.Fatalf("escribirInterruptor: %v", err)
	}
	leido, err := leerInterruptor(root)
	if err != nil {
		t.Fatal(err)
	}
	if leido == nil || !leido.Prendido || leido.Rondas != 2 || leido.Tope != 7 || leido.Schema != esquemaInterruptor {
		t.Fatalf("contrato leído = %+v", leido)
	}
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(common, "chanks", "piloto", "interruptor.json")
	info, err := os.Lstat(path)
	if err != nil {
		t.Fatal(err)
	}
	if !info.Mode().IsRegular() || info.Mode().Perm() != 0o600 {
		t.Fatalf("el interruptor debe ser un archivo regular 0600, es %v", info.Mode())
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var campos map[string]any
	if err := json.Unmarshal(data, &campos); err != nil {
		t.Fatal(err)
	}
	quiere := map[string]bool{"schema": true, "prendido": true, "rondas": true, "tope": true}
	if len(campos) != len(quiere) {
		t.Fatalf("claves del interruptor = %v", campos)
	}
	for k := range campos {
		if !quiere[k] {
			t.Fatalf("clave inesperada en el interruptor: %q", k)
		}
	}
	// Apagar preserva los límites de la corrida.
	if err := escribirInterruptor(root, Interruptor{Prendido: false, Rondas: 2, Tope: 7}); err != nil {
		t.Fatal(err)
	}
	leido, err = leerInterruptor(root)
	if err != nil || leido.Prendido || leido.Rondas != 2 || leido.Tope != 7 {
		t.Fatalf("apagado releído = %+v (%v)", leido, err)
	}
}

func TestInterruptorMalformado(t *testing.T) {
	for _, tc := range []struct {
		nombre    string
		contenido string
	}{
		{"campo desconocido", `{"schema":"radar.piloto.interruptor/v1","prendido":true,"rondas":3,"tope":10,"freno":true}`},
		{"clave duplicada", `{"schema":"radar.piloto.interruptor/v1","prendido":true,"prendido":false,"rondas":3,"tope":10}`},
		{"esquema ajeno", `{"schema":"radar.piloto/v1","prendido":true,"rondas":3,"tope":10}`},
		{"rondas fuera de rango", `{"schema":"radar.piloto.interruptor/v1","prendido":true,"rondas":4,"tope":10}`},
		{"tope negativo", `{"schema":"radar.piloto.interruptor/v1","prendido":true,"rondas":3,"tope":-1}`},
		{"no es objeto", `[]`},
		{"datos adicionales", `{"schema":"radar.piloto.interruptor/v1","prendido":true,"rondas":3,"tope":10}{}`},
	} {
		t.Run(tc.nombre, func(t *testing.T) {
			root, _ := repoGit(t)
			escribirCrudo(t, root, tc.contenido)
			if _, err := leerInterruptor(root); err == nil {
				t.Fatalf("un interruptor malformado (%s) debe fallar cerrado", tc.nombre)
			}
		})
	}
}

func TestValidarMarca(t *testing.T) {
	base := Marca{Schema: esquemaMarca, Sesion: "S1", Vuelo: "S1", Rama: "refs/heads/piloto/2026-10-02/vuelo-S1", Estado: estadoEnCurso, Ronda: 1}
	for _, tc := range []struct {
		nombre string
		cambio func(*Marca)
		valida bool
	}{
		{"en-curso válida", func(m *Marca) {}, true},
		{"en-curso con motivo", func(m *Marca) { m.Motivo = motivoInterrumpida }, false},
		{"en-curso con commit", func(m *Marca) { m.Commit = strings.Repeat("a", 40) }, false},
		{"novedad delicada", func(m *Marca) { m.Estado = estadoNovedad; m.Motivo = motivoDecisionDelicada }, true},
		{"novedad no inferido", func(m *Marca) { m.Estado = estadoNovedad; m.Motivo = motivoNoSePudoInferir }, true},
		{"novedad interrumpida", func(m *Marca) { m.Estado = estadoNovedad; m.Motivo = motivoInterrumpida }, true},
		{"novedad sin motivo", func(m *Marca) { m.Estado = estadoNovedad }, false},
		{"novedad con motivo inventado", func(m *Marca) { m.Estado = estadoNovedad; m.Motivo = "porque sí" }, false},
		{"novedad con commit", func(m *Marca) {
			m.Estado = estadoNovedad
			m.Motivo = motivoInterrumpida
			m.Commit = strings.Repeat("a", 40)
		}, false},
		{"cierre completo", func(m *Marca) { m.Estado = estadoCierre; m.Commit = strings.Repeat("a", 40) }, true},
		{"cierre sin commit", func(m *Marca) { m.Estado = estadoCierre }, false},
		{"cierre con motivo", func(m *Marca) {
			m.Estado = estadoCierre
			m.Commit = strings.Repeat("a", 40)
			m.Motivo = motivoInterrumpida
		}, false},
		{"estado desconocido", func(m *Marca) { m.Estado = "volando" }, false},
		{"ronda cero", func(m *Marca) { m.Ronda = 0 }, false},
		{"decisiones negativas", func(m *Marca) { m.Estado = estadoCierre; m.Commit = strings.Repeat("a", 40); m.Decisiones = -1 }, false},
		{"esquema ajeno", func(m *Marca) { m.Schema = "otra/v1" }, false},
		{"rama que no cierra el vuelo", func(m *Marca) { m.Rama = "refs/heads/piloto/2026-10-02/vuelo-S2" }, false},
		{"vuelo inseguro", func(m *Marca) { m.Vuelo = "S 1"; m.Rama = "refs/heads/piloto/2026-10-02/vuelo-S 1" }, false},
		{"sesión vacía", func(m *Marca) { m.Sesion = "" }, false},
	} {
		t.Run(tc.nombre, func(t *testing.T) {
			m := base
			tc.cambio(&m)
			err := validarMarca(m)
			if tc.valida && err != nil {
				t.Fatalf("marca válida rechazada: %v", err)
			}
			if !tc.valida && err == nil {
				t.Fatalf("marca inválida aceptada: %+v", m)
			}
		})
	}
}

func TestMarcaRoundTripYNombre(t *testing.T) {
	root, _ := repoGit(t)
	m := Marca{Sesion: "S1", Vuelo: "S1", Rama: "refs/heads/piloto/2026-10-02/vuelo-S1", Estado: estadoNovedad, Motivo: motivoDecisionDelicada, Ronda: 2}
	if err := escribirMarca(root, m); err != nil {
		t.Fatalf("escribirMarca: %v", err)
	}
	leida, err := leerMarca(root, "S1")
	if err != nil {
		t.Fatal(err)
	}
	if leida == nil || leida.Schema != esquemaMarca || leida.Estado != estadoNovedad || leida.Motivo != motivoDecisionDelicada || leida.Ronda != 2 {
		t.Fatalf("marca leída = %+v", leida)
	}
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Lstat(filepath.Join(common, "chanks", "piloto", "marcas", "S1.json")); err != nil {
		t.Fatalf("la marca vive en <common>/chanks/piloto/marcas/<ID>.json: %v", err)
	}
	if otra, err := leerMarca(root, "S2"); err != nil || otra != nil {
		t.Fatalf("una marca ausente lee como nil: %+v (%v)", otra, err)
	}
	// El nombre del archivo y el campo sesión tienen que coincidir.
	path := filepath.Join(common, "chanks", "piloto", "marcas", "S1.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(strings.Replace(string(data), `"sesion":"S1"`, `"sesion":"S2"`, 1)), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := leerMarca(root, "S1"); err == nil {
		t.Fatal("una marca cuyo campo sesión no coincide con el archivo debe rechazarse")
	}
}

func TestCorridaRoundTrip(t *testing.T) {
	root, _ := repoGit(t)
	c := Corrida{Fecha: "2026-10-02", Inicio: "2026-10-02T22:00:00Z", Vuelos: []Vuelo{
		{ID: "S1", Ancla: "S1", Rama: "refs/heads/piloto/2026-10-02/vuelo-S1", Copia: "/x/vuelo-S1", Sesiones: []Miembro{{Sesion: "S1"}, {Sesion: "S3", DependeDe: []string{"S1"}}}},
	}}
	if err := escribirCorrida(root, c); err != nil {
		t.Fatalf("escribirCorrida: %v", err)
	}
	leida, err := leerCorrida(root)
	if err != nil {
		t.Fatal(err)
	}
	if leida == nil || leida.Schema != esquemaCorrida || leida.Fecha != "2026-10-02" || len(leida.Vuelos) != 1 {
		t.Fatalf("corrida leída = %+v", leida)
	}
	if len(leida.Vuelos[0].Sesiones) != 2 || leida.Vuelos[0].Sesiones[1].Sesion != "S3" {
		t.Fatalf("miembros = %+v", leida.Vuelos[0].Sesiones)
	}
	if ausente, err := leerCorrida(root); err != nil || ausente == nil {
		t.Fatalf("la corrida recién escrita debe leerse: %v", err)
	}
	otro, _ := repoGit(t)
	if c2, err := leerCorrida(otro); err != nil || c2 != nil {
		t.Fatalf("una corrida ausente lee como nil: %+v (%v)", c2, err)
	}
}

func TestRamaDeVueloYID(t *testing.T) {
	if got := ramaDeVuelo("2026-10-02", "S1"); got != "refs/heads/piloto/2026-10-02/vuelo-S1" {
		t.Fatalf("ramaDeVuelo = %q", got)
	}
	for _, tc := range []struct {
		valor string
		ok    bool
	}{
		{"S1", true}, {"vuelo-1", true}, {"S.1_2-3", true},
		{"", false}, {".", false}, {"..", false}, {"-x", false}, {"a b", false}, {"a/b", false},
	} {
		if got := idValido(tc.valor); got != tc.ok {
			t.Fatalf("idValido(%q) = %v, quiere %v", tc.valor, got, tc.ok)
		}
	}
	for _, motivo := range []string{motivoDecisionDelicada, motivoNoSePudoInferir, motivoInterrumpida} {
		if !motivoValido(motivo) {
			t.Fatalf("motivoValido(%q) = false", motivo)
		}
	}
	if motivoValido("") || motivoValido("otro") {
		t.Fatal("motivoValido acepta un motivo fuera del conjunto cerrado")
	}
}

func TestRepoPadre(t *testing.T) {
	root, _ := repoGit(t)
	padre, err := repoPadre(root)
	if err != nil {
		t.Fatal(err)
	}
	if padre != filepath.Dir(root) {
		t.Fatalf("repoPadre = %q, quiere %q", padre, filepath.Dir(root))
	}
}

func TestDirPilotoRechazaEnlace(t *testing.T) {
	root, _ := repoGit(t)
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(t.TempDir(), filepath.Join(common, "chanks")); err != nil {
		t.Fatal(err)
	}
	if _, err := dirPiloto(common, true); err == nil {
		t.Fatal("dirPiloto debe rechazar un componente que es enlace simbólico")
	}
}

// conSonda registers the corrida's RDD consent answer; the hard lock (S231)
// refuses despegar and en-curso without it. conRelojFijo installs it, so a
// test that needs the missing-sonda case calls quitarSonda instead.
func conSonda(t *testing.T, root string) {
	t.Helper()
	if err := registrarSonda(root); err != nil {
		t.Fatalf("registrarSonda: %v", err)
	}
}

func quitarSonda(t *testing.T, root string) {
	t.Helper()
	common, err := commonDir(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(common, "chanks", "piloto", "sonda.json")); err != nil && !os.IsNotExist(err) {
		t.Fatal(err)
	}
}

func TestSonda(t *testing.T) {
	t.Run("registra la respuesta humana en el directorio común", func(t *testing.T) {
		root, _ := repoGit(t)
		conRelojFijo(t, root)
		s, err := leerSonda(root)
		if err != nil || s == nil || !s.Confirmada || s.Schema != "radar.piloto.sonda/v1" || s.Fecha == "" {
			t.Fatalf("sonda = %+v (%v)", s, err)
		}
	})
	t.Run("sin sonda no hay registro", func(t *testing.T) {
		root, _ := repoGit(t)
		s, err := leerSonda(root)
		if err != nil || s != nil {
			t.Fatalf("sonda = %+v (%v), quiere nil", s, err)
		}
	})
	t.Run("la CLI exige --confirmar", func(t *testing.T) {
		root, _ := repoGit(t)
		var salida bytes.Buffer
		if err := cmdSonda(&salida, root, false); err == nil {
			t.Fatal("sonda sin --confirmar debe fallar")
		}
		if s, _ := leerSonda(root); s != nil {
			t.Fatalf("un rechazo no registra la sonda: %+v", s)
		}
		if err := cmdSonda(&salida, root, true); err != nil {
			t.Fatalf("cmdSonda: %v", err)
		}
		if s, _ := leerSonda(root); s == nil || !s.Confirmada {
			t.Fatalf("la CLI no registró la sonda: %+v", s)
		}
	})
}
