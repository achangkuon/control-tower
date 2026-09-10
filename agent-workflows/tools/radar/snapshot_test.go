package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSnapshotReportsTotalAndPerZonaAvance(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}, {ID: "entrega", Nombre: "Entrega"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "hosts", "S1"),
			abierta("S3", "entrega"),
		},
	}

	s := p.SnapshotAt(root, commit)

	if s.Producto != "control-tower" || s.Head != commit {
		t.Fatalf("identidad del snapshot inesperada: %#v", s)
	}
	if s.Avance.Cerradas != 1 || s.Avance.Total != 3 {
		t.Fatalf("avance total esperado 1/3, obtenido %d/%d", s.Avance.Cerradas, s.Avance.Total)
	}
	if len(s.Zonas) != 2 {
		t.Fatalf("se esperaban 2 Zonas, hay %d", len(s.Zonas))
	}
	if s.Zonas[0].ID != "entrega" || s.Zonas[1].ID != "hosts" {
		t.Fatalf("las Zonas deben salir ordenadas por id: %#v", s.Zonas)
	}
	hosts := s.Zonas[1]
	if hosts.Nombre != "Hosts" || hosts.Cerradas != 1 || hosts.Total != 2 {
		t.Fatalf("avance de la Zona hosts inesperado: %#v", hosts)
	}
}

// The report draws a row per Zona and needs the queue head to say what is next.
func TestSnapshotCarriesTheZonaQueueWithDerivedStates(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "hosts", "S1"),
			abierta("S3", "hosts", "S2"),
		},
	}
	p.Sesiones[1].Resultado = "Adaptador de host neutral"

	cola := p.SnapshotAt(root, commit).Zonas[0].Cola
	if len(cola) != 2 {
		t.Fatalf("se esperaban 2 Sesiones en cola, hay %d: %#v", len(cola), cola)
	}
	if cola[0].Sesion != "S2" || cola[0].Posicion != 1 || cola[0].Resultado != "Adaptador de host neutral" {
		t.Fatalf("cabeza de cola inesperada: %#v", cola[0])
	}
	if cola[0].Estado != "LISTO" || cola[1].Estado != "PLANIFICADO" {
		t.Fatalf("estados de cola inesperados: %#v", cola)
	}
}

// The vocabulary word is the contract; the emoji is presentation Radar owns and
// a JSON consumer must never have to strip.
func TestSnapshotEmitsStatesWithoutEmoji(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit), abierta("S2", "hosts", "S1")},
	}

	s := p.SnapshotAt(root, commit)
	if len(s.Sesiones) != 2 {
		t.Fatalf("se esperaban 2 Sesiones, hay %d", len(s.Sesiones))
	}
	for _, ses := range s.Sesiones {
		if strings.ContainsAny(ses.Estado, "📋🟢🔵🔴🟡✅📚") {
			t.Fatalf("el estado %q no debe llevar emoji", ses.Estado)
		}
	}
	if s.Sesiones[0].Estado != "COMPLETO" || s.Sesiones[1].Estado != "LISTO" {
		t.Fatalf("estados de Sesión inesperados: %#v", s.Sesiones)
	}
	if s.Sesiones[0].Zona != "hosts" {
		t.Fatalf("cada Sesión debe declarar su Zona: %#v", s.Sesiones[0])
	}
}

// A report that reads this must be able to diff two runs; map iteration order
// would make identical facts serialize differently.
func TestSnapshotJSONIsDeterministicAndSelfDescribing(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "metodo", Nombre: "Método"}, {ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{
			entregada("S1", "hosts", commit),
			abierta("S2", "metodo"),
			abierta("S3", "hosts", "S1"),
		},
	}

	first, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	second, err := json.Marshal(p.SnapshotAt(root, commit))
	if err != nil {
		t.Fatal(err)
	}
	if string(first) != string(second) {
		t.Fatalf("dos snapshots de los mismos hechos difieren:\n%s\n%s", first, second)
	}

	var decoded Snapshot
	if err := json.Unmarshal(first, &decoded); err != nil {
		t.Fatalf("el snapshot no vuelve a decodificar: %v", err)
	}
	if decoded.Schema != "radar.snapshot/v1" {
		t.Fatalf("el snapshot debe declarar su esquema, dijo %q", decoded.Schema)
	}
	if decoded.Avance.Total != 3 || len(decoded.Zonas) != 2 {
		t.Fatalf("el snapshot decodificado perdió hechos: %#v", decoded)
	}
}

