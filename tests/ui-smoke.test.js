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
  const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
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
    const clientes = Object.fromEntries(Array.from({ length: 12 }, (_, indice) => [
      `cliente-${indice + 1}`,
      { nome: `Cliente ${String(indice + 1).padStart(2, "0")}` },
    ]));
    const obras = Object.fromEntries(Array.from({ length: 12 }, (_, indice) => [
      `obra-${indice + 1}`,
      {
        clienteId: `cliente-${indice + 1}`,
        nome: `Obra ${String(indice + 1).padStart(2, "0")}`,
        referencia: `REF-${indice + 1}`,
        endereco: `Rua ${indice + 1}`,
        contato: "",
        observacoes: "",
      },
    ]));
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
    const funcionariosPassagens = {
      "passagem-teste": {
        nome: "Paulo",
        sobrenome: "Santos",
        obra: "Obra 01",
        ativo: true,
        senhaSalt: "MDEyMzQ1Njc4OWFiY2RlZg==",
        senhaHash: "L8QSevOYNxMtwOm6aDXwOmAY/xLaZT5j8YfTlPnclG0=",
        senhaIteracoes: 120000,
      },
    };
    const hoje = new Date();
    const dataPassagem = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const mesPassagem = dataPassagem.slice(0, 7);
    const passagens = {
      [mesPassagem]: {
        passagem1: {
          funcionarioId: "passagem-teste",
          funcionarioNome: "Paulo Santos",
          data: dataPassagem,
          diaSemana: "segunda-feira",
          origemObraId: "obra-1",
          origemObra: "REF-1 - Obra 01",
          destinoObraId: "obra-2",
          destinoObra: "REF-2 - Obra 02",
          criadoEm: new Date().toISOString(),
        },
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
                  : caminho === "administracao/clientes" ? clientes
                    : caminho === "administracao/obras" ? obras
                      : caminho === "administracao/funcionariosRompimentos" ? funcionarios
                        : caminho === "administracao/funcionariosPassagens" ? funcionariosPassagens
                          : caminho === "passagensExtras/passagem-teste" ? passagens
                            : caminho.startsWith("passagensExtras/passagem-teste/") ? passagens[caminho.split("/").at(-1)]
                        : null;
                queueMicrotask(() => sucesso({ val: () => valor }));
              },
              off() {},
              once: async () => {
                const valor = caminho === "passagensExtras/passagem-teste" ? passagens : null;
                return { val: () => valor };
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
  let falharPrimeiraConsultaRompimentos = true;
  await context.route("**/api/rompimentos?**", async (rota) => {
    if (falharPrimeiraConsultaRompimentos) {
      falharPrimeiraConsultaRompimentos = false;
      await rota.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false }),
      });
      return;
    }
    const url = new URL(rota.request().url());
    const data = url.searchParams.get("data");
    await rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        datasComRompimentos: [data],
        rompimentos: [{
          data,
          referencia: "CSP",
          idade: 28,
          cpTexto: "CP 16 a 19",
          detalhes: [{ obra: "CSP", cp: "398-5", idade: 28, fckEstimado: "Usi Beton - 20 MPa" }],
        }],
      }),
    });
  });
  await context.route("**/api/passagens-extras*", async (rota) => {
    const requisicao = rota.request();
    if (requisicao.method() === "POST") {
      const passagem = requisicao.postDataJSON();
      if (passagem.acao === "autenticar") {
        await rota.fulfill({
          status: passagem.senha === "1234" ? 200 : 401,
          contentType: "application/json",
          body: JSON.stringify({ success: passagem.senha === "1234" }),
        });
        return;
      }
      await rota.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, passagem: { id: "nova-passagem", ...passagem } }),
      });
      return;
    }
    if (requisicao.method() === "PATCH") {
      const passagem = requisicao.postDataJSON();
      await rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, passagem }) });
      return;
    }
    const hoje = new Date();
    const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    await rota.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        passagens: [{
          id: "passagem1",
          funcionarioId: "passagem-teste",
          funcionarioNome: "Paulo Santos",
          data,
          diaSemana: "segunda-feira",
          origemObraId: "obra-1",
          origemObra: "REF-1 - Obra 01",
          destinoObraId: "obra-2",
          destinoObra: "REF-2 - Obra 02",
          criadoEm: new Date().toISOString(),
        }],
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
    const errosPagina = [];
    const requisicoesRompimentos = [];
    page.on("pageerror", (erro) => errosPagina.push(erro.message));
    page.on("request", (requisicao) => {
      if (requisicao.url().includes("/api/rompimentos?")) requisicoesRompimentos.push(requisicao.url());
    });
    const base = `http://127.0.0.1:${porta}`;

    await page.goto(base);
    await assert.doesNotReject(() => page.getByRole("link", { name: /Rompimentos/i }).waitFor());
    await assert.doesNotReject(() => page.getByRole("link", { name: /Passagens Extras/i }).waitFor());
    await page.getByRole("link", { name: /Ensaios/i }).first().click();
    await assert.doesNotReject(() => page.getByRole("link", { name: /Umidade de Areia/i }).waitFor());
    await assert.doesNotReject(() => page.getByRole("link", { name: /Conversor Técnico/i }).waitFor());

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

    await page.goto(`${base}/pages/enderecos-obras.html`);
    await assert.doesNotReject(() => page.locator("#buscaObra").waitFor());

    await page.goto(`${base}/pages/administracao.html`);
    assert.equal(await page.locator("#accessModal").isVisible(), true);
    await page.evaluate(() => sessionStorage.setItem("sgi_concrefuji_admin_autorizado", "sim"));
    await page.reload();
    await page.getByRole("button", { name: /Clientes cadastrados/i }).click();
    assert.equal(await page.locator("#clientesLista > *").count(), 10);
    await page.locator("#buscaClientes").fill("Cliente 12");
    assert.equal(await page.locator("#clientesLista > *").count(), 1);
    assert.match(await page.locator("#paginacaoClientes").textContent(), /Página 1 de 1/);

    await page.locator("#buscaClientes").fill("");
    await page.getByRole("button", { name: "Editar cliente" }).first().click();
    await page.locator("#clienteNome").fill("Cliente atualizado");
    await page.locator("#btnSalvarCliente").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho === "administracao/clientes/cliente-1"));
    await page.locator("#btnNovoCliente").click();
    await page.locator("#clienteNome").fill("Novo cliente");
    await page.locator("#btnSalvarCliente").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "push" && acao.caminho === "administracao/clientes"));
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Excluir cliente" }).first().click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho === ""));

    await page.locator('[data-admin-view="obras"]:visible').first().click();
    assert.equal(await page.locator("#obrasLista > *").count(), 10);
    await page.getByRole("button", { name: "Editar obra" }).first().click();
    await page.locator("#obraNome").fill("Obra atualizada");
    await page.locator("#btnSalvarObra").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho.startsWith("administracao/obras/")));
    await page.locator("#btnNovaObra").click();
    await page.locator("#obraCliente").selectOption("cliente-1");
    await page.locator("#obraNome").fill("Nova obra");
    await page.locator("#obraReferencia").fill("NOVA-REF");
    await page.locator("#obraEndereco").fill("Rua Nova, 100");
    await page.locator("#btnSalvarObra").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "push" && acao.caminho === "administracao/obras"));
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Excluir obra" }).first().click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "remove" && acao.caminho.startsWith("administracao/obras/")));

    await page.locator('[data-admin-view="funcionarios"]:visible').first().click();
    await page.getByRole("button", { name: "Editar funcionário" }).click();
    assert.equal(await page.locator("#formFuncionarioRompimento").isVisible(), true);
    assert.equal(await page.locator("#funcionarioNome").inputValue(), "Marcelo");
    await page.locator("#funcionarioObra").fill("Obra atualizada");
    await page.locator("#btnSalvarFuncionario").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho.endsWith("/teste")));
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Excluir funcionário" }).click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "remove" && acao.caminho.endsWith("/teste")));
    await page.locator("#btnNovoFuncionario").click();
    assert.equal(await page.locator('input[name="funcionarioIdade"][value="1"]').isVisible(), true);
    await page.locator("#funcionarioNome").fill("João");
    await page.locator("#funcionarioSobrenome").fill("Souza");
    await page.locator("#funcionarioObra").fill("Laboratório");
    await page.locator('input[name="funcionarioReferencia"][value="CSP"]').check();
    await page.locator('input[name="funcionarioIdade"][value="7"]').check();
    await page.locator("#novaIdade").fill("90");
    await page.locator("#btnAdicionarIdade").click();
    assert.equal(await page.locator('input[name="funcionarioIdade"][value="90"]').isChecked(), true);
    await page.locator("#btnSalvarFuncionario").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "push" && acao.caminho === "administracao/funcionariosRompimentos"));
    assert.deepEqual(
      await page.evaluate(() => window.__dbActions.find((acao) => acao.tipo === "push" && acao.caminho === "administracao/funcionariosRompimentos").valor.idades),
      [7, 90],
    );

    await page.locator('[data-admin-view="funcionarios-passagens"]:visible').first().click();
    await page.locator("#funcionariosPassagensLista").getByText("Paulo Santos").waitFor();
    await page.getByRole("button", { name: "Editar funcionário de passagens" }).click();
    await page.locator("#funcionarioPassagemObra").fill("Obra atualizada");
    await page.locator("#btnSalvarFuncionarioPassagem").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "update" && acao.caminho === "administracao/funcionariosPassagens/passagem-teste"));
    await page.locator("#btnNovoFuncionarioPassagem").click();
    await page.locator("#funcionarioPassagemNome").fill("Ana");
    await page.locator("#funcionarioPassagemSobrenome").fill("Souza");
    await page.locator("#funcionarioPassagemObra").fill("Obra 02");
    await page.locator("#funcionarioPassagemSenha").fill("5678");
    await page.locator("#btnSalvarFuncionarioPassagem").click();
    await page.waitForFunction(() => window.__dbActions.some((acao) => acao.tipo === "push" && acao.caminho === "administracao/funcionariosPassagens"));

    await page.locator('[data-admin-view="passagens"]:visible').first().click();
    await page.locator("#filtroPassagemFuncionario").selectOption("passagem-teste");
    await page.locator("#btnFiltrarPassagens").click();
    await page.locator("#passagensAdminLista").getByText("REF-1 - Obra 01").waitFor();
    assert.equal(await page.locator("#totalPassagensPeriodo").textContent(), "1");

    await page.goto(`${base}/pages/passagens-extras.html`);
    await page.getByRole("button", { name: /Selecionar Paulo Santos/i }).click();
    assert.equal(await page.locator("#modalSenhaFuncionario").isVisible(), true);
    await page.locator("#senhaFuncionario").fill("1234");
    await page.locator("#btnEntrarFuncionario").click();
    await page.locator("#passagensLista").getByText("REF-1 - Obra 01").waitFor();
    assert.equal(await page.locator("#totalMes").textContent(), "1");
    assert.equal(await page.locator('#obrasSugestoes option[value="REF-1 - Obra 01"]').count(), 1);
    assert.equal(await page.locator('#obrasSugestoes option[value="REF-2 - Obra 02"]').count(), 1);
    assert.equal(await page.locator("#obraOrigem").inputValue(), "");
    assert.equal(await page.locator("#obraDestino").inputValue(), "");
    await page.locator("#obraOrigem").fill("REF-1 - Obra 01");
    await page.locator("#obraDestino").fill("REF-2 - Obra 02");
    await page.locator("#observacoesPassagem").fill("Retorno solicitado pela obra");
    const requisicaoPassagem = page.waitForRequest((requisicao) =>
      requisicao.url().includes("/api/passagens-extras") && requisicao.method() === "POST",
    );
    await page.locator("#btnSalvarPassagem").click();
    const passagemSalva = (await requisicaoPassagem).postDataJSON();
    assert.equal(passagemSalva.funcionarioId, "passagem-teste");
    assert.equal(passagemSalva.origemObra, "REF-1 - Obra 01");
    assert.equal(passagemSalva.destinoObra, "REF-2 - Obra 02");
    assert.equal(passagemSalva.observacoes, "Retorno solicitado pela obra");
    assert.match(passagemSalva.data, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(await page.locator("#obraOrigem").inputValue(), "");
    assert.equal(await page.locator("#obraDestino").inputValue(), "");
    assert.equal(await page.locator("#observacoesPassagem").inputValue(), "");
    await page.getByRole("button", { name: "Editar passagem" }).click();
    assert.equal(await page.locator("#obraOrigem").inputValue(), "REF-1 - Obra 01");
    assert.equal(await page.locator("#obraDestino").inputValue(), "REF-2 - Obra 02");
    await page.locator("#observacoesPassagem").fill("Observação atualizada");
    const requisicaoEdicao = page.waitForRequest((requisicao) =>
      requisicao.url().includes("/api/passagens-extras") && requisicao.method() === "PATCH",
    );
    await page.locator("#btnSalvarPassagem").click();
    const passagemEditada = (await requisicaoEdicao).postDataJSON();
    assert.equal(passagemEditada.passagemId, "passagem1");
    assert.equal(passagemEditada.observacoes, "Observação atualizada");

    for (const largura of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(`${base}/pages/administracao.html`);
      const overflowAdmin = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflowAdmin <= 1, `overflow horizontal na administração em ${largura}px: ${overflowAdmin}px`);
    }

    for (const largura of [320, 360, 375, 390, 412, 768, 1280]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(`${base}/pages/rompimentos.html`);
      const requisicoesAntes = requisicoesRompimentos.length;
      await page.getByRole("button", { name: /Marcelo Silva/i }).click();
      await page.getByText("398-5").waitFor();
      await page.getByText("Usi Beton - 20 MPa").waitFor();
      assert.ok(requisicoesRompimentos.length - requisicoesAntes <= 2, "a semana visível pode repetir uma vez após falha transitória");
      assert.match(await page.locator("#resumoNotificacoes").textContent(), /Toque para verificar/i);
      await page.locator("#btnAlternarNotificacoes").click();
      await page.locator("#avisoRompimentosAtrasados").waitFor({ state: "visible" });
      assert.match(await page.locator("#avisoRompimentosTexto").textContent(), /Caso já tenha feito, desconsiderar este aviso/);
      await page.locator("#btnFecharAvisoAtrasos").click();
      assert.equal(await page.locator("#avisoRompimentosAtrasados").isHidden(), true);
      assert.equal(await page.locator("#painelNotificacoes").isVisible(), true);
      assert.match(await page.locator("#painelNotificacoes").textContent(), /rompimentos em atraso/i);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `overflow horizontal em ${largura}px: ${overflow}px`);
    }
    assert.ok(requisicoesRompimentos.length >= 2, "a consulta deve se recuperar da primeira resposta 503");
    assert.ok(new Set(requisicoesRompimentos.slice(0, 2)).size === 2, "cada tentativa deve evitar resposta intermediária armazenada");

    for (const largura of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.goto(`${base}/pages/passagens-extras.html`);
      await page.getByRole("button", { name: /Selecionar Paulo Santos/i }).click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `overflow horizontal nas passagens em ${largura}px: ${overflow}px`);
    }

    assert.deepEqual(errosPagina, []);

    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => servidor.close(resolve));
  }
});
