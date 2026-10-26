"use strict";

const DB_FUNCIONARIOS = "administracao/funcionariosPassagens";
const DB_OBRAS = "administracao/obras";

let database = null;
let funcionarios = [];
let obras = [];
let opcoesObras = [];
let funcionarioSelecionado = null;
let funcionarioPendente = null;
let senhaAcesso = "";
let passagemEmEdicaoId = "";
let dataSelecionada = hojeLocal();
let mesVisivel = new Date(`${dataSelecionada}T12:00:00`);
let passagensMes = [];
let controladorPassagens = null;

const el = Object.fromEntries([
  "selecaoFuncionario", "funcionariosLista", "painelFuncionario", "btnTrocarFuncionario",
  "funcionarioNome", "funcionarioObra", "mesAnterior", "proximoMes", "tituloMes",
  "calendario", "diaSemana", "dataSelecionada", "formPassagem", "obraOrigem",
  "obraDestino", "obrasSugestoes", "erroFormulario", "btnSalvarPassagem", "totalMes", "estadoPassagens",
  "passagensLista", "observacoesPassagem", "btnCancelarEdicaoPassagem", "modalSenhaFuncionario",
  "formSenhaFuncionario", "nomeSenhaFuncionario", "senhaFuncionario", "erroSenhaFuncionario",
  "btnEntrarFuncionario", "btnCancelarSenha",
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
    if (passagemEmEdicaoId) return mostrarErro("Conclua ou cancele a edição antes de trocar a data.");
    dataSelecionada = botao.dataset.data;
    atualizarDataSelecionada();
    renderizarCalendario();
  });
  el.formPassagem.addEventListener("submit", salvarPassagem);
  el.btnCancelarEdicaoPassagem.addEventListener("click", limparFormularioPassagem);
  el.formSenhaFuncionario.addEventListener("submit", autenticarFuncionario);
  el.btnCancelarSenha.addEventListener("click", fecharSenhaFuncionario);
  el.passagensLista.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-editar-passagem]");
    if (botao) editarPassagem(botao.dataset.editarPassagem);
  });
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
  funcionarioPendente = funcionarios.find((item) => item.id === id);
  if (!funcionarioPendente) return;
  el.nomeSenhaFuncionario.textContent = nomeCompleto(funcionarioPendente);
  el.senhaFuncionario.value = "";
  el.erroSenhaFuncionario.textContent = funcionarioPendente.senhaHash
    ? ""
    : "A senha ainda não foi cadastrada. Solicite ao administrador.";
  el.erroSenhaFuncionario.classList.toggle("hidden", Boolean(funcionarioPendente.senhaHash));
  el.senhaFuncionario.disabled = !funcionarioPendente.senhaHash;
  el.btnEntrarFuncionario.disabled = !funcionarioPendente.senhaHash;
  el.btnEntrarFuncionario.classList.toggle("opacity-60", !funcionarioPendente.senhaHash);
  el.modalSenhaFuncionario.classList.remove("hidden");
  el.modalSenhaFuncionario.classList.add("flex");
  if (funcionarioPendente.senhaHash) requestAnimationFrame(() => el.senhaFuncionario.focus());
}

async function autenticarFuncionario(event) {
  event.preventDefault();
  if (!funcionarioPendente || !el.senhaFuncionario.value) return;
  el.btnEntrarFuncionario.disabled = true;
  el.btnEntrarFuncionario.classList.add("opacity-60");
  try {
    const resposta = await fetch("/api/passagens-extras", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ acao: "autenticar", funcionarioId: funcionarioPendente.id, senha: el.senhaFuncionario.value }),
    });
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok || !resultado?.success) throw new Error("SENHA_INVALIDA");
    senhaAcesso = el.senhaFuncionario.value;
    funcionarioSelecionado = funcionarioPendente;
    fecharSenhaFuncionario();
    abrirPainelFuncionario();
  } catch {
    el.erroSenhaFuncionario.textContent = "Senha incorreta. Tente novamente.";
    el.erroSenhaFuncionario.classList.remove("hidden");
    el.senhaFuncionario.select();
  } finally {
    el.btnEntrarFuncionario.disabled = false;
    el.btnEntrarFuncionario.classList.remove("opacity-60");
  }
}

