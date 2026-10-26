"use strict";

const { randomUUID } = require("node:crypto");
const { obterConfiguracao } = require("./config");
const { FirebaseRest } = require("./firebase-rest");
const { chaveSemana, datasDaSemana } = require("./datas");
const { coletarRompimentosConcreFuji } = require("./coletor");
const { filtrarPorFuncionario, agruparRompimentos } = require("./normalizacao");

function coletaValida(coleta, agora = Date.now()) {
  return Boolean(
    coletaUtilizavel(coleta) &&
    new Date(coleta.expiraEm).getTime() > agora,
  );
}

function coletaUtilizavel(coleta) {
  return Boolean(coleta && coleta.versao === 9 && coleta.status === "concluida" && Array.isArray(coleta.dados));
}

function hojeSaoPauloIso(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

function ttlColeta(configuracao, inicioSemana, agora = new Date()) {
  const fimSemana = datasDaSemana(inicioSemana).at(-1);
  return fimSemana < hojeSaoPauloIso(agora)
    ? configuracao.cacheHistoricoTtlMs
    : configuracao.cacheTtlMs;
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

async function obterColetaGlobal(
  firebase,
  configuracao,
  inicioSemana,
  coletar = coletarRompimentosConcreFuji,
) {
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
  if (!adquirido) {
    // Enquanto outra função atualiza a semana, uma coleta expirada ainda é
    // preferível a bloquear todos os usuários por até 45 segundos.
    if (coletaUtilizavel(existente)) return existente;
    return aguardarColeta(firebase, caminhoColeta);
  }

  try {
    let nova;
    try {
      nova = await coletar(configuracao, inicioSemana);
    } catch (erro) {
      // Uma indisponibilidade temporária no sistema externo não deve derrubar
      // a consulta quando já existe uma coleta anterior consistente.
      if (coletaUtilizavel(existente)) return existente;
      throw erro;
    }
    const coleta = {
      versao: 9,
      status: "concluida",
      inicioSemana,
      coletadoEm: nova.coletadoEm,
      expiraEm: new Date(Date.now() + ttlColeta(configuracao, inicioSemana)).toISOString(),
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
  coletaUtilizavel,
  hojeSaoPauloIso,
  ttlColeta,
  aguardarColeta,
  obterColetaGlobal,
  obterRompimentosFuncionario,
};
