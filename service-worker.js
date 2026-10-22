"use strict";

// Primeira versao conservadora: habilita o ciclo de vida do PWA sem cachear
// assets, APIs, autenticacao, Firebase ou qualquer resposta dinamica.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
