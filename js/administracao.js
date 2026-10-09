const ADMIN_PASSWORD = "Fujita010474";
const ADMIN_ACCESS_KEY = "sgi_concrefuji_admin_autorizado";
const DB_CLIENTES = "administracao/clientes";
const DB_OBRAS = "administracao/obras";
const DB_FUNCIONARIOS_ROMPIMENTOS = "administracao/funcionariosRompimentos";
const IDADES_PADRAO = [3, 7, 14, 28, 56, 63];

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

const el = {
  accessModal: document.getElementById("accessModal"),
  accessForm: document.getElementById("accessForm"),
  accessPassword: document.getElementById("accessPassword"),
  accessError: document.getElementById("accessError"),
  togglePassword: document.getElementById("togglePassword"),
  syncStatus: document.getElementById("syncStatus"),

  formCliente: document.getElementById("formCliente"),
  clienteFormTitulo: document.getElementById("clienteFormTitulo"),
  clienteNome: document.getElementById("clienteNome"),
  btnSalvarCliente: document.getElementById("btnSalvarCliente"),
  btnCancelarCliente: document.getElementById("btnCancelarCliente"),
  clientesLista: document.getElementById("clientesLista"),

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

  formFuncionarioRompimento: document.getElementById("formFuncionarioRompimento"),
  funcionarioFormTitulo: document.getElementById("funcionarioFormTitulo"),
  funcionarioNome: document.getElementById("funcionarioNome"),
  funcionarioSobrenome: document.getElementById("funcionarioSobrenome"),
  funcionarioObra: document.getElementById("funcionarioObra"),
  referenciasOpcoes: document.getElementById("referenciasOpcoes"),
  novaReferencia: document.getElementById("novaReferencia"),
  btnAdicionarReferencia: document.getElementById("btnAdicionarReferencia"),
  idadesOpcoes: document.getElementById("idadesOpcoes"),
  btnSalvarFuncionario: document.getElementById("btnSalvarFuncionario"),
  btnCancelarFuncionario: document.getElementById("btnCancelarFuncionario"),
  funcionariosRompimentosLista: document.getElementById("funcionariosRompimentosLista"),
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
  el.formCliente.addEventListener("submit", salvarCliente);
  el.formObra.addEventListener("submit", salvarObra);
  el.btnCancelarCliente.addEventListener("click", cancelarEdicaoCliente);
  el.btnCancelarObra.addEventListener("click", cancelarEdicaoObra);
  el.clientesLista.addEventListener("click", tratarCliqueCliente);
  el.obrasLista.addEventListener("click", tratarCliqueObra);
  el.formFuncionarioRompimento.addEventListener("submit", salvarFuncionarioRompimento);
  el.btnCancelarFuncionario.addEventListener("click", cancelarEdicaoFuncionario);
  el.btnAdicionarReferencia.addEventListener("click", adicionarReferencia);
  el.novaReferencia.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      adicionarReferencia();
    }
  });
  el.funcionariosRompimentosLista.addEventListener("click", tratarCliqueFuncionario);
  renderizarIdades();
  renderizarReferencias();
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
      });
      renderizarReferencias(referenciasSelecionadas());
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
  IDADES_PADRAO.forEach((idade) => {
    const label = document.createElement("label");
    label.className = "flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700";
    label.innerHTML = `
      <input type="checkbox" name="funcionarioIdade" value="${idade}" class="h-5 w-5 accent-red-600" ${marcadas.has(idade) ? "checked" : ""} />
      ${idade} dias
    `;
    el.idadesOpcoes.appendChild(label);
  });
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
  if (!funcionariosRompimentos.length) {
    el.funcionariosRompimentosLista.innerHTML = vazio("Nenhum funcionário cadastrado para rompimentos.");
    return;
  }

  el.funcionariosRompimentosLista.innerHTML = "";
  funcionariosRompimentos.forEach((funcionario) => {
    const article = document.createElement("article");
    article.className = "p-4";
    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="break-words font-black text-slate-900">${escapeHtml(nomeCompletoFuncionario(funcionario))}</h4>
          <p class="break-words text-xs font-bold text-slate-500">Obra: ${escapeHtml(funcionario.obra || "-")}</p>
          <p class="mt-2 break-words text-xs text-slate-500"><strong>Referências:</strong> ${escapeHtml((funcionario.referencias || []).join(", ") || "-")}</p>
          <p class="break-words text-xs text-slate-500"><strong>Idades:</strong> ${escapeHtml((funcionario.idades || []).map((idade) => `${idade} dias`).join(", ") || "-")}</p>
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
  renderizarReferencias(funcionario.referencias || []);
  renderizarIdades(funcionario.idades || []);
  el.funcionarioFormTitulo.textContent = "Editar funcionário";
  el.btnSalvarFuncionario.textContent = "Atualizar funcionário";
  el.btnCancelarFuncionario.classList.remove("hidden");
  el.funcionarioNome.focus();
}

async function excluirFuncionario(funcionario) {
  if (!confirm(`Excluir o funcionário "${nomeCompletoFuncionario(funcionario)}"?`)) return;
  await database.ref(`${DB_FUNCIONARIOS_ROMPIMENTOS}/${funcionario.id}`).remove();
  if (funcionarioEmEdicaoId === funcionario.id) cancelarEdicaoFuncionario();
}

function cancelarEdicaoFuncionario() {
  funcionarioEmEdicaoId = "";
  el.funcionarioFormTitulo.textContent = "Cadastrar funcionário";
  el.btnSalvarFuncionario.textContent = "Cadastrar funcionário";
  el.btnCancelarFuncionario.classList.add("hidden");
  el.funcionarioNome.value = "";
  el.funcionarioSobrenome.value = "";
  el.funcionarioObra.value = "";
  el.novaReferencia.value = "";
  renderizarReferencias();
  renderizarIdades();
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
  if (!clientes.length) {
    el.clientesLista.innerHTML = '<p class="text-xs text-slate-400 font-bold">Nenhum cliente cadastrado.</p>';
    return;
  }

  el.clientesLista.innerHTML = "";
  clientes.forEach((cliente) => {
    const div = document.createElement("div");
    div.className =
      "flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-600";
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
}

function renderizarObras() {
  if (!obras.length) {
    el.obrasLista.innerHTML = vazio("Nenhuma obra cadastrada.");
    return;
  }

  const ordenadas = [...obras].sort((a, b) => nomeCliente(a.clienteId).localeCompare(nomeCliente(b.clienteId), "pt-BR"));

  el.obrasLista.innerHTML = "";
  ordenadas.forEach((obra) => {
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
  el.clienteNome.focus();
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
  el.obraNome.focus();
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

function cancelarEdicaoCliente() {
  clienteEmEdicaoId = "";
  el.clienteFormTitulo.textContent = "Clientes";
  el.btnSalvarCliente.textContent = "Cadastrar cliente";
  el.btnCancelarCliente.classList.add("hidden");
  el.clienteNome.value = "";
}

function cancelarEdicaoObra() {
  obraEmEdicaoId = "";
  el.obraFormTitulo.textContent = "Obras";
  el.btnSalvarObra.textContent = "Cadastrar obra";
  el.btnCancelarObra.classList.add("hidden");
  el.obraCliente.value = "";
  el.obraNome.value = "";
  el.obraReferencia.value = "";
  el.obraEndereco.value = "";
  el.obraContato.value = "";
  el.obraObservacoes.value = "";
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
