"use strict";

const DB_FUNCIONARIOS = "administracao/funcionariosPassagens";
const DB_OBRAS = "administracao/obras";
const DB_PASSAGENS = "passagensExtras";

let database = null;
let funcionarios = [];
let obras = [];
let funcionarioSelecionado = null;
let dataSelecionada = hojeLocal();
let mesVisivel = new Date(`${dataSelecionada}T12:00:00`);
let passagensMes = [];
let referenciaPassagens = null;

const el = Object.fromEntries([
  "selecaoFuncionario", "funcionariosLista", "painelFuncionario", "btnTrocarFuncionario",
  "funcionarioNome", "funcionarioObra", "mesAnterior", "proximoMes", "tituloMes",
  "calendario", "diaSemana", "dataSelecionada", "formPassagem", "obraOrigem",
  "obraDestino", "erroFormulario", "btnSalvarPassagem", "totalMes", "estadoPassagens",
  "passagensLista",
].map((id) => [id, document.getElementById(id)]));

document.addEventListener("DOMContentLoaded", iniciar);

function iniciar() {
  database = window.SGIFirebase?.database;
  registrarEventos();
  if (!database) {
    renderizarMensagemFuncionarios("Não foi possível carregar os funcionários. Tente novamente.");
    return;
  }
  carregarFuncionarios();
  carregarObras();
}

function registrarEventos() {
  el.funcionariosLista.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-funcionario-id]");
    if (botao) selecionarFuncionario(botao.dataset.funcionarioId);
  });
  el.btnTrocarFuncionario.addEventListener("click", voltarParaFuncionarios);
  el.mesAnterior.addEventListener("click", () => mudarMes(-1));
  el.proximoMes.addEventListener("click", () => mudarMes(1));
  el.calendario.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-data]");
    if (!botao) return;
    dataSelecionada = botao.dataset.data;
    atualizarDataSelecionada();
    renderizarCalendario();
  });
  el.formPassagem.addEventListener("submit", salvarPassagem);
}

function carregarFuncionarios() {
  database.ref(DB_FUNCIONARIOS).on("value", (snapshot) => {
    funcionarios = objetoParaLista(snapshot.val()).filter((item) => item.ativo !== false);
    renderizarFuncionarios();
    if (funcionarioSelecionado) {
      const atualizado = funcionarios.find((item) => item.id === funcionarioSelecionado.id);
      if (atualizado) funcionarioSelecionado = atualizado;
    }
  }, () => renderizarMensagemFuncionarios("Não foi possível carregar os funcionários. Tente novamente."));
}

function carregarObras() {
  database.ref(DB_OBRAS).on("value", (snapshot) => {
    obras = objetoParaLista(snapshot.val()).sort((a, b) => rotuloObra(a).localeCompare(rotuloObra(b), "pt-BR"));
    preencherObras();
  }, () => preencherObras());
}

function renderizarFuncionarios() {
  if (!funcionarios.length) return renderizarMensagemFuncionarios("Nenhum funcionário cadastrado.");
  el.funcionariosLista.innerHTML = "";
  funcionarios.forEach((funcionario) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.funcionarioId = funcionario.id;
    botao.className = "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition active:scale-[.98]";
    botao.setAttribute("aria-label", `Selecionar ${nomeCompleto(funcionario)}`);
    botao.innerHTML = `<span class="flex items-start gap-3"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><i class="fa-solid fa-user"></i></span><span class="min-w-0"><strong class="block break-words text-base font-black">${escapeHtml(nomeCompleto(funcionario))}</strong><span class="block break-words text-xs font-bold text-slate-500">Obra: ${escapeHtml(funcionario.obra || "Não informada")}</span></span></span><span class="mt-3 inline-flex min-h-10 items-center text-xs font-black uppercase tracking-wide text-red-600">Registrar passagens</span>`;
    el.funcionariosLista.appendChild(botao);
  });
}

function renderizarMensagemFuncionarios(mensagem) {
  el.funcionariosLista.innerHTML = `<div class="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500 sm:col-span-2">${escapeHtml(mensagem)}</div>`;
}

function selecionarFuncionario(id) {
  funcionarioSelecionado = funcionarios.find((item) => item.id === id);
  if (!funcionarioSelecionado) return;
  dataSelecionada = hojeLocal();
  mesVisivel = new Date(`${dataSelecionada}T12:00:00`);
  el.funcionarioNome.textContent = nomeCompleto(funcionarioSelecionado);
  el.funcionarioObra.textContent = `Obra: ${funcionarioSelecionado.obra || "Não informada"}`;
  el.selecaoFuncionario.classList.add("hidden");
  el.painelFuncionario.classList.remove("hidden");
  preencherObras();
  atualizarDataSelecionada();
  renderizarCalendario();
  assinarPassagensMes();
}

