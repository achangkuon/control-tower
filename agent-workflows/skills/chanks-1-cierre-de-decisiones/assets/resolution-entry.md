# Delta de resolución

Usá este shape para enviar una resolución a Support:

```yaml
operacion: replace
sesion: <ID exacto>
campo: decisiones[<indice>]
valor_anterior:
  tipo: escala
  pregunta: <pregunta exacta>
  evidencia: <fuente original>
valor_nuevo:
  tipo: resuelta
  resolucion: <hecho decidido>
  autoridad: <maintainer y fecha>
  descartadas:
    - opcion: <alternativa>
      razon: <por qué perdió>
  falsificador: <observación que demostraría incumplimiento>
  clase: <clase original>
  contaminaba: [<IDs exactos>]
```

Reglas:

- Conservá la pregunta y evidencia originales dentro del historial que admita el esquema.
- Nombrá alternativas descartadas y razones concretas.
- Usá IDs exactos en `contaminaba`; no prosa.
- No agregues estado ni porcentaje al delta.
- Si `valor_anterior` no coincide, el delta está stale y no debe aplicarse.
