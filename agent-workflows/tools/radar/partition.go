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
	Ruta int    // declaration position, for metadata and duplicate rules
}

func claveRuta(kind, id string, ruta int) string {
	return fmt.Sprintf("%s:%s:%d", kind, id, ruta)
}

func claveOwner(o Owner) string {
	return claveRuta(o.Kind, o.ID, o.Ruta)
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
// An exact Cimiento may carve one file out of one broad Zona route. It does not
// hide a real overlap between Zonas, nor an explicit exact-path contradiction.
func (p *Plan) owners(file string) []Owner {
	var zonas []Owner
	for i := range p.Zonas {
		for ruta, r := range p.Zonas[i].Rutas {
			if matchRule(r, file) {
				zonas = append(zonas, Owner{Kind: "zona", ID: p.Zonas[i].ID, Rule: r, Ruta: ruta})
				break
			}
		}
	}

	var cimiento *Owner
	for ruta, r := range p.Cimientos.Rutas {
		if !matchRule(r, file) {
			continue
		}
		o := Owner{Kind: "cimientos", ID: "cimientos", Rule: r, Ruta: ruta}
		cimiento = &o
		if r == file {
			break // an exact declaration wins over any broader Cimiento rule
		}
	}
	if cimiento == nil {
		return zonas
	}
	if len(zonas) == 0 {
		return []Owner{*cimiento}
	}
	if len(zonas) == 1 && cimiento.Rule == file && esRutaAmplia(zonas[0].Rule) {
		return []Owner{*cimiento}
	}
	if len(zonas) > 1 {
		return zonas
	}
	return append(zonas, *cimiento)
}

func esRutaAmplia(rule string) bool {
	return strings.HasSuffix(rule, "/") || strings.HasSuffix(rule, "/**") || strings.ContainsAny(rule, "*?[")
}

// trackedFiles lists the files in one immutable HEAD tree under root.
//
// git ls-tree rather than a filesystem walk or mutable index snapshot keeps a
// complete check/render transaction on one object identity. Untracked files are
// not part of the product yet, so they need no owner.
func trackedFiles(root string) ([]string, error) {
	head, err := gitHEAD(root)
	if err != nil {
		return nil, err
	}
	return trackedFilesAt(root, head)
}

func trackedFilesAt(root, head string) ([]string, error) {
	if _, err := gitOID(root, head); err != nil {
		return nil, fmt.Errorf("HEAD de partición inválido: %w", err)
	}
	cmd := exec.Command("git", "-C", root, "ls-tree", "-r", "--name-only", "--full-tree", head)
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
	head, err := gitHEAD(root)
	if err != nil {
		return nil, err
	}
	return p.VerificarParticionAt(root, head)
}

func (p *Plan) VerificarParticionAt(root, head string) ([]Hallazgo, error) {
	files, err := trackedFilesAt(root, head)
	if err != nil {
		return nil, err
	}

	var hallazgos []Hallazgo

	huerfanos := []string{}
	solapes := map[string][]Owner{}
	usadas := map[string]bool{}
	coincideConHEAD := map[string]bool{}
	for _, s := range p.Sesiones {
		if s.Entrega != nil || s.Archivada || s.Zona == "" || s.Zona == "cimientos" {
			continue
		}
		for _, m := range s.Modulos {
			for _, ruta := range m.Rutas {
				normalizada, err := exactRepoFile(root, ruta)
				if err != nil {
					continue
				}
				for _, z := range p.Zonas {
					if z.ID != s.Zona {
						continue
					}
					for ruta, regla := range z.Rutas {
						if !esRutaAmplia(regla) && regla == normalizada {
							usadas[claveRuta("zona", z.ID, ruta)] = true
						}
					}
				}
			}
		}
	}

	for _, f := range files {
		for _, z := range p.Zonas {
			for ruta, regla := range z.Rutas {
				if matchRule(regla, f) {
					coincideConHEAD[claveRuta("zona", z.ID, ruta)] = true
				}
			}
		}
		for ruta, regla := range p.Cimientos.Rutas {
			if matchRule(regla, f) {
				coincideConHEAD[claveRuta("cimientos", "cimientos", ruta)] = true
			}
		}
		own := p.owners(f)
		switch {
		case len(own) == 0:
			huerfanos = append(huerfanos, f)
		case len(own) > 1:
			solapes[f] = own
		}
		for _, o := range own {
			usadas[claveOwner(o)] = true
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
		for ruta, r := range p.Zonas[i].Rutas {
			key := claveRuta("zona", p.Zonas[i].ID, ruta)
			if ausencia := p.Zonas[i].ausenciaIntencional(ruta); ausencia != "" && coincideConHEAD[key] {
				hallazgos = append(hallazgos, Hallazgo{
					Severidad: "error",
					Regla:     "ausencia intencional",
					Detalle:   fmt.Sprintf("la zona %q clasifica %q como %q, pero coincide con un archivo trackeado en HEAD", p.Zonas[i].ID, r, ausencia),
				})
			} else if ausencia == "" && !usadas[key] {
				hallazgos = append(hallazgos, Hallazgo{
					Severidad: "aviso",
					Regla:     "rutas reales",
					Detalle:   fmt.Sprintf("la zona %q declara %q y no le corresponde ningún archivo", p.Zonas[i].ID, r),
				})
			}
		}
	}
	for ruta, r := range p.Cimientos.Rutas {
		key := claveRuta("cimientos", "cimientos", ruta)
		if ausencia := p.Cimientos.ausenciaIntencional(ruta); ausencia != "" && coincideConHEAD[key] {
			hallazgos = append(hallazgos, Hallazgo{
				Severidad: "error",
				Regla:     "ausencia intencional",
				Detalle:   fmt.Sprintf("cimientos clasifica %q como %q, pero coincide con un archivo trackeado en HEAD", r, ausencia),
			})
		} else if ausencia == "" && !usadas[key] {
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
	head, err := gitHEAD(root)
	if err != nil {
		return nil, 0, err
	}
	return p.CoberturaAt(root, head)
}

func (p *Plan) CoberturaAt(root, head string) (map[string]int, int, error) {
	files, err := trackedFilesAt(root, head)
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
