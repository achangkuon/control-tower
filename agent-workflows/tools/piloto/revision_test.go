package main

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var errSinRadar = errors.New("radar no disponible para la prueba")

// conSnapshot fixes the Radar read seam so review tests never need an installed
// radar and never depend on the host's state.
func conSnapshot(t *testing.T, snap Snapshot) {
	t.Helper()
	previo := snapshotRadar
	snapshotRadar = func(root string) (Snapshot, error) { return snap, nil }
	t.Cleanup(func() { snapshotRadar = previo })
}

func conSnapshotError(t *testing.T, err error) {
	t.Helper()
	previo := snapshotRadar
	snapshotRadar = func(root string) (Snapshot, error) { return Snapshot{}, err }
	t.Cleanup(func() { snapshotRadar = previo })
}

func TestInformeRevision(t *testing.T) {
	root, _ := repoGit(t)
	v := vueloCon("S1",
		Miembro{Sesion: "S1"},
		Miembro{Sesion: "S3", DependeDe: []string{"S1"}},
		Miembro{Sesion: "S4", DependeDe: []string{"S3"}},
		Miembro{Sesion: "S5"},
	)
	corridaConVuelos(t, root, v)
	if err := escribirMarca(root, Marca{Sesion: "S1", Vuelo: "S1", Rama: v.Rama, Estado: estadoCierre, Commit: strings.Repeat("a", 40), Decisiones: 2, Ronda: 1}); err != nil {
		t.Fatal(err)
	}
	if err := escribirMarca(root, Marca{Sesion: "S3", Vuelo: "S1", Rama: v.Rama, Estado: estadoNovedad, Motivo: motivoDecisionDelicada, Ronda: 2}); err != nil {
		t.Fatal(err)
	}
	conSnapshot(t, Snapshot{Sesiones: []SesionEstado{
		{ID: "S1", Estado: "POR REVISAR"},
		{ID: "S3", Estado: "NOVEDAD"},
		{ID: "S4", Estado: "LISTO", DependeDe: []string{"S3"}},
		{ID: "S5", Estado: "COMPLETO"},
	}})

	inf, err := informeRevision(root)
	if err != nil {
		t.Fatalf("informeRevision: %v", err)
	}
	if len(inf.Vuelos) != 1 {
		t.Fatalf("vuelos del informe = %+v", inf.Vuelos)
	}
	vr := inf.Vuelos[0]
	if strings.Join(vr.Orden, ",") != "S1,S5,S3,S4" {
		t.Fatalf("orden de revisión = %v", vr.Orden)
	}
	if vr.PorRevisar != 1 || vr.Novedad != 1 || vr.SinEmpezar != 1 || vr.Completa != 1 {
		t.Fatalf("totales del vuelo = %+v", vr)
	}
	if vr.RondaAlcanzada != 2 {
		t.Fatalf("ronda alcanzada = %d", vr.RondaAlcanzada)
	}
	quiere := map[string]EstadoRevision{
		"S1": {Sesion: "S1", Estado: "POR REVISAR", Nota: "con 2 decisiones anotadas", Ronda: 1},
		"S3": {Sesion: "S3", Estado: "NOVEDAD", Nota: motivoDecisionDelicada, Ronda: 2},
		"S4": {Sesion: "S4", Estado: "SIN EMPEZAR", Ronda: 3},
		"S5": {Sesion: "S5", Estado: "COMPLETA", Ronda: 1},
	}
	for _, s := range vr.Sesiones {
		q, ok := quiere[s.Sesion]
		if !ok {
			t.Fatalf("Sesión inesperada %+v", s)
		}
		if s.Estado != q.Estado || s.Nota != q.Nota || s.Ronda != q.Ronda {
			t.Fatalf("%s = %+v, quiere %+v", s.Sesion, s, q)
		}
		delete(quiere, s.Sesion)
	}
	if len(quiere) != 0 {
		t.Fatalf("faltan Sesiones en el informe: %v", quiere)
	}

	var salida bytes.Buffer
	formatearInformeRevision(&salida, inf)
	texto := salida.String()
	for _, esperado := range []string{"Revisión", "POR REVISAR", "con 2 decisiones anotadas", "NOVEDAD", motivoDecisionDelicada, "SIN EMPEZAR"} {
		if !strings.Contains(texto, esperado) {
			t.Fatalf("el informe debe incluir %q:\n%s", esperado, texto)
		}
	}
}

