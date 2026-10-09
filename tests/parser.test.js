"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseTabela } = require("../server/rompimentos/parser");

test("interpreta tabela por cabeçalhos, não por posições fixas", () => {
  const resultado = parseTabela({
    cabecalhos: ["CP", "FCK Estimado", "Referência", "Idade", "Data"],
    linhas: [["16-5", "25 MPa", "CSP", "28 dias", "12/10/2026"]],
    dataPadrao: "",
    coletadoEm: "2026-10-09T12:00:00.000Z",
  });

  assert.deepEqual(resultado[0], {
    data: "2026-10-12",
    referencia: "CSP",
    cp: "16-5",
    idade: 28,
    fckEstimado: "25 MPa",
    coletadoEm: "2026-10-09T12:00:00.000Z",
  });
});

test("usa a data do calendário quando a tabela não possui coluna Data", () => {
  const [resultado] = parseTabela({
    cabecalhos: ["Referência", "CP", "Idade"],
    linhas: [["VSP", "1-6", "7"]],
    dataPadrao: "2026-10-13",
    coletadoEm: "agora",
  });
  assert.equal(resultado.data, "2026-10-13");
});