// A Sesión with proven pending territory counts in the total but belongs to no
// Zona; dropping it from the total would understate the work that exists.
func TestSnapshotKeepsPendingTerritoryOutOfZonasButInTheTotal(t *testing.T) {
	root, commit := repoGit(t)
	huerfana := abierta("S9", "")
	huerfana.ImportacionLegacy = &ImportacionLegacy{TerritorioPendiente: true}
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit), huerfana},
	}

	s := p.SnapshotAt(root, commit)
	if s.Avance.Total != 2 {
		t.Fatalf("el total debe contar la Sesión sin Zona: %#v", s.Avance)
	}
	if s.Zonas[0].Total != 1 {
		t.Fatalf("la Zona no debe contar territorio pendiente: %#v", s.Zonas[0])
	}
	if s.TerritorioPendiente != 1 {
		t.Fatalf("el snapshot debe declarar cuántas Sesiones no tienen Zona, dijo %d", s.TerritorioPendiente)
	}
}

// The CLI is the only surface a report can reach; a snapshot that Radar can
// compute but not emit is not usable by anyone.
func TestCmdStatusJSONEmitsTheSnapshot(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts", Rutas: []string{"tracked.txt"}}},
		Sesiones: []Sesion{completa("S1", "hosts", commit), pendiente("S2", "hosts", "S1")},
	}

	var out strings.Builder
	if err := cmdStatusJSON(&out, p, root); err != nil {
		t.Fatalf("status --json falló: %v", err)
	}

	var decoded Snapshot
	if err := json.Unmarshal([]byte(out.String()), &decoded); err != nil {
		t.Fatalf("la salida no es JSON válido: %v\n%s", err, out.String())
	}
	if decoded.Schema != SnapshotSchema || decoded.Avance.Total != 2 {
		t.Fatalf("snapshot emitido inesperado: %#v", decoded)
	}
	if len(decoded.Zonas) != 1 || decoded.Zonas[0].Cerradas != 1 {
		t.Fatalf("el snapshot emitido perdió el avance por Zona: %#v", decoded.Zonas)
	}
}

// Numbers Radar would not stand behind must never reach a consumer: a report
// that renders them turns invalid data into a published fact.
func TestCmdStatusJSONRefusesInvalidData(t *testing.T) {
	root, commit := repoGit(t)
	p := &Plan{
		Producto: "control-tower",
		Zonas:    []Zona{{ID: "hosts", Nombre: "Hosts"}},
		Sesiones: []Sesion{entregada("S1", "hosts", commit)},
	}

	var out strings.Builder
	err := cmdStatusJSON(&out, p, root)
	if err == nil {
		t.Fatal("una zona sin rutas debe impedir emitir el snapshot")
	}
	if out.Len() != 0 {
		t.Fatalf("no debe emitirse nada cuando la validación falla, salió %q", out.String())
	}
}

// completa and pendiente build Sesiones that satisfy the whole checker, so the
// emission tests exercise the real refusal path instead of bypassing it.
func completa(id, zona, commit string, deps ...string) Sesion {
	s := pendiente(id, zona, deps...)
	s.Entrega = &Entrega{Commit: commit}
	return s
}

func pendiente(id, zona string, deps ...string) Sesion {
	return Sesion{
		ID:        id,
		Zona:      zona,
		Resultado: "Resultado observable de " + id,
		Autoridad: "openspec/changes/ejemplo/tasks.md",
		DependeDe: deps,
		Criterios: []string{"Criterio binario verificable"},
		Ruta:      RutaSesion{Propuesta: "direct", Autoridad: "openspec/changes/ejemplo/tasks.md"},
		Modulos: []Modulo{{
			ID:        "M" + strings.TrimPrefix(id, "S") + ".1",
			Resultado: "Módulo observable de " + id,
			Rutas:     []string{"tracked.txt"},
			Tareas: []Tarea{{
				ID:        "T" + strings.TrimPrefix(id, "S") + ".1.1",
				Accion:    "Ejecutar la acción atómica de " + id,
				Resultado: "Resultado atómico de " + id,
				Criterios: []string{"Criterio binario verificable"},
			}},
		}},
	}
}
