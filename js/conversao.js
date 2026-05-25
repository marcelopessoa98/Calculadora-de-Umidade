/**
 * SGI - ConcreFuji | Inteligência de Conversão e Normas Técnicas
 * Desenvolvido por: Marcelo Pessoa
 */

// --- Configurações e Estado Global ---
const CONSTANTE_GRAVIDADE = 9.80665;
let unidadeSelecionada = "";

const elementos = {
  // Entradas
  tipoCP: document.getElementById("tipoCP"),
  largura: document.getElementById("larguraCustom"),
  altura: document.getElementById("alturaCustom"),
  customDims: document.getElementById("customDims"),
  idadeCP: document.getElementById("idadeCP"),
  fckProjeto: document.getElementById("fckProjeto"),
  fckContainer: document.getElementById("fckTargetContainer"),
  valorCarga: document.getElementById("valorCarga"),

  // Botões
  botoesUnidade: document.querySelectorAll(".unit-btn"),
  btnProcessar: document.getElementById("btnProcessar"),
  btnLimpar: document.getElementById("btnLimpar"),
  btnSalvar: document.getElementById("btnSalvar"),

  // Saídas
  resBox: document.getElementById("resBox"),
  resTf: document.getElementById("resTf"),
  resKn: document.getElementById("resKn"),
  resMpa: document.getElementById("resMpa"),
  obsTecnica: document.getElementById("obsTecnica"),
  captureArea: document.getElementById("captureArea"),
};

// --- Inicialização de Eventos ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Alternar visualização de campos extras
  elementos.tipoCP.addEventListener("change", () => {
    elementos.customDims.classList.toggle(
      "hidden",
      elementos.tipoCP.value !== "custom",
    );
  });

  elementos.idadeCP.addEventListener("change", () => {
    elementos.fckContainer.classList.toggle(
      "hidden",
      elementos.idadeCP.value !== "7d",
    );
  });

  // 2. Seleção de Unidade (Tf / kN)
  elementos.botoesUnidade.forEach((botao) => {
    botao.addEventListener("click", () => {
      unidadeSelecionada = botao.getAttribute("data-unit");
      marcarBotaoAtivo(botao);
    });
  });

  // 3. Processar Cálculo
  elementos.btnProcessar.addEventListener("click", executarCalculos);

  // 4. Limpar Interface
  elementos.btnLimpar.addEventListener("click", resetarInterface);

  // 5. Salvar Print (Usando html2canvas)
  elementos.btnSalvar.addEventListener("click", salvarPrint);
});

// --- Funções de Lógica ---

function marcarBotaoAtivo(botaoAtivo) {
  elementos.botoesUnidade.forEach((btn) => {
    btn.classList.remove(
      "border-red-600",
      "text-red-600",
      "bg-red-50",
      "border-gray-100",
    );
    btn.classList.add("border-gray-100", "text-gray-400");
  });
  botaoAtivo.classList.remove("border-gray-100", "text-gray-400");
  botaoAtivo.classList.add("border-red-600", "text-red-600", "bg-red-50");
}

function calcularArea() {
  // Se for um dos tipos pré-definidos, o valor já é a área em cm²
  if (elementos.tipoCP.value !== "custom") {
    return parseFloat(elementos.tipoCP.value);
  }

  const dOrB = parseFloat(elementos.largura.value); // Diâmetro ou Base
  const h = parseFloat(elementos.altura.value); // Altura (se for retangular)

  if (isNaN(dOrB) || dOrB <= 0) return 0;

  // Lógica: Se não informou altura ou altura = diâmetro, assume-se Cilíndrico
  if (isNaN(h) || h <= 0 || dOrB === h) {
    // Área Círculo (cm²) = (π * d²) / 400  --> (400 pois d está em mm)
    return (Math.PI * Math.pow(dOrB, 2)) / 400;
  } else {
    // Área Retangular (cm²) = (b * h) / 100
    return (dOrB * h) / 100;
  }
}

