const ADMIN_PASSWORD = "Fujita010474";
const ADMIN_ACCESS_KEY = "sgi_concrefuji_admin_autorizado";
const DB_CLIENTES = "administracao/clientes";
const DB_OBRAS = "administracao/obras";
const DB_FUNCIONARIOS_ROMPIMENTOS = "administracao/funcionariosRompimentos";
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
let referenciasDisponiveis = new Set(["CSP", "VSP", "GSF"]);
let idadesDisponiveis = new Set(IDADES_PADRAO);
const paginas = { clientes: 1, obras: 1, funcionarios: 1 };

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
  configurarBusca(el.buscaClientes, "clientes", renderizarClientes);
  configurarBusca(el.buscaObras, "obras", renderizarObras);
  configurarBusca(el.buscaFuncionarios, "funcionarios", renderizarFuncionariosRompimentos);
  configurarPaginacao(el.paginacaoClientes, "clientes", renderizarClientes);
  configurarPaginacao(el.paginacaoObras, "obras", renderizarObras);
  configurarPaginacao(el.paginacaoFuncionarios, "funcionarios", renderizarFuncionariosRompimentos);
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
}

function renderizarTudo() {
  preencherClientes();
  renderizarClientes();
  renderizarObras();
  renderizarFuncionariosRompimentos();
  el.clientesTotal.textContent = clientesCarregados ? clientes.length : "—";
  el.obrasTotal.textContent = obrasCarregadas ? obras.length : "—";
  el.funcionariosTotal.textContent = funcionariosRompimentosCarregados ? funcionariosRompimentos.length : "—";

  if (clientesCarregados && obrasCarregadas && funcionariosRompimentosCarregados) {
    atualizarStatus("Sincronizado", "bg-emerald-400");
  }
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