function fecharSenhaFuncionario() {
  funcionarioPendente = null;
  el.senhaFuncionario.value = "";
  el.modalSenhaFuncionario.classList.add("hidden");
  el.modalSenhaFuncionario.classList.remove("flex");
}

function abrirPainelFuncionario() {
  dataSelecionada = hojeLocal();
  mesVisivel = new Date(`${dataSelecionada}T12:00:00`);
  el.funcionarioNome.textContent = nomeCompleto(funcionarioSelecionado);
  el.funcionarioObra.textContent = `Obra: ${funcionarioSelecionado.obra || "Não informada"}`;
  el.selecaoFuncionario.classList.add("hidden");
  el.painelFuncionario.classList.remove("hidden");
  limparFormularioPassagem();
  preencherObras();
  atualizarDataSelecionada();
  renderizarCalendario();
  assinarPassagensMes();
}

function voltarParaFuncionarios() {
  desassinarPassagens();
  funcionarioSelecionado = null;
  senhaAcesso = "";
  passagensMes = [];
  limparFormularioPassagem();
  el.painelFuncionario.classList.add("hidden");
  el.selecaoFuncionario.classList.remove("hidden");
}

function mudarMes(diferenca) {
  if (passagemEmEdicaoId) return mostrarErro("Conclua ou cancele a edição antes de trocar o mês.");
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
  opcoesObras = obras.map((obra) => ({ id: obra.id, nome: rotuloObra(obra), nomeObra: obra.nome || "" }));
  const obraFuncionario = funcionarioSelecionado?.obra?.trim();
  if (obraFuncionario && !opcoesObras.some((item) => mesmoTexto(item.nome, obraFuncionario) || mesmoTexto(item.nomeObra, obraFuncionario))) {
    opcoesObras.unshift({ id: `atual-${funcionarioSelecionado.id}`, nome: obraFuncionario, nomeObra: obraFuncionario });
  }
  el.obrasSugestoes.innerHTML = "";
  opcoesObras.forEach((obra) => {
    const option = document.createElement("option");
    option.value = obra.nome;
    el.obrasSugestoes.appendChild(option);
  });
  el.obraOrigem.value = opcoesObras.some((obra) => mesmoTexto(obra.nome, origemAnterior)) ? origemAnterior : "";
  el.obraDestino.value = opcoesObras.some((obra) => mesmoTexto(obra.nome, destinoAnterior)) ? destinoAnterior : "";
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
    const resposta = await fetch("/api/passagens-extras", {
      method: passagemEmEdicaoId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Passagens-Credencial": codificarCredencial(senhaAcesso) },
      body: JSON.stringify({
      funcionarioId: funcionarioSelecionado.id,
      passagemId: passagemEmEdicaoId || undefined,
      data: dataSelecionada,
      origemObraId: origem.id,
      origemObra: origem.nome,
      destinoObraId: destino.id,
      destinoObra: destino.nome,
      observacoes: el.observacoesPassagem.value.trim(),
      }),
    });
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok || !resultado?.success) throw new Error("FALHA_PUBLICA");
    limparFormularioPassagem();
    await assinarPassagensMes();
  } catch {
    mostrarErro("Não foi possível salvar a passagem extra. Tente novamente.");
  } finally {
    el.btnSalvarPassagem.disabled = false;
    el.btnSalvarPassagem.classList.remove("opacity-60");
  }
}

function assinarPassagensMes() {
  desassinarPassagens();
  if (!funcionarioSelecionado) return Promise.resolve();
  el.estadoPassagens.classList.remove("hidden");
  el.estadoPassagens.textContent = "Carregando passagens...";
  controladorPassagens = new AbortController();
  const controladorAtual = controladorPassagens;
  const parametros = new URLSearchParams({
    funcionarioId: funcionarioSelecionado.id,
    mes: chaveMes(isoLocal(mesVisivel)),
  });
  return fetch(`/api/passagens-extras?${parametros.toString()}`, {
    headers: { Accept: "application/json", "X-Passagens-Credencial": codificarCredencial(senhaAcesso) },
    signal: controladorAtual.signal,
  }).then(async (resposta) => {
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok || !resultado?.success) throw new Error("FALHA_PUBLICA");
    if (controladorPassagens !== controladorAtual) return;
    passagensMes = (resultado.passagens || []).sort(ordenarPassagens);
    renderizarPassagens();
    renderizarCalendario();
  }).catch((erro) => {
    if (erro.name === "AbortError" || controladorPassagens !== controladorAtual) return;
    passagensMes = [];
    el.totalMes.textContent = "0";
    el.passagensLista.innerHTML = "";
    el.estadoPassagens.classList.remove("hidden");
    el.estadoPassagens.textContent = "Não foi possível carregar as passagens. Tente novamente.";
  });
}

