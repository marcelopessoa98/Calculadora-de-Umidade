const ADMIN_PASSWORD = "Fujita010474";
const ADMIN_ACCESS_KEY = "sgi_concrefuji_admin_autorizado";
const DB_CLIENTES = "administracao/clientes";
const DB_OBRAS = "administracao/obras";
const DB_FUNCIONARIOS_ROMPIMENTOS = "administracao/funcionariosRompimentos";
const DB_FUNCIONARIOS_PASSAGENS = "administracao/funcionariosPassagens";
const DB_AVISOS = "administracao/avisos";
const IDADES_PADRAO = [1, 3, 7, 14, 28, 56, 63];
const ITENS_POR_PAGINA = 10;

let database = null;
let clientes = [];
let obras = [];
let clientesCarregados = false;
let obrasCarregadas = false;
let clienteEmEdicaoId = "";
let obraEmEdicaoId = "";
let funcionariosRompimentos = [];
let funcionariosRompimentosCarregados = false;
let funcionarioEmEdicaoId = "";
let funcionariosPassagens = [];
let funcionariosPassagensCarregados = false;
let funcionarioPassagemEmEdicaoId = "";
let avisos = [];
let avisosCarregados = false;
let avisoEmEdicaoId = "";
let passagensRelatorio = [];
let consultaPassagensRelatorio = null;
let referenciasDisponiveis = new Set(["CSP", "VSP", "GSF"]);
let idadesDisponiveis = new Set(IDADES_PADRAO);
const paginas = { clientes: 1, obras: 1, funcionarios: 1, funcionariosPassagens: 1 };

const el = {
  accessModal: document.getElementById("accessModal"),
  accessForm: document.getElementById("accessForm"),
  accessPassword: document.getElementById("accessPassword"),
  accessError: document.getElementById("accessError"),
  togglePassword: document.getElementById("togglePassword"),
  syncStatus: document.getElementById("syncStatus"),
  clientesTotal: document.getElementById("clientesTotal"),
  obrasTotal: document.getElementById("obrasTotal"),
  funcionariosTotal: document.getElementById("funcionariosTotal"),

  formCliente: document.getElementById("formCliente"),
  clienteFormTitulo: document.getElementById("clienteFormTitulo"),
  clienteNome: document.getElementById("clienteNome"),
  btnSalvarCliente: document.getElementById("btnSalvarCliente"),
  btnCancelarCliente: document.getElementById("btnCancelarCliente"),
  clientesLista: document.getElementById("clientesLista"),
  buscaClientes: document.getElementById("buscaClientes"),
  paginacaoClientes: document.getElementById("paginacaoClientes"),
  btnNovoCliente: document.getElementById("btnNovoCliente"),
  modalCliente: document.getElementById("modalCliente"),

  formObra: document.getElementById("formObra"),
  obraFormTitulo: document.getElementById("obraFormTitulo"),
  obraCliente: document.getElementById("obraCliente"),
  obraNome: document.getElementById("obraNome"),
  obraReferencia: document.getElementById("obraReferencia"),
  obraEndereco: document.getElementById("obraEndereco"),
  obraContato: document.getElementById("obraContato"),
  obraObservacoes: document.getElementById("obraObservacoes"),
  btnSalvarObra: document.getElementById("btnSalvarObra"),
  btnCancelarObra: document.getElementById("btnCancelarObra"),
  obrasLista: document.getElementById("obrasLista"),
  buscaObras: document.getElementById("buscaObras"),
  paginacaoObras: document.getElementById("paginacaoObras"),
  btnNovaObra: document.getElementById("btnNovaObra"),
  modalObra: document.getElementById("modalObra"),

  formFuncionarioRompimento: document.getElementById("formFuncionarioRompimento"),
  funcionarioFormTitulo: document.getElementById("funcionarioFormTitulo"),
  funcionarioNome: document.getElementById("funcionarioNome"),
  funcionarioSobrenome: document.getElementById("funcionarioSobrenome"),
  funcionarioObra: document.getElementById("funcionarioObra"),
  referenciasOpcoes: document.getElementById("referenciasOpcoes"),
  novaReferencia: document.getElementById("novaReferencia"),
  btnAdicionarReferencia: document.getElementById("btnAdicionarReferencia"),
  idadesOpcoes: document.getElementById("idadesOpcoes"),
  novaIdade: null,
  btnAdicionarIdade: null,
  btnSalvarFuncionario: document.getElementById("btnSalvarFuncionario"),
  btnCancelarFuncionario: document.getElementById("btnCancelarFuncionario"),
  funcionariosRompimentosLista: document.getElementById("funcionariosRompimentosLista"),
  buscaFuncionarios: document.getElementById("buscaFuncionarios"),
  paginacaoFuncionarios: document.getElementById("paginacaoFuncionarios"),
  btnNovoFuncionario: document.getElementById("btnNovoFuncionario"),
  modalFuncionario: document.getElementById("modalFuncionario"),

  funcionariosPassagensTotal: document.getElementById("funcionariosPassagensTotal"),
  formFuncionarioPassagem: document.getElementById("formFuncionarioPassagem"),
  funcionarioPassagemFormTitulo: document.getElementById("funcionarioPassagemFormTitulo"),
  funcionarioPassagemNome: document.getElementById("funcionarioPassagemNome"),
  funcionarioPassagemSobrenome: document.getElementById("funcionarioPassagemSobrenome"),
  funcionarioPassagemObra: document.getElementById("funcionarioPassagemObra"),
  funcionarioPassagemSenha: document.getElementById("funcionarioPassagemSenha"),
  ajudaFuncionarioPassagemSenha: document.getElementById("ajudaFuncionarioPassagemSenha"),
  btnSalvarFuncionarioPassagem: document.getElementById("btnSalvarFuncionarioPassagem"),
  btnCancelarFuncionarioPassagem: document.getElementById("btnCancelarFuncionarioPassagem"),
  btnNovoFuncionarioPassagem: document.getElementById("btnNovoFuncionarioPassagem"),
  funcionariosPassagensLista: document.getElementById("funcionariosPassagensLista"),
  buscaFuncionariosPassagens: document.getElementById("buscaFuncionariosPassagens"),
  paginacaoFuncionariosPassagens: document.getElementById("paginacaoFuncionariosPassagens"),
  modalFuncionarioPassagem: document.getElementById("modalFuncionarioPassagem"),

  passagensTotal: document.getElementById("passagensTotal"),
  filtroPassagemFuncionario: document.getElementById("filtroPassagemFuncionario"),
  filtroPassagemFuncionariosOpcoes: document.getElementById("filtroPassagemFuncionariosOpcoes"),
  filtroPassagemFuncionarioId: document.getElementById("filtroPassagemFuncionarioId"),
  filtroPassagemInicio: document.getElementById("filtroPassagemInicio"),
  filtroPassagemFim: document.getElementById("filtroPassagemFim"),
  btnFiltrarPassagens: document.getElementById("btnFiltrarPassagens"),
  btnExportarPassagensPdf: document.getElementById("btnExportarPassagensPdf"),
  erroFiltroPassagens: document.getElementById("erroFiltroPassagens"),
  totalPassagensPeriodo: document.getElementById("totalPassagensPeriodo"),
  nomeFuncionarioPassagens: document.getElementById("nomeFuncionarioPassagens"),
  estadoPassagensAdmin: document.getElementById("estadoPassagensAdmin"),
  passagensAdminLista: document.getElementById("passagensAdminLista"),

  avisosTotal: document.getElementById("avisosTotal"),
  avisosLista: document.getElementById("avisosLista"),
  btnNovoAviso: document.getElementById("btnNovoAviso"),
  modalAviso: document.getElementById("modalAviso"),
  formAviso: document.getElementById("formAviso"),
  avisoFormTitulo: document.getElementById("avisoFormTitulo"),
  avisoMensagem: document.getElementById("avisoMensagem"),
  avisoInicio: document.getElementById("avisoInicio"),
  avisoFim: document.getElementById("avisoFim"),
  erroAviso: document.getElementById("erroAviso"),
  btnSalvarAviso: document.getElementById("btnSalvarAviso"),
  btnCancelarAviso: document.getElementById("btnCancelarAviso"),
};