func TestInformeRevisionFallaSinCorrida(t *testing.T) {
	root, _ := repoGit(t)
	conSnapshot(t, Snapshot{})
	if _, err := informeRevision(root); err == nil {
		t.Fatal("sin corrida el informe falla cerrado")
	}
}

func TestInformeRevisionFallaSinRadar(t *testing.T) {
	root, _ := repoGit(t)
	corridaConVuelos(t, root, vueloCon("S1", Miembro{Sesion: "S1"}))
	conSnapshotError(t, errSinRadar)
	if _, err := informeRevision(root); err == nil {
		t.Fatal("sin snapshot de Radar no se inventa estado")
	}
}

func TestOrdenDeRevision(t *testing.T) {
	c := &Corrida{Vuelos: []Vuelo{
		vueloCon("A", Miembro{Sesion: "A1"}, Miembro{Sesion: "A2", DependeDe: []string{"A1"}}),
		vueloCon("B", Miembro{Sesion: "B1"}, Miembro{Sesion: "B2", DependeDe: []string{"B1"}}),
	}}
	// Sin NOVEDAD el orden sigue la corrida y la cascada base-arriba.
	if got := strings.Join(ordenDeVuelos(c, nil), ","); got != "A,B" {
		t.Fatalf("orden de vuelos = %s", got)
	}
	pasos := ordenDeRevision(c, nil)
	if len(pasos) != 4 {
		t.Fatalf("pasos = %+v", pasos)
	}
	var secuencia []string
	for _, p := range pasos {
		secuencia = append(secuencia, p.Vuelo+":"+p.Sesion)
	}
	if strings.Join(secuencia, " ") != "A:A1 A:A2 B:B1 B:B2" {
		t.Fatalf("secuencia = %v", secuencia)
	}

	// Un vuelo con NOVEDAD se atiende primero, aunque esté después en la corrida.
	marcas := map[string]*Marca{"B2": {Sesion: "B2", Estado: estadoNovedad, Motivo: motivoInterrumpida, Ronda: 2}}
	if got := strings.Join(ordenDeVuelos(c, marcas), ","); got != "B,A" {
		t.Fatalf("con NOVEDAD en B el orden = %s", got)
	}
	pasos = ordenDeRevision(c, marcas)
	secuencia = secuencia[:0]
	for _, p := range pasos {
		secuencia = append(secuencia, p.Vuelo+":"+p.Sesion)
	}
	if strings.Join(secuencia, " ") != "B:B1 B:B2 A:A1 A:A2" {
		t.Fatalf("secuencia con NOVEDAD = %v", secuencia)
	}
}

func TestAnalisisDeImpacto(t *testing.T) {
	c := &Corrida{Vuelos: []Vuelo{
		vueloCon("S1",
			Miembro{Sesion: "S1"},
			Miembro{Sesion: "S3", DependeDe: []string{"S1"}},
			Miembro{Sesion: "S4", DependeDe: []string{"S1"}},
			Miembro{Sesion: "S5", DependeDe: []string{"S3"}},
		),
	}}
	imp, err := analizarImpacto(c, "S1")
	if err != nil {
		t.Fatalf("analizarImpacto: %v", err)
	}
	if imp.Vuelo != "S1" || strings.Join(imp.Afectadas, ",") != "S3,S4,S5" {
		t.Fatalf("impacto de S1 = %+v", imp)
	}
	if len(imp.Opciones) != 3 || !strings.Contains(imp.Opciones[1], "3 Sesiones") {
		t.Fatalf("opciones = %v", imp.Opciones)
	}
	if imp, err = analizarImpacto(c, "S3"); err != nil || strings.Join(imp.Afectadas, ",") != "S5" {
		t.Fatalf("impacto de S3 = %+v (%v)", imp, err)
	}
	if imp, err = analizarImpacto(c, "S5"); err != nil || len(imp.Afectadas) != 0 {
		t.Fatalf("S5 no tiene arriba: %+v (%v)", imp, err)
	}
	if _, err := analizarImpacto(c, "S9"); err == nil {
		t.Fatal("una Sesión fuera de la corrida no tiene impacto")
	}
}

