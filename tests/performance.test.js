"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ttlColeta, coletaUtilizavel } = require("../server/rompimentos/servico");

test("mantém cache histórico por mais tempo que a semana atual", () => {
  const configuracao = { cacheTtlMs: 1_000, cacheHistoricoTtlMs: 6_000 };
  const agora = new Date("2026-10-23T15:00:00Z");
  assert.equal(ttlColeta(configuracao, "2026-10-12", agora), 6_000);
  assert.equal(ttlColeta(configuracao, "2026-10-19", agora), 1_000);
  assert.equal(coletaUtilizavel({ versao: 9, status: "concluida", dados: [] }), true);
});
