"use strict";

const { inicioSemanaIso } = require("../server/rompimentos/datas");
const { obterRompimentosFuncionario } = require("../server/rompimentos/servico");

const MENSAGEM_ERRO = "Não foi possível carregar os rompimentos. Tente novamente.";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: MENSAGEM_ERRO });
  }

  const funcionarioId = String(req.query?.funcionarioId || "");
  const inicioSemana = inicioSemanaIso(String(req.query?.data || ""));

  if (!/^[A-Za-z0-9_-]{1,120}$/.test(funcionarioId) || !inicioSemana) {
    return res.status(400).json({ success: false, message: MENSAGEM_ERRO });
  }

  try {
    const resultado = await obterRompimentosFuncionario(funcionarioId, inicioSemana);
    return res.status(200).json({ success: true, ...resultado });
  } catch (erro) {
    console.error("Falha durante coleta do relatório.", { codigo: erro?.message || "ERRO_DESCONHECIDO" });
    return res.status(503).json({ success: false, message: MENSAGEM_ERRO });
  }
};
