"use strict";

const { chromium: playwrightChromium } = require("playwright-core");
const { datasDaSemana } = require("./datas");
const { parseTabela } = require("./parser");

const TEXTO_PENDENTES_CE = /^\s*\d*\s*Pendentes\s*\(CE\)\s*$/i;
const TEXTO_PROIBIDO = /Pendentes\s*\(MA\)|Lan[cç]ados/i;
const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function linksPendentesCe(page) {
  return page
    .locator("a[href]")
    .filter({ hasText: /Pendentes\s*\(CE\)/i });
}

async function abrirNavegador() {
  const caminhoLocal = String(process.env.CHROME_EXECUTABLE_PATH || "").trim();
  // @sparticuz/chromium >= 153 is ESM. Dynamic import keeps this CommonJS
  // module compatible with the Vercel function runtime.
  const serverlessChromium = caminhoLocal
    ? null
    : (await import("@sparticuz/chromium")).default;
  const executablePath = caminhoLocal || await serverlessChromium.executablePath();
  const args = caminhoLocal ? [] : serverlessChromium.args;
  const browser = await playwrightChromium.launch({ executablePath, args, headless: true });
  return browser;
}

async function clicarPorNome(page, regex, codigoErro = "ETAPA_NAVEGACAO_NAO_ENCONTRADA") {
  const candidatos = [
    page.getByRole("link", { name: regex }),
    page.getByRole("button", { name: regex }),
    page.getByText(regex, { exact: true }),
  ].map((candidato) => candidato.filter({ visible: true }));

  const alvo = candidatos.slice(1).reduce((uniao, candidato) => uniao.or(candidato), candidatos[0]);
  try {
    await alvo.first().waitFor({ state: "visible", timeout: 10_000 });
    await alvo.first().click();
    await page.waitForLoadState("domcontentloaded");
  } catch {
    throw new Error(codigoErro);
  }
}