document.addEventListener("DOMContentLoaded", () => {
  configurarAcesso();
  registrarEventos();
});

function configurarAcesso() {
  if (sessionStorage.getItem(ADMIN_ACCESS_KEY) === "sim") {
    liberarAcesso();
    return;
  }

  el.accessPassword.focus();

  el.accessForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (el.accessPassword.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_ACCESS_KEY, "sim");
      liberarAcesso();
      return;
    }

    el.accessError.classList.remove("hidden");
    el.accessPassword.value = "";
    el.accessPassword.focus();
  });

  el.togglePassword.addEventListener("click", () => {
    const visivel = el.accessPassword.type === "text";
    el.accessPassword.type = visivel ? "password" : "text";
    el.togglePassword.innerHTML = `<i class="fa-solid ${visivel ? "fa-eye" : "fa-eye-slash"}"></i>`;
    el.togglePassword.setAttribute("aria-label", visivel ? "Mostrar senha" : "Ocultar senha");
  });
}

function liberarAcesso() {
  el.accessModal.classList.add("hidden");
  document.body.classList.remove("access-locked");
  iniciarFirebase();
}

function registrarEventos() {
  criarCampoNovaIdade();
  el.formCliente.addEventListener("submit", salvarCliente);
  el.formObra.addEventListener("submit", salvarObra);
  el.btnCancelarCliente.addEventListener("click", cancelarEdicaoCliente);
  el.btnCancelarObra.addEventListener("click", cancelarEdicaoObra);
  el.clientesLista.addEventListener("click", tratarCliqueCliente);
  el.obrasLista.addEventListener("click", tratarCliqueObra);
  el.formFuncionarioRompimento.addEventListener("submit", salvarFuncionarioRompimento);
  el.formFuncionarioPassagem.addEventListener("submit", salvarFuncionarioPassagem);
  el.formAviso.addEventListener("submit", salvarAviso);
  el.btnCancelarFuncionario.addEventListener("click", cancelarEdicaoFuncionario);
  el.btnAdicionarReferencia.addEventListener("click", adicionarReferencia);
  el.btnAdicionarIdade.addEventListener("click", adicionarIdade);
  el.novaReferencia.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      adicionarReferencia();
    }
  });
  el.novaIdade.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      adicionarIdade();
    }
  });
  el.funcionariosRompimentosLista.addEventListener("click", tratarCliqueFuncionario);
  el.funcionariosPassagensLista.addEventListener("click", tratarCliqueFuncionarioPassagem);
  document.querySelectorAll("[data-admin-view], [data-open-view]").forEach((botao) => {
    botao.addEventListener("click", () => mostrarArea(botao.dataset.adminView || botao.dataset.openView));
  });
  document.querySelectorAll("[data-close-modal]").forEach((botao) => {
    botao.addEventListener("click", () => fecharModal(document.getElementById(botao.dataset.closeModal)));
  });
  document.querySelectorAll(".admin-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) fecharModal(modal);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharModal(document.querySelector(".admin-modal:not(.hidden)"));
  });
  el.btnNovoCliente.addEventListener("click", () => {
    cancelarEdicaoCliente(false);
    abrirModal(el.modalCliente, el.clienteNome);
  });
  el.btnNovaObra.addEventListener("click", () => {
    cancelarEdicaoObra(false);
    abrirModal(el.modalObra, el.obraCliente);
  });
  el.btnNovoFuncionario.addEventListener("click", () => {
    cancelarEdicaoFuncionario(false);
    abrirModal(el.modalFuncionario, el.funcionarioNome);
  });
  el.btnNovoFuncionarioPassagem.addEventListener("click", () => {
    cancelarEdicaoFuncionarioPassagem(false);
    abrirModal(el.modalFuncionarioPassagem, el.funcionarioPassagemNome);
  });
  el.btnCancelarFuncionarioPassagem.addEventListener("click", cancelarEdicaoFuncionarioPassagem);
  el.btnNovoAviso.addEventListener("click", () => {
    cancelarEdicaoAviso(false);
    preencherPeriodoPadraoAviso();
    abrirModal(el.modalAviso, el.avisoMensagem);
  });
  el.btnCancelarAviso.addEventListener("click", cancelarEdicaoAviso);
  el.avisosLista.addEventListener("click", tratarCliqueAviso);
  configurarBusca(el.buscaClientes, "clientes", renderizarClientes);
  configurarBusca(el.buscaObras, "obras", renderizarObras);
  configurarBusca(el.buscaFuncionarios, "funcionarios", renderizarFuncionariosRompimentos);
  configurarBusca(el.buscaFuncionariosPassagens, "funcionariosPassagens", renderizarFuncionariosPassagens);
  configurarPaginacao(el.paginacaoClientes, "clientes", renderizarClientes);
  configurarPaginacao(el.paginacaoObras, "obras", renderizarObras);
  configurarPaginacao(el.paginacaoFuncionarios, "funcionarios", renderizarFuncionariosRompimentos);
  configurarPaginacao(el.paginacaoFuncionariosPassagens, "funcionariosPassagens", renderizarFuncionariosPassagens);
  el.btnFiltrarPassagens.addEventListener("click", consultarPassagensExtras);
  el.btnExportarPassagensPdf.addEventListener("click", exportarPassagensPdf);
  el.filtroPassagemFuncionario.addEventListener("input", () => {
    el.filtroPassagemFuncionarioId.value = resolverFuncionarioFiltro()?.id || "";
    invalidarRelatorioPassagens();
  });
  el.filtroPassagemFuncionario.addEventListener("change", () => {
    const funcionario = resolverFuncionarioFiltro();
    el.filtroPassagemFuncionarioId.value = funcionario?.id || "";
    if (funcionario) el.filtroPassagemFuncionario.value = rotuloFuncionarioFiltro(funcionario);
  });
  el.filtroPassagemInicio.addEventListener("change", invalidarRelatorioPassagens);
  el.filtroPassagemFim.addEventListener("change", invalidarRelatorioPassagens);
  definirPeriodoPadraoPassagens();
  renderizarIdades();
  renderizarReferencias();
}

function mostrarArea(area) {
  document.querySelectorAll(".admin-view").forEach((view) => {
    view.hidden = view.id !== `view-${area}`;
  });
  document.querySelectorAll(".admin-nav").forEach((botao) => {
    const ativo = botao.dataset.adminView === area;
    botao.classList.toggle("admin-nav-active", ativo);
    botao.classList.toggle("bg-white", !ativo);
    botao.setAttribute("aria-current", ativo ? "page" : "false");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirModal(modal, foco) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => foco?.focus());
}

function fecharModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  if (!document.querySelector(".admin-modal:not(.hidden)")) document.body.classList.remove("modal-open");
}

function configurarBusca(input, chave, renderizar) {
  input.addEventListener("input", () => {
    paginas[chave] = 1;
    renderizar();
  });
}

function configurarPaginacao(container, chave, renderizar) {
  container.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-page]");
    if (!botao || botao.disabled) return;
    paginas[chave] = Number(botao.dataset.page);
    renderizar();
  });
}