function desassinarPassagens() {
  controladorPassagens?.abort();
  controladorPassagens = null;
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
    article.innerHTML = `<div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><i class="fa-solid fa-arrow-right-arrow-left"></i></span><div class="min-w-0 flex-1"><p class="text-[10px] font-black uppercase tracking-widest text-red-600">${escapeHtml(formatarDataCompleta(passagem.data))}</p><p class="mt-1 break-words text-sm font-bold text-slate-600">De <strong class="text-slate-900">${escapeHtml(passagem.origemObra)}</strong></p><p class="break-words text-sm font-bold text-slate-600">Para <strong class="text-slate-900">${escapeHtml(passagem.destinoObra)}</strong></p>${passagem.observacoes ? `<p class="mt-2 break-words rounded-lg bg-slate-50 p-2 text-xs font-medium text-slate-600"><strong>Observações:</strong> ${escapeHtml(passagem.observacoes)}</p>` : ""}</div><button type="button" data-editar-passagem="${escapeHtml(passagem.id)}" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Editar passagem"><i class="fa-solid fa-pen"></i></button></div>`;
    el.passagensLista.appendChild(article);
  });
}

function editarPassagem(id) {
  const passagem = passagensMes.find((item) => item.id === id);
  if (!passagem) return;
  garantirOpcaoHistorica(passagem.origemObraId, passagem.origemObra);
  garantirOpcaoHistorica(passagem.destinoObraId, passagem.destinoObra);
  passagemEmEdicaoId = passagem.id;
  dataSelecionada = passagem.data;
  mesVisivel = dataIsoParaDate(passagem.data);
  el.obraOrigem.value = passagem.origemObra || "";
  el.obraDestino.value = passagem.destinoObra || "";
  el.observacoesPassagem.value = passagem.observacoes || "";
  el.btnSalvarPassagem.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Salvar alterações';
  el.btnCancelarEdicaoPassagem.classList.remove("hidden");
  atualizarDataSelecionada();
  renderizarCalendario();
  el.formPassagem.scrollIntoView({ behavior: "smooth", block: "center" });
}

function garantirOpcaoHistorica(id, nome) {
  if (!id || !nome || opcoesObras.some((item) => mesmoTexto(item.nome, nome))) return;
  opcoesObras.push({ id, nome, nomeObra: nome });
  const option = document.createElement("option");
  option.value = nome;
  el.obrasSugestoes.appendChild(option);
}

function limparFormularioPassagem() {
  passagemEmEdicaoId = "";
  el.obraOrigem.value = "";
  el.obraDestino.value = "";
  el.observacoesPassagem.value = "";
  el.btnSalvarPassagem.innerHTML = '<i class="fa-solid fa-plus mr-2"></i>Adicionar passagem extra';
  el.btnCancelarEdicaoPassagem.classList.add("hidden");
  ocultarErro();
}

function codificarCredencial(valor) {
  const bytes = new TextEncoder().encode(valor);
  let binario = "";
  bytes.forEach((byte) => { binario += String.fromCharCode(byte); });
  return btoa(binario);
}

function mostrarErro(mensagem) { el.erroFormulario.textContent = mensagem; el.erroFormulario.classList.remove("hidden"); }
function ocultarErro() { el.erroFormulario.textContent = ""; el.erroFormulario.classList.add("hidden"); }
function opcaoSelecionada(input) { const opcao = opcoesObras.find((item) => mesmoTexto(item.nome, input.value)); return opcao ? { id: opcao.id, nome: opcao.nome } : null; }
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
