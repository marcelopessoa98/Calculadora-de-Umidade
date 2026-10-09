"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const handler = require("../api/rompimentos");
const { TEXTO_PENDENTES_CE } = require("../server/rompimentos/coletor");

function respostaMock() {
  return {
    statusCode: 200,
    headers: {},
    corpo: null,
    setHeader(nome, valor) { this.headers[nome] = valor; },
    status(codigo) { this.statusCode = codigo; return this; },
    json(corpo) { this.corpo = corpo; return this; },
  };
}

test("coletor aceita somente o rótulo Pendentes (CE)", () => {
  assert.equal(TEXTO_PENDENTES_CE.test("398 Pendentes (CE)"), true);
  assert.equal(TEXTO_PENDENTES_CE.test("120 Pendentes (MA)"), false);
  assert.equal(TEXTO_PENDENTES_CE.test("500 Lançados"), false);
});

test("carrega o Chromium ESM sem require no runtime da Vercel", () => {
  const caminho = path.resolve(__dirname, "../server/rompimentos/coletor.js");
  const fonte = fs.readFileSync(caminho, "utf8");
  assert.doesNotMatch(fonte, /require\(["']@sparticuz\/chromium["']\)/);
  assert.match(fonte, /import\(["']@sparticuz\/chromium["']\)/);
});

test("API rejeita entrada inválida sem revelar detalhes técnicos", async () => {
  const res = respostaMock();
  await handler({ method: "GET", query: { funcionarioId: "../segredo", data: "inválida" } }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.corpo, {
    success: false,
    message: "Não foi possível carregar os rompimentos. Tente novamente.",
  });
  assert.equal(res.headers["Cache-Control"], "no-store");
});
