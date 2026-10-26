"use strict";

const FIREBASE_DATABASE_URL = "https://sgi-concrefuji-default-rtdb.firebaseio.com";

function obterConfiguracao() {
  const username = String(process.env.CONCREFUJI_USERNAME || "").trim();
  const password = String(process.env.CONCREFUJI_PASSWORD || "");
  const baseUrl = validarBaseUrl(process.env.CONCREFUJI_BASE_URL);

  if (!username || !password || !baseUrl) {
    throw new Error("CONFIGURACAO_COLETOR_INCOMPLETA");
  }

  return {
    username,
    password,
    baseUrl,
    firebaseDatabaseUrl: FIREBASE_DATABASE_URL,
    cacheTtlMs: 60 * 60 * 1000,
    cacheHistoricoTtlMs: 6 * 60 * 60 * 1000,
    lockTtlMs: 2 * 60 * 1000,
  };
}

function validarBaseUrl(valor) {
  if (!valor) return "";

  try {
    const url = new URL(String(valor).trim());
    if (url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

module.exports = {
  FIREBASE_DATABASE_URL,
  obterConfiguracao,
  validarBaseUrl,
};

