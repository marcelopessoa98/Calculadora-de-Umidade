"use strict";

const { randomUUID } = require("node:crypto");
const { obterConfiguracao } = require("./config");
const { FirebaseRest } = require("./firebase-rest");
const { chaveSemana } = require("./datas");
const { coletarRompimentosConcreFuji } = require("./coletor");
const { filtrarPorFuncionario, agruparRompimentos } = require("./normalizacao");

function coletaValida(coleta, agora = Date.now()) {
  return Boolean(
    coleta &&
    coleta.versao === 9 &&
    coleta.status === "concluida" &&
    Array.isArray(coleta.dados) &&
    new Date(coleta.expiraEm).getTime() > agora,
  );
}

async function aguardarColeta(firebase, caminhoColeta, limiteMs = 45_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const coleta = await firebase.obter(caminhoColeta);
    if (coletaValida(coleta)) return coleta;
  }
  throw new Error("COLETA_EM_ANDAMENTO");
}

async function obterColetaGlobal(firebase, configuracao, inicioSemana) {
  const chave = chaveSemana(inicioSemana);
  const caminhoColeta = `rompimentos/coletas/${chave}`;
  const caminhoLock = `rompimentos/locks/${chave}`;
  const existente = await firebase.obter(caminhoColeta);
  if (coletaValida(existente)) return existente;

  const agora = Date.now();
  const lockId = randomUUID();
  const lock = {
    id: lockId,
    iniciadoEm: new Date(agora).toISOString(),
    expiraEm: new Date(agora + configuracao.lockTtlMs).toISOString(),
  };

  const adquirido = await firebase.tentarAdquirirLock(caminhoLock, lock, agora);
  if (!adquirido) return aguardarColeta(firebase, caminhoColeta);

  try {
    const nova = await coletarRompimentosConcreFuji(configuracao, inicioSemana);
    const coleta = {
      versao: 9,
      status: "concluida",
      inicioSemana,
      coletadoEm: nova.coletadoEm,
      expiraEm: new Date(Date.now() + configuracao.cacheTtlMs).toISOString(),
      dados: nova.dados,
    };
    await firebase.salvar(caminhoColeta, coleta);
    return coleta;
  } finally {
    const lockAtual = await firebase.obter(caminhoLock).catch(() => null);
    if (lockAtual?.id === lockId) await firebase.remover(caminhoLock).catch(() => {});
  }
}

async function obterRompimentosFuncionario(funcionarioId, inicioSemana) {
  const configuracao = obterConfiguracao();
  const firebase = new FirebaseRest(configuracao.firebaseDatabaseUrl);
  const funcionario = await firebase.obter(`administracao/funcionariosRompimentos/${funcionarioId}`);

  if (!funcionario || funcionario.ativo === false) throw new Error("FUNCIONARIO_NAO_ENCONTRADO");

  const coleta = await obterColetaGlobal(firebase, configuracao, inicioSemana);
  const filtrados = filtrarPorFuncionario(coleta.dados, funcionario);
  const grupos = agruparRompimentos(filtrados);

  return {
    funcionario: {
      id: funcionarioId,
      nome: funcionario.nome,
      sobrenome: funcionario.sobrenome,
      obra: funcionario.obra,
    },
    inicioSemana,
    coletadoEm: coleta.coletadoEm,
    datasComRompimentos: [...new Set(grupos.map((grupo) => grupo.data))],
    rompimentos: grupos,
  };
}

module.exports = {
  coletaValida,
  aguardarColeta,
  obterColetaGlobal,
  obterRompimentosFuncionario,
};
