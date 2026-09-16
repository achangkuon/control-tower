package main

import "testing"

func TestResolverRutaConRaiz(t *testing.T) {
	for _, prueba := range []struct {
		nombre, ruta, raiz, quiere string
	}{
		{"relative -f under -C", "openspec/plan.yaml", "/repo", "/repo/openspec/plan.yaml"},
		{"relative -o under -C", "openspec/ROADMAP.md", "/repo", "/repo/openspec/ROADMAP.md"},
		{"absolute path is preserved", "/otro/plan.yaml", "/repo", "/otro/plan.yaml"},
		{"no -C preserves relative path", "openspec/plan.yaml", "", "openspec/plan.yaml"},
	} {
		t.Run(prueba.nombre, func(t *testing.T) {
			if got := resolverRutaConRaiz(prueba.ruta, prueba.raiz); got != prueba.quiere {
				t.Fatalf("resolverRutaConRaiz(%q, %q) = %q, quiere %q", prueba.ruta, prueba.raiz, got, prueba.quiere)
			}
		})
	}
}