function iniciarFirebase() {
  database = window.SGIFirebase?.database;

  if (!database) {
    atualizarStatus("Indisponível", "bg-red-500");
    alert("Não foi possível carregar os dados. Verifique a conexão com a internet.");
    return;
  }

  atualizarStatus("Conectando", "bg-amber-400");

  database.ref(DB_CLIENTES).on(
    "value",
    (snapshot) => {
      clientes = objetoParaLista(snapshot.val());
      clientesCarregados = true;
      renderizarTudo();
    },
    tratarErroFirebase,
  );

  database.ref(DB_OBRAS).on(
    "value",
    (snapshot) => {
      obras = objetoParaLista(snapshot.val());
      obrasCarregadas = true;
      renderizarTudo();
    },
    tratarErroFirebase,
  );

  database.ref(DB_FUNCIONARIOS_ROMPIMENTOS).on(
    "value",
    (snapshot) => {
      funcionariosRompimentos = objetoParaLista(snapshot.val());
      funcionariosRompimentosCarregados = true;
      funcionariosRompimentos.forEach((funcionario) => {
        (funcionario.referencias || []).forEach((referencia) => referenciasDisponiveis.add(referencia));
        (funcionario.idades || []).forEach((idade) => {
          if (Number.isInteger(Number(idade)) && Number(idade) > 0) idadesDisponiveis.add(Number(idade));
        });
      });
      renderizarReferencias(referenciasSelecionadas());
      renderizarIdades(idadesSelecionadas());
      renderizarTudo();
    },
    tratarErroFirebase,
  );

  database.ref(DB_FUNCIONARIOS_PASSAGENS).on(
    "value",
    (snapshot) => {
      funcionariosPassagens = objetoParaLista(snapshot.val());
      funcionariosPassagensCarregados = true;
      renderizarTudo();
    },
    tratarErroFirebase,
  );

  database.ref(DB_AVISOS).on(
    "value",
    (snapshot) => {
      avisos = objetoParaLista(snapshot.val()).sort((a, b) => Date.parse(b.criadoEm || b.inicioEm) - Date.parse(a.criadoEm || a.inicioEm));
      avisosCarregados = true;
      renderizarTudo();
    },
    tratarErroFirebase,
  );
}

function renderizarTudo() {
  preencherClientes();
  preencherFuncionariosPassagens();
  renderizarClientes();
  renderizarObras();
  renderizarFuncionariosRompimentos();
  renderizarFuncionariosPassagens();
  renderizarAvisos();
  el.clientesTotal.textContent = clientesCarregados ? clientes.length : "—";
  el.obrasTotal.textContent = obrasCarregadas ? obras.length : "—";
  el.funcionariosTotal.textContent = funcionariosRompimentosCarregados ? funcionariosRompimentos.length : "—";
  el.funcionariosPassagensTotal.textContent = funcionariosPassagensCarregados ? funcionariosPassagens.length : "—";
  el.avisosTotal.textContent = avisosCarregados ? avisos.length : "—";

  if (clientesCarregados && obrasCarregadas && funcionariosRompimentosCarregados && funcionariosPassagensCarregados && avisosCarregados) {
    atualizarStatus("Sincronizado", "bg-emerald-400");
  }
}

function definirPeriodoPadraoPassagens() {
  const hoje = new Date();
  el.filtroPassagemInicio.value = isoDataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1, 12));
  el.filtroPassagemFim.value = isoDataLocal(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 12));
}

function preencherFuncionariosPassagens() {
  const idAnterior = el.filtroPassagemFuncionarioId.value;
  el.filtroPassagemFuncionariosOpcoes.innerHTML = "";
  funcionariosPassagens.filter((funcionario) => funcionario.ativo !== false).forEach((funcionario) => {
    const option = document.createElement("option");
    option.value = rotuloFuncionarioFiltro(funcionario);
    el.filtroPassagemFuncionariosOpcoes.appendChild(option);
  });
  const funcionarioAnterior = funcionariosPassagens.find((funcionario) => funcionario.id === idAnterior && funcionario.ativo !== false);
  if (funcionarioAnterior) {
    el.filtroPassagemFuncionario.value = rotuloFuncionarioFiltro(funcionarioAnterior);
  }
}

function rotuloFuncionarioFiltro(funcionario) {
  const nome = nomeCompletoFuncionario(funcionario);
  return funcionario.obra ? `${nome} - ${funcionario.obra}` : nome;
}

function resolverFuncionarioFiltro() {
  const termo = normalizarBusca(el.filtroPassagemFuncionario.value);
  if (!termo) return null;
  const ativos = funcionariosPassagens.filter((funcionario) => funcionario.ativo !== false);
  const exato = ativos.find((funcionario) =>
    normalizarBusca(rotuloFuncionarioFiltro(funcionario)) === termo || normalizarBusca(nomeCompletoFuncionario(funcionario)) === termo,
  );
  if (exato) return exato;
  const encontrados = ativos.filter((funcionario) => normalizarBusca(rotuloFuncionarioFiltro(funcionario)).includes(termo));
  return encontrados.length === 1 ? encontrados[0] : null;
}

function invalidarRelatorioPassagens() {
  passagensRelatorio = [];
  consultaPassagensRelatorio = null;
  el.btnExportarPassagensPdf.classList.add("hidden");
}

async function consultarPassagensExtras() {
  const funcionario = resolverFuncionarioFiltro();
  const funcionarioId = funcionario?.id || "";
  const inicio = el.filtroPassagemInicio.value;
  const fim = el.filtroPassagemFim.value;

  ocultarErroFiltroPassagens();
  invalidarRelatorioPassagens();
  if (!funcionario) return mostrarErroFiltroPassagens("Digite e selecione um funcionário da lista.");
  if (!inicio || !fim) return mostrarErroFiltroPassagens("Informe a data inicial e a data final.");
  if (inicio > fim) return mostrarErroFiltroPassagens("A data inicial não pode ser posterior à data final.");
  el.filtroPassagemFuncionarioId.value = funcionario.id;
  el.filtroPassagemFuncionario.value = rotuloFuncionarioFiltro(funcionario);

  el.btnFiltrarPassagens.disabled = true;
  el.btnFiltrarPassagens.classList.add("opacity-60");
  el.estadoPassagensAdmin.classList.remove("hidden");
  el.estadoPassagensAdmin.textContent = "Carregando passagens...";
  el.passagensAdminLista.innerHTML = "";
  el.nomeFuncionarioPassagens.textContent = nomeCompletoFuncionario(funcionario);

  try {
    const parametros = new URLSearchParams({ funcionarioId, inicio, fim });
    const resposta = await fetch(`/api/passagens-extras?${parametros.toString()}`, { headers: { Accept: "application/json" } });
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok || !resultado?.success) throw new Error("FALHA_PUBLICA");
    const passagens = (resultado.passagens || [])
      .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")) || String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
    passagensRelatorio = passagens;
    consultaPassagensRelatorio = { funcionario, inicio, fim };
    renderizarPassagensAdmin(passagens);
    el.btnExportarPassagensPdf.classList.toggle("hidden", !passagens.length);
  } catch {
    invalidarRelatorioPassagens();
    el.totalPassagensPeriodo.textContent = "0";
    el.passagensTotal.textContent = "0";
    el.estadoPassagensAdmin.classList.remove("hidden");
    el.estadoPassagensAdmin.textContent = "Não foi possível carregar as passagens. Tente novamente.";
  } finally {
    el.btnFiltrarPassagens.disabled = false;
    el.btnFiltrarPassagens.classList.remove("opacity-60");
  }
}

function renderizarPassagensAdmin(passagens) {
  el.totalPassagensPeriodo.textContent = String(passagens.length);
  el.passagensTotal.textContent = String(passagens.length);
  el.passagensAdminLista.innerHTML = "";
  if (!passagens.length) {
    el.estadoPassagensAdmin.classList.remove("hidden");
    el.estadoPassagensAdmin.textContent = "Nenhuma passagem extra encontrada no período selecionado.";
    return;
  }

  el.estadoPassagensAdmin.classList.add("hidden");
  passagens.forEach((passagem) => {
    const article = document.createElement("article");
    article.className = "grid gap-2 p-4 md:grid-cols-[130px_minmax(0,1fr)_40px_minmax(0,1fr)] md:items-center md:gap-3";
    article.innerHTML = `
      <div><span class="text-[10px] font-black uppercase text-red-600 md:hidden">Quando</span><p class="text-sm font-black text-slate-900">${escapeHtml(formatarDataPassagem(passagem.data))}</p><p class="text-xs font-bold capitalize text-slate-400">${escapeHtml(passagem.diaSemana || diaSemanaPassagem(passagem.data))}</p></div>
      <div><span class="text-[10px] font-black uppercase text-slate-400 md:hidden">Origem</span><p class="break-words text-sm font-bold text-slate-700">${escapeHtml(passagem.origemObra || "—")}</p></div>
      <div class="hidden text-center text-sky-600 md:block"><i class="fa-solid fa-arrow-right"></i></div>
      <div><span class="text-[10px] font-black uppercase text-slate-400 md:hidden">Destino</span><p class="break-words text-sm font-bold text-slate-700">${escapeHtml(passagem.destinoObra || "—")}</p></div>
      <div class="rounded-xl border border-amber-100 bg-amber-50/70 p-3 md:col-span-4">
        <p class="text-[10px] font-black uppercase tracking-wider text-amber-700"><i class="fa-solid fa-note-sticky mr-1"></i>Observações do funcionário</p>
        <p class="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-700">${escapeHtml(passagem.observacoes || "Sem observações informadas.")}</p>
      </div>
    `;
    el.passagensAdminLista.appendChild(article);
  });
}

