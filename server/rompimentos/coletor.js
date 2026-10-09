"use strict";

const { randomUUID } = require("node:crypto");
const { rm } = require("node:fs/promises");
const { chromium: playwrightChromium } = require("playwright-core");
const serverlessChromium = require("@sparticuz/chromium");
const { datasDaSemana } = require("./datas");
const { parseTabela } = require("./parser");

const TEXTO_PENDENTES_CE = /^\s*\d*\s*Pendentes\s*\(CE\)\s*$/i;
const TEXTO_PROIBIDO = /Pendentes\s*\(MA\)|Lan[cç]ados/i;
const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

async function abrirNavegador() {
  const caminhoLocal = String(process.env.CHROME_EXECUTABLE_PATH || "").trim();
  const userDataDir = `/tmp/concrefuji-${randomUUID()}`;
  const executablePath = caminhoLocal || await serverlessChromium.executablePath();
  const args = caminhoLocal ? [`--user-data-dir=${userDataDir}`] : [
    ...serverlessChromium.args,
    `--user-data-dir=${userDataDir}`,
  ];
  const browser = await playwrightChromium.launch({ executablePath, args, headless: true });
  return { browser, userDataDir };
}

async function clicarPorNome(page, regex) {
  const candidatos = [
    page.getByRole("link", { name: regex }),
    page.getByRole("button", { name: regex }),
    page.getByText(regex, { exact: true }),
  ];

  for (const candidato of candidatos) {
    if (await candidato.count()) {
      await candidato.first().click();
      await page.waitForLoadState("domcontentloaded");
      return;
    }
  }
  throw new Error("ETAPA_NAVEGACAO_NAO_ENCONTRADA");
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
  await clicarPorNome(page, /^Relat[oó]rios$/i);
  await clicarPorNome(page, /^Calend[aá]rio de Rompimento$/i);
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
  const links = page.getByText(TEXTO_PENDENTES_CE);
  const encontrados = [];

  for (let indice = 0; indice < await links.count(); indice += 1) {
    const link = links.nth(indice);
    const contexto = await link.evaluate((elemento) => {
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
  const tabelas = page.locator("table");
  for (let indice = 0; indice < await tabelas.count(); indice += 1) {
    const tabela = tabelas.nth(indice);
    const cabecalhos = await tabela.locator("thead th, tr:first-child th").allTextContents();
    if (!cabecalhos.length) continue;
    const linhas = await tabela.locator("tbody tr").evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.innerText || "").trim())),
    );
    try {
      return parseTabela({ cabecalhos, linhas, dataPadrao, coletadoEm });
    } catch (erro) {
      if (erro.message !== "CABECALHOS_TABELA_NAO_RECONHECIDOS") throw erro;
    }
  }
  throw new Error("TABELA_ROMPIMENTOS_NAO_ENCONTRADA");
}

async function coletarRompimentosConcreFuji(configuracao, inicioSemana) {
  const { browser, userDataDir } = await abrirNavegador();
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
        const linksAtuais = page.getByText(TEXTO_PENDENTES_CE);
        if (pendencia.indice >= await linksAtuais.count()) continue;
        await linksAtuais.nth(pendencia.indice).click();
        await page.waitForLoadState("domcontentloaded");
        registros.push(...await lerTabelaAtual(page, pendencia.data, coletadoEm));
        await page.goBack({ waitUntil: "domcontentloaded" });
      }
    }

    return { inicioSemana, coletadoEm, dados: registros };
  } finally {
    await browser.close().catch(() => {});
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  TEXTO_PENDENTES_CE,
  coletarRompimentosConcreFuji,
  lerTabelaAtual,
};
