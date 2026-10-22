"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");

const RAIZ = path.resolve(__dirname, "..");
const CAMINHOS_NAVEGADOR = [
  process.env.CHROME_EXECUTABLE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

async function primeiroArquivoExistente(caminhos) {
  for (const caminho of caminhos) {
    try {
      await fsPromises.access(caminho);
      return caminho;
    } catch {}
  }
  return "";
}

function iniciarServidor() {
  const tipos = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
  };
  const servidor = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const relativo = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const arquivo = path.resolve(RAIZ, relativo);
      if (!arquivo.startsWith(RAIZ)) return res.writeHead(403).end();
      const conteudo = await fsPromises.readFile(arquivo);
      res.writeHead(200, { "content-type": tipos[path.extname(arquivo)] || "application/octet-stream" });
      res.end(conteudo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) =>
    servidor.listen(0, "127.0.0.1", () => resolve(servidor)),
  );
}

test("manifesto PWA referencia icones existentes e mantem escopo na raiz", () => {
  const manifesto = JSON.parse(
    fs.readFileSync(path.join(RAIZ, "manifest.webmanifest"), "utf8"),
  );

  assert.equal(manifesto.name, "SGI ConcreFuji");
  assert.equal(manifesto.short_name, "SGI ConcreFuji");
  assert.equal(manifesto.start_url, "/");
  assert.equal(manifesto.scope, "/");
  assert.equal(manifesto.display, "standalone");
  assert.ok(manifesto.icons.some((icone) => icone.sizes === "192x192"));
  assert.ok(manifesto.icons.some((icone) => icone.sizes === "512x512"));
  assert.ok(manifesto.icons.some((icone) => icone.purpose === "maskable"));

  for (const icone of manifesto.icons) {
    assert.equal(
      fs.existsSync(path.join(RAIZ, icone.src.replace(/^\//, ""))),
      true,
      `icone ausente: ${icone.src}`,
    );
  }
});

test("service worker conservador nao intercepta nem armazena requisicoes", () => {
  const fonte = fs.readFileSync(path.join(RAIZ, "service-worker.js"), "utf8");

  assert.doesNotMatch(fonte, /addEventListener\(["']fetch["']/);
  assert.doesNotMatch(fonte, /caches\./);
  assert.doesNotMatch(fonte, /CacheStorage/);
});

test("todas as paginas registram os metadados do PWA", () => {
  const paginas = [
    "index.html",
    ...fs.readdirSync(path.join(RAIZ, "pages"))
      .filter((arquivo) => arquivo.endsWith(".html"))
      .map((arquivo) => path.join("pages", arquivo)),
  ];

  for (const pagina of paginas) {
    const fonte = fs.readFileSync(path.join(RAIZ, pagina), "utf8");
    assert.match(fonte, /rel="manifest" href="\/manifest\.webmanifest"/);
    assert.match(fonte, /name="theme-color" content="#c8101e"/);
    assert.match(fonte, /rel="apple-touch-icon"/);
    assert.match(fonte, /src="\/js\/pwa\.js"/);
  }
});

test("navegador carrega o manifesto e registra o service worker", async (t) => {
  const executablePath = await primeiroArquivoExistente(CAMINHOS_NAVEGADOR);
  if (!executablePath) return t.skip("Chrome/Edge local nao encontrado");

  const servidor = await iniciarServidor();
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.route(/^https:\/\//, (rota) => rota.abort());
    await page.goto(`http://127.0.0.1:${servidor.address().port}/`);
    const registro = await page.evaluate(async () => {
      const ativo = await navigator.serviceWorker.ready;
      return {
        scope: ativo.scope,
        scriptURL: ativo.active?.scriptURL || "",
      };
    });
    assert.equal(new URL(registro.scope).pathname, "/");
    assert.equal(new URL(registro.scriptURL).pathname, "/service-worker.js");

    const sessao = await page.context().newCDPSession(page);
    const manifesto = await sessao.send("Page.getAppManifest");
    assert.deepEqual(manifesto.errors, []);
    assert.match(manifesto.data, /"name"\s*:\s*"SGI ConcreFuji"/);
  } finally {
    await browser.close();
    await new Promise((resolve) => servidor.close(resolve));
  }
});
