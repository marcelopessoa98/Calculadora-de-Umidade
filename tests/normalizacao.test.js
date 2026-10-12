"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  numeroPrincipalCp,
  intervalosNumericos,
  textoIntervalos,
  agruparRompimentos,
  filtrarPorFuncionario,
} = require("../server/rompimentos/normalizacao");

test("extrai o número principal e preserva a regra de CP composto", () => {
  assert.equal(numeroPrincipalCp("16-5"), 16);
  assert.equal(numeroPrincipalCp("CP 019-6"), 19);
  assert.equal(numeroPrincipalCp("sem número"), null);
});

test("cria somente intervalos realmente contínuos", () => {
  const intervalos = intervalosNumericos([3, 2, 1, 8, 7, 12, 2]);
  assert.deepEqual(intervalos, [[1, 3], [7, 8], [12, 12]]);
  assert.equal(textoIntervalos(intervalos), "1 a 3, 7 a 8 e 12");
});

test("agrupa por data, referência e idade sem misturar grupos", () => {
  const registros = [
    { data: "2026-10-12", referencia: "CSP", cp: "16-5", idade: 28, fckEstimado: "20 MPa" },
    { data: "2026-10-12", referencia: "CSP", cp: "16-6", idade: 28, fckEstimado: "20 MPa" },
    { data: "2026-10-12", referencia: "CSP", cp: "17-5", idade: 28 },
    { data: "2026-10-12", referencia: "CSP", cp: "34-5", idade: 7 },
    { data: "2026-10-13", referencia: "CSP", cp: "18-5", idade: 28 },
    { data: "2026-10-12", referencia: "VSP", cp: "1-5", idade: 28 },
  ];

  const grupos = agruparRompimentos(registros);
  assert.equal(grupos.length, 4);
  assert.equal(grupos[1].cpTexto, "CP 16 a 17");
  assert.deepEqual(grupos[1].cpsBrutos, ["16-5", "16-6", "17-5"]);
  assert.deepEqual(grupos[1].detalhes[0], {
    obra: "CSP",
    cp: "16-5",
    idade: 28,
    fckEstimado: "20 MPa",
  });
});

test("filtra múltiplas referências e idades do funcionário", () => {
  const registros = [
    { referencia: "CSP", idade: 3 },
    { referencia: "CSP", idade: 7 },
    { referencia: "VSP", idade: 28 },
    { referencia: "GSF", idade: 7 },
  ];
  const filtrados = filtrarPorFuncionario(registros, {
    referencias: ["csp", "VSP"],
    idades: [7, 28],
  });
  assert.deepEqual(filtrados, [registros[1], registros[2]]);
});

