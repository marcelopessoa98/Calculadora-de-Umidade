"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
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
      await fs.access(caminho);
      return caminho;
    } catch {}
  }
  return "";
}

function iniciarServidor() {
  const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png" };
  const servidor = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const relativo = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
      const arquivo = path.resolve(RAIZ, relativo);
      if (!arquivo.startsWith(RAIZ)) {
        res.writeHead(403).end();
        return;
      }
      const conteudo = await fs.readFile(arquivo);
      res.writeHead(200, { "content-type": tipos[path.extname(arquivo)] || "application/octet-stream" });
      res.end(conteudo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => servidor.listen(0, "127.0.0.1", () => resolve(servidor)));
}

async function prepararPagina(context) {
  await context.route("**/firebase-*-compat.js", (rota) =>
    rota.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  await context.addInitScript(() => {
    const funcionarios = {
      teste: {
        nome: "Marcelo",
        sobrenome: "Silva",
        obra: "Laboratório Ceará",
        referencias: ["CSP", "VSP"],
        idades: [7, 28],
        ativo: true,
      },
    };
    window.__dbActions = [];
    window.firebase = {
      apps: [],
      initializeApp() { this.apps.push({}); return {}; },
      app() { return {}; },
      database() {
        return {
          ref(caminho = "") {
            return {
              on(evento, sucesso) {
                const valor = caminho === ".info/connected" ? true
                  : caminho === "administracao/funcionariosRompimentos" ? funcionarios
                    : null;
                queueMicrotask(() => sucesso({ val: () => valor }));
              },
              push: async (valor) => { window.__dbActions.push({ tipo: "push", caminho, valor }); return {}; },
              update: async (valor) => { window.__dbActions.push({ tipo: "update", caminho, valor }); return {}; },
              remove: async () => { window.__dbActions.push({ tipo: "remove", caminho }); return {}; },
            };
          },
        };
      },
    };
  });
  await context.route("**/api/rompimentos?**", async (rota) => {
    const url = new URL(rota.request().url());
    const data = url.searchParams.get("data");
    await rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        datasComRompimentos: [data],
        rompimentos: [{ data, referencia: "CSP", idade: 28, cpTexto: "CP 16 a 19" }],
      }),
    });
  });
}

test("fluxos existentes e módulo Rompimentos funcionam sem overflow mobile", async (t) => {
  const executablePath = await primeiroArquivoExistente(CAMINHOS_NAVEGADOR);
  if (!executablePath) return t.skip("Chrome/Edge local não encontrado para teste visual");

  const servidor = await iniciarServidor();
  const porta = servidor.address().port;
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
    await prepararPagina(context);
    const page = await context.newPage();
    const base = `http://127.0.0.1:${porta}`;

    await page.goto(base);
    await assert.doesNotReject(() => page.getByRole("link", { name: /Rompimentos/i }).waitFor());

    await page.goto(`${base}/pages/umidade.html`);
    await page.locator("#pesoUmido").fill("100");
    await page.locator("#pesoSeco").fill("90");
    await page.locator("#btnCalcular").click();
    assert.equal(await page.locator("#valor").textContent(), "10,00%");

    await page.goto(`${base}/pages/conversao.html`);
    await page.locator('[data-unit="kn"]').click();
    await page.locator("#valorCarga").fill("100");
    await page.locator("#btnProcessar").click();
    assert.equal(await page.locator("#resBox").isVisible(), true);

    await page.goto(`${base}/pages/administracao.html`);
    await page.evaluate(() => sessionStorage.setItem("sgi_concrefuji_admin_autorizado", "sim"));
    await page.reload();
    assert.equal(await page.locator("#formFuncionarioRompimento").isVisible(), true);
    await page.getByRole("button", { name: "Editar funcionário" }).click();
    assert.equal(await page.locator("#funcionarioNome").inputValue(), "Marcelo");
    await page.locator("#funcionarioObra").fill("Obra atualizada");
    await page.locator("#btnSalvarFuncionario").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho.endsWith("/teste")));
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Excluir funcionário" }).click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "remove" && acao.caminho.endsWith("/teste")));
    await page.locator("#funcionarioNome").fill("João");
    await page.locator("#funcionarioSobrenome").fill("Souza");
    await page.locator("#funcionarioObra").fill("Laboratório");
    await page.locator('input[name="funcionarioReferencia"][value="CSP"]').check();
    await page.locator('input[name="funcionarioIdade"][value="7"]').check();
    await page.locator("#btnSalvarFuncionario").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "push" && acao.caminho === "administracao/funcionariosRompimentos"));

    for (const largura of [320, 360, 375, 390, 412, 768, 1280]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(`${base}/pages/rompimentos.html`);
      await page.getByRole("button", { name: /Marcelo Silva/i }).click();
      await page.getByText("CP 16 a 19").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `overflow horizontal em ${largura}px: ${overflow}px`);
    }

    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => servidor.close(resolve));
  }
});