async function exportarPassagensPdf() {
  if (!consultaPassagensRelatorio || !passagensRelatorio.length) {
    return mostrarErroFiltroPassagens("Consulte um período com passagens antes de exportar o PDF.");
  }
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) return mostrarErroFiltroPassagens("Não foi possível preparar o PDF. Recarregue a página e tente novamente.");

  ocultarErroFiltroPassagens();
  el.btnExportarPassagensPdf.disabled = true;
  el.btnExportarPassagensPdf.classList.add("opacity-60");
  const textoOriginal = el.btnExportarPassagensPdf.innerHTML;
  el.btnExportarPassagensPdf.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Gerando PDF';

  try {
    const { funcionario, inicio, fim } = consultaPassagensRelatorio;
    const doc = new JsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
    if (typeof doc.autoTable !== "function") throw new Error("AUTOTABLE_INDISPONIVEL");
    const logo = await carregarImagemRelatorio("../assets/logo.png");
    const nomeFuncionario = nomeCompletoFuncionario(funcionario);
    const geradoEm = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
    const linhas = passagensRelatorio.map((passagem) => [
      formatarDataPassagem(passagem.data),
      passagem.diaSemana || diaSemanaPassagem(passagem.data),
      passagem.origemObra || "Não informado",
      passagem.destinoObra || "Não informado",
      passagem.observacoes || "Sem observações informadas.",
    ].map(textoPdf));

    doc.setProperties({
      title: `Relatorio de passagens extras - ${nomeFuncionario}`,
      subject: `Passagens extras de ${formatarDataPassagem(inicio)} a ${formatarDataPassagem(fim)}`,
      author: "SGI ConcreFuji",
      creator: "SGI ConcreFuji",
    });

    doc.autoTable({
      startY: 55,
      margin: { top: 27, right: 12, bottom: 18, left: 12 },
      head: [["Data", "Dia da semana", "Origem", "Destino", "Observações"]],
      body: linhas,
      theme: "grid",
      rowPageBreak: "avoid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.6,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        textColor: [51, 65, 85],
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
        1: { cellWidth: 31 },
        2: { cellWidth: 58 },
        3: { cellWidth: 58 },
        4: { cellWidth: 95 },
      },
      didDrawPage(data) {
        desenharCabecalhoRelatorio(doc, data.pageNumber, {
          logo,
          nomeFuncionario,
          obra: funcionario.obra || "Não informada",
          inicio,
          fim,
          total: passagensRelatorio.length,
          geradoEm,
        });
      },
    });

    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);
      doc.setDrawColor(226, 232, 240);
      doc.line(12, 194, 285, 194);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SGI ConcreFuji - Relatório administrativo para arquivo do RH", 12, 199);
      doc.text(`Página ${pagina} de ${totalPaginas}`, 285, 199, { align: "right" });
    }

    const nomeArquivo = textoPdf(nomeFuncionario)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLocaleLowerCase("pt-BR");
    doc.save(`passagens-extras-${nomeArquivo}-${inicio}-a-${fim}.pdf`);
  } catch {
    mostrarErroFiltroPassagens("Não foi possível gerar o PDF. Tente novamente.");
  } finally {
    el.btnExportarPassagensPdf.disabled = false;
    el.btnExportarPassagensPdf.classList.remove("opacity-60");
    el.btnExportarPassagensPdf.innerHTML = textoOriginal;
  }
}

function desenharCabecalhoRelatorio(doc, pagina, dados) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  if (pagina === 1) {
    if (dados.logo) doc.addImage(dados.logo, "PNG", 12, 8, 47, 13.5);
    doc.setFontSize(16);
    doc.text("RELATÓRIO DE PASSAGENS EXTRAS", 67, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emitido em ${textoPdf(dados.geradoEm)}`, 67, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Funcionário: ${textoPdf(dados.nomeFuncionario)}`, 12, 31);
    doc.text(`Obra atual: ${textoPdf(dados.obra)}`, 12, 38);
    doc.text(`Período: ${formatarDataPassagem(dados.inicio)} a ${formatarDataPassagem(dados.fim)}`, 12, 45);

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(245, 28, 40, 18, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    doc.text("TOTAL DE PASSAGENS", 265, 34, { align: "center" });
    doc.setFontSize(15);
    doc.text(String(dados.total), 265, 42, { align: "center" });
    doc.setDrawColor(185, 28, 28);
    doc.setLineWidth(0.8);
    doc.line(12, 50, 285, 50);
    return;
  }

  doc.setFontSize(10);
  doc.text(`Passagens extras - ${textoPdf(dados.nomeFuncionario)}`, 12, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${formatarDataPassagem(dados.inicio)} a ${formatarDataPassagem(dados.fim)}`, 285, 14, { align: "right" });
  doc.setDrawColor(185, 28, 28);
  doc.setLineWidth(0.6);
  doc.line(12, 20, 285, 20);
}

function carregarImagemRelatorio(caminho) {
  return new Promise((resolve) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => resolve(null);
    imagem.src = caminho;
  });
}

function textoPdf(valor) {
  return String(valor || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u00a0/g, " ");
}

function mostrarErroFiltroPassagens(mensagem) {
  el.erroFiltroPassagens.textContent = mensagem;
  el.erroFiltroPassagens.classList.remove("hidden");
}

function ocultarErroFiltroPassagens() {
  el.erroFiltroPassagens.textContent = "";
  el.erroFiltroPassagens.classList.add("hidden");
}

function formatarDataPassagem(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${iso}T12:00:00`));
}

function diaSemanaPassagem(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(`${iso}T12:00:00`));
}

