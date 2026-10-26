const DB_FUNCIONARIOS = "administracao/funcionariosRompimentos";
const MENSAGEM_CARREGANDO = "Carregando rompimentos...";
const MENSAGEM_VAZIO = "Nenhum rompimento para esta data.";
const MENSAGEM_ERRO =
  "Não foi possível carregar os rompimentos. Tente novamente.";
const CACHE_SESSAO_TTL_MS = 10 * 60 * 1000;

let database = null;
let funcionarios = [];
let funcionarioSelecionado = null;
let mesExibido = inicioDoMes(new Date());
let dataSelecionada = dataLocalIso(new Date());
let datasComRompimentos = new Set();
let requisicaoAtual = 0;
let requisicaoNotificacoesAtual = 0;
let chaveAvisoAtual = "";
let chaveNotificacoesCarregadas = "";
let notificacoesCarregando = false;
const cacheSemanas = new Map();
const requisicoesSemanas = new Map();
const avisosFechados = new Set();

const el = {
  selecaoFuncionario: document.getElementById("selecaoFuncionario"),
  funcionariosLista: document.getElementById("funcionariosLista"),
  painelFuncionario: document.getElementById("painelFuncionario"),
  btnTrocarFuncionario: document.getElementById("btnTrocarFuncionario"),
  funcionarioNome: document.getElementById("funcionarioNome"),
  funcionarioObra: document.getElementById("funcionarioObra"),
  avisoRompimentosAtrasados: document.getElementById(
    "avisoRompimentosAtrasados",
  ),
  avisoRompimentosTexto: document.getElementById("avisoRompimentosTexto"),
  btnFecharAvisoAtrasos: document.getElementById("btnFecharAvisoAtrasos"),
  btnAlternarNotificacoes: document.getElementById("btnAlternarNotificacoes"),
  contadorNotificacoes: document.getElementById("contadorNotificacoes"),
  resumoNotificacoes: document.getElementById("resumoNotificacoes"),
  painelNotificacoes: document.getElementById("painelNotificacoes"),
  iconeNotificacoes: document.getElementById("iconeNotificacoes"),
  mesAnterior: document.getElementById("mesAnterior"),
  proximoMes: document.getElementById("proximoMes"),
  tituloMes: document.getElementById("tituloMes"),
  calendario: document.getElementById("calendario"),
  diaSemana: document.getElementById("diaSemana"),
  dataSelecionada: document.getElementById("dataSelecionada"),
  estadoRompimentos: document.getElementById("estadoRompimentos"),
  rompimentosLista: document.getElementById("rompimentosLista"),
};

document.addEventListener("DOMContentLoaded", () => {
  registrarEventos();
  carregarFuncionarios();
});

function registrarEventos() {
  el.funcionariosLista.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-funcionario-id]");
    if (!botao) return;
    selecionarFuncionario(botao.dataset.funcionarioId);
  });

  el.btnTrocarFuncionario.addEventListener("click", voltarParaFuncionarios);
  el.btnFecharAvisoAtrasos.addEventListener("click", fecharAvisoAtrasos);
  el.btnAlternarNotificacoes.addEventListener(
    "click",
    alternarCentralNotificacoes,
  );
  el.painelNotificacoes.addEventListener("click", (event) => {
    if (event.target.closest("[data-recarregar-notificacoes]"))
      carregarNotificacoesAtrasadas(true);
  });
  el.estadoRompimentos.addEventListener("click", (event) => {
    if (event.target.closest("[data-recarregar-rompimentos]"))
      carregarRompimentos();
  });
  el.mesAnterior.addEventListener("click", () => alterarMes(-1));
  el.proximoMes.addEventListener("click", () => alterarMes(1));
  el.calendario.addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-data]");
    if (!botao) return;
    dataSelecionada = botao.dataset.data;
    renderizarCalendario();
    carregarRompimentos();
  });
}

