"use strict";

const crypto = require("node:crypto");
const { FirebaseRest } = require("../server/rompimentos/firebase-rest");
const { FIREBASE_DATABASE_URL } = require("../server/rompimentos/config");

const DB_FUNCIONARIOS = "administracao/funcionariosPassagens";
const DB_OBRAS = "administracao/obras";
const DB_PASSAGENS = "passagensExtras";
const MENSAGEM_ERRO = "Não foi possível processar as passagens extras. Tente novamente.";

function responder(res, status, corpo) {
  res.setHeader?.("Cache-Control", "no-store");
  return res.status(status).json(corpo);
}

function idValido(valor) {
  return /^[A-Za-z0-9_-]{1,120}$/.test(String(valor || ""));
}

function dataValida(valor) {
  const texto = String(valor || "");
  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(texto)) return false;
  const data = new Date(`${texto}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

function textoSeguro(valor, limite = 180) {
  const texto = String(valor || "").trim().replace(/\s+/g, " ");
  return texto && texto.length <= limite ? texto : "";
}

function textoOpcional(valor, limite = 500) {
  const texto = String(valor || "").trim().replace(/\s+/g, " ");
  return texto.length <= limite ? texto : null;
}

function credencialRequisicao(req) {
  const cabecalho = req.headers?.["x-passagens-credencial"] || req.headers?.["X-Passagens-Credencial"] || "";
  try {
    return Buffer.from(String(cabecalho), "base64").toString("utf8").normalize("NFKC");
  } catch {
    return "";
  }
}

function senhaValida(senha, funcionario) {
  const hash = String(funcionario?.senhaHash || "");
  const salt = String(funcionario?.senhaSalt || "");
  const iteracoes = Number(funcionario?.senhaIteracoes);
  if (!senha || !hash || !salt || !Number.isInteger(iteracoes) || iteracoes < 100000 || iteracoes > 1000000) return false;
  try {
    const esperado = Buffer.from(hash, "base64");
    const calculado = crypto.pbkdf2Sync(senha.normalize("NFKC"), Buffer.from(salt, "base64"), iteracoes, esperado.length, "sha256");
    return esperado.length === 32 && crypto.timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

function nomeCompleto(funcionario) {
  return `${funcionario?.nome || ""} ${funcionario?.sobrenome || ""}`.trim();
}

function rotuloObra(obra) {
  return obra?.referencia ? `${obra.referencia} - ${obra.nome}` : obra?.nome || "";
}

function diaSemana(dataIso) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${dataIso}T12:00:00Z`));
}

function listaPassagens(valor) {
  return Object.entries(valor || {}).map(([id, passagem]) => ({ id, ...passagem }));
}

function listaPeriodo(valor, inicio, fim) {
  return Object.values(valor || {}).flatMap(listaPassagens)
    .filter((passagem) => dataValida(passagem.data) && passagem.data >= inicio && passagem.data <= fim);
}

function validarObra(id, nome, obras, funcionario) {
  const obraId = String(id || "");
  const obraNome = textoSeguro(nome);
  if (!obraId || !obraNome) return null;

  const obra = obras?.[obraId];
  if (obra && rotuloObra(obra) === obraNome) return { id: obraId, nome: obraNome };

  if (obraId === `atual-${funcionario.id}` && textoSeguro(funcionario.obra) === obraNome) {
    return { id: obraId, nome: obraNome };
  }
  return null;
}

async function obterFuncionario(firebase, funcionarioId) {
  const funcionario = await firebase.obter(`${DB_FUNCIONARIOS}/${funcionarioId}`);
  if (!funcionario || funcionario.ativo === false) return null;
  return { id: funcionarioId, ...funcionario };
}

async function processarGet(req, res, firebase, funcionario) {
  const mes = String(req.query?.mes || "");
  const inicio = String(req.query?.inicio || "");
  const fim = String(req.query?.fim || "");
  let passagens;

  if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes)) {
    passagens = listaPassagens(await firebase.obter(`${DB_PASSAGENS}/${funcionario.id}/${mes}`));
  } else if (dataValida(inicio) && dataValida(fim) && inicio <= fim) {
    passagens = listaPeriodo(await firebase.obter(`${DB_PASSAGENS}/${funcionario.id}`), inicio, fim);
  } else {
    return responder(res, 400, { success: false, message: MENSAGEM_ERRO });
  }

  passagens.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
  return responder(res, 200, {
    success: true,
    funcionario: { id: funcionario.id, nome: funcionario.nome, sobrenome: funcionario.sobrenome },
    passagens,
  });
}

