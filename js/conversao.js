/**
 * SGI - ConcreFuji
 * Módulo de Conversão de Cargas e Resistência (MPa)
 */

// --- Estado Global da Aplicação ---
let unidadeSelecionada = ""; // Armazena 'tf' ou 'kn'
const CONSTANTE_GRAVIDADE = 9.80665;

// --- Seleção de Elementos ---
const elementos = {
  tipoCP: document.getElementById("tipoCP"),
  valorCarga: document.getElementById("valorCarga"),
  botoesUnidade: document.querySelectorAll(".unit-btn"),
  btnProcessar: document.getElementById("btnProcessar"),
  btnLimpar: document.getElementById("btnLimpar"),
  btnSalvar: document.getElementById("btnSalvar"),
  resBox: document.getElementById("resBox"),
  resTf: document.getElementById("resTf"),
  resKn: document.getElementById("resKn"),
  resMpa: document.getElementById("resMpa"),
  captureArea: document.getElementById("captureArea"),
};

// --- Inicialização de Eventos ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Escuta cliques nos botões de unidade (Tf / kN)
  elementos.botoesUnidade.forEach((botao) => {
    botao.addEventListener("click", () => {
      unidadeSelecionada = botao.getAttribute("data-unit");
      marcarBotaoAtivo(botao);
    });
  });

  // 2. Escuta o clique no botão de processar
  if (elementos.btnProcessar) {
    elementos.btnProcessar.addEventListener("click", executarCalculos);
  }

  // 3. Escuta o botão de limpar
  if (elementos.btnLimpar) {
    elementos.btnLimpar.addEventListener("click", resetarInterface);
  }

  // 4. Escuta o botão de print (Salvar Imagem)
  if (elementos.btnSalvar) {
    elementos.btnSalvar.addEventListener("click", salvarPrint);
  }
});

// --- Funções de Lógica ---

function marcarBotaoAtivo(botaoAtivo) {
  elementos.botoesUnidade.forEach((btn) => {
    btn.classList.remove("border-red-600", "text-red-600", "bg-red-50");
    btn.classList.add("border-gray-200", "text-gray-400");
  });
  botaoAtivo.classList.replace("border-gray-200", "border-red-600");
  botaoAtivo.classList.replace("text-gray-400", "text-red-600");
  botaoAtivo.classList.add("bg-red-50");
}

function executarCalculos() {
  const valorEntrada = parseFloat(elementos.valorCarga.value);
  const areaCP = parseFloat(elementos.tipoCP.value);

  // Validações
  if (!unidadeSelecionada)
    return alert("Por favor, selecione primeiro a Unidade (Tf ou kN).");
  if (isNaN(valorEntrada) || valorEntrada <= 0)
    return alert("Insira um valor de carga válido.");

  let tf, kn, mpa;

  // Lógica de Conversão Base
  if (unidadeSelecionada === "tf") {
    tf = valorEntrada;
    kn = valorEntrada * CONSTANTE_GRAVIDADE;
  } else {
    kn = valorEntrada;
    tf = valorEntrada / CONSTANTE_GRAVIDADE;
  }

  // Cálculo de MPa: Força(N) / Área(mm²)
  // 1 kN = 1000 N | Área em mm² = Área em cm² * 100
  mpa = (kn * 1000) / (areaCP * 100);

  exibirResultados(tf, kn, mpa);
}

function exibirResultados(tf, kn, mpa) {
  // Formatação para 2 casas decimais com substituição de ponto por vírgula
  elementos.resTf.innerText = tf.toFixed(2).replace(".", ",") + " tf";
  elementos.resKn.innerText = kn.toFixed(2).replace(".", ",") + " kN";
  elementos.resMpa.innerText = mpa.toFixed(2).replace(".", ",");

  elementos.resBox.classList.remove("hidden");
}

function resetarInterface() {
  elementos.valorCarga.value = "";
  elementos.resBox.classList.add("hidden");
  unidadeSelecionada = "";
  elementos.botoesUnidade.forEach((btn) => {
    btn.classList.remove("border-red-600", "text-red-600", "bg-red-50");
    btn.classList.add("border-gray-200", "text-gray-400");
  });
}

async function salvarPrint() {
  try {
    const canvas = await html2canvas(elementos.captureArea, { scale: 2 });
    const link = document.createElement("a");
    link.download = `CONCREFUJI-CALCULO-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
  }
}
