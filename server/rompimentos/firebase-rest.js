"use strict";

class FirebaseRest {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl).replace(/\/$/, "");
  }

  url(caminho) {
    const seguro = String(caminho || "")
      .split("/")
      .filter(Boolean)
      .map((parte) => encodeURIComponent(parte))
      .join("/");
    return `${this.baseUrl}/${seguro}.json`;
  }

  async obter(caminho) {
    const resposta = await fetch(this.url(caminho), { signal: AbortSignal.timeout(10_000) });
    if (!resposta.ok) throw new Error("FIREBASE_LEITURA_FALHOU");
    return resposta.json();
  }

  async salvar(caminho, valor) {
    const resposta = await fetch(this.url(caminho), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(valor),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) throw new Error("FIREBASE_ESCRITA_FALHOU");
    return resposta.json();
  }

  async remover(caminho) {
    const resposta = await fetch(this.url(caminho), {
      method: "DELETE",
      signal: AbortSignal.timeout(10_000),
    });
    if (!resposta.ok) throw new Error("FIREBASE_REMOCAO_FALHOU");
  }

  async tentarAdquirirLock(caminho, lock, agora = Date.now()) {
    const url = this.url(caminho);
    const leitura = await fetch(url, {
      headers: { "X-Firebase-ETag": "true" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!leitura.ok) throw new Error("FIREBASE_LOCK_FALHOU");

    const atual = await leitura.json();
    if (atual?.expiraEm && new Date(atual.expiraEm).getTime() > agora) return false;

    const resposta = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "if-match": leitura.headers.get("etag") || "null_etag",
      },
      body: JSON.stringify(lock),
      signal: AbortSignal.timeout(10_000),
    });

    if (resposta.status === 412) return false;
    if (!resposta.ok) throw new Error("FIREBASE_LOCK_FALHOU");
    return true;
  }
}

module.exports = { FirebaseRest };
