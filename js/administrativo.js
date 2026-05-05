const firebaseConfig = {
  apiKey: "AIzaSyAHb8-BZYbCano40rDz9xJTqVSJrXrbD1A",
  authDomain: "sgi-concrefuji.firebaseapp.com",
  databaseURL: "https://sgi-concrefuji-default-rtdb.firebaseio.com",
  projectId: "sgi-concrefuji",
  storageBucket: "sgi-concrefuji.firebasestorage.app",
  messagingSenderId: "811243775203",
  appId: "1:811243775203:web:7647d8c79cbcd19e7fd1d6",
  measurementId: "G-GF740Y87LC",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

const ADMIN_USER = "admin";
const ADMIN_PASS = "fuji2026";

const loginCard = document.getElementById("loginCard");
const painelAdmin = document.getElementById("painelAdmin");
const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const btnLogoutAdmin = document.getElementById("btnLogoutAdmin");
const adminUsuario = document.getElementById("adminUsuario");
const adminSenha = document.getElementById("adminSenha");
const statusAdmin = document.getElementById("statusAdmin");

const obraId = document.getElementById("obraId");
const obraNome = document.getElementById("obraNome");
const obraCliente = document.getElementById("obraCliente");
const obraEndereco = document.getElementById("obraEndereco");
const btnSalvarObra = document.getElementById("btnSalvarObra");
const btnCancelarEdicaoObra = document.getElementById("btnCancelarEdicaoObra");
const listaObras = document.getElementById("listaObras");

const filtroPontoFuncionario = document.getElementById("filtroPontoFuncionario");
const filtroPontoData = document.getElementById("filtroPontoData");
const listaPontos = document.getElementById("listaPontos");

const relatorioDataInicio = document.getElementById("relatorioDataInicio");
const relatorioDataFim = document.getElementById("relatorioDataFim");
const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
const resultadoRelatorio = document.getElementById("resultadoRelatorio");

let obrasCache = {};
let pontosCache = {};

async function geocodificarEndereco(endereco) {
  if (!endereco) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
  const resposta = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  if (!Array.isArray(dados) || !dados.length) return null;
  return {
    latitude: Number(dados[0].lat),
    longitude: Number(dados[0].lon),
  };
}

function setStatus(msg, erro = false) {
  statusAdmin.textContent = msg;
  statusAdmin.className = erro
    ? "text-xs text-red-600 mt-4 text-center"
    : "text-xs text-gray-500 mt-4 text-center";
}

function isAdminLogado() {
  return sessionStorage.getItem("isAdminPainel") === "true";
}

function atualizarVisibilidade() {
  const logado = isAdminLogado();
  loginCard.classList.toggle("hidden", logado);
  painelAdmin.classList.toggle("hidden", !logado);
  btnLogoutAdmin.classList.toggle("hidden", !logado);
  setStatus(logado ? "Painel administrativo liberado." : "Aguardando login administrativo.");
}

function limparFormularioObra() {
  obraId.value = "";
  obraNome.value = "";
  obraCliente.value = "";
  obraEndereco.value = "";
  btnSalvarObra.textContent = "Salvar Obra";
}

async function salvarObra() {
  if (!isAdminLogado()) return;

  const nome = obraNome.value.trim();
  const cliente = obraCliente.value.trim();
  const endereco = obraEndereco.value.trim();
  if (!nome || !cliente) {
    setStatus("Preencha ao menos nome da obra e cliente.", true);
    return;
  }

  const id = obraId.value || Date.now().toString();
  let coordenadas = null;
  if (endereco) {
    try {
      coordenadas = await geocodificarEndereco(endereco);
    } catch (erroGeo) {
      console.warn("Falha ao geocodificar endereço da obra:", erroGeo);
    }
  }

  await database.ref("obras/" + id).set({
    id,
    nome,
    cliente,
    endereco,
    localizacao: coordenadas
      ? {
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
        }
      : null,
    atualizadoEm: new Date().toISOString(),
  });

  limparFormularioObra();
  setStatus(
    coordenadas
      ? "Obra salva com endereço georreferenciado."
      : "Obra salva (sem coordenadas automáticas)."
  );
}

function editarObra(id) {
  const obra = obrasCache[id];
  if (!obra) return;
  obraId.value = obra.id;
  obraNome.value = obra.nome || "";
  obraCliente.value = obra.cliente || "";
  obraEndereco.value = obra.endereco || "";
  btnSalvarObra.textContent = "Atualizar Obra";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirObra(id) {
  if (!confirm("Excluir obra definitivamente?")) return;
  await database.ref("obras/" + id).remove();
  setStatus("Obra excluída.");
}

function renderObras() {
  const obras = Object.values(obrasCache || {}).reverse();
  if (!obras.length) {
    listaObras.innerHTML = '<li class="text-xs text-gray-400 italic">Nenhuma obra cadastrada.</li>';
    return;
  }

  listaObras.innerHTML = obras
    .map(
      (o) => `<li class="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <p class="text-xs font-bold text-gray-700">${o.nome}</p>
        <p class="text-[11px] text-gray-500">Cliente: ${o.cliente}</p>
        <p class="text-[11px] text-gray-500">Endereço: ${o.endereco || "-"}</p>
        <p class="text-[11px] text-gray-500">Coords: ${o.localizacao?.latitude ?? "-"} / ${o.localizacao?.longitude ?? "-"}</p>
        <div class="mt-2 flex gap-2">
          <button onclick="editarObra('${o.id}')" class="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold">Editar</button>
          <button onclick="excluirObra('${o.id}')" class="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded-md font-bold">Excluir</button>
        </div>
      </li>`
    )
    .join("");
}

function filtrarPontos() {
  const termo = (filtroPontoFuncionario.value || "").toLowerCase().trim();
  const data = filtroPontoData.value;

  return Object.values(pontosCache || {})
    .filter((p) => {
      const okNome = !termo || `${p.nome || ""} ${p.funcionarioId || ""}`.toLowerCase().includes(termo);
      const okData = !data || (p.dataIso && p.dataIso.startsWith(data));
      return okNome && okData;
    })
    .sort((a, b) => (a.dataIso < b.dataIso ? 1 : -1));
}

async function editarLocalizacaoPonto(id) {
  const ponto = pontosCache[id];
  if (!ponto) return;

  const latAtual = ponto.localizacao?.latitude ?? "";
  const lonAtual = ponto.localizacao?.longitude ?? "";

  const novaLat = prompt("Nova latitude:", String(latAtual));
  if (novaLat === null) return;
  const novaLon = prompt("Nova longitude:", String(lonAtual));
  if (novaLon === null) return;

  const lat = Number(novaLat);
  const lon = Number(novaLon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    setStatus("Latitude/longitude inválidas.", true);
    return;
  }

  await database.ref("pontos/" + id + "/localizacao").update({
    latitude: lat,
    longitude: lon,
    editadoManual: true,
    editadoEm: new Date().toISOString(),
  });

  setStatus("Localização do ponto atualizada.");
}

async function excluirPonto(id) {
  if (!confirm("Excluir este registro de ponto?")) return;
  await database.ref("pontos/" + id).remove();
  setStatus("Ponto excluído.");
}

function renderPontos() {
  const pontos = filtrarPontos();

  if (!pontos.length) {
    listaPontos.innerHTML = '<li class="text-xs text-gray-400 italic">Nenhum ponto encontrado.</li>';
    return;
  }

  listaPontos.innerHTML = pontos
    .map((p) => {
      const lat = p.localizacao?.latitude ?? "-";
      const lon = p.localizacao?.longitude ?? "-";
      const temCoordenada =
        typeof p.localizacao?.latitude === "number" &&
        typeof p.localizacao?.longitude === "number";
      const linkMaps = temCoordenada
        ? `https://www.google.com/maps?q=${p.localizacao.latitude},${p.localizacao.longitude}`
        : null;
      return `<li class="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <p class="text-xs font-bold text-gray-700">${p.nome || "Sem nome"} (${p.funcionarioId || "-"})</p>
        <p class="text-[11px] text-gray-500">Data: ${p.dataLocal || p.dataIso || "-"}</p>
        <p class="text-[11px] text-gray-500">Lat/Lon: ${lat} / ${lon}</p>
        ${
          linkMaps
            ? `<a href="${linkMaps}" target="_blank" rel="noopener noreferrer" class="inline-flex mt-2 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">Ver no Google Maps</a>`
            : `<span class="inline-flex mt-2 text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">Localização indisponível</span>`
        }
        <div class="mt-2 flex gap-2">
          <button onclick="editarLocalizacaoPonto('${p.registroId || p.id || ""}')" class="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold">Editar Localização</button>
          <button onclick="excluirPonto('${p.registroId || p.id || ""}')" class="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded-md font-bold">Excluir</button>
        </div>
      </li>`;
    })
    .join("");
}

function gerarRelatorio() {
  const inicio = relatorioDataInicio.value;
  const fim = relatorioDataFim.value;

  if (!inicio || !fim) {
    resultadoRelatorio.innerHTML = '<span class="text-red-600">Informe data inicial e final.</span>';
    return;
  }

  const inicioDate = new Date(inicio + "T00:00:00");
  const fimDate = new Date(fim + "T23:59:59");
  const pontos = Object.values(pontosCache || {}).filter((p) => {
    if (!p.dataIso) return false;
    const d = new Date(p.dataIso);
    return d >= inicioDate && d <= fimDate;
  });

  const agrupado = {};
  for (const p of pontos) {
    const funcionario = p.nome || p.funcionarioId || "Sem identificação";
    const data = (p.dataIso || "").slice(0, 10);
    if (!agrupado[funcionario]) agrupado[funcionario] = {};
    if (!agrupado[funcionario][data]) agrupado[funcionario][data] = [];
    agrupado[funcionario][data].push(new Date(p.dataIso));
  }

  const linhas = [];
  for (const funcionario of Object.keys(agrupado)) {
    let totalHoras = 0;
    let totalExtra = 0;

    for (const data of Object.keys(agrupado[funcionario])) {
      const registros = agrupado[funcionario][data].sort((a, b) => a - b);
      if (registros.length < 2) continue;

      const entrada = registros[0];
      const saida = registros[registros.length - 1];
      const horas = (saida - entrada) / (1000 * 60 * 60);
      const extra = Math.max(0, horas - 8);

      totalHoras += horas;
      totalExtra += extra;
    }

    linhas.push({ funcionario, totalHoras, totalExtra });
  }

  if (!linhas.length) {
    resultadoRelatorio.innerHTML = '<span class="text-gray-500">Sem dados suficientes no período.</span>';
    return;
  }

  resultadoRelatorio.innerHTML = linhas
    .sort((a, b) => b.totalExtra - a.totalExtra)
    .map(
      (l) => `<div class="border border-gray-100 rounded-xl p-3 mb-2 bg-gray-50">
        <p class="font-bold text-gray-700">${l.funcionario}</p>
        <p>Total de horas: ${l.totalHoras.toFixed(2)}h</p>
        <p class="text-red-600 font-bold">Horas extras: ${l.totalExtra.toFixed(2)}h</p>
      </div>`
    )
    .join("");
}

btnLoginAdmin.addEventListener("click", () => {
  const user = adminUsuario.value.trim();
  const pass = adminSenha.value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem("isAdminPainel", "true");
    atualizarVisibilidade();
    return;
  }

  setStatus("Usuário ou senha inválidos.", true);
});

btnLogoutAdmin.addEventListener("click", () => {
  sessionStorage.removeItem("isAdminPainel");
  atualizarVisibilidade();
});

btnSalvarObra.addEventListener("click", salvarObra);
btnCancelarEdicaoObra.addEventListener("click", limparFormularioObra);

filtroPontoFuncionario.addEventListener("input", renderPontos);
filtroPontoData.addEventListener("change", renderPontos);
btnGerarRelatorio.addEventListener("click", gerarRelatorio);

database.ref("obras").on("value", (s) => {
  obrasCache = s.val() || {};
  renderObras();
});

database.ref("pontos").on("value", (s) => {
  pontosCache = s.val() || {};
  renderPontos();
});

window.editarObra = editarObra;
window.excluirObra = excluirObra;
window.editarLocalizacaoPonto = editarLocalizacaoPonto;
window.excluirPonto = excluirPonto;

atualizarVisibilidade();