func TestRegistrarImpacto(t *testing.T) {
	root, _ := repoGit(t)
	corridaConVuelos(t, root, vueloCon("S1",
		Miembro{Sesion: "S1"},
		Miembro{Sesion: "S3", DependeDe: []string{"S1"}},
		Miembro{Sesion: "S4", DependeDe: []string{"S1"}},
	))
	if _, err := registrarImpacto(root, "S1", "enorme"); err == nil {
		t.Fatal("un tipo fuera del conjunto cerrado se rechaza")
	}
	cor, err := registrarImpacto(root, "S1", impactoMedio)
	if err != nil {
		t.Fatalf("registrarImpacto: %v", err)
	}
	if cor.Schema != esquemaCorreccion || cor.Tipo != impactoMedio || strings.Join(cor.Afectadas, ",") != "S3,S4" {
		t.Fatalf("corrección = %+v", cor)
	}
	leida, err := leerCorreccion(root, "S1")
	if err != nil || leida == nil || leida.Tipo != impactoMedio || strings.Join(leida.Afectadas, ",") != "S3,S4" {
		t.Fatalf("leerCorreccion = %+v (%v)", leida, err)
	}
	if vacia, err := leerCorreccion(root, "S4"); err != nil || vacia != nil {
		t.Fatalf("sin clasificación se lee nil: %+v (%v)", vacia, err)
	}
}

func TestResolucionDeNovedad(t *testing.T) {
	root, _ := repoGit(t)
	v := vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}})
	corridaConVuelos(t, root, v)
	if err := escribirMarca(root, Marca{Sesion: "S3", Vuelo: "S1", Rama: v.Rama, Estado: estadoNovedad, Motivo: motivoNoSePudoInferir, Ronda: 2}); err != nil {
		t.Fatal(err)
	}

	if r, err := resolverNovedad(root, "S3", "   "); err == nil || r != nil {
		t.Fatalf("una decisión vacía no se registra: %+v (%v)", r, err)
	}
	if _, err := resolverNovedad(root, "S1", "no hay novedad que resolver"); err == nil {
		t.Fatal("una Sesión sin NOVEDAD no se resuelve")
	}
	if _, err := resolverNovedad(root, "S9", "no existe"); err == nil {
		t.Fatal("una Sesión fuera de la corrida no se resuelve")
	}

	r, err := resolverNovedad(root, "S3", "El contrato manda X según Engram 123")
	if err != nil {
		t.Fatalf("resolverNovedad: %v", err)
	}
	if r.Schema != esquemaResolucion || r.Sesion != "S3" || r.Vuelo != "S1" || r.Motivo != motivoNoSePudoInferir || r.Ronda != 2 {
		t.Fatalf("resolución = %+v", r)
	}
	leida, err := leerResolucion(root, "S3")
	if err != nil || leida == nil || leida.Decision != "El contrato manda X según Engram 123" {
		t.Fatalf("leerResolucion = %+v (%v)", leida, err)
	}
	common, _ := commonDir(root)
	info, err := os.Lstat(filepath.Join(common, "chanks", "piloto", "resoluciones", "S3.json"))
	if err != nil {
		t.Fatalf("la resolución no quedó en la carpeta de registros: %v", err)
	}
	if !info.Mode().IsRegular() || info.Mode().Perm() != 0o600 {
		t.Fatalf("la evidencia debe ser 0600 y regular: %v", info.Mode())
	}
	if otra, err := leerResolucion(root, "S1"); err != nil || otra != nil {
		t.Fatalf("sin resolución se lee nil: %+v (%v)", otra, err)
	}
}