function voltarParaFuncionarios() {
  desassinarPassagens();
  funcionarioSelecionado = null;
  passagensMes = [];
  el.painelFuncionario.classList.add("hidden");
  el.selecaoFuncionario.classList.remove("hidden");
}

function mudarMes(diferenca) {
  mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + diferenca, 1, 12);
  dataSelecionada = isoLocal(new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1, 12));
  atualizarDataSelecionada();
  renderizarCalendario();
  assinarPassagensMes();
}

function renderizarCalendario() {
  const ano = mesVisivel.getFullYear();
  const mes = mesVisivel.getMonth();
  const primeiroDia = new Date(ano, mes, 1, 12).getDay();
  const totalDias = new Date(ano, mes + 1, 0, 12).getDate();
  const datasComPassagem = new Set(passagensMes.map((item) => item.data));
  el.tituloMes.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(mesVisivel);
  el.calendario.innerHTML = "";
  for (let i = 0; i < primeiroDia; i += 1) el.calendario.appendChild(document.createElement("span"));
  for (let dia = 1; dia <= totalDias; dia += 1) {
    const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const selecionado = iso === dataSelecionada;
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.data = iso;
    botao.className = `calendar-day relative flex items-center justify-center rounded-xl text-sm font-black ${selecionado ? "bg-red-600 text-white shadow-md" : "text-slate-700 hover:bg-slate-100"}`;
    botao.setAttribute("aria-label", formatarDataCompleta(iso));
    botao.setAttribute("aria-pressed", String(selecionado));
    botao.innerHTML = `${dia}${datasComPassagem.has(iso) ? `<span class="absolute bottom-1 h-1.5 w-1.5 rounded-full ${selecionado ? "bg-white" : "bg-sky-600"}"></span>` : ""}`;
    el.calendario.appendChild(botao);
  }
}

function atualizarDataSelecionada() {
  const data = dataIsoParaDate(dataSelecionada);
  el.diaSemana.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(data);
  el.dataSelecionada.textContent = new Intl.DateTimeFormat("pt-BR").format(data);
  ocultarErro();
}

function preencherObras() {
  const origemAnterior = el.obraOrigem.value;
  const destinoAnterior = el.obraDestino.value;
  const opcoes = obras.map((obra) => ({ id: obra.id, nome: rotuloObra(obra) }));
  const obraFuncionario = funcionarioSelecionado?.obra?.trim();
  if (obraFuncionario && !opcoes.some((item) => mesmoTexto(item.nome, obraFuncionario))) {
    opcoes.unshift({ id: `atual-${funcionarioSelecionado.id}`, nome: obraFuncionario });
  }
  [el.obraOrigem, el.obraDestino].forEach((select, indice) => {
    select.innerHTML = `<option value="">Selecione a obra</option>`;
    opcoes.forEach((obra) => {
      const option = document.createElement("option");
      option.value = obra.id;
      option.textContent = obra.nome;
      select.appendChild(option);
    });
    const anterior = indice === 0 ? origemAnterior : destinoAnterior;
    if ([...select.options].some((option) => option.value === anterior)) select.value = anterior;
  });
  if (!origemAnterior && obraFuncionario) {
    const option = [...el.obraOrigem.options].find((item) => mesmoTexto(item.textContent, obraFuncionario));
    if (option) el.obraOrigem.value = option.value;
  }
}

async function salvarPassagem(event) {
  event.preventDefault();
  if (!funcionarioSelecionado || !database) return;
  const origem = opcaoSelecionada(el.obraOrigem);
  const destino = opcaoSelecionada(el.obraDestino);
  if (!origem || !destino) return mostrarErro("Selecione a obra de origem e a obra de destino.");
  if (origem.id === destino.id || mesmoTexto(origem.nome, destino.nome)) return mostrarErro("A obra de destino deve ser diferente da obra de origem.");

  ocultarErro();
  el.btnSalvarPassagem.disabled = true;
  el.btnSalvarPassagem.classList.add("opacity-60");
  try {
    await database.ref(`${DB_PASSAGENS}/${funcionarioSelecionado.id}/${chaveMes(dataSelecionada)}`).push({
      funcionarioId: funcionarioSelecionado.id,
      funcionarioNome: nomeCompleto(funcionarioSelecionado),
      data: dataSelecionada,
      diaSemana: diaSemana(dataSelecionada),
      origemObraId: origem.id,
      origemObra: origem.nome,
      destinoObraId: destino.id,
      destinoObra: destino.nome,
      criadoEm: new Date().toISOString(),
    });
    el.obraDestino.value = "";
  } catch {
    mostrarErro("Não foi possível salvar a passagem extra. Tente novamente.");
  } finally {
    el.btnSalvarPassagem.disabled = false;
    el.btnSalvarPassagem.classList.remove("opacity-60");
  }
}

