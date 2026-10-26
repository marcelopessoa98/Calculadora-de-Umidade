"use strict";

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

function obterCredencial() {
  const valor = String(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!valor) throw new Error("FIREBASE_CREDENCIAL_AUSENTE");

  try {
    const credencial = JSON.parse(valor);
    if (
      credencial.project_id !== "sgi-concrefuji" ||
      !credencial.client_email ||
      !credencial.private_key
    ) {
      throw new Error("invalida");
    }
    return credencial;
  } catch {
    throw new Error("FIREBASE_CREDENCIAL_INVALIDA");
  }
}

function obterDatabase(baseUrl) {
  const app = getApps()[0] || initializeApp({
    credential: cert(obterCredencial()),
    databaseURL: baseUrl,
  });
  return getDatabase(app);
}

function codigoErro(prefixo, erro) {
  const detalhe = String(erro?.code || "ERRO_DESCONHECIDO")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .slice(0, 80);
  return new Error(`${prefixo}_${detalhe}`);
}

class FirebaseRest {
  constructor(baseUrl) {
    this.database = obterDatabase(baseUrl);
  }

  referencia(caminho) {
    return this.database.ref(String(caminho || "").replace(/^\/+|\/+$/g, ""));
  }

  async obter(caminho) {
    try {
      const snapshot = await this.referencia(caminho).get();
      return snapshot.val();
    } catch (erro) {
      throw codigoErro("FIREBASE_LEITURA_FALHOU", erro);
    }
  }

  async salvar(caminho, valor) {
    try {
      await this.referencia(caminho).set(valor);
      return valor;
    } catch (erro) {
      throw codigoErro("FIREBASE_ESCRITA_FALHOU", erro);
    }
  }

  async criar(caminho, valor) {
    try {
      const referencia = this.referencia(caminho).push();
      await referencia.set(valor);
      return { id: referencia.key, ...valor };
    } catch (erro) {
      throw codigoErro("FIREBASE_ESCRITA_FALHOU", erro);
    }
  }

  async remover(caminho) {
    try {
      await this.referencia(caminho).remove();
    } catch (erro) {
      throw codigoErro("FIREBASE_REMOCAO_FALHOU", erro);
    }
  }

  async tentarAdquirirLock(caminho, lock, agora = Date.now()) {
    try {
      const resultado = await this.referencia(caminho).transaction((atual) => {
        if (atual?.expiraEm && new Date(atual.expiraEm).getTime() > agora) return;
        return lock;
      }, undefined, false);
      return resultado.committed;
    } catch (erro) {
      throw codigoErro("FIREBASE_LOCK_FALHOU", erro);
    }
  }
}

module.exports = { FirebaseRest, obterCredencial };
