"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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
    "2026-10": { b: { data: "2026-10-01", observacoes: "Visita adicional" }, c: { data: "2026-10-20" } },
  };
  const resultado = _internals.listaPeriodo(valor, "2026-10-01", "2026-10-10");
  assert.deepEqual(resultado.map((item) => item.id), ["b"]);
  assert.equal(resultado[0].observacoes, "Visita adicional");
});

test("valida a senha derivada sem armazenar o texto original", () => {
  const salt = Buffer.from("0123456789abcdef");
  const funcionario = {
    senhaSalt: salt.toString("base64"),
    senhaHash: crypto.pbkdf2Sync("1234", salt, 120000, 32, "sha256").toString("base64"),
    senhaIteracoes: 120000,
  };
  assert.equal(_internals.senhaValida("1234", funcionario), true);
  assert.equal(_internals.senhaValida("9999", funcionario), false);
  assert.equal(_internals.senhaValida("1234", {}), false);
});

test("aceita observações vazias e limita o tamanho", () => {
  assert.equal(_internals.textoOpcional(""), "");
  assert.equal(_internals.textoOpcional("  visita   adicional  "), "visita adicional");
  assert.equal(_internals.textoOpcional("x".repeat(501)), null);
});

test("aceita somente a credencial administrativa para exclusão", () => {
  const requisicao = (senha) => ({
    headers: { "x-admin-credencial": Buffer.from(senha).toString("base64") },
  });
  assert.equal(_internals.credencialAdministrativaValida(requisicao("Fujita010474")), true);
  assert.equal(_internals.credencialAdministrativaValida(requisicao("senha-incorreta")), false);
  assert.equal(_internals.credencialAdministrativaValida({ headers: {} }), false);
});
