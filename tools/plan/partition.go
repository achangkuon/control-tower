package main

import (
	"fmt"
	"os/exec"
	"path"
	"sort"
	"strings"
)

// The partition is the load-bearing guarantee of the whole model: if two Zonas
// can own the same file, agents collide at merge and no amount of process fixes
// it. Convention §3 requires the partition to be disjoint and exhaustive, and
// this file is what makes that a check rather than a promise.

// Owner is what a path matcher resolves to.
type Owner struct {
	Kind string // "zona" or "cimientos"
	ID   string // zone id, or "cimientos"
	Rule string // the pattern that matched, for reporting
}

// Hallazgo is one partition problem, in the reader's language.
type Hallazgo struct {
	Severidad string // "error" or "aviso"
	Regla     string // which rule was broken
	Detalle   string
}

// matchRule reports whether file matches pattern.
//
// Three deliberate forms, and no more. A partition written with the full glob
// language is a partition nobody can predict the meaning of:
//
//	"hosts/"     directory prefix
//	"hosts/**"   directory prefix, explicit
//	"core.mjs"   exact path, or a single-segment path.Match pattern
func matchRule(pattern, file string) bool {
	p := strings.TrimSuffix(pattern, "**")
	if strings.HasSuffix(p, "/") {
		return strings.HasPrefix(file, p)
	}
	if pattern == file {
		return true
	}
	ok, err := path.Match(pattern, file)
	return err == nil && ok
}

// owners returns every owner claiming a file. More than one is a partition error.
func (p *Plan) owners(file string) []Owner {
	var out []Owner
	for i := range p.Zonas {
		for _, r := range p.Zonas[i].Rutas {
			if matchRule(r, file) {
				out = append(out, Owner{Kind: "zona", ID: p.Zonas[i].ID, Rule: r})
				break
			}
		}
	}
	for _, r := range p.Cimientos.Rutas {
		if matchRule(r, file) {
			out = append(out, Owner{Kind: "cimientos", ID: "cimientos", Rule: r})
			break
		}
	}
	return out
}

// trackedFiles lists what git tracks under root.
//
// git ls-files rather than a filesystem walk: it already honours .gitignore, so
// node_modules and build output never reach the partition. An untracked file is
// not part of the product yet, so it needs no owner.
func trackedFiles(root string) ([]string, error) {
	cmd := exec.Command("git", "-C", root, "ls-files")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("no se pudo listar los archivos de %s con git: %w", root, err)
	}
	var files []string
	for _, l := range strings.Split(string(out), "\n") {
		if l = strings.TrimSpace(l); l != "" {
			files = append(files, l)
		}
	}
	return files, nil
}

// VerificarParticion checks the partition against the real tree.
//
// It answers the two questions that decide whether parallel work is safe:
// does any file have two owners, and does any file have none.
func (p *Plan) VerificarParticion(root string) ([]Hallazgo, error) {
	files, err := trackedFiles(root)
	if err != nil {
		return nil, err
	}

	var hallazgos []Hallazgo

	huerfanos := []string{}
	solapes := map[string][]Owner{}
	usadas := map[string]bool{}

	for _, f := range files {
		own := p.owners(f)
		switch {
		case len(own) == 0:
			huerfanos = append(huerfanos, f)
		case len(own) > 1:
			solapes[f] = own
		}
		for _, o := range own {
			usadas[o.Kind+":"+o.ID+":"+o.Rule] = true
		}
	}

	// Overlap first: it is the error that corrupts work, while an orphan only
	// blocks it.
	if len(solapes) > 0 {
		keys := make([]string, 0, len(solapes))
		for k := range solapes {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, f := range keys {
			var quienes []string
			for _, o := range solapes[f] {
				quienes = append(quienes, fmt.Sprintf("%s (por %q)", o.ID, o.Rule))
			}
			hallazgos = append(hallazgos, Hallazgo{
				Severidad: "error",
				Regla:     "zonas disjuntas",
				Detalle:   fmt.Sprintf("%s tiene %d dueños: %s", f, len(solapes[f]), strings.Join(quienes, ", ")),
			})
		}
	}

	if len(huerfanos) > 0 {
		sort.Strings(huerfanos)
		muestra := huerfanos
		resto := 0
		if len(muestra) > 12 {
			resto = len(muestra) - 12
			muestra = muestra[:12]
		}
		detalle := fmt.Sprintf("%d archivo(s) sin dueño: %s", len(huerfanos), strings.Join(muestra, ", "))
		if resto > 0 {
			detalle += fmt.Sprintf(" … y %d más", resto)
		}
		hallazgos = append(hallazgos, Hallazgo{
			Severidad: "error",
			Regla:     "partición exhaustiva",
			Detalle:   detalle,
		})
	}

	// A rule that matches nothing is a rule that describes a tree that no longer
	// exists. It is not fatal today, but it is how a partition rots.
	for i := range p.Zonas {
		for _, r := range p.Zonas[i].Rutas {
			if !usadas["zona:"+p.Zonas[i].ID+":"+r] {
				hallazgos = append(hallazgos, Hallazgo{
					Severidad: "aviso",
					Regla:     "rutas reales",
					Detalle:   fmt.Sprintf("la zona %q declara %q y no le corresponde ningún archivo", p.Zonas[i].ID, r),
				})
			}
		}
	}
	for _, r := range p.Cimientos.Rutas {
		if !usadas["cimientos:cimientos:"+r] {
			hallazgos = append(hallazgos, Hallazgo{
				Severidad: "aviso",
				Regla:     "rutas reales",
				Detalle:   fmt.Sprintf("cimientos declara %q y no le corresponde ningún archivo", r),
			})
		}
	}

	return hallazgos, nil
}

// Cobertura counts how many tracked files each owner holds. It is what makes a
// lopsided partition visible: a Zona holding 80% of the tree is a bottleneck
// waiting to happen, and the fix is to split it.
func (p *Plan) Cobertura(root string) (map[string]int, int, error) {
	files, err := trackedFiles(root)
	if err != nil {
		return nil, 0, err
	}
	out := map[string]int{}
	for _, f := range files {
		for _, o := range p.owners(f) {
			out[o.ID]++
		}
	}
	return out, len(files), nil
}