func TestResolucionIlegibleFallaCerrado(t *testing.T) {
	root, _ := repoGit(t)
	common, _ := commonDir(root)
	dir := filepath.Join(common, "chanks", "piloto", "resoluciones")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	// Clave duplicada: el lector estricto no la acepta.
	if err := os.WriteFile(filepath.Join(dir, "S1.json"), []byte(`{"schema":"radar.piloto.resolucion/v1","sesion":"S1","sesion":"S1","vuelo":"S1","motivo":"no se pudo inferir","decision":"x","ronda":1}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := leerResolucion(root, "S1"); err == nil {
		t.Fatal("una resolución con claves duplicadas falla cerrada")
	}
}

func TestOrdenDeRevisionUnionEspera(t *testing.T) {
	c := &Corrida{Vuelos: []Vuelo{
		vueloCon("A", Miembro{Sesion: "A1"}, Miembro{Sesion: "S7", DependeDe: []string{"A1", "B1"}, Union: true}),
		vueloCon("B", Miembro{Sesion: "B1"}),
	}}
	pasos := ordenDeRevision(c, nil)
	// La Sesión que une dos vuelos va al final de su vuelo y espera al otro.
	var union *PasoRevision
	for i := range pasos {
		if pasos[i].Sesion == "S7" {
			union = &pasos[i]
		}
	}
	if union == nil || union.Vuelo != "A" || !union.Union {
		t.Fatalf("falta el paso de la unión: %+v", pasos)
	}
	if strings.Join(union.Espera, ",") != "B" {
		t.Fatalf("espera = %v", union.Espera)
	}
	// Con el otro vuelo ya revisado, no espera a nadie.
	marcas := map[string]*Marca{
		"A1": {Sesion: "A1", Estado: estadoCierre, Ronda: 1, Commit: strings.Repeat("a", 40)},
		"B1": {Sesion: "B1", Estado: estadoCierre, Ronda: 1, Commit: strings.Repeat("b", 40)},
	}
	for _, p := range ordenDeRevision(c, marcas) {
		if p.Sesion == "S7" && len(p.Espera) != 0 {
			t.Fatalf("con B revisado S7 no espera: %+v", p)
		}
	}
}

func TestComandosDeRevision(t *testing.T) {
	root, _ := repoGit(t)
	v := vueloCon("S1", Miembro{Sesion: "S1"}, Miembro{Sesion: "S3", DependeDe: []string{"S1"}})
	corridaConVuelos(t, root, v)
	if err := escribirMarca(root, Marca{Sesion: "S3", Vuelo: "S1", Rama: v.Rama, Estado: estadoNovedad, Motivo: motivoInterrumpida, Ronda: 2}); err != nil {
		t.Fatal(err)
	}
	conSnapshot(t, Snapshot{Sesiones: []SesionEstado{
		{ID: "S1", Estado: "LISTO"},
		{ID: "S3", Estado: "NOVEDAD"},
	}})
	var salida bytes.Buffer
	if err := cmdInformeRevision(&salida, root); err != nil {
		t.Fatalf("cmdInformeRevision: %v", err)
	}
	if !strings.Contains(salida.String(), "NOVEDAD") || !strings.Contains(salida.String(), "Orden de revisión") {
		t.Fatalf("informe = %q", salida.String())
	}
	if err := cmdOrdenRevision(&salida, root); err != nil {
		t.Fatalf("cmdOrdenRevision: %v", err)
	}
	if !strings.Contains(salida.String(), "Orden de revisión") {
		t.Fatalf("orden = %q", salida.String())
	}
	if err := cmdResolverNovedad(&salida, root, "S3", "resuelto por Engram 123"); err != nil {
		t.Fatalf("cmdResolverNovedad: %v", err)
	}
	if !strings.Contains(salida.String(), "resuelta") {
		t.Fatalf("resolución = %q", salida.String())
	}
	if err := cmdImpacto(&salida, root, "S1", ""); err != nil {
		t.Fatalf("cmdImpacto análisis: %v", err)
	}
	if !strings.Contains(salida.String(), "El tipo lo decidís vos") {
		t.Fatalf("impacto = %q", salida.String())
	}
	if err := cmdImpacto(&salida, root, "S1", impactoGrave); err != nil {
		t.Fatalf("cmdImpacto registro: %v", err)
	}
	if !strings.Contains(salida.String(), "registrado como grave") {
		t.Fatalf("registro de impacto = %q", salida.String())
	}
}