function carregarFuncionarios() {
  database = window.SGIFirebase?.database;
  if (!database) {
    renderizarMensagemFuncionarios(MENSAGEM_ERRO);
    return;
  }

  database.ref(DB_FUNCIONARIOS).on(
    "value",
    (snapshot) => {
      funcionarios = Object.entries(snapshot.val() || {})
        .map(([id, valor]) => ({ id, ...valor }))
        .filter((funcionario) => funcionario.ativo !== false)
        .sort((a, b) =>
          nomeCompleto(a).localeCompare(nomeCompleto(b), "pt-BR"),
        );
      renderizarFuncionarios();
    },
    () => renderizarMensagemFuncionarios(MENSAGEM_ERRO),
  );
}

function renderizarFuncionarios() {
  if (!funcionarios.length) {
    renderizarMensagemFuncionarios("Nenhum funcionário cadastrado.");
    return;
  }

  el.funcionariosLista.innerHTML = "";
  funcionarios.forEach((funcionario) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.funcionarioId = funcionario.id;
    botao.className =
      "w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98]";
    botao.innerHTML = `
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <i class="fa-solid fa-user"></i>
        </span>
        <span class="min-w-0 flex-1">
          <strong class="block break-words text-base font-black text-slate-900">${escapeHtml(nomeCompleto(funcionario))}</strong>
          <span class="block break-words text-xs font-bold text-slate-500">Obra: ${escapeHtml(funcionario.obra || "Não informada")}</span>
        </span>
        <i class="fa-solid fa-chevron-right shrink-0 text-slate-300"></i>
      </div>
      <span class="mt-3 inline-flex min-h-10 items-center text-xs font-black uppercase tracking-wide text-red-600">Ver rompimentos</span>
    `;
    el.funcionariosLista.appendChild(botao);
  });
}

function renderizarMensagemFuncionarios(mensagem) {
  el.funcionariosLista.innerHTML = `<div class="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500 sm:col-span-2">${escapeHtml(mensagem)}</div>`;
}

