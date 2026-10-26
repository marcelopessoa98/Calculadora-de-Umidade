"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { _internals } = require("../api/passagens-extras");

test("valida datas reais e calcula o dia da semana no servidor", () => {
  assert.equal(_internals.dataValida("2026-10-23"), true);
  assert.equal(_internals.dataValida("2026-02-30"), false);
  assert.equal(_internals.diaSemana("2026-10-23"), "sexta-feira");
});

test("aceita somente obras cadastradas ou a obra atual do funcionário", () => {
  const obras = { obra1: { referencia: "VSP", nome: "Residencial Vila do Sol" } };
  const funcionario = { id: "func1", obra: "Fortaleza - CE" };
  assert.deepEqual(
    _internals.validarObra("obra1", "VSP - Residencial Vila do Sol", obras, funcionario),
    { id: "obra1", nome: "VSP - Residencial Vila do Sol" },
  );
  assert.deepEqual(
    _internals.validarObra("atual-func1", "Fortaleza - CE", obras, funcionario),
    { id: "atual-func1", nome: "Fortaleza - CE" },
  );
  assert.equal(_internals.validarObra("obra1", "Obra adulterada", obras, funcionario), null);
});

test("filtra o histórico de passagens pelo período solicitado", () => {
  const valor = {
    "2026-09": { a: { data: "2026-09-30" } },
    "2026-10": { b: { data: "2026-10-01" }, c: { data: "2026-10-20" } },
  };
  assert.deepEqual(
    _internals.listaPeriodo(valor, "2026-10-01", "2026-10-10").map((item) => item.id),
    ["b"],
  );
});