async function realizarLogin(page, configuracao) {
  await page.goto(configuracao.baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const senha = page.locator('input[type="password"]').first();
  const usuario = page.locator([
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[name*="user" i]',
    'input[name*="login" i]',
    'input[type="text"]',
  ].join(", ")).first();

  if (!(await usuario.count()) || !(await senha.count())) {
    throw new Error("FORMULARIO_LOGIN_NAO_ENCONTRADO");
  }

  await usuario.fill(configuracao.username);
  await senha.fill(configuracao.password);

  const botao = page.getByRole("button", { name: /entrar|acessar|login/i }).first();
  if (await botao.count()) {
    await Promise.allSettled([
      page.waitForLoadState("domcontentloaded"),
      botao.click(),
    ]);
  } else {
    await senha.press("Enter");
    await page.waitForLoadState("domcontentloaded");
  }

  if (await page.locator('input[type="password"]').first().isVisible().catch(() => false)) {
    throw new Error("LOGIN_NAO_CONFIRMADO");
  }
}

async function acessarCalendario(page) {
  await clicarPorNome(page, /^Relat[oó]rios$/i, "MENU_RELATORIOS_NAO_ENCONTRADO");
  await clicarPorNome(
    page,
    /Calend[aá]rio.*Rompimentos?/i,
    "CALENDARIO_ROMPIMENTO_NAO_ENCONTRADO",
  );
}

async function mesVisivel(page) {
  const textos = await page.locator("h1, h2, h3, h4, caption, [role=heading]").allTextContents();
  for (const textoOriginal of textos) {
    const texto = textoOriginal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const indiceMes = MESES.findIndex((mes) => texto.includes(mes));
    const ano = texto.match(/\b(20\d{2})\b/);
    if (indiceMes >= 0 && ano) return { ano: Number(ano[1]), mes: indiceMes + 1 };
  }
  return null;
}

async function navegarAteMes(page, inicioSemana) {
  const alvo = new Date(`${inicioSemana}T12:00:00Z`);
  for (let tentativa = 0; tentativa < 24; tentativa += 1) {
    const atual = await mesVisivel(page);
    if (!atual) {
      // O DOM real precisa expor o mês em um heading/caption para navegação confiável.
      return;
    }
    const diferenca = (alvo.getUTCFullYear() - atual.ano) * 12 + alvo.getUTCMonth() + 1 - atual.mes;
    if (diferenca === 0) return;
    await clicarPorNome(page, diferenca > 0 ? /pr[oó]ximo|seguinte|next/i : /anterior|previous|prev/i);
  }
  throw new Error("MES_CALENDARIO_NAO_ALCANCADO");
}

async function localizarPendentesCe(page, datasSemana) {
  const diasValidos = new Set(datasSemana.map((data) => Number(data.slice(-2))));
  const anoMes = datasSemana[0].slice(0, 7);
  const links = linksPendentesCe(page);
  const encontrados = [];

  for (let indice = 0; indice < await links.count(); indice += 1) {
    const link = links.nth(indice);
    const contexto = await link.evaluate((elemento) => {
      const celula = elemento.closest("td");
      if (celula) {
        const atributos = ["data-date", "data-data", "data-day", "datetime"];
        for (const nome of atributos) {
          const valor = celula.getAttribute?.(nome);
          if (valor) return { atributo: valor, texto: celula.innerText || "" };
        }
        const linhas = String(celula.innerText || "").split(/\n+/).map((item) => item.trim());
        const dia = linhas.find((item) => /^\d{1,2}$/.test(item));
        if (dia) return { atributo: "", texto: celula.innerText || "", dia: Number(dia) };
      }

      let atual = elemento;
      for (let nivel = 0; atual && nivel < 7; nivel += 1, atual = atual.parentElement) {
        const atributos = ["data-date", "data-data", "data-day", "datetime"];
        for (const nome of atributos) {
          const valor = atual.getAttribute?.(nome);
          if (valor) return { atributo: valor, texto: atual.innerText || "" };
        }
        const linhas = String(atual.innerText || "").split(/\n+/).map((item) => item.trim());
        const dia = linhas.find((item) => /^\d{1,2}$/.test(item));
        if (dia) return { atributo: "", texto: atual.innerText || "", dia: Number(dia) };
      }
      return { atributo: "", texto: elemento.parentElement?.innerText || "" };
    });

    if (TEXTO_PROIBIDO.test(contexto.texto) && !TEXTO_PENDENTES_CE.test((await link.textContent()) || "")) {
      continue;
    }

    const isoNoAtributo = String(contexto.atributo || "").match(/(20\d{2})-(\d{2})-(\d{2})/);
    const data = isoNoAtributo
      ? `${isoNoAtributo[1]}-${isoNoAtributo[2]}-${isoNoAtributo[3]}`
      : contexto.dia && diasValidos.has(contexto.dia)
        ? `${anoMes}-${String(contexto.dia).padStart(2, "0")}`
        : "";

    if (datasSemana.includes(data)) encontrados.push({ data, indice });
  }

  return encontrados;
}

async function lerTabelaAtual(page, dataPadrao, coletadoEm) {
  await page.locator("table tbody tr").first().waitFor({
    state: "attached",
    timeout: 10_000,
  }).catch(() => {
    throw new Error("TABELA_ROMPIMENTOS_SEM_LINHAS");
  });

  const tabelas = page.locator("table");
  for (let indice = 0; indice < await tabelas.count(); indice += 1) {
    const tabela = tabelas.nth(indice);
    const estrutura = await tabela.locator("tr").evaluateAll((trs) => {
      const celulas = (tr) => [...tr.querySelectorAll("th, td")]
        .map((celula) => (celula.innerText || "").trim());
      const normalizar = (valor) => String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const indiceCabecalho = trs.findIndex((tr) => {
        const nomes = celulas(tr).map(normalizar);
        return nomes.includes("obra") && nomes.includes("cp") && nomes.includes("idade");
      });
      if (indiceCabecalho < 0) return null;
      return {
        cabecalhos: celulas(trs[indiceCabecalho]),
        linhas: trs.slice(indiceCabecalho + 1)
          .map((tr) => [...tr.querySelectorAll("td")]
            .map((td) => (td.innerText || "").trim()))
          .filter((linha) => linha.length > 0),
      };
    });
    if (!estrutura) continue;
    try {
      return parseTabela({ ...estrutura, dataPadrao, coletadoEm });
    } catch (erro) {
      if (erro.message !== "CABECALHOS_TABELA_NAO_RECONHECIDOS") throw erro;
    }
  }
  throw new Error("TABELA_ROMPIMENTOS_NAO_ENCONTRADA");
}

async function coletarRompimentosConcreFuji(configuracao, inicioSemana) {
  const browser = await abrirNavegador();
  const coletadoEm = new Date().toISOString();
  const datasSemana = datasDaSemana(inicioSemana);
  const registros = [];

  try {
    const context = await browser.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
    const page = await context.newPage();
    await realizarLogin(page, configuracao);
    await acessarCalendario(page);
    const datasPorMes = [...new Set(datasSemana.map((data) => data.slice(0, 7)))];
    for (const anoMes of datasPorMes) {
      const datasDoMes = datasSemana.filter((data) => data.startsWith(anoMes));
      await navegarAteMes(page, datasDoMes[0]);
      const pendencias = await localizarPendentesCe(page, datasDoMes);
      for (const pendencia of pendencias) {
        const linksAtuais = linksPendentesCe(page);
        if (pendencia.indice >= await linksAtuais.count()) continue;
        const linkAtual = linksAtuais.nth(pendencia.indice);
        const href = await linkAtual.getAttribute("href");
        if (href) {
          await page.goto(new URL(href, page.url()).toString(), {
            waitUntil: "domcontentloaded",
          });
        } else {
          await linkAtual.click();
          await page.waitForLoadState("domcontentloaded");
        }
        registros.push(...await lerTabelaAtual(page, pendencia.data, coletadoEm));
        await page.goBack({ waitUntil: "domcontentloaded" });
      }
    }

    return { inicioSemana, coletadoEm, dados: registros };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = {
  TEXTO_PENDENTES_CE,
  coletarRompimentosConcreFuji,
  lerTabelaAtual,
};
