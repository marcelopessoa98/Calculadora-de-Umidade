const ADMIN_PASSWORD = "Fujita010474";
const ADMIN_ACCESS_KEY = "sgi_concrefuji_admin_autorizado";
const DB_CLIENTES = "administracao/clientes";
const DB_OBRAS = "administracao/obras";

let database = null;
let clientes = [];
let obras = [];
let clientesCarregados = false;
let obrasCarregadas = false;
let clienteEmEdicaoId = "";
let obraEmEdicaoId = "";

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
}

function iniciarFirebase() {
  database = window.SGIFirebase?.database;

  if (!database) {
    atualizarStatus("Firebase indisponível", "bg-red-500");
    alert("Não foi possível carregar o Firebase. Verifique a conexão com a internet.");
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
}

function renderizarTudo() {
  preencherClientes();
  renderizarClientes();
  renderizarObras();

  if (clientesCarregados && obrasCarregadas) {
    atualizarStatus("Sincronizado", "bg-emerald-400");
  }
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
  console.error("Erro no Firebase:", error);
  atualizarStatus(`Erro: ${error.code || "Firebase"}`, "bg-red-500");
  alert(`Erro ao acessar o Firebase: ${error.code || error.message}`);
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