async function processarPost(req, res, firebase, funcionario) {
  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const data = String(corpo.data || "");
  if (!dataValida(data)) return responder(res, 400, { success: false, message: MENSAGEM_ERRO });
  const observacoes = textoOpcional(corpo.observacoes);
  if (observacoes === null) return responder(res, 400, { success: false, message: MENSAGEM_ERRO });

  const obras = await firebase.obter(DB_OBRAS);
  const origem = validarObra(corpo.origemObraId, corpo.origemObra, obras, funcionario);
  const destino = validarObra(corpo.destinoObraId, corpo.destinoObra, obras, funcionario);
  if (!origem || !destino || origem.id === destino.id || origem.nome === destino.nome) {
    return responder(res, 400, { success: false, message: MENSAGEM_ERRO });
  }

  const passagem = await firebase.criar(`${DB_PASSAGENS}/${funcionario.id}/${data.slice(0, 7)}`, {
    funcionarioId: funcionario.id,
    funcionarioNome: nomeCompleto(funcionario),
    data,
    diaSemana: diaSemana(data),
    origemObraId: origem.id,
    origemObra: origem.nome,
    destinoObraId: destino.id,
    destinoObra: destino.nome,
    observacoes,
    criadoEm: new Date().toISOString(),
  });
  return responder(res, 201, { success: true, passagem });
}

async function processarPatch(req, res, firebase, funcionario) {
  const corpo = req.body || {};
  const passagemId = String(corpo.passagemId || "");
  const data = String(corpo.data || "");
  if (!idValido(passagemId) || !dataValida(data)) return responder(res, 400, { success: false, message: MENSAGEM_ERRO });

  const caminho = `${DB_PASSAGENS}/${funcionario.id}/${data.slice(0, 7)}/${passagemId}`;
  const atual = await firebase.obter(caminho);
  if (!atual || atual.funcionarioId !== funcionario.id || atual.data !== data) {
    return responder(res, 404, { success: false, message: MENSAGEM_ERRO });
  }

  const obras = await firebase.obter(DB_OBRAS);
  const origem = validarObra(corpo.origemObraId, corpo.origemObra, obras, funcionario)
    || (corpo.origemObraId === atual.origemObraId && corpo.origemObra === atual.origemObra
      ? { id: atual.origemObraId, nome: atual.origemObra } : null);
  const destino = validarObra(corpo.destinoObraId, corpo.destinoObra, obras, funcionario)
    || (corpo.destinoObraId === atual.destinoObraId && corpo.destinoObra === atual.destinoObra
      ? { id: atual.destinoObraId, nome: atual.destinoObra } : null);
  const observacoes = textoOpcional(corpo.observacoes);
  if (!origem || !destino || origem.id === destino.id || origem.nome === destino.nome || observacoes === null) {
    return responder(res, 400, { success: false, message: MENSAGEM_ERRO });
  }

  const passagem = {
    ...atual,
    funcionarioNome: nomeCompleto(funcionario),
    origemObraId: origem.id,
    origemObra: origem.nome,
    destinoObraId: destino.id,
    destinoObra: destino.nome,
    observacoes,
    atualizadoEm: new Date().toISOString(),
  };
  await firebase.salvar(caminho, passagem);
  return responder(res, 200, { success: true, passagem: { id: passagemId, ...passagem } });
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader?.("Allow", "GET, POST, PATCH");
    return responder(res, 405, { success: false, message: MENSAGEM_ERRO });
  }

  let corpo = req.body || {};
  if (["POST", "PATCH"].includes(req.method) && typeof corpo === "string") {
    try {
      corpo = JSON.parse(corpo || "{}");
    } catch {
      return responder(res, 400, { success: false, message: MENSAGEM_ERRO });
    }
    req.body = corpo;
  }
  const funcionarioId = String(req.method === "GET" ? req.query?.funcionarioId : corpo.funcionarioId || "");
  if (!idValido(funcionarioId)) return responder(res, 400, { success: false, message: MENSAGEM_ERRO });

  try {
    const firebase = new FirebaseRest(FIREBASE_DATABASE_URL);
    const funcionario = await obterFuncionario(firebase, funcionarioId);
    if (!funcionario) return responder(res, 404, { success: false, message: MENSAGEM_ERRO });
    if (req.method === "POST" && corpo.acao === "autenticar") {
      return senhaValida(String(corpo.senha || ""), funcionario)
        ? responder(res, 200, { success: true, funcionario: { id: funcionario.id, nome: funcionario.nome, sobrenome: funcionario.sobrenome } })
        : responder(res, 401, { success: false, message: MENSAGEM_ERRO });
    }
    const consultaAdministrativa = req.method === "GET" && dataValida(req.query?.inicio) && dataValida(req.query?.fim);
    if (!consultaAdministrativa && !senhaValida(credencialRequisicao(req), funcionario)) {
      return responder(res, 401, { success: false, message: MENSAGEM_ERRO });
    }
    if (req.method === "GET") return processarGet(req, res, firebase, funcionario);
    if (req.method === "PATCH") return processarPatch(req, res, firebase, funcionario);
    return processarPost(req, res, firebase, funcionario);
  } catch {
    return responder(res, 503, { success: false, message: MENSAGEM_ERRO });
  }
};

module.exports._internals = { dataValida, textoSeguro, textoOpcional, rotuloObra, diaSemana, listaPassagens, listaPeriodo, validarObra, senhaValida };