function assinarPassagensMes() {
  desassinarPassagens();
  if (!funcionarioSelecionado || !database) return;
  el.estadoPassagens.classList.remove("hidden");
  el.estadoPassagens.textContent = "Carregando passagens...";
  const caminho = `${DB_PASSAGENS}/${funcionarioSelecionado.id}/${chaveMes(isoLocal(mesVisivel))}`;
  referenciaPassagens = database.ref(caminho);
  referenciaPassagens.on("value", (snapshot) => {
    passagensMes = objetoParaLista(snapshot.val()).sort(ordenarPassagens);
    renderizarPassagens();
    renderizarCalendario();
  }, () => {
    passagensMes = [];
    el.totalMes.textContent = "0";
    el.passagensLista.innerHTML = "";
    el.estadoPassagens.classList.remove("hidden");
    el.estadoPassagens.textContent = "Não foi possível carregar as passagens. Tente novamente.";
  });
}

function desassinarPassagens() {
  if (referenciaPassagens?.off) referenciaPassagens.off("value");
  referenciaPassagens = null;
}

function renderizarPassagens() {
  el.totalMes.textContent = String(passagensMes.length);
  el.passagensLista.innerHTML = "";
  if (!passagensMes.length) {
    el.estadoPassagens.classList.remove("hidden");
    el.estadoPassagens.textContent = "Nenhuma passagem extra cadastrada neste mês.";
    return;
  }
  el.estadoPassagens.classList.add("hidden");
  passagensMes.forEach((passagem) => {
    const article = document.createElement("article");
    article.className = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
    article.innerHTML = `<div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><i class="fa-solid fa-arrow-right-arrow-left"></i></span><div class="min-w-0 flex-1"><p class="text-[10px] font-black uppercase tracking-widest text-red-600">${escapeHtml(formatarDataCompleta(passagem.data))}</p><p class="mt-1 break-words text-sm font-bold text-slate-600">De <strong class="text-slate-900">${escapeHtml(passagem.origemObra)}</strong></p><p class="break-words text-sm font-bold text-slate-600">Para <strong class="text-slate-900">${escapeHtml(passagem.destinoObra)}</strong></p></div></div>`;
    el.passagensLista.appendChild(article);
  });
}

function mostrarErro(mensagem) { el.erroFormulario.textContent = mensagem; el.erroFormulario.classList.remove("hidden"); }
function ocultarErro() { el.erroFormulario.textContent = ""; el.erroFormulario.classList.add("hidden"); }
function opcaoSelecionada(select) { const option = select.options[select.selectedIndex]; return option?.value ? { id: option.value, nome: option.textContent.trim() } : null; }
function objetoParaLista(objeto) { return Object.entries(objeto || {}).map(([id, valor]) => ({ id, ...valor })); }
function nomeCompleto(item) { return `${item.nome || ""} ${item.sobrenome || ""}`.trim(); }
function rotuloObra(obra) { return obra.referencia ? `${obra.referencia} - ${obra.nome}` : obra.nome || "Obra sem nome"; }
function chaveMes(iso) { return String(iso).slice(0, 7); }
function dataIsoParaDate(iso) { return new Date(`${iso}T12:00:00`); }
function diaSemana(iso) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(dataIsoParaDate(iso)); }
function formatarDataCompleta(iso) { const data = dataIsoParaDate(iso); return `${diaSemana(iso)}, ${new Intl.DateTimeFormat("pt-BR").format(data)}`; }
function hojeLocal() { return isoLocal(new Date()); }
function isoLocal(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`; }
function ordenarPassagens(a, b) { return String(b.data || "").localeCompare(String(a.data || "")) || String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")); }
function mesmoTexto(a, b) { return String(a || "").trim().toLocaleLowerCase("pt-BR") === String(b || "").trim().toLocaleLowerCase("pt-BR"); }
function escapeHtml(valor) { return String(valor || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
