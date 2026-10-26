"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ttlColeta,
  coletaUtilizavel,
  obterColetaGlobal,
} = require("../server/rompimentos/servico");

test("mantém cache histórico por mais tempo que a semana atual", () => {
  const configuracao = { cacheTtlMs: 1_000, cacheHistoricoTtlMs: 6_000 };
  const agora = new Date("2026-10-23T15:00:00Z");
  assert.equal(ttlColeta(configuracao, "2026-10-12", agora), 6_000);
  assert.equal(ttlColeta(configuracao, "2026-10-19", agora), 1_000);
  assert.equal(coletaUtilizavel({ versao: 9, status: "concluida", dados: [] }), true);
});

test("usa a coleta anterior se a atualização externa falhar", async () => {
  const anterior = {
    versao: 9,
    status: "concluida",
    expiraEm: "2026-10-01T00:00:00.000Z",
    coletadoEm: "2026-10-01T00:00:00.000Z",
    dados: [{ obra: "ABC" }],
  };
  let lock = null;
  let lockRemovido = false;
  const firebase = {
    obter: async (caminho) => caminho.includes("/locks/") ? lock : anterior,
    tentarAdquirirLock: async (_caminho, novoLock) => {
      lock = novoLock;
      return true;
    },
    remover: async () => { lockRemovido = true; },
  };
  const configuracao = { cacheTtlMs: 1_000, cacheHistoricoTtlMs: 6_000, lockTtlMs: 1_000 };
  const coletarComFalha = async () => { throw new Error("INDISPONIVEL"); };

  const resultado = await obterColetaGlobal(firebase, configuracao, "2026-10-19", coletarComFalha);

  assert.equal(resultado, anterior);
  assert.equal(lockRemovido, true);
});