function isoDataLocal(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function renderizarReferencias(selecionadas = []) {
  const marcadas = new Set(selecionadas.map((valor) => String(valor).toLocaleUpperCase("pt-BR")));
  el.referenciasOpcoes.innerHTML = "";
  [...referenciasDisponiveis].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach((referencia) => {
    const label = document.createElement("label");
    label.className = "flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700";
    label.innerHTML = `
      <input type="checkbox" name="funcionarioReferencia" value="${escapeHtml(referencia)}" class="h-5 w-5 accent-red-600" ${marcadas.has(referencia.toLocaleUpperCase("pt-BR")) ? "checked" : ""} />
      <span class="break-all">${escapeHtml(referencia)}</span>
    `;
    el.referenciasOpcoes.appendChild(label);
  });
}

function renderizarIdades(selecionadas = []) {
  const marcadas = new Set(selecionadas.map(Number));
  el.idadesOpcoes.innerHTML = "";
  [...idadesDisponiveis].sort((a, b) => a - b).forEach((idade) => {
    const label = document.createElement("label");
    label.className = "flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700";
    label.innerHTML = `
      <input type="checkbox" name="funcionarioIdade" value="${idade}" class="h-5 w-5 accent-red-600" ${marcadas.has(idade) ? "checked" : ""} />
      ${rotuloIdade(idade)}
    `;
    el.idadesOpcoes.appendChild(label);
  });
}

function criarCampoNovaIdade() {
  const container = document.createElement("div");
  container.className = "mt-2 flex gap-2";
  container.innerHTML = `
    <input id="novaIdade" type="number" inputmode="numeric" min="1" step="1" class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-red-500" placeholder="Outra idade em dias" />
    <button id="btnAdicionarIdade" type="button" class="min-h-11 shrink-0 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase text-white">Adicionar</button>
  `;
  el.idadesOpcoes.insertAdjacentElement("afterend", container);
  el.novaIdade = container.querySelector("#novaIdade");
  el.btnAdicionarIdade = container.querySelector("#btnAdicionarIdade");
}

function adicionarReferencia() {
  const referencia = normalizarReferencia(el.novaReferencia.value);
  if (!referencia) return alert("Informe uma referência válida.");
  const selecionadas = referenciasSelecionadas();
  referenciasDisponiveis.add(referencia);
  selecionadas.push(referencia);
  renderizarReferencias(selecionadas);
  el.novaReferencia.value = "";
}

function adicionarIdade() {
  const idade = Number(el.novaIdade.value);
  if (!Number.isInteger(idade) || idade <= 0) return alert("Informe uma idade válida em dias.");
  const selecionadas = idadesSelecionadas();
  idadesDisponiveis.add(idade);
  selecionadas.push(idade);
  renderizarIdades(selecionadas);
  el.novaIdade.value = "";
}

function referenciasSelecionadas() {
  return [...el.referenciasOpcoes.querySelectorAll('input[name="funcionarioReferencia"]:checked')]
    .map((input) => input.value);
}

function idadesSelecionadas() {
  return [...el.idadesOpcoes.querySelectorAll('input[name="funcionarioIdade"]:checked')]
    .map((input) => Number(input.value))
    .filter(Number.isFinite);
}

function renderizarFuncionariosRompimentos() {
  const termo = normalizarBusca(el.buscaFuncionarios.value);
  const filtrados = funcionariosRompimentos.filter((funcionario) =>
    normalizarBusca([
      nomeCompletoFuncionario(funcionario),
      funcionario.obra,
      ...(funcionario.referencias || []),
      ...(funcionario.idades || []).map((idade) => `${idade} dias`),
    ].join(" ")).includes(termo),
  );
  const pagina = paginar(filtrados, "funcionarios");

  if (!filtrados.length) {
    el.funcionariosRompimentosLista.innerHTML = vazio(termo ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado para rompimentos.");
    renderizarPaginacao(el.paginacaoFuncionarios, pagina, "funcionarios");
    return;
  }

  el.funcionariosRompimentosLista.innerHTML = "";
  pagina.itens.forEach((funcionario) => {
    const article = document.createElement("article");
    article.className = "p-4";
    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="break-words font-black text-slate-900">${escapeHtml(nomeCompletoFuncionario(funcionario))}</h4>
          <p class="break-words text-xs font-bold text-slate-500">Obra: ${escapeHtml(funcionario.obra || "-")}</p>
          <div class="mt-3 flex flex-wrap gap-1">${chips(funcionario.referencias, "bg-slate-100 text-slate-600")}</div>
          <div class="mt-1 flex flex-wrap gap-1">${chips((funcionario.idades || []).map(rotuloIdade), "bg-red-50 text-red-700")}</div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" data-action="editar-funcionario" data-id="${funcionario.id}" class="h-11 w-11 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Editar funcionário">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" data-action="excluir-funcionario" data-id="${funcionario.id}" class="h-11 w-11 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700" aria-label="Excluir funcionário">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    el.funcionariosRompimentosLista.appendChild(article);
  });
  renderizarPaginacao(el.paginacaoFuncionarios, pagina, "funcionarios");
}

function renderizarFuncionariosPassagens() {
  const termo = normalizarBusca(el.buscaFuncionariosPassagens.value);
  const filtrados = funcionariosPassagens.filter((funcionario) =>
    normalizarBusca(`${nomeCompletoFuncionario(funcionario)} ${funcionario.obra || ""}`).includes(termo),
  );
  const pagina = paginar(filtrados, "funcionariosPassagens");

  if (!filtrados.length) {
    el.funcionariosPassagensLista.innerHTML = vazio(termo ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado para passagens extras.");
    renderizarPaginacao(el.paginacaoFuncionariosPassagens, pagina, "funcionariosPassagens");
    return;
  }

  el.funcionariosPassagensLista.innerHTML = "";
  pagina.itens.forEach((funcionario) => {
    const article = document.createElement("article");
    article.className = "p-4";
    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="break-words font-black text-slate-900">${escapeHtml(nomeCompletoFuncionario(funcionario))}</h4>
          <p class="break-words text-xs font-bold text-slate-500">Obra atual: ${escapeHtml(funcionario.obra || "Não informada")}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" data-action="editar-funcionario-passagem" data-id="${funcionario.id}" class="h-11 w-11 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Editar funcionário de passagens"><i class="fa-solid fa-pen"></i></button>
          <button type="button" data-action="excluir-funcionario-passagem" data-id="${funcionario.id}" class="h-11 w-11 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700" aria-label="Excluir funcionário de passagens"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    el.funcionariosPassagensLista.appendChild(article);
  });
  renderizarPaginacao(el.paginacaoFuncionariosPassagens, pagina, "funcionariosPassagens");
}

async function salvarFuncionarioPassagem(event) {
  event.preventDefault();
  const nome = normalizarTexto(el.funcionarioPassagemNome.value);
  const sobrenome = normalizarTexto(el.funcionarioPassagemSobrenome.value);
  const obra = normalizarTexto(el.funcionarioPassagemObra.value);
  const senha = el.funcionarioPassagemSenha.value.normalize("NFKC");
  const funcionarioAtual = funcionariosPassagens.find((item) => item.id === funcionarioPassagemEmEdicaoId);

  if (!nome) return alert("Informe o nome do funcionário.");
  if (!sobrenome) return alert("Informe o sobrenome do funcionário.");
  if (!obra) return alert("Informe a obra atual do funcionário.");
  if (!senha && !funcionarioAtual?.senhaHash) return alert("Crie uma senha de acesso para o funcionário.");
  if (senha && senha.length < 4) return alert("A senha deve ter pelo menos 4 caracteres.");
  if (funcionariosPassagens.some((funcionario) =>
    funcionario.id !== funcionarioPassagemEmEdicaoId && mesmoTexto(nomeCompletoFuncionario(funcionario), `${nome} ${sobrenome}`),
  )) return alert("Esse funcionário já está cadastrado para passagens extras.");

  const dados = { nome, sobrenome, obra, ativo: true };
  if (senha) Object.assign(dados, await gerarCredencialPassagens(senha), { senha: null });
  if (funcionarioPassagemEmEdicaoId) {
    await database.ref(`${DB_FUNCIONARIOS_PASSAGENS}/${funcionarioPassagemEmEdicaoId}`).update({ ...dados, atualizadoEm: new Date().toISOString() });
  } else {
    await database.ref(DB_FUNCIONARIOS_PASSAGENS).push({ ...dados, criadoEm: new Date().toISOString() });
  }
  cancelarEdicaoFuncionarioPassagem();
}

function tratarCliqueFuncionarioPassagem(event) {
  const botao = event.target.closest("button[data-action]");
  if (!botao) return;
  const funcionario = funcionariosPassagens.find((item) => item.id === botao.dataset.id);
  if (!funcionario) return;
  if (botao.dataset.action === "editar-funcionario-passagem") editarFuncionarioPassagem(funcionario);
  if (botao.dataset.action === "excluir-funcionario-passagem") excluirFuncionarioPassagem(funcionario);
}

function editarFuncionarioPassagem(funcionario) {
  funcionarioPassagemEmEdicaoId = funcionario.id;
  el.funcionarioPassagemNome.value = funcionario.nome || "";
  el.funcionarioPassagemSobrenome.value = funcionario.sobrenome || "";
  el.funcionarioPassagemObra.value = funcionario.obra || "";
  el.funcionarioPassagemSenha.value = "";
  el.ajudaFuncionarioPassagemSenha.textContent = funcionario.senhaHash
    ? "Deixe em branco para manter a senha atual ou digite uma nova para substituí-la."
    : "Este funcionário ainda não possui senha. Crie uma para liberar o acesso.";
  el.funcionarioPassagemFormTitulo.textContent = "Editar funcionário de passagens";
  el.btnSalvarFuncionarioPassagem.textContent = "Atualizar funcionário";
  el.btnCancelarFuncionarioPassagem.classList.remove("hidden");
  abrirModal(el.modalFuncionarioPassagem, el.funcionarioPassagemNome);
}

async function excluirFuncionarioPassagem(funcionario) {
  if (!confirm(`Excluir o funcionário "${nomeCompletoFuncionario(funcionario)}" da lista de passagens extras? O histórico de passagens será preservado.`)) return;
  await database.ref(`${DB_FUNCIONARIOS_PASSAGENS}/${funcionario.id}`).remove();
  if (funcionarioPassagemEmEdicaoId === funcionario.id) cancelarEdicaoFuncionarioPassagem();
}

function cancelarEdicaoFuncionarioPassagem(fechar = true) {
  funcionarioPassagemEmEdicaoId = "";
  el.funcionarioPassagemFormTitulo.textContent = "Novo funcionário de passagens";
  el.btnSalvarFuncionarioPassagem.textContent = "Cadastrar funcionário";
  el.btnCancelarFuncionarioPassagem.classList.add("hidden");
  el.funcionarioPassagemNome.value = "";
  el.funcionarioPassagemSobrenome.value = "";
  el.funcionarioPassagemObra.value = "";
  el.funcionarioPassagemSenha.value = "";
  el.ajudaFuncionarioPassagemSenha.textContent = "A senha será solicitada quando o funcionário entrar no módulo.";
  if (fechar) fecharModal(el.modalFuncionarioPassagem);
}

async function gerarCredencialPassagens(senha) {
  const iteracoes = 120000;
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iteracoes },
    chave,
    256,
  );
  const base64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return { senhaHash: base64(hash), senhaSalt: base64(saltBytes), senhaIteracoes: iteracoes };
}

async function salvarFuncionarioRompimento(event) {
  event.preventDefault();
  const nome = normalizarTexto(el.funcionarioNome.value);
  const sobrenome = normalizarTexto(el.funcionarioSobrenome.value);
  const obra = normalizarTexto(el.funcionarioObra.value);
  const referencias = referenciasSelecionadas().map(normalizarReferencia).filter(Boolean);
  const idades = idadesSelecionadas().sort((a, b) => a - b);

  if (!nome) return alert("Informe o nome do funcionário.");
  if (!sobrenome) return alert("Informe o sobrenome do funcionário.");
  if (!obra) return alert("Informe a obra do funcionário.");
  if (!referencias.length) return alert("Selecione ao menos uma referência.");
  if (!idades.length) return alert("Selecione ao menos uma idade.");
  const duplicado = funcionariosRompimentos.some((funcionario) =>
    funcionario.id !== funcionarioEmEdicaoId &&
    mesmoTexto(nomeCompletoFuncionario(funcionario), `${nome} ${sobrenome}`),
  );
  if (duplicado) return alert("Esse funcionário já está cadastrado.");

  const dados = { nome, sobrenome, obra, referencias: [...new Set(referencias)], idades, ativo: true };
  if (funcionarioEmEdicaoId) {
    await database.ref(`${DB_FUNCIONARIOS_ROMPIMENTOS}/${funcionarioEmEdicaoId}`).update({
      ...dados,
      atualizadoEm: new Date().toISOString(),
    });
  } else {
    await database.ref(DB_FUNCIONARIOS_ROMPIMENTOS).push({
      ...dados,
      criadoEm: new Date().toISOString(),
    });
  }

  cancelarEdicaoFuncionario();
}

function tratarCliqueFuncionario(event) {
  const botao = event.target.closest("button[data-action]");
  if (!botao) return;
  const funcionario = funcionariosRompimentos.find((item) => item.id === botao.dataset.id);
  if (!funcionario) return;
  if (botao.dataset.action === "editar-funcionario") editarFuncionario(funcionario);
  if (botao.dataset.action === "excluir-funcionario") excluirFuncionario(funcionario);
}

function editarFuncionario(funcionario) {
  funcionarioEmEdicaoId = funcionario.id;
  el.funcionarioNome.value = funcionario.nome || "";
  el.funcionarioSobrenome.value = funcionario.sobrenome || "";
  el.funcionarioObra.value = funcionario.obra || "";
  (funcionario.referencias || []).forEach((referencia) => referenciasDisponiveis.add(referencia));
  (funcionario.idades || []).forEach((idade) => idadesDisponiveis.add(Number(idade)));
  renderizarReferencias(funcionario.referencias || []);
  renderizarIdades(funcionario.idades || []);
  el.funcionarioFormTitulo.textContent = "Editar funcionário";
  el.btnSalvarFuncionario.textContent = "Atualizar funcionário";
  el.btnCancelarFuncionario.classList.remove("hidden");
  abrirModal(el.modalFuncionario, el.funcionarioNome);
}

async function excluirFuncionario(funcionario) {
  if (!confirm(`Excluir o funcionário "${nomeCompletoFuncionario(funcionario)}"?`)) return;
  await database.ref(`${DB_FUNCIONARIOS_ROMPIMENTOS}/${funcionario.id}`).remove();
  if (funcionarioEmEdicaoId === funcionario.id) cancelarEdicaoFuncionario();
}

function cancelarEdicaoFuncionario(fechar = true) {
  funcionarioEmEdicaoId = "";
  el.funcionarioFormTitulo.textContent = "Novo funcionário";
  el.btnSalvarFuncionario.textContent = "Cadastrar funcionário";
  el.btnCancelarFuncionario.classList.add("hidden");
  el.funcionarioNome.value = "";
  el.funcionarioSobrenome.value = "";
  el.funcionarioObra.value = "";
  el.novaReferencia.value = "";
  el.novaIdade.value = "";
  renderizarReferencias();
  renderizarIdades();
  if (fechar) fecharModal(el.modalFuncionario);
}

function nomeCompletoFuncionario(funcionario) {
  return `${funcionario.nome || ""} ${funcionario.sobrenome || ""}`.trim();
}

function normalizarReferencia(valor) {
  return normalizarTexto(valor).toLocaleUpperCase("pt-BR").replace(/[^A-ZÀ-ÖØ-Ý0-9._/-]/g, "");
}

function preencherClientes() {
  const valorAnterior = el.obraCliente.value;
  el.obraCliente.innerHTML = '<option value="">Selecione o cliente</option>';

  clientes.forEach((cliente) => {
    const option = document.createElement("option");
    option.value = cliente.id;
    option.textContent = cliente.nome;
    el.obraCliente.appendChild(option);
  });

  if (clientes.some((cliente) => cliente.id === valorAnterior)) {
    el.obraCliente.value = valorAnterior;
  }
}

function preencherPeriodoPadraoAviso() {
  const inicio = new Date();
  inicio.setSeconds(0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  el.avisoInicio.value = dataHoraParaInput(inicio);
  el.avisoFim.value = dataHoraParaInput(fim);
}

function dataHoraParaInput(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const pad = (numero) => String(numero).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function situacaoAviso(aviso) {
  const agora = Date.now();
  const inicio = Date.parse(aviso.inicioEm);
  const fim = Date.parse(aviso.fimEm);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return { texto: "Inválido", classe: "bg-red-50 text-red-700" };
  if (agora < inicio) return { texto: "Agendado", classe: "bg-sky-50 text-sky-700" };
  if (agora > fim) return { texto: "Encerrado", classe: "bg-slate-100 text-slate-500" };
  return { texto: "Em exibição", classe: "bg-emerald-50 text-emerald-700" };
}

function renderizarAvisos() {
  if (!avisosCarregados) return;
  if (!avisos.length) {
    el.avisosLista.innerHTML = vazio("Nenhum aviso cadastrado.");
    return;
  }

  el.avisosLista.innerHTML = avisos.map((aviso) => {
    const situacao = situacaoAviso(aviso);
    return `
      <article class="p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${situacao.classe}">${situacao.texto}</span>
            <p class="mt-3 whitespace-pre-line break-words text-sm font-bold leading-relaxed text-slate-800">${escapeHtml(aviso.mensagem)}</p>
            <p class="mt-3 text-xs font-semibold text-slate-400"><i class="fa-regular fa-calendar mr-1"></i>${escapeHtml(formatarDataHora(aviso.inicioEm))} até ${escapeHtml(formatarDataHora(aviso.fimEm))}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button type="button" data-action="editar-aviso" data-id="${aviso.id}" class="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Editar aviso"><i class="fa-solid fa-pen"></i></button>
            <button type="button" data-action="excluir-aviso" data-id="${aviso.id}" class="h-9 w-9 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700" aria-label="Excluir aviso"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

async function salvarAviso(event) {
  event.preventDefault();
  el.erroAviso.classList.add("hidden");
  const mensagem = String(el.avisoMensagem.value || "").trim();
  const inicio = new Date(el.avisoInicio.value);
  const fim = new Date(el.avisoFim.value);

  if (!mensagem) return exibirErroAviso("Informe a mensagem do aviso.");
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return exibirErroAviso("Informe o início e o fim da exibição.");
  if (fim <= inicio) return exibirErroAviso("O fim da exibição deve ser posterior ao início.");

  const dados = {
    mensagem,
    inicioEm: inicio.toISOString(),
    fimEm: fim.toISOString(),
    ativo: true,
  };

  try {
    if (avisoEmEdicaoId) {
      await database.ref(`${DB_AVISOS}/${avisoEmEdicaoId}`).update({ ...dados, atualizadoEm: new Date().toISOString() });
    } else {
      await database.ref(DB_AVISOS).push({ ...dados, criadoEm: new Date().toISOString() });
    }
    cancelarEdicaoAviso();
  } catch {
    exibirErroAviso("Não foi possível salvar o aviso. Tente novamente.");
  }
}

function exibirErroAviso(mensagem) {
  el.erroAviso.textContent = mensagem;
  el.erroAviso.classList.remove("hidden");
}

function tratarCliqueAviso(event) {
  const botao = event.target.closest("button[data-action]");
  if (!botao) return;
  const aviso = avisos.find((item) => item.id === botao.dataset.id);
  if (!aviso) return;
  if (botao.dataset.action === "editar-aviso") editarAviso(aviso);
  if (botao.dataset.action === "excluir-aviso") excluirAviso(aviso);
}

function editarAviso(aviso) {
  avisoEmEdicaoId = aviso.id;
  el.avisoMensagem.value = aviso.mensagem || "";
  el.avisoInicio.value = dataHoraParaInput(aviso.inicioEm);
  el.avisoFim.value = dataHoraParaInput(aviso.fimEm);
  el.avisoFormTitulo.textContent = "Editar aviso";
  el.btnSalvarAviso.textContent = "Atualizar aviso";
  el.btnCancelarAviso.classList.remove("hidden");
  el.erroAviso.classList.add("hidden");
  abrirModal(el.modalAviso, el.avisoMensagem);
}

async function excluirAviso(aviso) {
  if (!confirm("Excluir este aviso? Ele deixará de aparecer imediatamente no menu.")) return;
  await database.ref(`${DB_AVISOS}/${aviso.id}`).remove();
  if (avisoEmEdicaoId === aviso.id) cancelarEdicaoAviso();
}

function cancelarEdicaoAviso(fechar = true) {
  avisoEmEdicaoId = "";
  el.avisoFormTitulo.textContent = "Novo aviso";
  el.btnSalvarAviso.textContent = "Cadastrar aviso";
  el.btnCancelarAviso.classList.add("hidden");
  el.avisoMensagem.value = "";
  el.avisoInicio.value = "";
  el.avisoFim.value = "";
  el.erroAviso.classList.add("hidden");
  if (fechar) fecharModal(el.modalAviso);
}

function renderizarClientes() {
  const termo = normalizarBusca(el.buscaClientes.value);
  const filtrados = clientes.filter((cliente) => normalizarBusca(cliente.nome).includes(termo));
  const pagina = paginar(filtrados, "clientes");
  if (!filtrados.length) {
    el.clientesLista.innerHTML = vazio(termo ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado.");
    renderizarPaginacao(el.paginacaoClientes, pagina, "clientes");
    return;
  }

  el.clientesLista.innerHTML = "";
  pagina.itens.forEach((cliente) => {
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-3 px-4 py-4 text-sm font-bold text-slate-700";
    div.innerHTML = `
      <i class="fa-solid fa-circle-check text-emerald-500"></i>
      <span class="flex-1">${escapeHtml(cliente.nome)}</span>
      <button type="button" data-action="editar-cliente" data-id="${cliente.id}" class="h-8 w-8 rounded-lg text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Editar cliente">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button type="button" data-action="excluir-cliente" data-id="${cliente.id}" class="h-8 w-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700" aria-label="Excluir cliente">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    el.clientesLista.appendChild(div);
  });
  renderizarPaginacao(el.paginacaoClientes, pagina, "clientes");
}

function renderizarObras() {
  const ordenadas = [...obras].sort((a, b) => nomeCliente(a.clienteId).localeCompare(nomeCliente(b.clienteId), "pt-BR"));
  const termo = normalizarBusca(el.buscaObras.value);
  const filtradas = ordenadas.filter((obra) => normalizarBusca([
    obra.nome,
    obra.referencia,
    obra.endereco,
    nomeCliente(obra.clienteId),
  ].join(" ")).includes(termo));
  const pagina = paginar(filtradas, "obras");
  if (!filtradas.length) {
    el.obrasLista.innerHTML = vazio(termo ? "Nenhuma obra encontrada." : "Nenhuma obra cadastrada.");
    renderizarPaginacao(el.paginacaoObras, pagina, "obras");
    return;
  }

  el.obrasLista.innerHTML = "";
  pagina.itens.forEach((obra) => {
    const div = document.createElement("article");
    div.className = "p-4";
    div.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(nomeCliente(obra.clienteId))}</p>
          <h4 class="font-black text-slate-900">${escapeHtml(obra.nome)}</h4>
          <p class="text-xs font-bold text-slate-500">Referência: ${escapeHtml(obra.referencia)}</p>
          <a class="inline-flex items-center gap-1 mt-2 text-xs font-black text-red-600 hover:text-red-700" href="${googleMapsUrl(obra.endereco)}" target="_blank" rel="noopener noreferrer">
            <i class="fa-solid fa-location-dot"></i>
            ${escapeHtml(obra.endereco)}
          </a>
          <p class="text-xs text-slate-500 mt-2">Contato: ${escapeHtml(obra.contato || "-")}</p>
          ${obra.observacoes ? `<p class="text-xs text-slate-500 mt-1">${escapeHtml(obra.observacoes)}</p>` : ""}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" data-action="editar-obra" data-id="${obra.id}" class="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Editar obra">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" data-action="excluir-obra" data-id="${obra.id}" class="h-9 w-9 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-700" aria-label="Excluir obra">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    el.obrasLista.appendChild(div);
  });
  renderizarPaginacao(el.paginacaoObras, pagina, "obras");
}

async function salvarCliente(event) {
  event.preventDefault();
  const nome = normalizarTexto(el.clienteNome.value);

  if (!nome) return alert("Informe o nome do cliente.");
  if (clientes.some((cliente) => cliente.id !== clienteEmEdicaoId && mesmoTexto(cliente.nome, nome))) {
    return alert("Cliente já cadastrado.");
  }

  if (clienteEmEdicaoId) {
    await database.ref(`${DB_CLIENTES}/${clienteEmEdicaoId}`).update({
      nome,
      atualizadoEm: new Date().toISOString(),
    });
  } else {
    await database.ref(DB_CLIENTES).push({
      nome,
      criadoEm: new Date().toISOString(),
    });
  }

  cancelarEdicaoCliente();
}

async function salvarObra(event) {
  event.preventDefault();

  const clienteId = el.obraCliente.value;
  const nome = normalizarTexto(el.obraNome.value);
  const referencia = normalizarTexto(el.obraReferencia.value);
  const endereco = normalizarTexto(el.obraEndereco.value);
  const contato = normalizarTexto(el.obraContato.value);
  const observacoes = normalizarTexto(el.obraObservacoes.value);

  if (!clienteId) return alert("Selecione um cliente.");
  if (!nome) return alert("Informe o nome da obra.");
  if (!referencia) return alert("Informe a referência da obra.");
  if (!endereco) return alert("Informe o endereço da obra.");
  if (obras.some((obra) => obra.id !== obraEmEdicaoId && mesmoTexto(obra.referencia, referencia))) {
    return alert("Essa referência já está cadastrada em outra obra.");
  }

  const dadosObra = {
    clienteId,
    nome,
    referencia,
    endereco,
    contato,
    observacoes,
  };

  if (obraEmEdicaoId) {
    await database.ref(`${DB_OBRAS}/${obraEmEdicaoId}`).update({
      ...dadosObra,
      atualizadoEm: new Date().toISOString(),
    });
  } else {
    await database.ref(DB_OBRAS).push({
      ...dadosObra,
      criadoEm: new Date().toISOString(),
    });
  }

  cancelarEdicaoObra();
}

function tratarCliqueCliente(event) {
  const botao = event.target.closest("button[data-action]");
  if (!botao) return;

  const cliente = clientes.find((item) => item.id === botao.dataset.id);
  if (!cliente) return;

  if (botao.dataset.action === "editar-cliente") {
    editarCliente(cliente);
  }

  if (botao.dataset.action === "excluir-cliente") {
    excluirCliente(cliente);
  }
}

function tratarCliqueObra(event) {
  const botao = event.target.closest("button[data-action]");
  if (!botao) return;

  const obra = obras.find((item) => item.id === botao.dataset.id);
  if (!obra) return;

  if (botao.dataset.action === "editar-obra") {
    editarObra(obra);
  }

  if (botao.dataset.action === "excluir-obra") {
    excluirObra(obra);
  }
}

function editarCliente(cliente) {
  clienteEmEdicaoId = cliente.id;
  el.clienteNome.value = cliente.nome || "";
  el.clienteFormTitulo.textContent = "Editar cliente";
  el.btnSalvarCliente.textContent = "Atualizar cliente";
  el.btnCancelarCliente.classList.remove("hidden");
  abrirModal(el.modalCliente, el.clienteNome);
}

function editarObra(obra) {
  obraEmEdicaoId = obra.id;
  el.obraCliente.value = obra.clienteId || "";
  el.obraNome.value = obra.nome || "";
  el.obraReferencia.value = obra.referencia || "";
  el.obraEndereco.value = obra.endereco || "";
  el.obraContato.value = obra.contato || "";
  el.obraObservacoes.value = obra.observacoes || "";
  el.obraFormTitulo.textContent = "Editar obra";
  el.btnSalvarObra.textContent = "Atualizar obra";
  el.btnCancelarObra.classList.remove("hidden");
  abrirModal(el.modalObra, el.obraNome);
}

async function excluirCliente(cliente) {
  const obrasDoCliente = obras.filter((obra) => obra.clienteId === cliente.id);
  const mensagem = obrasDoCliente.length
    ? `Excluir o cliente "${cliente.nome}" e também ${obrasDoCliente.length} obra(s) vinculada(s)?`
    : `Excluir o cliente "${cliente.nome}"?`;

  if (!confirm(mensagem)) return;

  const updates = {};
  updates[`${DB_CLIENTES}/${cliente.id}`] = null;
  obrasDoCliente.forEach((obra) => {
    updates[`${DB_OBRAS}/${obra.id}`] = null;
  });

  await database.ref().update(updates);

  if (clienteEmEdicaoId === cliente.id) cancelarEdicaoCliente();
  if (obrasDoCliente.some((obra) => obra.id === obraEmEdicaoId)) cancelarEdicaoObra();
}

async function excluirObra(obra) {
  if (!confirm(`Excluir a obra "${obra.nome}"?`)) return;

  await database.ref(`${DB_OBRAS}/${obra.id}`).remove();
  if (obraEmEdicaoId === obra.id) cancelarEdicaoObra();
}

function cancelarEdicaoCliente(fechar = true) {
  clienteEmEdicaoId = "";
  el.clienteFormTitulo.textContent = "Novo cliente";
  el.btnSalvarCliente.textContent = "Cadastrar cliente";
  el.btnCancelarCliente.classList.add("hidden");
  el.clienteNome.value = "";
  if (fechar) fecharModal(el.modalCliente);
}

function cancelarEdicaoObra(fechar = true) {
  obraEmEdicaoId = "";
  el.obraFormTitulo.textContent = "Nova obra";
  el.btnSalvarObra.textContent = "Cadastrar obra";
  el.btnCancelarObra.classList.add("hidden");
  el.obraCliente.value = "";
  el.obraNome.value = "";
  el.obraReferencia.value = "";
  el.obraEndereco.value = "";
  el.obraContato.value = "";
  el.obraObservacoes.value = "";
  if (fechar) fecharModal(el.modalObra);
}

function atualizarStatus(texto, corClasse) {
  el.syncStatus.classList.remove("hidden");
  el.syncStatus.innerHTML = `<span class="h-2 w-2 rounded-full ${corClasse}"></span>${texto}`;
}

function tratarErroFirebase(error) {
  atualizarStatus("Indisponível", "bg-red-500");
  alert("Não foi possível carregar os dados. Tente novamente.");
}

function objetoParaLista(objeto) {
  return Object.entries(objeto || {})
    .map(([id, valor]) => ({ id, ...valor }))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}

function nomeCliente(clienteId) {
  return clientes.find((cliente) => cliente.id === clienteId)?.nome || "Cliente não encontrado";
}

function googleMapsUrl(endereco) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco || "")}`;
}

function normalizarTexto(valor) {
  return String(valor || "").trim().replace(/\s+/g, " ");
}

function mesmoTexto(a, b) {
  return normalizarTexto(a).toLocaleLowerCase("pt-BR") === normalizarTexto(b).toLocaleLowerCase("pt-BR");
}

function normalizarBusca(valor) {
  return normalizarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function rotuloIdade(idade) {
  const numero = Number(idade);
  return `${numero} ${numero === 1 ? "dia" : "dias"}`;
}

function paginar(lista, chave) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / ITENS_POR_PAGINA));
  paginas[chave] = Math.min(Math.max(1, paginas[chave]), totalPaginas);
  const inicio = (paginas[chave] - 1) * ITENS_POR_PAGINA;
  return {
    itens: lista.slice(inicio, inicio + ITENS_POR_PAGINA),
    paginaAtual: paginas[chave],
    totalPaginas,
    totalItens: lista.length,
  };
}

function renderizarPaginacao(container, pagina, chave) {
  const desabilitarAnterior = pagina.paginaAtual <= 1;
  const desabilitarProxima = pagina.paginaAtual >= pagina.totalPaginas;
  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-xs font-bold text-slate-400">${pagina.totalItens} registro(s)</span>
      <div class="flex items-center gap-2">
        <button type="button" data-page="${pagina.paginaAtual - 1}" ${desabilitarAnterior ? "disabled" : ""} class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
        <span class="whitespace-nowrap text-xs font-black text-slate-500">Página ${pagina.paginaAtual} de ${pagina.totalPaginas}</span>
        <button type="button" data-page="${pagina.paginaAtual + 1}" ${desabilitarProxima ? "disabled" : ""} class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
      </div>
    </div>
  `;
  container.dataset.paginationFor = chave;
}

function chips(valores = [], classes) {
  if (!valores.length) return '<span class="text-xs text-slate-400">—</span>';
  return valores.map((valor) => `<span class="rounded-full px-2 py-1 text-[10px] font-black ${classes}">${escapeHtml(valor)}</span>`).join("");
}

function vazio(texto) {
  return `<div class="p-5 text-center text-sm font-bold text-slate-400">${texto}</div>`;
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