function selecionarFuncionario(id) {
  funcionarioSelecionado = funcionarios.find(
    (funcionario) => funcionario.id === id,
  );
  if (!funcionarioSelecionado) return;

  const hoje = dataIsoParaLocal(hojeSaoPauloIso());
  mesExibido = inicioDoMes(hoje);
  dataSelecionada = dataLocalIso(hoje);
  datasComRompimentos = new Set();
  el.funcionarioNome.textContent = nomeCompleto(funcionarioSelecionado);
  el.funcionarioObra.textContent = `Obra: ${funcionarioSelecionado.obra || "Não informada"}`;
  el.selecaoFuncionario.classList.add("hidden");
  el.painelFuncionario.classList.remove("hidden");
  prepararCentralNotificacoes();
  renderizarCalendario();
  carregarRompimentos();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function voltarParaFuncionarios() {
  requisicaoAtual += 1;
  requisicaoNotificacoesAtual += 1;
  funcionarioSelecionado = null;
  chaveAvisoAtual = "";
  el.avisoRompimentosAtrasados.hidden = true;
  el.avisoRompimentosAtrasados.classList.add("hidden");
  el.painelFuncionario.classList.add("hidden");
  el.selecaoFuncionario.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function alterarMes(delta) {
  mesExibido = new Date(
    mesExibido.getFullYear(),
    mesExibido.getMonth() + delta,
    1,
  );
  const hoje = dataIsoParaLocal(hojeSaoPauloIso());
  dataSelecionada =
    hoje.getFullYear() === mesExibido.getFullYear() &&
    hoje.getMonth() === mesExibido.getMonth()
      ? dataLocalIso(hoje)
      : dataLocalIso(mesExibido);
  datasComRompimentos = new Set();
  renderizarCalendario();
  carregarRompimentos();
}

function renderizarCalendario() {
  el.tituloMes.textContent = mesExibido.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  el.calendario.innerHTML = "";
  const primeiroDiaSemana = new Date(
    mesExibido.getFullYear(),
    mesExibido.getMonth(),
    1,
  ).getDay();
  const totalDias = new Date(
    mesExibido.getFullYear(),
    mesExibido.getMonth() + 1,
    0,
  ).getDate();

  for (let vazio = 0; vazio < primeiroDiaSemana; vazio += 1) {
    const espaco = document.createElement("span");
    espaco.setAttribute("aria-hidden", "true");
    el.calendario.appendChild(espaco);
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const data = new Date(mesExibido.getFullYear(), mesExibido.getMonth(), dia);
    const iso = dataLocalIso(data);
    const selecionado = iso === dataSelecionada;
    const temRompimento = datasComRompimentos.has(iso);
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.data = iso;
    botao.className = `calendar-day relative flex min-w-0 items-center justify-center rounded-xl text-sm font-black transition active:scale-95 ${
      selecionado
        ? "bg-red-600 text-white shadow-md"
        : "bg-slate-50 text-slate-700"
    }`;
    botao.setAttribute("role", "gridcell");
    botao.setAttribute(
      "aria-label",
      data.toLocaleDateString("pt-BR", { dateStyle: "long" }),
    );
    botao.setAttribute("aria-selected", selecionado ? "true" : "false");
    botao.innerHTML = `${dia}${temRompimento ? `<span class="absolute bottom-1 h-1.5 w-1.5 rounded-full ${selecionado ? "bg-white" : "bg-red-500"}"></span>` : ""}`;
    el.calendario.appendChild(botao);
  }

  atualizarTituloData();
}

async function carregarRompimentos() {
  if (!funcionarioSelecionado) return;
  const idRequisicao = ++requisicaoAtual;
  const funcionarioId = funcionarioSelecionado.id;
  const dataConsulta = dataSelecionada;
  mostrarEstado(MENSAGEM_CARREGANDO);

  let resultado;
  try {
    resultado = await obterRompimentosSemana(funcionarioId, dataConsulta);
    if (
      idRequisicao !== requisicaoAtual ||
      funcionarioSelecionado?.id !== funcionarioId
    )
      return;
  } catch (erro) {
    if (idRequisicao === requisicaoAtual)
      mostrarEstado(MENSAGEM_ERRO, true, codigoErroPublico(erro, "REDE"));
    return;
  }

  try {
    datasComRompimentos = new Set(resultado.datasComRompimentos || []);
    renderizarCalendario();
    renderizarRompimentos(
      (resultado.rompimentos || []).filter(
        (grupo) => grupo.data === dataConsulta,
      ),
    );
  } catch (erro) {
    console.error("Falha ao exibir rompimentos.", erro);
    if (idRequisicao === requisicaoAtual)
      mostrarEstado(MENSAGEM_ERRO, true, "TELA");
  }
}

async function obterRompimentosSemana(funcionarioId, dataConsulta) {
  const inicioSemana = inicioSemanaLocalIso(dataConsulta);
  const chaveCache = `${funcionarioId}:${inicioSemana}`;
  if (cacheSemanas.has(chaveCache)) return cacheSemanas.get(chaveCache);
  const cacheSessao = lerCacheSessao(chaveCache);
  if (cacheSessao) {
    cacheSemanas.set(chaveCache, cacheSessao);
    return cacheSessao;
  }
  if (requisicoesSemanas.has(chaveCache))
    return requisicoesSemanas.get(chaveCache);

  const requisicao = (async () => {
    const parametros = new URLSearchParams({
      funcionarioId,
      data: dataConsulta,
    });
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      let resposta;
      try {
        parametros.set("tentativa", `${Date.now()}-${tentativa}`);
        resposta = await fetch(`/api/rompimentos?${parametros.toString()}`, {
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
          cache: "no-store",
        });
      } catch (erro) {
        if (tentativa > 0) throw criarErroPublico("REDE", erro);
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      const resultado = await resposta.json().catch(() => null);
      if (resposta.ok && resultado?.success) {
        cacheSemanas.set(chaveCache, resultado);
        salvarCacheSessao(chaveCache, resultado);
        return resultado;
      }
      if (tentativa > 0 || ![502, 503, 504].includes(resposta.status))
        throw criarErroPublico(`HTTP ${resposta.status || 0}`);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    throw criarErroPublico("REDE");
  })();

  requisicoesSemanas.set(chaveCache, requisicao);
  try {
    return await requisicao;
  } finally {
    requisicoesSemanas.delete(chaveCache);
  }
}

function prepararCentralNotificacoes() {
  chaveAvisoAtual = "";
  chaveNotificacoesCarregadas = "";
  notificacoesCarregando = false;
  el.avisoRompimentosAtrasados.hidden = true;
  el.avisoRompimentosAtrasados.classList.add("hidden");
  el.contadorNotificacoes.hidden = true;
  el.contadorNotificacoes.classList.add("hidden");
  el.contadorNotificacoes.textContent = "";
  el.resumoNotificacoes.textContent = "Toque para verificar pendências.";
  el.painelNotificacoes.innerHTML =
    '<p class="text-sm font-bold text-slate-500">Abra para consultar os rompimentos anteriores.</p>';
  definirCentralAberta(false);
}

async function carregarNotificacoesAtrasadas(forcar = false) {
  if (!funcionarioSelecionado) return;
  const idRequisicao = ++requisicaoNotificacoesAtual;
  const funcionarioId = funcionarioSelecionado.id;
  const hoje = hojeSaoPauloIso();
  const chaveConsulta = `${funcionarioId}:${hoje}`;
  if (!forcar && (notificacoesCarregando || chaveNotificacoesCarregadas === chaveConsulta)) return;
  notificacoesCarregando = true;
  const inicio = `${hoje.slice(0, 8)}01`;
  const fim = adicionarDiasIso(hoje, -1);

  el.resumoNotificacoes.textContent = "Verificando pendências...";
  el.painelNotificacoes.innerHTML =
    '<p class="text-sm font-bold text-slate-500">Verificando pendências...</p>';

  if (fim < inicio) {
    renderizarNotificacoesAtrasadas([], false, funcionarioId, hoje);
    chaveNotificacoesCarregadas = chaveConsulta;
    notificacoesCarregando = false;
    return;
  }

  const semanaAtual = inicioSemanaLocalIso(hoje);
  const semanas = iniciosSemanasNoIntervalo(inicio, fim).sort((a, b) => {
    if (a === semanaAtual) return -1;
    if (b === semanaAtual) return 1;
    return a.localeCompare(b);
  });
  const resultados = await executarComLimite(semanas, 2, async (semana) => {
    try {
      return {
        sucesso: true,
        resultado: await obterRompimentosSemana(funcionarioId, semana),
      };
    } catch {
      return { sucesso: false, resultado: null };
    }
  });

  if (
    idRequisicao !== requisicaoNotificacoesAtual ||
    funcionarioSelecionado?.id !== funcionarioId
  )
    return void (notificacoesCarregando = false);

  const datas = new Set();
  resultados.forEach(({ sucesso, resultado }) => {
    if (!sucesso) return;
    (resultado.rompimentos || []).forEach((grupo) => {
      if (grupo.data >= inicio && grupo.data <= fim) datas.add(grupo.data);
    });
  });
  const houveFalha = resultados.some((item) => !item.sucesso);
  renderizarNotificacoesAtrasadas(
    [...datas].sort(),
    houveFalha,
    funcionarioId,
    hoje,
  );
  chaveNotificacoesCarregadas = chaveConsulta;
  notificacoesCarregando = false;
}

function renderizarNotificacoesAtrasadas(
  datas,
  houveFalha,
  funcionarioId,
  hoje,
) {
  const mensagem = datas.length ? mensagemAvisoAtrasos(datas) : "";
  chaveAvisoAtual = `${funcionarioId}:${hoje}:${datas.join(",")}`;

  el.contadorNotificacoes.textContent = String(datas.length);
  el.contadorNotificacoes.hidden = !datas.length;
  el.contadorNotificacoes.classList.toggle("hidden", !datas.length);
  el.resumoNotificacoes.textContent = datas.length
    ? `${datas.length} ${datas.length === 1 ? "data pendente" : "datas pendentes"}`
    : houveFalha
      ? MENSAGEM_ERRO
      : "Nenhuma pendência anterior encontrada.";

  const blocos = [];
  if (datas.length) {
    blocos.push(`
      <article class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
        ${escapeHtml(mensagem)}
      </article>
    `);
  } else if (!houveFalha) {
    blocos.push(
      '<p class="text-sm font-bold text-slate-500">Nenhuma notificação pendente.</p>',
    );
  }
  if (houveFalha) {
    blocos.push(`
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-3">
        <p class="text-sm font-bold text-slate-600">${escapeHtml(MENSAGEM_ERRO)}</p>
        <button type="button" data-recarregar-notificacoes class="min-h-10 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase text-white">Tentar novamente</button>
      </div>
    `);
  }
  el.painelNotificacoes.innerHTML = blocos.join("");

  el.avisoRompimentosTexto.textContent = mensagem;
  const mostrarAviso = datas.length && !avisosFechados.has(chaveAvisoAtual);
  el.avisoRompimentosAtrasados.hidden = !mostrarAviso;
  el.avisoRompimentosAtrasados.classList.toggle("hidden", !mostrarAviso);
}

function mensagemAvisoAtrasos(datas) {
  const datasFormatadas = datas.map(formatarDataIso);
  const lista =
    datasFormatadas.length > 1
      ? `${datasFormatadas.slice(0, -1).join(", ")} e ${datasFormatadas[datasFormatadas.length - 1]}`
      : datasFormatadas[0];
  return `Você tem rompimentos em atraso ${datas.length === 1 ? "do dia" : "dos dias"} ${lista}. Favor realizar o rompimento. Caso já tenha feito, desconsiderar este aviso.`;
}

function fecharAvisoAtrasos() {
  if (chaveAvisoAtual) avisosFechados.add(chaveAvisoAtual);
  el.avisoRompimentosAtrasados.hidden = true;
  el.avisoRompimentosAtrasados.classList.add("hidden");
}

function alternarCentralNotificacoes() {
  const abrir = el.painelNotificacoes.hidden;
  definirCentralAberta(abrir);
  if (abrir) carregarNotificacoesAtrasadas();
}

function lerCacheSessao(chave) {
  try {
    const item = JSON.parse(sessionStorage.getItem(`sgi_rompimentos:${chave}`) || "null");
    if (!item || item.expiraEm <= Date.now() || !item.resultado?.success) return null;
    return item.resultado;
  } catch {
    return null;
  }
}

function salvarCacheSessao(chave, resultado) {
  try {
    sessionStorage.setItem(`sgi_rompimentos:${chave}`, JSON.stringify({
      expiraEm: Date.now() + CACHE_SESSAO_TTL_MS,
      resultado,
    }));
  } catch {}
}

function definirCentralAberta(aberta) {
  el.painelNotificacoes.hidden = !aberta;
  el.painelNotificacoes.classList.toggle("hidden", !aberta);
  el.btnAlternarNotificacoes.setAttribute(
    "aria-expanded",
    aberta ? "true" : "false",
  );
  el.iconeNotificacoes.classList.toggle("rotate-180", aberta);
}

function renderizarRompimentos(grupos) {
  if (!grupos.length) {
    mostrarEstado(MENSAGEM_VAZIO);
    return;
  }

  esconderEstado();
  el.rompimentosLista.innerHTML = "";
  const porReferencia = new Map();
  grupos.forEach((grupo) => {
    if (!porReferencia.has(grupo.referencia))
      porReferencia.set(grupo.referencia, []);
    porReferencia.get(grupo.referencia).push(grupo);
  });

  porReferencia.forEach((itens, referencia) => {
    const detalhes = [];
    itens.forEach((item) => {
      if (Array.isArray(item.detalhes) && item.detalhes.length) {
        detalhes.push(...item.detalhes);
      } else if (Array.isArray(item.cpsBrutos) && item.cpsBrutos.length) {
        detalhes.push(...item.cpsBrutos.map((cp) => ({
          obra: referencia,
          cp,
          idade: item.idade,
          fckEstimado: "",
        })));
      } else {
        detalhes.push({
          obra: referencia,
          cp: item.cpTexto || "CP não informado",
          idade: item.idade,
          fckEstimado: "",
        });
      }
    });
    const article = document.createElement("article");
    article.className =
      "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";
    article.innerHTML = `
      <header class="border-b border-slate-100 bg-slate-950 px-4 py-3 text-white">
        <h4 class="break-words text-lg font-black">${escapeHtml(referencia)}</h4>
      </header>
      <div class="overflow-x-auto">
        <table class="min-w-[520px] w-full border-collapse text-left text-sm">
          <thead class="bg-red-700 text-[10px] uppercase tracking-wide text-white">
            <tr>
              <th class="px-3 py-3 font-black">Obra</th>
              <th class="px-3 py-3 font-black">CP</th>
              <th class="px-3 py-3 font-black">Idade</th>
              <th class="px-3 py-3 font-black">FCK estimado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${detalhes
              .map(
                (detalhe) => `
              <tr class="odd:bg-white even:bg-slate-50">
                <td class="px-3 py-3 font-black text-slate-800">${escapeHtml(detalhe.obra || referencia)}</td>
                <td class="px-3 py-3 font-black text-slate-900">${escapeHtml(detalhe.cp || "-")}</td>
                <td class="px-3 py-3 font-black text-slate-800">${Number(detalhe.idade)} ${Number(detalhe.idade) === 1 ? "dia" : "dias"}</td>
                <td class="px-3 py-3 font-bold text-slate-700">${escapeHtml(detalhe.fckEstimado || "-")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    el.rompimentosLista.appendChild(article);
  });
}

function mostrarEstado(mensagem, permitirNovaTentativa = false, codigo = "") {
  el.rompimentosLista.innerHTML = "";
  el.estadoRompimentos.textContent = mensagem;
  if (codigo) {
    const diagnostico = document.createElement("small");
    diagnostico.className = "mt-2 block text-[10px] font-black uppercase tracking-wider text-slate-400";
    diagnostico.textContent = `Código: ${codigo}`;
    el.estadoRompimentos.appendChild(diagnostico);
  }
  if (permitirNovaTentativa) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.dataset.recarregarRompimentos = "";
    botao.className = "mx-auto mt-3 block rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white";
    botao.textContent = "Tentar novamente";
    el.estadoRompimentos.appendChild(botao);
  }
  el.estadoRompimentos.classList.remove("hidden");
}

function esconderEstado() {
  el.estadoRompimentos.classList.add("hidden");
  el.estadoRompimentos.textContent = "";
}

function atualizarTituloData() {
  const data = dataIsoParaLocal(dataSelecionada);
  el.diaSemana.textContent = data.toLocaleDateString("pt-BR", {
    weekday: "long",
  });
  el.dataSelecionada.textContent = data.toLocaleDateString("pt-BR");
}

function inicioDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function dataLocalIso(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataIsoParaLocal(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function inicioSemanaLocalIso(iso) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = data.getUTCDay();
  data.setUTCDate(data.getUTCDate() + (diaSemana === 0 ? -6 : 1 - diaSemana));
  return data.toISOString().slice(0, 10);
}

function hojeSaoPauloIso() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = {};
  partes.forEach((parte) => { valores[parte.type] = parte.value; });
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function criarErroPublico(codigo, causa) {
  const erro = new Error(codigo);
  erro.codigoPublico = codigo;
  erro.cause = causa;
  return erro;
}

function codigoErroPublico(erro, padrao = "ERRO") {
  return /^[A-Z]+(?: [0-9]{1,3})?$/.test(String(erro?.codigoPublico || ""))
    ? erro.codigoPublico
    : padrao;
}

function adicionarDiasIso(iso, quantidade) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

function iniciosSemanasNoIntervalo(inicio, fim) {
  const semanas = [];
  let semana = inicioSemanaLocalIso(inicio);
  while (semana <= fim) {
    semanas.push(semana);
    semana = adicionarDiasIso(semana, 7);
  }
  return semanas;
}

async function executarComLimite(itens, limite, tarefa) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhadores = Array.from(
    { length: Math.min(limite, itens.length) },
    async () => {
      while (proximo < itens.length) {
        const indice = proximo;
        proximo += 1;
        resultados[indice] = await tarefa(itens[indice]);
      }
    },
  );
  await Promise.all(trabalhadores);
  return resultados;
}

function formatarDataIso(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function nomeCompleto(funcionario) {
  return `${funcionario.nome || ""} ${funcionario.sobrenome || ""}`.trim();
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