function executarCalculos() {
  const valorEntrada = parseFloat(elementos.valorCarga.value);
  const areaCM2 = calcularArea();
  const idade = elementos.idadeCP.value;
  const fckProj = parseFloat(elementos.fckProjeto.value);

  // Validações Iniciais
  if (!unidadeSelecionada) return alert("Selecione a Unidade (Tf ou kN).");
  if (isNaN(valorEntrada) || valorEntrada <= 0)
    return alert("Insira um valor de carga válido.");
  if (areaCM2 <= 0) return alert("Verifique as dimensões do CP.");

  let tf, kn, mpa;

  // 1. Conversão de Força
  if (unidadeSelecionada === "tf") {
    tf = valorEntrada;
    kn = valorEntrada * CONSTANTE_GRAVIDADE;
  } else {
    kn = valorEntrada;
    tf = valorEntrada / CONSTANTE_GRAVIDADE;
  }

  // 2. Cálculo de MPa (N/mm²)
  // kN * 1000 = Newtons | areaCM2 * 100 = mm²
  mpa = (kn * 1000) / (areaCM2 * 100);

  exibirResultados(tf, kn, mpa);
  validarRegrasTecnicas(mpa, idade, fckProj, areaCM2);
}

function exibirResultados(tf, kn, mpa) {
  elementos.resTf.innerText = tf.toFixed(2).replace(".", ",") + " Tf";
  elementos.resKn.innerText = kn.toFixed(2).replace(".", ",") + " kN";
  elementos.resMpa.innerText = mpa.toFixed(2).replace(".", ",");
  elementos.resBox.classList.remove("hidden");
}

function validarRegrasTecnicas(mpa, idade, fckProj, area) {
  const obs = elementos.obsTecnica;
  obs.classList.add("hidden");
  obs.className =
    "p-4 rounded-2xl text-[10px] font-black uppercase leading-tight border-2 mt-4";

  // REGRA 12 HORAS (Para CP Padrão 100x200mm)
  if (idade === "12h" && area > 70 && area < 85) {
    obs.classList.remove("hidden");
    if (mpa < 3.0) {
      obs.innerHTML =
        "⚠️ REPROVADO: ABAIXO DE 3 MPa. Aguardar +1h para novo rompimento.";
      obs.classList.add("bg-red-50", "border-red-200", "text-red-700");
    } else {
      obs.innerHTML = "✅ APROVADO.";
      obs.classList.add(
        "bg-emerald-50",
        "border-emerald-200",
        "text-emerald-700",
      );
    }
  }

  // REGRA 7 DIAS (Verifica 70% do fck)
  if (idade === "7d" && !isNaN(fckProj)) {
    const meta70 = fckProj * 0.7;
    obs.classList.remove("hidden");
    if (mpa >= meta70) {
      obs.innerHTML = `✅ META ATINGIDA: ${mpa.toFixed(2)} MPa (Atingiu ${((mpa / fckProj) * 100).toFixed(0)}% do fck)`;
      obs.classList.add(
        "bg-emerald-50",
        "border-emerald-200",
        "text-emerald-700",
      );
    } else {
      obs.innerHTML = `❌ ALERTA: ${mpa.toFixed(2)} MPa (Abaixo dos 70% esperados: ${meta70.toFixed(2)} MPa)`;
      obs.classList.add("bg-amber-50", "border-amber-200", "text-amber-800");
    }
  }
}

function resetarInterface() {
  elementos.valorCarga.value = "";
  elementos.fckProjeto.value = "";
  elementos.largura.value = "";
  elementos.altura.value = "";
  elementos.resBox.classList.add("hidden");
  elementos.obsTecnica.classList.add("hidden");
  unidadeSelecionada = "";
  elementos.botoesUnidade.forEach((btn) => {
    btn.classList.remove("border-red-600", "text-red-600", "bg-red-50");
    btn.classList.add("border-gray-100", "text-gray-400");
  });
}

async function salvarPrint() {
  try {
    const canvas = await html2canvas(elementos.captureArea, {
      scale: 2,
      backgroundColor: "#F3F4F6",
    });
    const link = document.createElement("a");
    link.download = `CONCREFUJI-ENSAIO-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    alert("Erro ao salvar print. Tente novamente.");
  }
}
