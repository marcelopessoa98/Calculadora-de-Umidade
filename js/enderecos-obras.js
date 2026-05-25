const DB_CLIENTES = "administracao/clientes";
const DB_OBRAS = "administracao/obras";

let database = null;
let clientes = [];
let obras = [];
let clientesCarregados = false;
let obrasCarregadas = false;

const el = {
  syncStatus: document.getElementById("syncStatus"),
  buscaObra: document.getElementById("buscaObra"),
  totalObras: document.getElementById("totalObras"),
  totalFiltradas: document.getElementById("totalFiltradas"),
  obrasLista: document.getElementById("obrasLista"),
};

document.addEventListener("DOMContentLoaded", () => {
  el.buscaObra.addEventListener("input", renderizarObras);
  iniciarFirebase();
});

function iniciarFirebase() {
  database = window.SGIFirebase?.database;

  if (!database) {
    atualizarStatus("Firebase indisponível", "bg-red-500");
    el.obrasLista.innerHTML = vazio("Não foi possível carregar o Firebase.");
    return;
  }

  atualizarStatus("Conectando", "bg-amber-400");

  database.ref(DB_CLIENTES).on(
    "value",
    (snapshot) => {
      clientes = objetoParaLista(snapshot.val());
      clientesCarregados = true;
      renderizarObras();
    },
    tratarErroFirebase,
  );

  database.ref(DB_OBRAS).on(
    "value",
    (snapshot) => {
      obras = objetoParaLista(snapshot.val());
      obrasCarregadas = true;
      renderizarObras();
    },
    tratarErroFirebase,
  );
}

function renderizarObras() {
  const termo = normalizarBusca(el.buscaObra.value);
  const filtradas = obras
    .filter((obra) => {
      const cliente = nomeCliente(obra.clienteId);
      const conteudo = normalizarBusca(`${cliente} ${obra.nome} ${obra.referencia}`);
      return !termo || conteudo.includes(termo);
    })
    .sort((a, b) => nomeCliente(a.clienteId).localeCompare(nomeCliente(b.clienteId), "pt-BR"));

  el.totalObras.textContent = String(obras.length);
  el.totalFiltradas.textContent = String(filtradas.length);

  if (clientesCarregados && obrasCarregadas) {
    atualizarStatus("Sincronizado", "bg-emerald-400");
  }

  if (!obras.length) {
    el.obrasLista.innerHTML = vazio("Nenhuma obra cadastrada.");
    return;
  }

  if (!filtradas.length) {
    el.obrasLista.innerHTML = vazio("Nenhuma obra encontrada para o filtro.");
    return;
  }

  el.obrasLista.innerHTML = "";
  filtradas.forEach((obra) => {
    const article = document.createElement("article");
    article.className = "rounded-lg bg-white border border-slate-200 p-4 shadow-sm";
    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(nomeCliente(obra.clienteId))}</p>
          <h2 class="font-black text-lg text-slate-900 leading-tight">${escapeHtml(obra.nome)}</h2>
          <p class="mt-1 text-xs font-black uppercase text-red-600">Referência: ${escapeHtml(obra.referencia)}</p>
        </div>
        <a
          href="${googleMapsUrl(obra.endereco)}"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 h-11 w-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
          aria-label="Abrir endereço no Google Maps"
        >
          <i class="fa-solid fa-map-location-dot"></i>
        </a>
      </div>

      <a
        class="inline-flex items-start gap-2 mt-4 text-sm font-bold text-slate-700 hover:text-red-600"
        href="${googleMapsUrl(obra.endereco)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="fa-solid fa-location-dot mt-1 text-red-500"></i>
        <span>${escapeHtml(obra.endereco)}</span>
      </a>

      ${obra.contato ? `<p class="mt-3 text-sm font-bold text-slate-600"><i class="fa-solid fa-phone text-slate-300 mr-2"></i>${escapeHtml(obra.contato)}</p>` : ""}
      ${obra.observacoes ? `<div class="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 font-medium">${escapeHtml(obra.observacoes)}</div>` : ""}
    `;
    el.obrasLista.appendChild(article);
  });
}

function atualizarStatus(texto, corClasse) {
  el.syncStatus.classList.remove("hidden");
  el.syncStatus.innerHTML = `<span class="h-2 w-2 rounded-full ${corClasse}"></span>${texto}`;
}

function tratarErroFirebase(error) {
  console.error("Erro no Firebase:", error);
  atualizarStatus(`Erro: ${error.code || "Firebase"}`, "bg-red-500");
  el.obrasLista.innerHTML = vazio(`Erro ao acessar o Firebase: ${error.code || error.message}`);
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

function normalizarBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function vazio(texto) {
  return `<div class="rounded-lg bg-white border border-slate-200 p-5 text-center text-sm font-bold text-slate-400">${texto}</div>`;
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
